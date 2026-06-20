use anchor_lang::prelude::*;
use crate::constants::ODDS_BPS_ONE;
use crate::error::PtbError;

/// payout = stake * odds, where odds are in bps (`10_000` = 1.0x). Floored.
pub fn payout_from(stake: u64, odds_bps: u64) -> Result<u64> {
    let p = (stake as u128)
        .checked_mul(odds_bps as u128)
        .ok_or(error!(PtbError::MathOverflow))?
        .checked_div(ODDS_BPS_ONE as u128)
        .ok_or(error!(PtbError::MathOverflow))?;
    u64::try_from(p).map_err(|_| error!(PtbError::MathOverflow))
}

/// Collateral the MM locks to back a bet = payout - stake.
pub fn collateral_from(stake: u64, odds_bps: u64) -> Result<u64> {
    let payout = payout_from(stake, odds_bps)?;
    payout
        .checked_sub(stake)
        .ok_or(error!(PtbError::MathOverflow))
}

/// Move native lamports between two accounts by direct mutation.
/// REQUIRES `from` to be owned by this program (so the runtime permits the
/// debit). Used for vault -> position (accept) and position -> winner (settle).
pub fn move_lamports(from: &AccountInfo, to: &AccountInfo, amount: u64) -> Result<()> {
    let from_new = from
        .lamports()
        .checked_sub(amount)
        .ok_or(error!(PtbError::MathOverflow))?;
    let to_new = to
        .lamports()
        .checked_add(amount)
        .ok_or(error!(PtbError::MathOverflow))?;
    **from.try_borrow_mut_lamports()? = from_new;
    **to.try_borrow_mut_lamports()? = to_new;
    Ok(())
}

/// Free (withdrawable / lockable) lamports in a program-owned account =
/// balance minus the rent-exempt minimum for its current size.
pub fn free_lamports(acct: &AccountInfo) -> Result<u64> {
    let rent_min = Rent::get()?.minimum_balance(acct.data_len());
    Ok(acct.lamports().saturating_sub(rent_min))
}
