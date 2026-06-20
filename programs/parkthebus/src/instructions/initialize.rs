use anchor_lang::prelude::*;
use crate::constants::*;
use crate::error::PtbError;
use crate::state::Config;

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(
        init,
        payer = authority,
        space = 8 + Config::INIT_SPACE,
        seeds = [CONFIG_SEED],
        bump,
    )]
    pub config: Account<'info, Config>,

    #[account(mut)]
    pub authority: Signer<'info>,

    pub system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<Initialize>, council: Vec<Pubkey>, threshold: u8) -> Result<()> {
    require!(
        !council.is_empty() && council.len() <= MAX_COUNCIL,
        PtbError::InvalidCouncilSize
    );
    // Strict majority required, and you can't need more votes than members.
    let majority = (council.len() / 2 + 1) as u8;
    require!(
        threshold >= majority && (threshold as usize) <= council.len(),
        PtbError::InvalidThreshold
    );
    // Duplicate keys would shrink the real honest-majority requirement.
    for (i, member) in council.iter().enumerate() {
        require!(
            !council[..i].contains(member),
            PtbError::DuplicateCouncilMember
        );
    }

    let config = &mut ctx.accounts.config;
    config.authority = ctx.accounts.authority.key();
    config.council = council;
    config.threshold = threshold;
    config.rfq_counter = 0;
    config.bump = ctx.bumps.config;

    msg!(
        "ParkTheBus initialized: {} council members, threshold {}",
        config.council.len(),
        config.threshold
    );
    Ok(())
}
