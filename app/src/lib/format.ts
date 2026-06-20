import BN from 'bn.js'
import { LAMPORTS_PER_SOL, ODDS_BPS_ONE } from '../config'

const num = (x: number | BN): number => (typeof x === 'number' ? x : x.toNumber())

export const lamportsToSol = (l: number | BN) => num(l) / LAMPORTS_PER_SOL
export const solToLamports = (s: number) => Math.round(s * LAMPORTS_PER_SOL)
export const fmtSol = (l: number | BN, dp = 3) => `${lamportsToSol(l).toFixed(dp)} SOL`

/** Odds in basis points where 10000 = 1.0x. */
export const bpsToOdds = (bps: number | BN) => num(bps) / ODDS_BPS_ONE
export const oddsToBps = (x: number) => Math.round(x * ODDS_BPS_ONE)
export const fmtOdds = (bps: number | BN) => `${bpsToOdds(bps).toFixed(2)}x`

/** Decimal-odds implied probability = 1 / odds. */
export const impliedProb = (bps: number | BN) => ODDS_BPS_ONE / num(bps)
export const fmtPct = (p: number, dp = 1) => `${(p * 100).toFixed(dp)}%`

/** MM collateral for a bet = stake * (odds - 1). */
export const collateralFor = (stakeLamports: number, oddsBps: number) =>
  Math.floor((stakeLamports * oddsBps) / ODDS_BPS_ONE) - stakeLamports
export const payoutFor = (stakeLamports: number, oddsBps: number) =>
  Math.floor((stakeLamports * oddsBps) / ODDS_BPS_ONE)

/**
 * Rent-exempt floor of an MmVault account (8 disc + 33 data bytes).
 * Lamports at or below this are reserved for rent and can't back collateral —
 * exactly how `free_lamports` works on-chain (util.rs).
 */
export const VAULT_RENT_LAMPORTS = 1_176_240
/** Lamports in a vault that are actually available to back a quote. */
export const vaultFree = (balanceLamports: number) =>
  Math.max(0, balanceLamports - VAULT_RENT_LAMPORTS)

export const shortAddr = (a: string, n = 4) =>
  a.length <= 2 * n + 1 ? a : `${a.slice(0, n)}…${a.slice(-n)}`

export function timeLeft(expiresAtSec: number): string {
  const diff = expiresAtSec - Math.floor(Date.now() / 1000)
  if (diff <= 0) return 'expired'
  const m = Math.floor(diff / 60)
  const s = diff % 60
  if (m >= 60) return `${Math.floor(m / 60)}h ${m % 60}m`
  return `${m}m ${s}s`
}
