import { PublicKey } from '@solana/web3.js'

export const NETWORK = 'devnet'
export const RPC_URL =
  (import.meta.env.VITE_SOLANA_RPC as string) ?? 'https://api.devnet.solana.com'

export const PROGRAM_ID = new PublicKey(
  (import.meta.env.VITE_PROGRAM_ID as string) ??
    '6xzNc5rA9bMi8DzH1ZMp1CKrnC51XvurYTX5ygaGqm2i',
)

/** Where the Express AI/odds/fixtures proxy lives (dev: vite proxies /api). */
export const API_BASE = (import.meta.env.VITE_API_BASE as string) ?? '/api'

/** The 2-of-2 settlement council (the user's devnet wallets). */
export const COUNCIL: PublicKey[] = [
  '9HA6iNgWsrUHrqwnCLVbmivggget85RYz2vHvyLgmSiM',
  'sqZcUVNaye4SXu3UabgwRyPY9JHnoewAB9enThyuQyw',
].map((s) => new PublicKey(s))

export const ODDS_BPS_ONE = 10_000
export const RFQ_DEPOSIT_LAMPORTS = 10_000_000 // 0.01 SOL
export const LAMPORTS_PER_SOL = 1_000_000_000
export const MAX_PARLAY_LEGS = 4

export const explorerTx = (sig: string) =>
  `https://explorer.solana.com/tx/${sig}?cluster=devnet`
export const explorerAddr = (addr: string) =>
  `https://explorer.solana.com/address/${addr}?cluster=devnet`

export const isCouncil = (pk?: PublicKey | null) =>
  !!pk && COUNCIL.some((c) => c.equals(pk))
