import { useMemo } from 'react'
import { AnchorProvider, Program, type IdlAccounts } from '@coral-xyz/anchor'
import { useConnection, useAnchorWallet } from '@solana/wallet-adapter-react'
import { Connection, PublicKey } from '@solana/web3.js'
import idlJson from '../idl/parkthebus.json'
import type { Parkthebus } from '../idl/parkthebus'

export type PtbProgram = Program<Parkthebus>
export type RfqAccount = IdlAccounts<Parkthebus>['rfqAccount']
export type QuoteAccount = IdlAccounts<Parkthebus>['quoteAccount']
export type PositionAccount = IdlAccounts<Parkthebus>['positionAccount']
export type SettlementAccount = IdlAccounts<Parkthebus>['settlementAccount']
export type ReputationAccount = IdlAccounts<Parkthebus>['reputationAccount']
export type ConfigAccount = IdlAccounts<Parkthebus>['config']
export type MmVault = IdlAccounts<Parkthebus>['mmVault']

const READONLY_WALLET = {
  publicKey: PublicKey.default,
  signTransaction: async <T>(t: T) => t,
  signAllTransactions: async <T>(t: T[]) => t,
}

export function getProgram(connection: Connection, wallet?: unknown): PtbProgram {
  const provider = new AnchorProvider(
    connection,
    (wallet as AnchorProvider['wallet']) ?? READONLY_WALLET,
    { commitment: 'confirmed', skipPreflight: true, preflightCommitment: 'confirmed' },
  )
  return new Program(idlJson as unknown as Parkthebus, provider)
}

/** Program bound to the connected wallet (or a read-only stub when disconnected). */
export function useProgram(): PtbProgram {
  const { connection } = useConnection()
  const wallet = useAnchorWallet()
  return useMemo(() => getProgram(connection, wallet), [connection, wallet])
}

/** First key of an Anchor enum object, e.g. { open: {} } -> "open". */
export function enumKey(e: Record<string, unknown> | null | undefined): string {
  if (!e) return ''
  return Object.keys(e)[0] ?? ''
}
