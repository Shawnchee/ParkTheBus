use anchor_lang::prelude::*;
use anchor_lang::system_program::{self, Transfer};
use crate::constants::*;
use crate::error::PtbError;
use crate::state::*;

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug)]
pub struct PostRfqArgs {
    pub match_id: String,
    pub event_description: String,
    pub event_type: EventType,
    pub stake: u64,
    pub min_odds_bps: u64,
    pub expires_at: i64,
    /// 0 = no kickoff lockout for this market.
    pub kickoff_at: i64,
    pub is_parlay: bool,
    pub parlay_legs: Vec<ParlayLeg>,
}

#[derive(Accounts)]
pub struct PostRfq<'info> {
    #[account(mut, seeds = [CONFIG_SEED], bump = config.bump)]
    pub config: Account<'info, Config>,

    #[account(
        init,
        payer = bettor,
        space = 8 + RfqAccount::INIT_SPACE,
        seeds = [RFQ_SEED, config.rfq_counter.to_le_bytes().as_ref()],
        bump,
    )]
    pub rfq: Account<'info, RfqAccount>,

    #[account(mut)]
    pub bettor: Signer<'info>,

    pub system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<PostRfq>, args: PostRfqArgs) -> Result<()> {
    require!(args.stake > 0, PtbError::InvalidStake);
    require!(args.min_odds_bps > ODDS_BPS_ONE, PtbError::OddsTooLow);
    require!(
        args.match_id.len() <= MAX_MATCH_ID_LEN
            && args.event_description.len() <= MAX_EVENT_DESC_LEN,
        PtbError::StringTooLong
    );
    // Parlay shape: a parlay needs 2..=MAX pending legs; a single bet has none.
    if args.is_parlay {
        require!(
            args.parlay_legs.len() >= 2 && args.parlay_legs.len() <= MAX_PARLAY_LEGS,
            PtbError::InvalidParlay
        );
        for leg in &args.parlay_legs {
            require!(
                leg.event_description.len() <= MAX_EVENT_DESC_LEN,
                PtbError::StringTooLong
            );
            require!(leg.result == LegResult::Pending, PtbError::InvalidParlay);
        }
    } else {
        require!(args.parlay_legs.is_empty(), PtbError::InvalidParlay);
    }

    let now = Clock::get()?.unix_timestamp;
    require!(args.expires_at > now, PtbError::InvalidExpiry);
    // Kickoff (if set) must be in the future, else the RFQ is born un-quotable.
    require!(
        args.kickoff_at == 0 || args.kickoff_at > now,
        PtbError::InvalidKickoff
    );

    let config = &mut ctx.accounts.config;
    let rfq = &mut ctx.accounts.rfq;

    // Standard events auto-approve and go live; custom events wait on council.
    let (status, approval_status) = match args.event_type {
        EventType::Standard => (RfqStatus::Open, ApprovalStatus::AutoApproved),
        EventType::Custom => (RfqStatus::PendingApproval, ApprovalStatus::Pending),
    };

    rfq.rfq_id = config.rfq_counter;
    rfq.bettor = ctx.accounts.bettor.key();
    rfq.match_id = args.match_id;
    rfq.event_description = args.event_description;
    rfq.event_type = args.event_type;
    rfq.stake = args.stake;
    rfq.min_odds_bps = args.min_odds_bps;
    rfq.status = status;
    rfq.approval_status = approval_status;
    rfq.created_at = now;
    rfq.expires_at = args.expires_at;
    rfq.kickoff_at = args.kickoff_at;
    rfq.is_parlay = args.is_parlay;
    rfq.parlay_legs = args.parlay_legs;
    rfq.deposit = RFQ_DEPOSIT_LAMPORTS;
    rfq.quote_count = 0;
    rfq.accepted_mm = None;
    rfq.bump = ctx.bumps.rfq;

    // Escrow the spam-prevention deposit inside the RFQ account's lamports.
    system_program::transfer(
        CpiContext::new(
            ctx.accounts.system_program.key(),
            Transfer {
                from: ctx.accounts.bettor.to_account_info(),
                to: rfq.to_account_info(),
            },
        ),
        RFQ_DEPOSIT_LAMPORTS,
    )?;

    config.rfq_counter = config
        .rfq_counter
        .checked_add(1)
        .ok_or(error!(PtbError::MathOverflow))?;

    msg!("RFQ #{} posted: {}", rfq.rfq_id, rfq.event_description);
    Ok(())
}
