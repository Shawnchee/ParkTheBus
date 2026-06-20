use anchor_lang::prelude::*;
use crate::constants::*;
use crate::error::PtbError;
use crate::state::*;

/// A council member records the result of one parlay leg as matches play out.
/// The aggregate is enforced at `execute_settlement` (all legs Won => BettorWins
/// may pay; any leg Lost => only MmWins). Threshold consensus is still required
/// to actually release funds, so single-member recording is safe.
#[derive(Accounts)]
pub struct RecordLegResult<'info> {
    #[account(seeds = [CONFIG_SEED], bump = config.bump)]
    pub config: Account<'info, Config>,

    #[account(
        mut,
        seeds = [RFQ_SEED, rfq.rfq_id.to_le_bytes().as_ref()],
        bump = rfq.bump,
    )]
    pub rfq: Account<'info, RfqAccount>,

    #[account(
        seeds = [POSITION_SEED, rfq.key().as_ref()],
        bump = position.bump,
        constraint = position.rfq_id == rfq.rfq_id @ PtbError::ResultMismatch,
    )]
    pub position: Account<'info, PositionAccount>,

    pub council_member: Signer<'info>,
}

pub fn handler(ctx: Context<RecordLegResult>, leg_index: u8, won: bool) -> Result<()> {
    let member = ctx.accounts.council_member.key();
    require!(
        ctx.accounts.config.is_council(&member),
        PtbError::NotCouncilMember
    );
    require!(ctx.accounts.rfq.is_parlay, PtbError::NotAParlay);
    require!(
        ctx.accounts.position.status == PositionStatus::Matched,
        PtbError::PositionNotMatched
    );
    // Council auto-exclusion (Rule 2): a party can't adjudicate its own legs.
    require!(
        member != ctx.accounts.position.bettor
            && member != ctx.accounts.position.market_maker,
        PtbError::CouncilMemberExcluded
    );

    let idx = leg_index as usize;
    let rfq = &mut ctx.accounts.rfq;
    require!(idx < rfq.parlay_legs.len(), PtbError::LegIndexOutOfRange);

    rfq.parlay_legs[idx].result = if won { LegResult::Won } else { LegResult::Lost };
    msg!(
        "RFQ #{} leg {} recorded: {}",
        rfq.rfq_id,
        idx,
        if won { "WON" } else { "LOST" }
    );
    Ok(())
}
