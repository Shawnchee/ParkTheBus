use anchor_lang::prelude::*;

#[error_code]
pub enum PtbError {
    #[msg("Council size must be between 1 and MAX_COUNCIL")]
    InvalidCouncilSize,
    #[msg("Threshold must be a strict majority of the council and not exceed its size")]
    InvalidThreshold,
    #[msg("Council contains duplicate members")]
    DuplicateCouncilMember,
    #[msg("Position payout does not equal stake + collateral (invariant broken)")]
    BadPositionInvariant,
    #[msg("Odds must be strictly greater than 1.0x (10000 bps)")]
    OddsTooLow,
    #[msg("Collateral rounds to zero — increase stake or odds margin")]
    CollateralTooLow,
    #[msg("Market is not approved for quoting")]
    MarketNotApproved,
    #[msg("Kickoff must be unset (0) or in the future")]
    InvalidKickoff,
    #[msg("Stake must be greater than zero")]
    InvalidStake,
    #[msg("A string field exceeds its maximum length")]
    StringTooLong,
    #[msg("Expiry must be in the future")]
    InvalidExpiry,
    #[msg("RFQ is not open for this action")]
    RfqNotOpen,
    #[msg("RFQ has already been matched")]
    RfqAlreadyMatched,
    #[msg("RFQ has expired")]
    RfqExpired,
    #[msg("Quote odds do not meet the RFQ minimum")]
    QuoteBelowMinOdds,
    #[msg("Kickoff has passed; no new quotes or matches accepted")]
    KickoffPassed,
    #[msg("Market maker has insufficient free collateral in their vault")]
    InsufficientCollateral,
    #[msg("Quote is not in a pending state")]
    QuoteNotPending,
    #[msg("Numerical overflow")]
    MathOverflow,
    #[msg("Withdraw amount exceeds free (unreserved) vault balance")]
    WithdrawExceedsBalance,
    // ---- reserved for later phases (settlement / parlays) ----
    #[msg("Caller is not a council member")]
    NotCouncilMember,
    #[msg("Council member has already voted on this settlement")]
    AlreadyVoted,
    #[msg("Council member is excluded from this market (has a position in it)")]
    CouncilMemberExcluded,
    #[msg("Settlement has not reached the required vote threshold")]
    ThresholdNotMet,
    #[msg("Position is not in the expected state for settlement")]
    PositionNotMatched,
    #[msg("Settlement result does not match this position's event")]
    ResultMismatch,
    #[msg("RFQ is not awaiting council approval")]
    NotPendingApproval,
    #[msg("Settlement has already been executed")]
    SettlementAlreadyExecuted,
    #[msg("Vote outcome does not match the proposed settlement outcome")]
    OutcomeMismatch,
    #[msg("RFQ has not expired yet")]
    RfqNotExpired,
    #[msg("Cannot cancel an RFQ that is already matched or settled")]
    CannotCancelMatched,
    #[msg("Invalid parlay: needs 2-4 pending legs (or none for a single bet)")]
    InvalidParlay,
    #[msg("This RFQ is not a parlay")]
    NotAParlay,
    #[msg("Parlay leg index out of range")]
    LegIndexOutOfRange,
}
