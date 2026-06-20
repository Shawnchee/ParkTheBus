use anchor_lang::prelude::*;
use anchor_lang::system_program::{self, Transfer};
use crate::constants::*;
use crate::state::MmVault;

/// A market maker tops up their collateral vault. Quotes stay free; the vault is
/// what `accept_quote` draws from when one of their quotes is matched.
#[derive(Accounts)]
pub struct DepositCollateral<'info> {
    #[account(
        init_if_needed,
        payer = market_maker,
        space = 8 + MmVault::INIT_SPACE,
        seeds = [MM_VAULT_SEED, market_maker.key().as_ref()],
        bump,
    )]
    pub mm_vault: Account<'info, MmVault>,

    #[account(mut)]
    pub market_maker: Signer<'info>,

    pub system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<DepositCollateral>, amount: u64) -> Result<()> {
    // Idempotent on re-deposit (seed is keyed to the MM, only they sign).
    let vault = &mut ctx.accounts.mm_vault;
    vault.market_maker = ctx.accounts.market_maker.key();
    vault.bump = ctx.bumps.mm_vault;

    system_program::transfer(
        CpiContext::new(
            ctx.accounts.system_program.key(),
            Transfer {
                from: ctx.accounts.market_maker.to_account_info(),
                to: ctx.accounts.mm_vault.to_account_info(),
            },
        ),
        amount,
    )?;

    msg!("MM vault topped up by {} lamports", amount);
    Ok(())
}
