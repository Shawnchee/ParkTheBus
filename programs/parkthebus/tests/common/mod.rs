#![allow(dead_code)]
//! Shared LiteSVM test harness for the parkthebus program.

use anchor_lang::solana_program::instruction::Instruction;
use anchor_lang::{AccountDeserialize, InstructionData, ToAccountMetas};
use anchor_lang::prelude::Pubkey;
use litesvm::types::{FailedTransactionMetadata, TransactionMetadata};
use litesvm::LiteSVM;
use solana_keypair::Keypair;
use solana_clock::Clock;
use solana_message::{Message, VersionedMessage};
use solana_signer::Signer;
use solana_transaction::versioned::VersionedTransaction;

use parkthebus::constants::*;
use parkthebus::instructions::post_rfq::PostRfqArgs;

pub const SOL: u64 = 1_000_000_000;
/// Safely beyond any LiteSVM default clock, so RFQs never look expired in tests
/// unless we deliberately advance the clock.
pub const FAR_FUTURE: i64 = 7_000_000_000;

pub type TxResult = std::result::Result<TransactionMetadata, FailedTransactionMetadata>;

pub fn program_bytes() -> Vec<u8> {
    std::fs::read(concat!(
        env!("CARGO_MANIFEST_DIR"),
        "/../../target/deploy/parkthebus.so"
    ))
    .expect("program .so not found — run `anchor build` first")
}

pub struct Env {
    pub svm: LiteSVM,
    pub council: Vec<Keypair>,
}

impl Env {
    pub fn new(council_size: usize) -> Self {
        let mut svm = LiteSVM::new();
        svm.add_program(parkthebus::ID, &program_bytes()).unwrap();
        let council: Vec<Keypair> = (0..council_size).map(|_| Keypair::new()).collect();
        for c in &council {
            svm.airdrop(&c.pubkey(), 10 * SOL).unwrap();
        }
        Self { svm, council }
    }

    pub fn council_pubkeys(&self) -> Vec<Pubkey> {
        self.council.iter().map(|k| k.pubkey()).collect()
    }

    pub fn funded(&mut self, sol: u64) -> Keypair {
        let kp = Keypair::new();
        self.svm.airdrop(&kp.pubkey(), sol * SOL).unwrap();
        kp
    }

    pub fn send(&mut self, ix: Instruction, payer: &Keypair, extra: &[&Keypair]) -> TxResult {
        let bh = self.svm.latest_blockhash();
        let msg = Message::new_with_blockhash(&[ix], Some(&payer.pubkey()), &bh);
        let mut signers: Vec<&Keypair> = vec![payer];
        signers.extend_from_slice(extra);
        let tx =
            VersionedTransaction::try_new(VersionedMessage::Legacy(msg), &signers[..]).unwrap();
        self.svm.send_transaction(tx)
    }

    pub fn send1(&mut self, ix: Instruction, payer: &Keypair) -> TxResult {
        self.send(ix, payer, &[])
    }

    pub fn lamports(&self, pk: &Pubkey) -> u64 {
        self.svm.get_account(pk).map(|a| a.lamports).unwrap_or(0)
    }

    pub fn exists(&self, pk: &Pubkey) -> bool {
        self.svm.get_account(pk).map(|a| !a.data.is_empty()).unwrap_or(false)
    }

    /// Current on-chain unix timestamp (from the Clock sysvar).
    pub fn now(&self) -> i64 {
        self.svm.get_sysvar::<Clock>().unix_timestamp
    }

    /// Warp the Clock sysvar to a specific unix timestamp (for expiry/kickoff tests).
    pub fn warp_unix(&mut self, unix_ts: i64) {
        let mut clock = self.svm.get_sysvar::<Clock>();
        clock.unix_timestamp = unix_ts;
        self.svm.set_sysvar::<Clock>(&clock);
        // fresh blockhash so post-warp txs aren't deduped against earlier ones
        self.svm.expire_blockhash();
    }

    pub fn account<T: AccountDeserialize>(&self, pk: &Pubkey) -> T {
        let acct = self.svm.get_account(pk).expect("account should exist");
        let mut data = acct.data.as_slice();
        T::try_deserialize(&mut data).expect("account should deserialize")
    }
}

/// Assert a transaction failed and one of its logs contains `needle`.
pub fn expect_log(res: TxResult, needle: &str) {
    match res {
        Ok(_) => panic!("expected failure containing '{needle}', but tx succeeded"),
        Err(fail) => {
            let logs = fail.meta.logs.join("\n");
            assert!(
                logs.contains(needle),
                "expected a log containing '{needle}', got logs:\n{logs}"
            );
        }
    }
}

// ---- PDA helpers -----------------------------------------------------------

pub fn config_pda() -> Pubkey {
    Pubkey::find_program_address(&[CONFIG_SEED], &parkthebus::ID).0
}
pub fn mm_vault_pda(mm: &Pubkey) -> Pubkey {
    Pubkey::find_program_address(&[MM_VAULT_SEED, mm.as_ref()], &parkthebus::ID).0
}
pub fn rfq_pda(rfq_id: u64) -> Pubkey {
    Pubkey::find_program_address(&[RFQ_SEED, &rfq_id.to_le_bytes()], &parkthebus::ID).0
}
pub fn quote_pda(rfq: &Pubkey, mm: &Pubkey) -> Pubkey {
    Pubkey::find_program_address(&[QUOTE_SEED, rfq.as_ref(), mm.as_ref()], &parkthebus::ID).0
}
pub fn position_pda(rfq: &Pubkey) -> Pubkey {
    Pubkey::find_program_address(&[POSITION_SEED, rfq.as_ref()], &parkthebus::ID).0
}
pub fn settlement_pda(rfq: &Pubkey) -> Pubkey {
    Pubkey::find_program_address(&[SETTLEMENT_SEED, rfq.as_ref()], &parkthebus::ID).0
}
pub fn reputation_pda(wallet: &Pubkey) -> Pubkey {
    Pubkey::find_program_address(&[REPUTATION_SEED, wallet.as_ref()], &parkthebus::ID).0
}

// ---- instruction builders --------------------------------------------------

pub fn ix_initialize(authority: &Pubkey, council: Vec<Pubkey>, threshold: u8) -> Instruction {
    Instruction {
        program_id: parkthebus::ID,
        accounts: parkthebus::accounts::Initialize {
            config: config_pda(),
            authority: *authority,
            system_program: anchor_lang::system_program::ID,
        }
        .to_account_metas(None),
        data: parkthebus::instruction::Initialize { council, threshold }.data(),
    }
}

pub fn ix_deposit_collateral(mm: &Pubkey, amount: u64) -> Instruction {
    Instruction {
        program_id: parkthebus::ID,
        accounts: parkthebus::accounts::DepositCollateral {
            mm_vault: mm_vault_pda(mm),
            market_maker: *mm,
            system_program: anchor_lang::system_program::ID,
        }
        .to_account_metas(None),
        data: parkthebus::instruction::DepositCollateral { amount }.data(),
    }
}

pub fn ix_post_rfq(bettor: &Pubkey, rfq_id: u64, args: PostRfqArgs) -> Instruction {
    Instruction {
        program_id: parkthebus::ID,
        accounts: parkthebus::accounts::PostRfq {
            config: config_pda(),
            rfq: rfq_pda(rfq_id),
            bettor: *bettor,
            system_program: anchor_lang::system_program::ID,
        }
        .to_account_metas(None),
        data: parkthebus::instruction::PostRfq { args }.data(),
    }
}

pub fn ix_submit_quote(mm: &Pubkey, rfq_id: u64, offered_odds_bps: u64) -> Instruction {
    let rfq = rfq_pda(rfq_id);
    Instruction {
        program_id: parkthebus::ID,
        accounts: parkthebus::accounts::SubmitQuote {
            rfq,
            quote: quote_pda(&rfq, mm),
            market_maker: *mm,
            system_program: anchor_lang::system_program::ID,
        }
        .to_account_metas(None),
        data: parkthebus::instruction::SubmitQuote { offered_odds_bps }.data(),
    }
}

pub fn ix_accept_quote(bettor: &Pubkey, rfq_id: u64, mm: &Pubkey) -> Instruction {
    let rfq = rfq_pda(rfq_id);
    Instruction {
        program_id: parkthebus::ID,
        accounts: parkthebus::accounts::AcceptQuote {
            rfq,
            quote: quote_pda(&rfq, mm),
            market_maker: *mm,
            mm_vault: mm_vault_pda(mm),
            position: position_pda(&rfq),
            bettor: *bettor,
            system_program: anchor_lang::system_program::ID,
        }
        .to_account_metas(None),
        data: parkthebus::instruction::AcceptQuote {}.data(),
    }
}

pub fn ix_approve_market(council_member: &Pubkey, rfq_id: u64, approved: bool) -> Instruction {
    Instruction {
        program_id: parkthebus::ID,
        accounts: parkthebus::accounts::ApproveMarket {
            config: config_pda(),
            rfq: rfq_pda(rfq_id),
            council_member: *council_member,
        }
        .to_account_metas(None),
        data: parkthebus::instruction::ApproveMarket { approved }.data(),
    }
}

pub fn ix_cancel_rfq(bettor: &Pubkey, rfq_id: u64) -> Instruction {
    Instruction {
        program_id: parkthebus::ID,
        accounts: parkthebus::accounts::CancelRfq {
            rfq: rfq_pda(rfq_id),
            bettor: *bettor,
        }
        .to_account_metas(None),
        data: parkthebus::instruction::CancelRfq {}.data(),
    }
}

pub fn ix_expire_rfq(bettor: &Pubkey, cranker: &Pubkey, rfq_id: u64) -> Instruction {
    Instruction {
        program_id: parkthebus::ID,
        accounts: parkthebus::accounts::ExpireRfq {
            rfq: rfq_pda(rfq_id),
            bettor: *bettor,
            cranker: *cranker,
        }
        .to_account_metas(None),
        data: parkthebus::instruction::ExpireRfq {}.data(),
    }
}

pub fn ix_sign_settlement(
    council_member: &Pubkey,
    rfq_id: u64,
    outcome: parkthebus::state::SettlementOutcome,
    evidence_uri: &str,
) -> Instruction {
    let rfq = rfq_pda(rfq_id);
    Instruction {
        program_id: parkthebus::ID,
        accounts: parkthebus::accounts::SignSettlement {
            config: config_pda(),
            rfq,
            position: position_pda(&rfq),
            settlement: settlement_pda(&rfq),
            council_member: *council_member,
            system_program: anchor_lang::system_program::ID,
        }
        .to_account_metas(None),
        data: parkthebus::instruction::SignSettlement {
            outcome,
            evidence_uri: evidence_uri.to_string(),
        }
        .data(),
    }
}

pub fn ix_execute_settlement(
    rfq_id: u64,
    bettor: &Pubkey,
    market_maker: &Pubkey,
    cranker: &Pubkey,
) -> Instruction {
    let rfq = rfq_pda(rfq_id);
    Instruction {
        program_id: parkthebus::ID,
        accounts: parkthebus::accounts::ExecuteSettlement {
            config: config_pda(),
            rfq,
            position: position_pda(&rfq),
            settlement: settlement_pda(&rfq),
            bettor: *bettor,
            market_maker: *market_maker,
            bettor_rep: reputation_pda(bettor),
            mm_rep: reputation_pda(market_maker),
            cranker: *cranker,
            system_program: anchor_lang::system_program::ID,
        }
        .to_account_metas(None),
        data: parkthebus::instruction::ExecuteSettlement {}.data(),
    }
}

pub fn ix_record_leg_result(
    council_member: &Pubkey,
    rfq_id: u64,
    leg_index: u8,
    won: bool,
) -> Instruction {
    let rfq = rfq_pda(rfq_id);
    Instruction {
        program_id: parkthebus::ID,
        accounts: parkthebus::accounts::RecordLegResult {
            config: config_pda(),
            rfq,
            position: position_pda(&rfq),
            council_member: *council_member,
        }
        .to_account_metas(None),
        data: parkthebus::instruction::RecordLegResult { leg_index, won }.data(),
    }
}

/// A parlay RFQ with `n_legs` pending legs at the given combined odds.
pub fn parlay_rfq_args(stake: u64, min_odds_bps: u64, n_legs: usize) -> PostRfqArgs {
    let legs = (0..n_legs)
        .map(|i| parkthebus::state::ParlayLeg {
            event_description: format!("Leg {}", i),
            result: parkthebus::state::LegResult::Pending,
        })
        .collect();
    PostRfqArgs {
        match_id: "WC-PARLAY".to_string(),
        event_description: "3-leg parlay".to_string(),
        event_type: parkthebus::state::EventType::Standard,
        stake,
        min_odds_bps,
        expires_at: FAR_FUTURE,
        kickoff_at: 0,
        is_parlay: true,
        parlay_legs: legs,
    }
}

/// Convenience: a standard, auto-approved RFQ with the given stake + min odds.
pub fn standard_rfq_args(stake: u64, min_odds_bps: u64) -> PostRfqArgs {
    PostRfqArgs {
        match_id: "WC-BRA-FRA".to_string(),
        event_description: "Brazil WIN".to_string(),
        event_type: parkthebus::state::EventType::Standard,
        stake,
        min_odds_bps,
        expires_at: FAR_FUTURE,
        kickoff_at: 0,
        is_parlay: false,
        parlay_legs: vec![],
    }
}
