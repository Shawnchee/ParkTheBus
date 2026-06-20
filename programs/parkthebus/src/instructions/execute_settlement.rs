use anchor_lang::prelude::*;
use crate::constants::*;
use crate::error::PtbError;
use crate::state::*;
use crate::util::move_lamports;

/// Permissionless: once a settlement has reached threshold votes, release the
/// position escrow to the winner (or refund both on Void), refund the RFQ
/// deposit to the bettor, update on-chain reputation, and close the position.
#[derive(Accounts)]
pub struct ExecuteSettlement<'info> {
    #[account(seeds = [CONFIG_SEED], bump = config.bump)]
    pub config: Account<'info, Config>,

    #[account(
        mut,
        seeds = [RFQ_SEED, rfq.rfq_id.to_le_bytes().as_ref()],
        bump = rfq.bump,
    )]
    pub rfq: Account<'info, RfqAccount>,

    #[account(
        mut,
        close = bettor,
        seeds = [POSITION_SEED, rfq.key().as_ref()],
        bump = position.bump,
        has_one = bettor,
        has_one = market_maker,
    )]
    pub position: Account<'info, PositionAccount>,

    #[account(
        mut,
        seeds = [SETTLEMENT_SEED, rfq.key().as_ref()],
        bump = settlement.bump,
        constraint = settlement.position == position.key() @ PtbError::ResultMismatch,
    )]
    pub settlement: Account<'info, SettlementAccount>,

    /// CHECK: pinned by `has_one = bettor`; receives payout/refund + position rent.
    #[account(mut)]
    pub bettor: UncheckedAccount<'info>,

    /// CHECK: pinned by `has_one = market_maker`; receives payout/refund.
    #[account(mut)]
    pub market_maker: UncheckedAccount<'info>,

    #[account(
        init_if_needed,
        payer = cranker,
        space = 8 + ReputationAccount::INIT_SPACE,
        seeds = [REPUTATION_SEED, bettor.key().as_ref()],
        bump,
    )]
    pub bettor_rep: Account<'info, ReputationAccount>,

    #[account(
        init_if_needed,
        payer = cranker,
        space = 8 + ReputationAccount::INIT_SPACE,
        seeds = [REPUTATION_SEED, market_maker.key().as_ref()],
        bump,
    )]
    pub mm_rep: Account<'info, ReputationAccount>,

    #[account(mut)]
    pub cranker: Signer<'info>,

    pub system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<ExecuteSettlement>) -> Result<()> {
    let threshold = ctx.accounts.config.threshold;
    require!(!ctx.accounts.settlement.executed, PtbError::SettlementAlreadyExecuted);
    require!(
        ctx.accounts.settlement.vote_count >= threshold,
        PtbError::ThresholdNotMet
    );
    require!(
        ctx.accounts.position.status == PositionStatus::Matched,
        PtbError::PositionNotMatched
    );

    let stake = ctx.accounts.position.stake;
    let collateral = ctx.accounts.position.collateral;
    let payout = ctx.accounts.position.payout_amount;
    let outcome = ctx.accounts.settlement.outcome;

    // Defensive: the escrowed pot must equal stake + collateral before we release it.
    require!(
        payout == stake.checked_add(collateral).ok_or(error!(PtbError::MathOverflow))?,
        PtbError::BadPositionInvariant
    );

    // Parlay all-or-nothing: the recorded legs must agree with the voted outcome.
    if ctx.accounts.rfq.is_parlay {
        let legs = &ctx.accounts.rfq.parlay_legs;
        match outcome {
            // Bettor only collects if EVERY leg won.
            SettlementOutcome::BettorWins => require!(
                legs.iter().all(|l| l.result == LegResult::Won),
                PtbError::ResultMismatch
            ),
            // MM collects when at least one leg lost.
            SettlementOutcome::MmWins => require!(
                legs.iter().any(|l| l.result == LegResult::Lost),
                PtbError::ResultMismatch
            ),
            // Void (abandoned/postponed) needs no leg constraint.
            SettlementOutcome::Void => {}
        }
    }

    let position_ai = ctx.accounts.position.to_account_info();
    let bettor_ai = ctx.accounts.bettor.to_account_info();
    let mm_ai = ctx.accounts.market_maker.to_account_info();

    let (new_status, mm_won) = match outcome {
        SettlementOutcome::BettorWins => {
            move_lamports(&position_ai, &bettor_ai, payout)?;
            (PositionStatus::SettledBettorWin, Some(false))
        }
        SettlementOutcome::MmWins => {
            move_lamports(&position_ai, &mm_ai, payout)?;
            (PositionStatus::SettledMmWin, Some(true))
        }
        SettlementOutcome::Void => {
            move_lamports(&position_ai, &bettor_ai, stake)?;
            move_lamports(&position_ai, &mm_ai, collateral)?;
            (PositionStatus::Cancelled, None)
        }
    };

    // Refund the RFQ spam deposit to the bettor (held in the RFQ account lamports).
    let deposit = ctx.accounts.rfq.deposit;
    if deposit > 0 {
        move_lamports(&ctx.accounts.rfq.to_account_info(), &bettor_ai, deposit)?;
        ctx.accounts.rfq.deposit = 0;
    }

    ctx.accounts.position.status = new_status;
    ctx.accounts.rfq.status = RfqStatus::Settled;
    ctx.accounts.settlement.executed = true;

    // ---- Reputation -------------------------------------------------------
    let bettor_key = ctx.accounts.bettor.key();
    let mm_key = ctx.accounts.market_maker.key();
    let bettor_is_council = ctx.accounts.config.is_council(&bettor_key);
    let mm_is_council = ctx.accounts.config.is_council(&mm_key);

    let br = &mut ctx.accounts.bettor_rep;
    br.wallet = bettor_key;
    br.markets_as_bettor = br.markets_as_bettor.saturating_add(1);
    br.total_volume_lamports = br.total_volume_lamports.saturating_add(stake);
    br.is_council_member = bettor_is_council;
    br.bump = ctx.bumps.bettor_rep;

    let mr = &mut ctx.accounts.mm_rep;
    mr.wallet = mm_key;
    mr.markets_as_mm = mr.markets_as_mm.saturating_add(1);
    mr.total_volume_lamports = mr.total_volume_lamports.saturating_add(payout);
    mr.is_council_member = mm_is_council;
    mr.bump = ctx.bumps.mm_rep;
    match mm_won {
        Some(true) => mr.mm_wins = mr.mm_wins.saturating_add(1),
        Some(false) => mr.mm_losses = mr.mm_losses.saturating_add(1),
        None => {}
    }

    msg!("RFQ #{} settled: {:?}", ctx.accounts.rfq.rfq_id, outcome);
    Ok(())
}
