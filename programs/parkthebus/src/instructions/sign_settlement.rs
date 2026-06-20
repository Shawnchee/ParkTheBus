use anchor_lang::prelude::*;
use crate::constants::*;
use crate::error::PtbError;
use crate::state::*;

/// A council member casts a vote on a matched position's outcome. The first vote
/// creates the settlement and fixes the proposed outcome + evidence; subsequent
/// votes must agree. Enforces council membership, party-exclusion (Rule 2), and
/// one-vote-per-member.
#[derive(Accounts)]
pub struct SignSettlement<'info> {
    #[account(seeds = [CONFIG_SEED], bump = config.bump)]
    pub config: Account<'info, Config>,

    #[account(
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

    #[account(
        init_if_needed,
        payer = council_member,
        space = 8 + SettlementAccount::INIT_SPACE,
        seeds = [SETTLEMENT_SEED, rfq.key().as_ref()],
        bump,
    )]
    pub settlement: Account<'info, SettlementAccount>,

    #[account(mut)]
    pub council_member: Signer<'info>,

    pub system_program: Program<'info, System>,
}

pub fn handler(
    ctx: Context<SignSettlement>,
    outcome: SettlementOutcome,
    evidence_uri: String,
) -> Result<()> {
    let member = ctx.accounts.council_member.key();
    require!(
        ctx.accounts.config.is_council(&member),
        PtbError::NotCouncilMember
    );
    require!(
        ctx.accounts.position.status == PositionStatus::Matched,
        PtbError::PositionNotMatched
    );
    // Council auto-exclusion (Rule 2): a party to the bet cannot judge it.
    require!(
        member != ctx.accounts.position.bettor && member != ctx.accounts.position.market_maker,
        PtbError::CouncilMemberExcluded
    );
    require!(
        evidence_uri.len() <= MAX_EVIDENCE_URI_LEN,
        PtbError::StringTooLong
    );

    let rfq_id = ctx.accounts.rfq.rfq_id;
    let position_key = ctx.accounts.position.key();
    let bump = ctx.bumps.settlement;
    let s = &mut ctx.accounts.settlement;

    require!(!s.executed, PtbError::SettlementAlreadyExecuted);

    if s.vote_count == 0 {
        s.rfq_id = rfq_id;
        s.position = position_key;
        s.outcome = outcome;
        s.evidence_uri = evidence_uri;
        s.voters = vec![member];
        s.vote_count = 1;
        s.executed = false;
        s.bump = bump;
    } else {
        require!(s.outcome == outcome, PtbError::OutcomeMismatch);
        require!(!s.voters.contains(&member), PtbError::AlreadyVoted);
        s.voters.push(member);
        s.vote_count = s.vote_count.saturating_add(1);
    }

    msg!(
        "Settlement vote {}/{} for RFQ #{}",
        s.vote_count,
        ctx.accounts.config.threshold,
        rfq_id
    );
    Ok(())
}
