use anchor_lang::prelude::*;
use crate::constants::*;
use crate::error::PtbError;
use crate::state::*;

/// A council member approves (or rejects) a custom-event RFQ that is awaiting
/// review. Approval flips it Open so MMs can quote; rejection marks it Rejected
/// (the bettor can then `cancel_rfq` to reclaim the deposit, or let it expire).
#[derive(Accounts)]
pub struct ApproveMarket<'info> {
    #[account(seeds = [CONFIG_SEED], bump = config.bump)]
    pub config: Account<'info, Config>,

    #[account(
        mut,
        seeds = [RFQ_SEED, rfq.rfq_id.to_le_bytes().as_ref()],
        bump = rfq.bump,
    )]
    pub rfq: Account<'info, RfqAccount>,

    pub council_member: Signer<'info>,
}

pub fn handler(ctx: Context<ApproveMarket>, approved: bool) -> Result<()> {
    let config = &ctx.accounts.config;
    require!(
        config.is_council(&ctx.accounts.council_member.key()),
        PtbError::NotCouncilMember
    );

    let rfq = &mut ctx.accounts.rfq;
    require!(
        rfq.status == RfqStatus::PendingApproval,
        PtbError::NotPendingApproval
    );

    if approved {
        rfq.status = RfqStatus::Open;
        rfq.approval_status = ApprovalStatus::CouncilApproved;
        msg!("RFQ #{} approved by council", rfq.rfq_id);
    } else {
        rfq.approval_status = ApprovalStatus::Rejected;
        msg!("RFQ #{} rejected by council", rfq.rfq_id);
    }
    Ok(())
}
