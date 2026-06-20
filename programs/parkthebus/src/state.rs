use anchor_lang::prelude::*;
use crate::constants::*;

// ===========================================================================
// Enums
// ===========================================================================

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq, Debug, InitSpace)]
pub enum EventType {
    /// Objectively verifiable from api-football (match result, scorer, goals).
    Standard,
    /// Free-text event ("Ronaldo to cry") — needs council pre-approval.
    Custom,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq, Debug, InitSpace)]
pub enum RfqStatus {
    PendingApproval,
    Open,
    Matched,
    Settled,
    Expired,
    Cancelled,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq, Debug, InitSpace)]
pub enum ApprovalStatus {
    AutoApproved,
    CouncilApproved,
    Pending,
    Rejected,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq, Debug, InitSpace)]
pub enum QuoteStatus {
    Pending,
    Accepted,
    Rejected,
    Expired,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq, Debug, InitSpace)]
pub enum PositionStatus {
    Matched,
    SettledBettorWin,
    SettledMmWin,
    Cancelled,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq, Debug, InitSpace)]
pub enum LegResult {
    Pending,
    Won,
    Lost,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq, Debug, InitSpace)]
pub struct ParlayLeg {
    #[max_len(MAX_EVENT_DESC_LEN)]
    pub event_description: String,
    pub result: LegResult,
}

// ===========================================================================
// Accounts
// ===========================================================================

/// Singleton program configuration + global RFQ counter + council registry.
#[account]
#[derive(InitSpace)]
pub struct Config {
    pub authority: Pubkey,
    #[max_len(MAX_COUNCIL)]
    pub council: Vec<Pubkey>,
    /// Votes required to settle (strict majority; 2-of-2 for MVP).
    pub threshold: u8,
    /// Monotonic id assigned to each new RFQ.
    pub rfq_counter: u64,
    pub bump: u8,
}

impl Config {
    pub fn is_council(&self, who: &Pubkey) -> bool {
        self.council.iter().any(|m| m == who)
    }
}

/// Per-market-maker collateral vault. Program-owned so `accept_quote` can debit
/// it without the MM's signature. Holds rent + free collateral as native lamports;
/// the struct itself is intentionally tiny.
#[account]
#[derive(InitSpace)]
pub struct MmVault {
    pub market_maker: Pubkey,
    pub bump: u8,
}

/// A Request For Quote posted by a bettor. Also escrows the spam-prevention
/// deposit (0.01 SOL) as native lamports inside this account.
#[account]
#[derive(InitSpace)]
pub struct RfqAccount {
    pub rfq_id: u64,
    pub bettor: Pubkey,
    #[max_len(MAX_MATCH_ID_LEN)]
    pub match_id: String,
    #[max_len(MAX_EVENT_DESC_LEN)]
    pub event_description: String,
    pub event_type: EventType,
    pub stake: u64,
    pub min_odds_bps: u64,
    pub status: RfqStatus,
    pub approval_status: ApprovalStatus,
    pub created_at: i64,
    pub expires_at: i64,
    /// Kickoff timestamp; no quotes/accepts allowed at or after this (Rule 5). 0 = unset.
    pub kickoff_at: i64,
    pub is_parlay: bool,
    #[max_len(MAX_PARLAY_LEGS)]
    pub parlay_legs: Vec<ParlayLeg>,
    pub deposit: u64,
    pub quote_count: u32,
    pub accepted_mm: Option<Pubkey>,
    pub bump: u8,
}

/// A free competing quote from a market maker on one RFQ.
/// PDA seed = ["quote", rfq, market_maker] => one (improvable) quote per MM per RFQ.
#[account]
#[derive(InitSpace)]
pub struct QuoteAccount {
    pub rfq_id: u64,
    pub market_maker: Pubkey,
    pub offered_odds_bps: u64,
    pub collateral_required: u64,
    pub status: QuoteStatus,
    pub created_at: i64,
    pub bump: u8,
}

/// Created on a match. Holds the entire pot (stake + collateral = payout) as
/// native lamports; the winner takes all at settlement.
#[account]
#[derive(InitSpace)]
pub struct PositionAccount {
    pub rfq_id: u64,
    pub bettor: Pubkey,
    pub market_maker: Pubkey,
    pub stake: u64,
    pub collateral: u64,
    pub matched_odds_bps: u64,
    /// stake + collateral; held as lamports in this account above rent.
    pub payout_amount: u64,
    pub status: PositionStatus,
    pub bump: u8,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq, Debug, InitSpace)]
pub enum SettlementOutcome {
    BettorWins,
    MmWins,
    /// Match void / postponed / abandoned — both parties refunded.
    Void,
}

/// One settlement per position (seed ["settlement", rfq]). Council members vote
/// on a single proposed outcome; once `vote_count >= config.threshold` the escrow
/// can be released by anyone via `execute_settlement`.
#[account]
#[derive(InitSpace)]
pub struct SettlementAccount {
    pub rfq_id: u64,
    pub position: Pubkey,
    pub outcome: SettlementOutcome,
    #[max_len(MAX_COUNCIL)]
    pub voters: Vec<Pubkey>,
    pub vote_count: u8,
    #[max_len(MAX_EVIDENCE_URI_LEN)]
    pub evidence_uri: String,
    pub executed: bool,
    pub bump: u8,
}

/// Per-wallet on-chain reputation (seed ["reputation", wallet]). Created lazily
/// at first settlement.
#[account]
#[derive(InitSpace)]
pub struct ReputationAccount {
    pub wallet: Pubkey,
    pub markets_as_mm: u64,
    pub markets_as_bettor: u64,
    pub total_volume_lamports: u64,
    pub mm_wins: u64,
    pub mm_losses: u64,
    pub disputes_involved: u64,
    pub is_council_member: bool,
    pub bump: u8,
}
