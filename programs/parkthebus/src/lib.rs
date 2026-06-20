pub mod constants;
pub mod error;
pub mod instructions;
pub mod state;
pub mod util;

use anchor_lang::prelude::*;

pub use constants::*;
pub use instructions::*;
pub use state::*;

declare_id!("6xzNc5rA9bMi8DzH1ZMp1CKrnC51XvurYTX5ygaGqm2i");

#[program]
pub mod parkthebus {
    use super::*;

    /// One-time setup: registers the council + vote threshold and the RFQ counter.
    pub fn initialize(
        ctx: Context<Initialize>,
        council: Vec<Pubkey>,
        threshold: u8,
    ) -> Result<()> {
        instructions::initialize::handler(ctx, council, threshold)
    }

    /// Market maker tops up their collateral vault (quotes stay free).
    pub fn deposit_collateral(ctx: Context<DepositCollateral>, amount: u64) -> Result<()> {
        instructions::deposit_collateral::handler(ctx, amount)
    }

    /// Bettor posts an RFQ (locks the spam-prevention deposit).
    pub fn post_rfq(ctx: Context<PostRfq>, args: PostRfqArgs) -> Result<()> {
        instructions::post_rfq::handler(ctx, args)
    }

    /// Market maker submits a free competing quote.
    pub fn submit_quote(ctx: Context<SubmitQuote>, offered_odds_bps: u64) -> Result<()> {
        instructions::submit_quote::handler(ctx, offered_odds_bps)
    }

    /// Bettor accepts a quote: escrows stake + pulls MM collateral, opens a position.
    pub fn accept_quote(ctx: Context<AcceptQuote>) -> Result<()> {
        instructions::accept_quote::handler(ctx)
    }

    /// Council member approves/rejects a custom-event RFQ awaiting review.
    pub fn approve_market(ctx: Context<ApproveMarket>, approved: bool) -> Result<()> {
        instructions::approve_market::handler(ctx, approved)
    }

    /// Bettor cancels an unmatched RFQ (refunds deposit + rent).
    pub fn cancel_rfq(ctx: Context<CancelRfq>) -> Result<()> {
        instructions::cancel_rfq::handler(ctx)
    }

    /// Permissionless crank: clean up an expired, unmatched RFQ (refunds the bettor).
    pub fn expire_rfq(ctx: Context<ExpireRfq>) -> Result<()> {
        instructions::expire_rfq::handler(ctx)
    }

    /// Council member votes on a matched position's outcome (threshold-gated).
    pub fn sign_settlement(
        ctx: Context<SignSettlement>,
        outcome: SettlementOutcome,
        evidence_uri: String,
    ) -> Result<()> {
        instructions::sign_settlement::handler(ctx, outcome, evidence_uri)
    }

    /// Council member records one parlay leg's result (Won/Lost) as matches play.
    pub fn record_leg_result(
        ctx: Context<RecordLegResult>,
        leg_index: u8,
        won: bool,
    ) -> Result<()> {
        instructions::record_leg_result::handler(ctx, leg_index, won)
    }

    /// Permissionless: release escrow once a settlement has the required votes.
    pub fn execute_settlement(ctx: Context<ExecuteSettlement>) -> Result<()> {
        instructions::execute_settlement::handler(ctx)
    }
}
