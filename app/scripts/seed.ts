/**
 * Initialize the on-chain Config (2-of-2 council) and seed a few demo RFQs so
 * the feed isn't empty for the demo. Run AFTER deploying:
 *   cd app && npx tsx scripts/seed.ts
 * Uses ~/.config/solana/id.json (the deploy/authority wallet) as the bettor.
 */
import * as anchor from '@coral-xyz/anchor'
import { Connection, Keypair, PublicKey, SystemProgram } from '@solana/web3.js'
import { readFileSync } from 'fs'
import os from 'os'

const RPC = process.env.RPC ?? 'https://api.devnet.solana.com'
const PROGRAM_ID = new PublicKey('6xzNc5rA9bMi8DzH1ZMp1CKrnC51XvurYTX5ygaGqm2i')
const COUNCIL = [
  '9HA6iNgWsrUHrqwnCLVbmivggget85RYz2vHvyLgmSiM',
  'sqZcUVNaye4SXu3UabgwRyPY9JHnoewAB9enThyuQyw',
].map((s) => new PublicKey(s))

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

async function main() {
  const authority = loadKp(`${os.homedir()}/.config/solana/id.json`)
  const conn = new Connection(RPC, 'confirmed')
  const wallet = new anchor.Wallet(authority)
  const provider = new anchor.AnchorProvider(conn, wallet, { commitment: 'confirmed' })
  const program = new anchor.Program(idl, provider)
  const configPda = pda([seed('config')])

  const bal = await conn.getBalance(authority.publicKey)
  console.log(`authority ${authority.publicKey.toBase58()} — ${(bal / 1e9).toFixed(3)} SOL`)

  // Make sure both council wallets can pay tx fees to vote (2-of-2 needs both).
  for (const c of COUNCIL) {
    const cb = await conn.getBalance(c)
    if (cb < 0.1e9) {
      console.log(`→ top up council ${c.toBase58().slice(0, 6)}… (${(cb / 1e9).toFixed(3)} SOL)`)
      const tx = new (await import('@solana/web3.js')).Transaction().add(
        SystemProgram.transfer({
          fromPubkey: authority.publicKey,
          toPubkey: c,
          lamports: 0.2e9,
        }),
      )
      await provider.sendAndConfirm(tx)
    }
  }

  if (!(await conn.getAccountInfo(configPda))) {
    console.log('→ initialize Config (2-of-2 council)…')
    await program.methods
      .initialize(COUNCIL, 2)
      .accounts({
        config: configPda,
        authority: authority.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .rpc()
  } else {
    console.log('→ Config already initialized')
  }

  const demos = [
    { match: 'WC-NED-SWE', desc: 'Netherlands WIN', type: { standard: {} }, stake: 0.5, odds: 2.0, parlay: false, legs: [] as string[] },
    { match: 'WC-GER-CIV', desc: 'Over 2.5 goals (Germany v Ivory Coast)', type: { standard: {} }, stake: 0.3, odds: 1.9, parlay: false, legs: [] },
    { match: 'WC-CUSTOM-1', desc: 'A manager to cry on camera', type: { custom: {} }, stake: 0.2, odds: 5.0, parlay: false, legs: [] },
    { match: 'WC-PARLAY-1', desc: '3-leg parlay', type: { standard: {} }, stake: 0.1, odds: 6.0, parlay: true, legs: ['Netherlands WIN', 'Germany WIN', 'Over 2.5 goals'] },
  ]

  for (const d of demos) {
    const cfg = await program.account.config.fetch(configPda)
    const id = (cfg.rfqCounter as anchor.BN).toNumber()
    const rfq = pda([seed('rfq'), u64le(id)])
    const now = Math.floor(Date.now() / 1000)
    const args = {
      matchId: d.match,
      eventDescription: d.desc,
      eventType: d.type,
      stake: new anchor.BN(Math.round(d.stake * 1e9)),
      minOddsBps: new anchor.BN(Math.round(d.odds * 10000)),
      expiresAt: new anchor.BN(now + 3600),
      kickoffAt: new anchor.BN(0),
      isParlay: d.parlay,
      parlayLegs: d.legs.map((l) => ({ eventDescription: l, result: { pending: {} } })),
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
    console.log(`→ posted RFQ #${id} — ${d.desc}`)
  }
  console.log('✅ seed complete — feed is populated')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
