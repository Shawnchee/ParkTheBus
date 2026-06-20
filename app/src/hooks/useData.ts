/* eslint-disable react-hooks/exhaustive-deps */
import { useCallback, useEffect, useState } from 'react'
import { PublicKey } from '@solana/web3.js'
import BN from 'bn.js'
import { useProgram } from '../lib/anchor'
import type {
  ConfigAccount,
  PositionAccount,
  QuoteAccount,
  ReputationAccount,
  RfqAccount,
  SettlementAccount,
  MmVault,
} from '../lib/anchor'
import {
  configPda,
  mmVaultPda,
  positionPda,
  reputationPda,
  rfqPda,
  settlementPda,
} from '../lib/pdas'

export interface WithKey<T> {
  publicKey: PublicKey
  account: T
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function useFetch<T>(fn: () => Promise<T>, deps: any[]) {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const refresh = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setData(await fn())
    } catch (e) {
      setError(e instanceof Error ? e.message : 'failed to load')
    } finally {
      setLoading(false)
    }
  }, deps)
  useEffect(() => {
    refresh()
  }, [refresh])
  return { data, loading, error, refresh }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const any = (x: unknown) => x as any

export function useConfig() {
  const program = useProgram()
  return useFetch<ConfigAccount | null>(
    () => any(program.account.config.fetchNullable(configPda())),
    [program],
  )
}

export function useRfqFeed() {
  const program = useProgram()
  return useFetch<WithKey<RfqAccount>[]>(
    () => any(program.account.rfqAccount.all()),
    [program],
  )
}

export function useRfq(rfqId: number | null) {
  const program = useProgram()
  return useFetch<RfqAccount | null>(
    () =>
      rfqId == null
        ? Promise.resolve(null)
        : any(program.account.rfqAccount.fetchNullable(rfqPda(rfqId))),
    [program, rfqId],
  )
}

export function useQuotes(rfqId: number | null) {
  const program = useProgram()
  return useFetch<WithKey<QuoteAccount>[]>(async () => {
    if (rfqId == null) return []
    const all = await program.account.quoteAccount.all()
    return any(all.filter((q) => (q.account.rfqId as BN).toNumber() === rfqId))
  }, [program, rfqId])
}

export function usePosition(rfqId: number | null) {
  const program = useProgram()
  return useFetch<PositionAccount | null>(
    () =>
      rfqId == null
        ? Promise.resolve(null)
        : any(
            program.account.positionAccount.fetchNullable(positionPda(rfqPda(rfqId))),
          ),
    [program, rfqId],
  )
}

export function useSettlement(rfqId: number | null) {
  const program = useProgram()
  return useFetch<SettlementAccount | null>(
    () =>
      rfqId == null
        ? Promise.resolve(null)
        : any(
            program.account.settlementAccount.fetchNullable(settlementPda(rfqPda(rfqId))),
          ),
    [program, rfqId],
  )
}

export function useReputation(wallet: PublicKey | null) {
  const program = useProgram()
  return useFetch<ReputationAccount | null>(
    () =>
      wallet == null
        ? Promise.resolve(null)
        : any(program.account.reputationAccount.fetchNullable(reputationPda(wallet))),
    [program, wallet?.toBase58()],
  )
}

export function useMmVault(mm: PublicKey | null) {
  const program = useProgram()
  return useFetch<MmVault | null>(
    () =>
      mm == null
        ? Promise.resolve(null)
        : any(program.account.mmVault.fetchNullable(mmVaultPda(mm))),
    [program, mm?.toBase58()],
  )
}
