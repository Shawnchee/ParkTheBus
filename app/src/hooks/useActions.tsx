import { useCallback } from 'react'
import { BN } from '@coral-xyz/anchor'
import { PublicKey, SystemProgram } from '@solana/web3.js'
import { useWallet } from '@solana/wallet-adapter-react'
import { useToast } from '../components/Toast'
import ExplorerLink from '../components/ExplorerLink'
import { useProgram } from '../lib/anchor'
import {
  configPda,
  mmVaultPda,
  positionPda,
  quotePda,
  reputationPda,
  rfqPda,
  settlementPda,
} from '../lib/pdas'

export type EventTypeArg = 'standard' | 'custom'
export type OutcomeArg = 'bettorWins' | 'mmWins' | 'void'

export interface PostRfqInput {
  matchId: string
  eventDescription: string
  eventType: EventTypeArg
  stakeLamports: number
  minOddsBps: number
  expiresAt: number
  kickoffAt: number
  isParlay: boolean
  legs: string[]
}

/* eslint-disable @typescript-eslint/no-explicit-any */
function friendlyError(e: any): string {
  const msg =
    e?.error?.errorMessage ||
    e?.errorMessage ||
    (Array.isArray(e?.logs) ? e.logs.join(' ') : '') ||
    e?.message ||
    'Transaction failed'
  if (/insufficient.*free.*collateral|InsufficientCollateral|0x1780/i.test(msg))
    return "This market maker hasn't locked enough collateral to back that quote, so it can't be accepted. Pick another quote, or ask them to top up their vault."
  if (/has[_ ]?one|0x7d1/i.test(msg))
    return 'Only the wallet that posted this RFQ can accept its quotes — switch to the bettor account.'
  if (/RFQ has expired|RfqExpired/i.test(msg))
    return 'This RFQ has expired and can no longer be matched.'
  if (/insufficient.*lamports|insufficient funds/i.test(msg))
    return "Insufficient funds — make sure you've airdropped devnet SOL."
  if (/already in use/i.test(msg)) return 'That account already exists (already matched?).'
  if (/0x1$/.test(msg)) return 'Insufficient funds for this transaction.'
  return msg
}

export function useActions() {
  const program = useProgram()
  const { publicKey } = useWallet()
  const toast = useToast()

  const run = useCallback(
    async (title: string, fn: () => Promise<string>): Promise<string> => {
      if (!publicKey) {
        toast.push({ kind: 'error', title: 'Connect your wallet first' })
        throw new Error('wallet not connected')
      }
      const id = toast.push({
        kind: 'pending',
        title: `${title}…`,
        body: 'Confirm in your wallet',
      })
      try {
        const sig = await fn()
        toast.update(id, {
          kind: 'success',
          title: `${title} confirmed`,
          body: <ExplorerLink tx={sig} label="View transaction" />,
        })
        return sig
      } catch (e) {
        toast.update(id, { kind: 'error', title: `${title} failed`, body: friendlyError(e) })
        throw e
      }
    },
    [publicKey, toast],
  )

  const sys = SystemProgram.programId

  const depositCollateral = useCallback(
    (sol: number) =>
      run('Deposit collateral', () => {
        const mm = publicKey!
        return program.methods
          .depositCollateral(new BN(Math.round(sol * 1e9)))
          .accounts({ mmVault: mmVaultPda(mm), marketMaker: mm, systemProgram: sys } as any)
          .rpc()
      }),
    [program, publicKey, run, sys],
  )

  /** Posts an RFQ; resolves to the new rfqId for navigation. */
  const postRfq = useCallback(
    async (input: PostRfqInput): Promise<number> => {
      let rfqId = 0
      await run('Post RFQ', async () => {
        const bettor = publicKey!
        const cfg = await program.account.config.fetch(configPda())
        const counter = cfg.rfqCounter as BN
        rfqId = counter.toNumber()
        const rfq = rfqPda(counter)
        const args = {
          matchId: input.matchId,
          eventDescription: input.eventDescription,
          eventType: input.eventType === 'custom' ? { custom: {} } : { standard: {} },
          stake: new BN(input.stakeLamports),
          minOddsBps: new BN(input.minOddsBps),
          expiresAt: new BN(input.expiresAt),
          kickoffAt: new BN(input.kickoffAt),
          isParlay: input.isParlay,
          parlayLegs: input.legs.map((d) => ({
            eventDescription: d,
            result: { pending: {} },
          })),
        }
        return program.methods
          .postRfq(args as any)
          .accounts({ config: configPda(), rfq, bettor, systemProgram: sys } as any)
          .rpc()
      })
      return rfqId
    },
    [program, publicKey, run, sys],
  )

  const submitQuote = useCallback(
    (rfqId: number, oddsBps: number) =>
      run('Submit quote', () => {
        const mm = publicKey!
        const rfq = rfqPda(rfqId)
        return program.methods
          .submitQuote(new BN(oddsBps))
          .accounts({
            rfq,
            quote: quotePda(rfq, mm),
            marketMaker: mm,
            systemProgram: sys,
          } as any)
          .rpc()
      }),
    [program, publicKey, run, sys],
  )

  const acceptQuote = useCallback(
    (rfqId: number, mm: PublicKey) =>
      run('Accept quote', () => {
        const bettor = publicKey!
        const rfq = rfqPda(rfqId)
        return program.methods
          .acceptQuote()
          .accounts({
            rfq,
            quote: quotePda(rfq, mm),
            marketMaker: mm,
            mmVault: mmVaultPda(mm),
            position: positionPda(rfq),
            bettor,
            systemProgram: sys,
          } as any)
          .rpc()
      }),
    [program, publicKey, run, sys],
  )

  const cancelRfq = useCallback(
    (rfqId: number) =>
      run('Cancel RFQ', () =>
        program.methods
          .cancelRfq()
          .accounts({ rfq: rfqPda(rfqId), bettor: publicKey! } as any)
          .rpc(),
      ),
    [program, publicKey, run],
  )

  const expireRfq = useCallback(
    (rfqId: number, bettor: PublicKey) =>
      run('Expire RFQ', () =>
        program.methods
          .expireRfq()
          .accounts({ rfq: rfqPda(rfqId), bettor, cranker: publicKey! } as any)
          .rpc(),
      ),
    [program, publicKey, run],
  )

  const approveMarket = useCallback(
    (rfqId: number, approved: boolean) =>
      run(approved ? 'Approve market' : 'Reject market', () =>
        program.methods
          .approveMarket(approved)
          .accounts({
            config: configPda(),
            rfq: rfqPda(rfqId),
            councilMember: publicKey!,
          } as any)
          .rpc(),
      ),
    [program, publicKey, run],
  )

  const signSettlement = useCallback(
    (rfqId: number, outcome: OutcomeArg, evidenceUri: string) =>
      run('Cast settlement vote', () => {
        const rfq = rfqPda(rfqId)
        return program.methods
          .signSettlement({ [outcome]: {} } as any, evidenceUri)
          .accounts({
            config: configPda(),
            rfq,
            position: positionPda(rfq),
            settlement: settlementPda(rfq),
            councilMember: publicKey!,
            systemProgram: sys,
          } as any)
          .rpc()
      }),
    [program, publicKey, run, sys],
  )

  const recordLegResult = useCallback(
    (rfqId: number, legIndex: number, won: boolean) =>
      run(`Record leg ${legIndex + 1}`, () => {
        const rfq = rfqPda(rfqId)
        return program.methods
          .recordLegResult(legIndex, won)
          .accounts({
            config: configPda(),
            rfq,
            position: positionPda(rfq),
            councilMember: publicKey!,
          } as any)
          .rpc()
      }),
    [program, publicKey, run],
  )

  const executeSettlement = useCallback(
    (rfqId: number, bettor: PublicKey, mm: PublicKey) =>
      run('Execute settlement', () => {
        const rfq = rfqPda(rfqId)
        return program.methods
          .executeSettlement()
          .accounts({
            config: configPda(),
            rfq,
            position: positionPda(rfq),
            settlement: settlementPda(rfq),
            bettor,
            marketMaker: mm,
            bettorRep: reputationPda(bettor),
            mmRep: reputationPda(mm),
            cranker: publicKey!,
            systemProgram: sys,
          } as any)
          .rpc()
      }),
    [program, publicKey, run, sys],
  )

  return {
    depositCollateral,
    postRfq,
    submitQuote,
    acceptQuote,
    cancelRfq,
    expireRfq,
    approveMarket,
    signSettlement,
    recordLegResult,
    executeSettlement,
  }
}
