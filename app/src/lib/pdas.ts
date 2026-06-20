import { PublicKey } from '@solana/web3.js'
import BN from 'bn.js'
import { PROGRAM_ID } from '../config'

const seed = (s: string) => Buffer.from(s)
const u64le = (n: number | BN) => new BN(n).toArrayLike(Buffer, 'le', 8)
const pda = (seeds: (Buffer | Uint8Array)[]) =>
  PublicKey.findProgramAddressSync(seeds, PROGRAM_ID)[0]

export const configPda = () => pda([seed('config')])
export const mmVaultPda = (mm: PublicKey) => pda([seed('mm_vault'), mm.toBuffer()])
export const rfqPda = (rfqId: number | BN) => pda([seed('rfq'), u64le(rfqId)])
export const quotePda = (rfq: PublicKey, mm: PublicKey) =>
  pda([seed('quote'), rfq.toBuffer(), mm.toBuffer()])
export const positionPda = (rfq: PublicKey) => pda([seed('position'), rfq.toBuffer()])
export const settlementPda = (rfq: PublicKey) => pda([seed('settlement'), rfq.toBuffer()])
export const reputationPda = (wallet: PublicKey) =>
  pda([seed('reputation'), wallet.toBuffer()])
