use anchor_lang::prelude::*;
use crate::constants::*;
use crate::error::PtbError;
use crate::state::*;

/// Permissionless crank: once an RFQ is past its expiry and still unmatched,
/// anyone can clean it up. Rent + deposit are returned to the original bettor.
#[derive(Accounts)]
pub struct ExpireRfq<'info> {
    #[account(
        mut,
        close = bettor,
        seeds = [RFQ_SEED, rfq.rfq_id.to_le_bytes().as_ref()],
        bump = rfq.bump,
        has_one = bettor,
    )]
    pub rfq: Account<'info, RfqAccount>,

    /// CHECK: must be the RFQ's bettor (enforced by `has_one`); receives the refund.
    #[account(mut)]
    pub bettor: UncheckedAccount<'info>,

    /// Whoever cranks the expiry (pays the tx fee).
    pub cranker: Signer<'info>,
}

pub fn handler(ctx: Context<ExpireRfq>) -> Result<()> {
    let rfq = &ctx.accounts.rfq;
    require!(
        matches!(rfq.status, RfqStatus::Open | RfqStatus::PendingApproval),
        PtbError::CannotCancelMatched
    );
    let now = Clock::get()?.unix_timestamp;
    require!(now >= rfq.expires_at, PtbError::RfqNotExpired);
    msg!("RFQ #{} expired; deposit refunded to bettor", rfq.rfq_id);
    Ok(())
}
