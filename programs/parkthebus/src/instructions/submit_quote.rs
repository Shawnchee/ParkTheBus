use anchor_lang::prelude::*;
use crate::constants::*;
use crate::error::PtbError;
use crate::state::*;
use crate::util::collateral_from;

#[derive(Accounts)]
pub struct SubmitQuote<'info> {
    #[account(
        mut,
        seeds = [RFQ_SEED, rfq.rfq_id.to_le_bytes().as_ref()],
        bump = rfq.bump,
    )]
    pub rfq: Account<'info, RfqAccount>,

    #[account(
        init,
        payer = market_maker,
        space = 8 + QuoteAccount::INIT_SPACE,
        seeds = [QUOTE_SEED, rfq.key().as_ref(), market_maker.key().as_ref()],
        bump,
    )]
    pub quote: Account<'info, QuoteAccount>,

    #[account(mut)]
    pub market_maker: Signer<'info>,

    pub system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<SubmitQuote>, offered_odds_bps: u64) -> Result<()> {
    let rfq = &mut ctx.accounts.rfq;

    require!(rfq.status == RfqStatus::Open, PtbError::RfqNotOpen);
    // Defense-in-depth: never quote a market that hasn't been approved.
    require!(
        matches!(
            rfq.approval_status,
            ApprovalStatus::AutoApproved | ApprovalStatus::CouncilApproved
        ),
        PtbError::MarketNotApproved
    );

    let now = Clock::get()?.unix_timestamp;
    require!(now < rfq.expires_at, PtbError::RfqExpired);
    // Kickoff lockout (Rule 5): no quotes once the match has started.
    require!(
        rfq.kickoff_at == 0 || now < rfq.kickoff_at,
        PtbError::KickoffPassed
    );

    require!(
        offered_odds_bps >= rfq.min_odds_bps,
        PtbError::QuoteBelowMinOdds
    );

    let collateral = collateral_from(rfq.stake, offered_odds_bps)?;
    // Reject quotes whose collateral floors to zero (MM would risk nothing).
    require!(collateral > 0, PtbError::CollateralTooLow);

    let quote = &mut ctx.accounts.quote;
    quote.rfq_id = rfq.rfq_id;
    quote.market_maker = ctx.accounts.market_maker.key();
    quote.offered_odds_bps = offered_odds_bps;
    quote.collateral_required = collateral;
    quote.status = QuoteStatus::Pending;
    quote.created_at = now;
    quote.bump = ctx.bumps.quote;

    rfq.quote_count = rfq.quote_count.saturating_add(1);

    msg!(
        "Quote on RFQ #{} at {} bps (collateral {})",
        rfq.rfq_id,
        offered_odds_bps,
        collateral
    );
    Ok(())
}
