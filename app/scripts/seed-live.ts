/**
 * Top up the feed with a few fresh LIVE markets (standard → auto-approved →
 * Open) that expire 2 hours out, so the demo always has open RFQs to quote.
 * Assumes Config is already initialized (see seed.ts for first-time setup).
 *   cd app && RPC=<devnet rpc> npx tsx scripts/seed-live.ts
 * Uses ~/.config/solana/id.json (the deploy/authority wallet) as the bettor.
 */
import * as anchor from '@coral-xyz/anchor'
import { Connection, Keypair, PublicKey, SystemProgram } from '@solana/web3.js'
import { readFileSync } from 'fs'
import os from 'os'

const RPC = process.env.RPC ?? 'https://api.devnet.solana.com'
const PROGRAM_ID = new PublicKey('6xzNc5rA9bMi8DzH1ZMp1CKrnC51XvurYTX5ygaGqm2i')

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const idl: any = JSON.parse(
  readFileSync(new URL('../src/idl/parkthebus.json', import.meta.url), 'utf8'),
)

const loadKp = (p: string) =>
  Keypair.fromSecretKey(Uint8Array.from(JSON.parse(readFileSync(p, 'utf8'))))
const seed = (s: string) => Buffer.from(s)
const u64le = (n: number) => new anchor.BN(n).toArrayLike(Buffer, 'le', 8)
const pda = (seeds: (Buffer | Uint8Array)[]) =>
  PublicKey.findProgramAddressSync(seeds, PROGRAM_ID)[0]

// Fresh live markets — all standard so they're immediately Open + quotable.
const TWO_HOURS = 2 * 60 * 60
const LIVE = [
  { match: 'WC-BRA-POR', desc: 'Brazil WIN', stake: 0.5, odds: 2.1 },
  { match: 'WC-ARG-CRO', desc: 'Argentina WIN', stake: 0.4, odds: 1.85 },
  { match: 'WC-ESP-GER', desc: 'Over 2.5 goals (Spain v Germany)', stake: 0.3, odds: 1.95 },
]

async function main() {
  const authority = loadKp(`${os.homedir()}/.config/solana/id.json`)
  const conn = new Connection(RPC, 'confirmed')
  const wallet = new anchor.Wallet(authority)
  const provider = new anchor.AnchorProvider(conn, wallet, { commitment: 'confirmed' })
  const program = new anchor.Program(idl, provider)
  const configPda = pda([seed('config')])

  const bal = await conn.getBalance(authority.publicKey)
  console.log(`authority ${authority.publicKey.toBase58()} — ${(bal / 1e9).toFixed(3)} SOL`)
  if (!(await conn.getAccountInfo(configPda))) {
    throw new Error('Config not initialized — run seed.ts first.')
  }

  for (const d of LIVE) {
    const cfg = await program.account.config.fetch(configPda)
    const id = (cfg.rfqCounter as anchor.BN).toNumber()
    const rfq = pda([seed('rfq'), u64le(id)])
    const now = Math.floor(Date.now() / 1000)
    const args = {
      matchId: d.match,
      eventDescription: d.desc,
      eventType: { standard: {} },
      stake: new anchor.BN(Math.round(d.stake * 1e9)),
      minOddsBps: new anchor.BN(Math.round(d.odds * 10000)),
      expiresAt: new anchor.BN(now + TWO_HOURS),
      kickoffAt: new anchor.BN(0),
      isParlay: false,
      parlayLegs: [] as { eventDescription: string; result: { pending: {} } }[],
    }
    await program.methods
      .postRfq(args)
      .accounts({
        config: configPda,
        rfq,
        bettor: authority.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .rpc()
    console.log(`→ posted RFQ #${id} — ${d.desc} (expires in 2h)`)
  }
  console.log('✅ live markets seeded')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
