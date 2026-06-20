use anchor_lang::prelude::*;
use anchor_lang::system_program::{self, Transfer};
use crate::constants::*;
use crate::error::PtbError;
use crate::state::*;
use crate::util::{collateral_from, free_lamports, move_lamports, payout_from};

#[derive(Accounts)]
pub struct AcceptQuote<'info> {
    #[account(
        mut,
        seeds = [RFQ_SEED, rfq.rfq_id.to_le_bytes().as_ref()],
        bump = rfq.bump,
        has_one = bettor,
    )]
    pub rfq: Account<'info, RfqAccount>,

    #[account(
        mut,
        seeds = [QUOTE_SEED, rfq.key().as_ref(), market_maker.key().as_ref()],
        bump = quote.bump,
    )]
    pub quote: Account<'info, QuoteAccount>,

    /// CHECK: identified by the quote PDA seeds; receives no funds in this ix.
    #[account(address = quote.market_maker)]
    pub market_maker: UncheckedAccount<'info>,

    #[account(
        mut,
        seeds = [MM_VAULT_SEED, market_maker.key().as_ref()],
        bump = mm_vault.bump,
    )]
    pub mm_vault: Account<'info, MmVault>,

    #[account(
        init,
        payer = bettor,
        space = 8 + PositionAccount::INIT_SPACE,
        seeds = [POSITION_SEED, rfq.key().as_ref()],
        bump,
    )]
    pub position: Account<'info, PositionAccount>,

    #[account(mut)]
    pub bettor: Signer<'info>,

    pub system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<AcceptQuote>) -> Result<()> {
    let rfq = &mut ctx.accounts.rfq;
    let quote = &mut ctx.accounts.quote;

    // Double-accept / race guard: once matched, fail clearly.
    require!(rfq.status != RfqStatus::Matched, PtbError::RfqAlreadyMatched);
    require!(rfq.status == RfqStatus::Open, PtbError::RfqNotOpen);
    require!(
        matches!(
            rfq.approval_status,
            ApprovalStatus::AutoApproved | ApprovalStatus::CouncilApproved
        ),
        PtbError::MarketNotApproved
    );
    require!(quote.status == QuoteStatus::Pending, PtbError::QuoteNotPending);

    let now = Clock::get()?.unix_timestamp;
    require!(now < rfq.expires_at, PtbError::RfqExpired);
    require!(
        rfq.kickoff_at == 0 || now < rfq.kickoff_at,
        PtbError::KickoffPassed
    );
    require!(
        quote.offered_odds_bps >= rfq.min_odds_bps,
        PtbError::QuoteBelowMinOdds
    );

    let odds = quote.offered_odds_bps;
    let stake = rfq.stake;
    let payout = payout_from(stake, odds)?;
    let collateral = collateral_from(stake, odds)?;
    require!(collateral > 0, PtbError::CollateralTooLow);

    // Re-validate MM still has the collateral (quotes lock nothing) — PRD §11.
    // If not, this fails cleanly and the UI falls through to the next quote.
    require!(
        free_lamports(&ctx.accounts.mm_vault.to_account_info())? >= collateral,
        PtbError::InsufficientCollateral
    );

    // Pull the bettor's stake into the position escrow (bettor is the signer).
    system_program::transfer(
        CpiContext::new(
            ctx.accounts.system_program.key(),
            Transfer {
                from: ctx.accounts.bettor.to_account_info(),
                to: ctx.accounts.position.to_account_info(),
            },
        ),
        stake,
    )?;

    // Pull the MM collateral from their (program-owned) vault into the escrow.
    move_lamports(
        &ctx.accounts.mm_vault.to_account_info(),
        &ctx.accounts.position.to_account_info(),
        collateral,
    )?;

    let position = &mut ctx.accounts.position;
    position.rfq_id = rfq.rfq_id;
    position.bettor = ctx.accounts.bettor.key();
    position.market_maker = ctx.accounts.market_maker.key();
    position.stake = stake;
    position.collateral = collateral;
    position.matched_odds_bps = odds;
    position.payout_amount = payout;
    position.status = PositionStatus::Matched;
    position.bump = ctx.bumps.position;

    rfq.status = RfqStatus::Matched;
    rfq.accepted_mm = Some(ctx.accounts.market_maker.key());
    quote.status = QuoteStatus::Accepted;

    msg!(
        "RFQ #{} matched at {} bps: stake {}, collateral {}, payout {}",
        rfq.rfq_id,
        odds,
        stake,
        collateral,
        payout
    );
    Ok(())
}
