use anchor_lang::prelude::*;
use crate::constants::*;
use crate::error::PtbError;
use crate::state::*;

/// Bettor cancels an unmatched RFQ. Closing the account returns rent + the
/// escrowed spam deposit to the bettor.
#[derive(Accounts)]
pub struct CancelRfq<'info> {
    #[account(
        mut,
        close = bettor,
        seeds = [RFQ_SEED, rfq.rfq_id.to_le_bytes().as_ref()],
        bump = rfq.bump,
        has_one = bettor,
    )]
    pub rfq: Account<'info, RfqAccount>,

    #[account(mut)]
    pub bettor: Signer<'info>,
}

pub fn handler(ctx: Context<CancelRfq>) -> Result<()> {
    let rfq = &ctx.accounts.rfq;
    // Only before a match: Open or still-PendingApproval (incl. council-rejected).
    require!(
        matches!(rfq.status, RfqStatus::Open | RfqStatus::PendingApproval),
        PtbError::CannotCancelMatched
    );
    msg!("RFQ #{} cancelled; deposit refunded", rfq.rfq_id);
    Ok(())
}
