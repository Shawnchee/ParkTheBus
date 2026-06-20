import { GoogleGenAI } from '@google/genai'

// Per user choice (no Anthropic key): Gemini 2.5 Flash free tier.
const MODEL = 'gemini-2.5-flash'

let client: GoogleGenAI | null = null
function getClient(): GoogleGenAI | null {
  if (!process.env.GEMINI_API_KEY) return null
  if (!client) client = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY })
  return client
}

const ONE = 10_000
const oddsX = (bps: number) => (bps / ONE).toFixed(2)
const impliedPct = (bps: number) => ((ONE / bps) * 100).toFixed(1)

/** Returns Gemini's text, or null when no key is configured. */
async function ask(system: string, user: string, maxTokens = 600): Promise<string | null> {
  const c = getClient()
  if (!c) return null
  const res = await c.models.generateContent({
    model: MODEL,
    contents: user,
    config: {
      systemInstruction: system,
      maxOutputTokens: maxTokens,
      temperature: 0.6,
      // Disable thinking so the (small) output budget isn't consumed by it —
      // these are short advisory responses on the free tier.
      thinkingConfig: { thinkingBudget: 0 },
    },
  })
  const text = (res.text ?? '').trim()
  return text || null
}

export interface Advice {
  text: string
  ai: boolean
}

// ---- Feature 1: RFQ pricing advisor (bettor) ------------------------------
export async function rfqAdvisor(input: {
  eventDescription: string
  minOddsBps: number
  marketOddsBps?: number
}): Promise<Advice> {
  const { eventDescription, minOddsBps, marketOddsBps } = input
  const sys =
    'You are a sharp, honest pricing advisor for a peer-to-peer sports prediction market. ' +
    'Answer in 2-3 plain sentences. Be specific with numbers. Never hype; if the odds are ' +
    'unrealistic, say so directly.'
  const market = marketOddsBps
    ? `The current market implies ${oddsX(marketOddsBps)}x (${impliedPct(marketOddsBps)}% probability).`
    : 'No live market line is available for this event.'
  const user =
    `A bettor wants to bet on "${eventDescription}" and will accept odds of at least ` +
    `${oddsX(minOddsBps)}x, which implies they think it has a ${impliedPct(minOddsBps)}% chance. ` +
    `${market} Is their minimum realistic, and roughly what quote range should they expect from market makers?`

  const text = await ask(sys, user)
  if (text) return { text, ai: true }

  const cmp = marketOddsBps
    ? ` The market implies ${oddsX(marketOddsBps)}x (${impliedPct(marketOddsBps)}%), so expect quotes near there.`
    : ''
  return {
    text: `At ${oddsX(minOddsBps)}x minimum you're implying a ${impliedPct(minOddsBps)}% chance for "${eventDescription}".${cmp} Set your minimum at or slightly below the implied market line to attract quotes.`,
    ai: false,
  }
}

// ---- Feature 2: MM quote assistant ----------------------------------------
export async function mmAssistant(input: {
  eventDescription: string
  minOddsBps: number
  offeredOddsBps: number
  bestCompetingBps?: number
  marketOddsBps?: number
}): Promise<Advice> {
  const { eventDescription, minOddsBps, offeredOddsBps, bestCompetingBps, marketOddsBps } = input
  const sys =
    'You are an EV-focused trading assistant for a market maker on a P2P prediction market. ' +
    'In 2-3 sentences give a break-even / edge read on their quote. Be blunt about a bad quote.'
  const parts = [
    `Event: "${eventDescription}".`,
    `The bettor wants at least ${oddsX(minOddsBps)}x.`,
    `The MM is considering offering ${oddsX(offeredOddsBps)}x (gives the bettor ${impliedPct(offeredOddsBps)}% implied probability).`,
  ]
  if (marketOddsBps)
    parts.push(`The market implies ${oddsX(marketOddsBps)}x / ${impliedPct(marketOddsBps)}%.`)
  if (bestCompetingBps) parts.push(`The best competing quote is ${oddsX(bestCompetingBps)}x.`)
  parts.push('What is their edge, and will the bettor likely accept?')

  const text = await ask(sys, parts.join(' '))
  if (text) return { text, ai: true }

  let edge = ''
  if (marketOddsBps) {
    const diff = ONE / offeredOddsBps - ONE / marketOddsBps
    const pct = (diff * 100).toFixed(1)
    edge =
      diff < 0
        ? ` You're giving ~${Math.abs(+pct)}% better-than-market odds — thin edge.`
        : ` You're pricing ~${pct}% under market — solid edge.`
  }
  return {
    text: `At ${oddsX(offeredOddsBps)}x you give the bettor ${impliedPct(offeredOddsBps)}% implied probability.${edge}`,
    ai: false,
  }
}

// ---- Feature 3: plain-English contract summary ----------------------------
export async function contractSummary(input: {
  eventDescription: string
  stakeLamports: number
  oddsBps: number
  marketMaker: string
  mmMarkets?: number
}): Promise<Advice> {
  const { eventDescription, stakeLamports, oddsBps, marketMaker, mmMarkets } = input
  const stake = stakeLamports / 1e9
  const payout = (stakeLamports * oddsBps) / ONE / 1e9
  const collateral = payout - stake
  const sys =
    'You explain an on-chain bet to a non-technical user right before they sign. ' +
    'Write 3-4 clear sentences. State what they stake, what they win, what they lose, and that ' +
    'settlement is by an on-chain council. No jargon, no markdown.'
  const user =
    `Bettor stakes ${stake.toFixed(3)} SOL that "${eventDescription}" at ${oddsX(oddsBps)}x odds. ` +
    `Market maker ${marketMaker}${mmMarkets != null ? ` (${mmMarkets} markets settled)` : ''} locks ` +
    `${collateral.toFixed(3)} SOL collateral. If correct the bettor receives ${payout.toFixed(3)} SOL; ` +
    `if wrong the ${stake.toFixed(3)} SOL stake goes to the market maker. Summarize for the signer.`

  const text = await ask(sys, user, 400)
  if (text) return { text, ai: true }

  return {
    text:
      `You are staking ${stake.toFixed(3)} SOL on "${eventDescription}". ` +
      `Your market maker (${marketMaker}${mmMarkets != null ? `, ${mmMarkets} markets settled` : ''}) ` +
      `locks ${collateral.toFixed(3)} SOL of collateral. If you're right you receive ${payout.toFixed(3)} SOL; ` +
      `if you're wrong your ${stake.toFixed(3)} SOL goes to the market maker. A 2-of-2 on-chain council settles the result.`,
    ai: false,
  }
}
