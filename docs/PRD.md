# Park The Bus 🚌
## Full Product Requirements Document v2.0
**P2P Football Prediction Market on Solana**
> "What do YOU want to bet on?"

Last Updated: June 2026
Stage: Hackathon MVP — Solana Devnet
Settlement Token: Native SOL (devnet), USDC architecture ready for mainnet

---

## 1. The Problem

| Platform | Problem |
|---|---|
| **Polymarket** | AMM-based pricing, governance required to list new markets, no parlays, no custom events |
| **Betfair** | 5% commission both ways, odds not negotiable, no custom props |
| **Sportybet / Bet365** | House sets odds, take it or leave it, no P2P |
| **None of the above** | Support "Ronaldo to cry" as a bettable market with human-quoted odds |

**The gap:** No platform lets users propose any event they want, get competing quotes from real humans, and settle peer-to-peer on-chain with manipulation-resistant verification.

---

## 2. The Solution — Park The Bus

A fully peer-to-peer prediction market where:
- **Bettors post RFQs** (Request for Quote) — any event, proposed odds, stake amount
- **Market makers compete** to offer best odds on those RFQs
- **Best quote wins** (auto or manual selection)
- **Solana smart contracts** lock funds and settle automatically for standard markets
- **Trusted council** (multi-sig) settles custom markets, with DAO appeal layer
- **Manipulation prevention** enforced on-chain, not just policy

Zero house edge. Zero AMM. Real humans. Real odds.

---

## 3. Competitive Landscape

| Feature | Park The Bus | Polymarket | Betfair | Sportybet |
|---|---|---|---|---|
| Custom events ("Ronaldo cries") | ✅ | ❌ | ❌ | ❌ |
| User-quoted odds | ✅ | ❌ (AMM) | Partial | ❌ |
| P2P (no house) | ✅ | Partial | ✅ | ❌ |
| Parlays | ✅ | ❌ | ❌ | ✅ |
| On-chain manipulation prevention | ✅ | Partial | ❌ | ❌ |
| Open market creation | ✅ | ❌ (governance) | ❌ | ❌ |
| Solana-native | ✅ | ❌ (Base/Ethereum) | ❌ | ❌ |
| House commission | 0% | ~2% spread | 5% | Built into odds |
| Anyone can be MM | ✅ | ❌ | Partial | ❌ |

**Closest competitor:** Betfair — but no custom events, no parlays, centralized, high fees.
**Real differentiator:** Custom event RFQ + P2P odds negotiation + on-chain manipulation prevention.

---

## 4. User Roles

### Bettor (User A)
Posts RFQs for any event they want to bet on. Proposes their desired odds and stake. Reviews competing MM quotes and accepts the best one (or auto-accepts). Never sets odds — always price taker.

**Mental model:** Customer at an auction. Posts what they want, waits for best bid.

### Market Maker (User B)
Anyone with SOL who wants to earn by underwriting bets. Browses open RFQ feed, submits competing quotes. Locks collateral when matched. Earns the stake if prediction is wrong.

**Mental model:** Insurance underwriter. Selective, odds-aware, portfolio-minded.

### Settlement Council
3-of-5 majority-vote council (native on-chain threshold voting, no Squads). Verifies market results after the match and casts on-chain votes. Scalable to 5-of-9; upgrades to a DAO appeal layer post-MVP.

**Mental model:** Judges panel. Transparent, publicly accountable, on-chain.

---

## 5. MVP Scope

### In Scope (Hackathon Build)
- Solana Anchor smart contract (single program for MVP; 3-program split is the post-MVP target — see §9)
- Native SOL escrow on devnet
- RFQ posting by bettors
- Competing quotes by MMs
- Manual quote acceptance by bettor (best-quote auto-select deferred to post-MVP)
- Standard market auto-settlement (match result, scorer, goals)
- Native on-chain majority-vote council settlement (3-of-5 strict majority; no Squads) — applies to all settlements
- Parlay builder (one MM per parlay, all-or-nothing)
- On-chain manipulation prevention (council exclusion, market deposit, kickoff lockout)
- On-chain MM reputation tracking
- React + Phantom frontend
- AI advisor (Claude claude-sonnet-4-6) — pricing guidance + contract summary
- Admin settlement UI
- RFQ social feed

### Out of Scope (Post-Hackathon)
- Mainnet deployment (needs security audit ~$5-15k)
- DAO governance (needs ~500 active users)
- Squads multi-sig integration (MVP uses native in-program threshold voting)
- Evidence-submission window + contest/appeal flow
- Three-program split with CPIs (MVP is a single program — see §9)
- USDC on mainnet (architecture ready, switch is trivial)
- Mobile app
- Other sports beyond football
- Token ($PTB)
- Fiat on-ramp

---

## 6. Network Configuration

```
Network:     Solana Devnet (NOT testnet — devnet is more stable for demos)
RPC:         https://api.devnet.solana.com
Explorer:    https://explorer.solana.com/?cluster=devnet
Token:       Native SOL (devnet — free via airdrop)
Wallet:      Phantom (devnet mode)
Faucet:      solana airdrop 2 <wallet> --url devnet

Why devnet not testnet:
- More reliable uptime
- Better explorer support for demo
- USDC test tokens available if needed later
- 99% of production tooling targets devnet
```

---

## 7. Core Flow

### Step 1 — Bettor Posts RFQ
```
Bettor connects Phantom (devnet)
→ Selects match from fixture list (or types custom event)
→ Fills RFQ form:
   - Event: "Brazil to WIN" or "Ronaldo to cry"
   - Stake: 0.5 SOL
   - Minimum odds willing to accept: 2.0x
   - RFQ expiry: 30 mins (or before kickoff, whichever first)
→ AI Advisor shows:
   - Current market implied odds for this event
   - Whether their minimum odds are realistic
   - "At 2.0x you imply 50% win prob. Market says 47%. Realistic — expect quotes around 2.0-2.3x"
→ Bettor pays small market creation deposit (0.01 SOL)
   - Returned if RFQ gets matched
   - Burned if RFQ is spam/ungradeable
→ RFQ posted to on-chain pool (PDA created)
→ Visible in public RFQ feed immediately
```

### Step 2 — Custom Market Pre-Approval (Custom Events Only)
```
Standard events (match result, scorer, goals):
→ Auto-approved immediately by whitelist check in contract

Custom events ("Ronaldo to cry"):
→ Flagged for council review
→ Council checks: is this objectively verifiable?
   YES → approved, RFQ goes live
   NO  → rejected, deposit returned, bettor notified why
→ Target: <30 min review window
→ Approval stored on-chain
```

### Step 3 — Market Makers Quote
```
MMs see open RFQ feed:
┌──────────────────────────────────────────────────────┐
│ RFQ #1  Brazil WIN   0.5 SOL   wants ≥2.0x          │
│         Expires: 23 mins  |  Quotes so far: 3        │
│         Best quote: 2.3x (MM: 7xK9...3mP2)          │
│         [Beat This] [View All Quotes]                │
├──────────────────────────────────────────────────────┤
│ RFQ #2  Ronaldo cry  0.2 SOL   wants ≥5.0x          │
│         Custom — Council Approved ✅                  │
│         Best quote: none yet                         │
│         [Be First to Quote]                          │
├──────────────────────────────────────────────────────┤
│ RFQ #3  PARLAY       0.1 SOL   wants ≥6.0x          │
│         Legs: Brazil WIN + Ronaldo scores            │
│               + Over 2.5 goals                      │
│         Best quote: 6.5x                            │
│         [Beat This]                                  │
└──────────────────────────────────────────────────────┘

MM clicks "Quote This":
→ Enters their offered odds (must beat current best to rank #1)
→ AI MM Assistant shows:
   - Implied probability at their offered odds
   - Break-even analysis
   - "At 2.3x you're giving bettor 43.5% implied prob.
      Market says 47%. You have slight edge. Good quote."
→ MM submits quote (no SOL locked yet — quote is free)
→ Quote ranked in real-time by best odds for bettor
```

### Step 4 — Matching
```
Bettor sees ranked quotes:
Rank 1: 2.4x — MM: 8xK2...9mP1  (reputation: 47 markets, ✅ clean)
Rank 2: 2.3x — MM: 7xK9...3mP2  (reputation: 12 markets, ✅ clean)
Rank 3: 2.1x — MM: 3xP1...7nQ4  (reputation: 2 markets, ⚠️ new)

Bettor accepts manually by picking a ranked quote.
(Post-MVP: a permissionless accept_best_quote crank — callable by anyone after
expiry — auto-matches the top quote. Programs can't self-trigger on a timer.)

On match:
→ Bettor's 0.5 SOL locked in PDA escrow
→ MM's collateral locked in PDA escrow
   (collateral = stake × odds - stake = bettor's potential winnings)
   Example: 0.5 SOL stake at 2.4x = 0.5 × 2.4 = 1.2 SOL payout
   MM locks: 1.2 - 0.5 = 0.7 SOL collateral
   NOTE: quotes lock no SOL (they're free), so accept_quote pulls MM collateral
   atomically and FAILS CLEANLY if the MM no longer has the funds — the UI marks
   that quote "unfunded" and the bettor falls through to the next-best quote.
→ Position status: MATCHED
→ Both wallets receive confirmation
→ Contract emits on-chain event (loggable, auditable)
```

### Step 5 — Settlement

#### Standard Markets (Auto-Sourced, Council-Confirmed)
```
Match ends
→ Result fetched from api-football.com (objective — anyone can verify)
→ Council members confirm the result and cast on-chain votes (sign_settlement)
→ At threshold (3 of 5) the contract verifies result matches the RFQ event
→ Correct prediction: bettor receives full payout (1.2 SOL)
→ Wrong prediction: MM receives bettor stake + own collateral back
→ Settlement tx visible on Solana Explorer
```

#### Custom Markets (Council)
```
Match ends
→ Council members independently verify the result
→ Council exclusion check (automatic, on-chain):
   If council wallet has an active position in this market → excluded from vote
→ Each council member casts an on-chain vote (sign_settlement) for the result
→ At threshold (3 of 5 — strict majority) execute_settlement releases escrow.
   No single admin can settle alone; no Squads dependency.
→ (Post-MVP: 2hr evidence-submission window + contest/appeal layer)
→ Contract executes payout
```

### Step 6 — Reputation Update
```
After settlement:
→ reputation_program updates MM account on-chain:
   + markets_settled++
   + total_volume += matched_amount
   + win_loss record updated
   + disputes_involved (if any)
→ Bettor account also updated (betting history)
→ Reputation visible to all future counterparties
```

---

## 8. Parlay Flow

```
Bettor opens Parlay Builder:
→ Adds legs from any open/approvable events:
   Leg 1: Brazil WIN
   Leg 2: Ronaldo scores anytime
   Leg 3: Over 2.5 goals
→ Sets total stake: 0.1 SOL
→ Sets minimum combined odds: 6.0x
→ RFQ posted as single parlay unit

One MM quotes the whole parlay:
→ MM sees all 3 legs + implied probabilities
→ Offers combined odds: 6.5x
→ If matched: MM locks collateral for full payout

Settlement logic:
→ Each leg settles independently as matches play
→ Leg 1 correct → position continues
→ Leg 2 correct → position continues
→ Leg 3 wrong   → entire parlay cancelled → MM wins
→ All 3 correct → bettor wins full 6.5x payout
→ Parlay paused if any leg is under council review
```

---

## 9. Solana Program Architecture

### Three Anchor Programs

```
1. rfq_program
   Handles: RFQ lifecycle, quotes, matching, escrow

2. settlement_program
   Handles: result storage, council voting, fund release
   Cross-program invokes rfq_program to release escrow

3. reputation_program
   Handles: on-chain MM + bettor history
   Updated by settlement_program after each settlement
   Readable by any external program (composable)
```

### Why Three Programs
- Separation of concerns — each upgradeable independently
- Settlement layer is reusable infrastructure (other apps can use it)
- Reputation layer is composable — future apps can read MM reputation
- Shows architectural maturity to hackathon judges

**MVP note:** The MVP ships as a *single* `parkthebus` program with `rfq` / `settlement` / `reputation` modules. The three-program split (with real CPIs) is the first post-core-loop refactor — an architecture target, not a day-one requirement. A working single-program loop demos better than a broken three-program one.

### Key Accounts (PDAs)

```rust
// RFQ Account
pub struct RfqAccount {
    pub rfq_id: u64,
    pub bettor: Pubkey,
    pub match_id: String,           // from api-football
    pub event_description: String,  // "Brazil WIN" or "Ronaldo to cry"
    pub event_type: EventType,      // STANDARD | CUSTOM
    pub stake: u64,                 // lamports
    pub min_odds_bps: u64,          // odds in basis points (2.0x = 20000)
    pub status: RfqStatus,          // PENDING_APPROVAL | OPEN | MATCHED | SETTLED | EXPIRED | CANCELLED
    pub approval_status: ApprovalStatus, // AUTO_APPROVED | COUNCIL_APPROVED | REJECTED
    pub created_at: i64,
    pub expires_at: i64,
    pub is_parlay: bool,
    pub parlay_legs: Vec<ParplayLeg>,
    pub deposit: u64,               // spam prevention deposit
    pub bump: u8,
}

// Quote Account
pub struct QuoteAccount {
    pub quote_id: u64,
    pub rfq_id: u64,
    pub market_maker: Pubkey,
    pub offered_odds_bps: u64,      // must be >= rfq.min_odds_bps
    pub collateral_required: u64,   // calculated: stake * (odds - 1)
    pub status: QuoteStatus,        // PENDING | ACCEPTED | REJECTED | EXPIRED
    pub created_at: i64,
    pub bump: u8,
}

// Position Account (created on match)
pub struct PositionAccount {
    pub position_id: u64,
    pub rfq_id: u64,
    pub quote_id: u64,
    pub bettor: Pubkey,
    pub market_maker: Pubkey,
    pub stake_escrow: Pubkey,       // PDA (system-owned) holding bettor stake in lamports
    pub collateral_escrow: Pubkey,  // PDA (system-owned) holding MM collateral in lamports
    pub matched_odds_bps: u64,
    pub payout_amount: u64,         // stake * odds
    pub status: PositionStatus,     // MATCHED | SETTLED_BETTOR_WIN | SETTLED_MM_WIN | CANCELLED
    pub settlement_result: Option<String>,
    pub bump: u8,
}

// Settlement Account (one per market/match)
pub struct SettlementAccount {
    pub match_id: String,
    pub result: Option<MatchResult>, // HOME_WIN | AWAY_WIN | DRAW
    pub custom_result: Option<bool>, // for custom markets: did it happen?
    pub evidence_uri: String,        // link to result source
    pub council_signatures: Vec<Pubkey>, // who signed
    pub signature_count: u8,
    pub is_contested: bool,
    pub contest_evidence_uri: Option<String>,
    pub settled_at: Option<i64>,
    pub bump: u8,
}

// Reputation Account (one per wallet)
pub struct ReputationAccount {
    pub wallet: Pubkey,
    pub markets_as_mm: u64,
    pub markets_as_bettor: u64,
    pub total_volume_sol: u64,
    pub mm_wins: u64,
    pub mm_losses: u64,
    pub disputes_involved: u64,
    pub is_council_member: bool,
    pub council_markets_excluded: Vec<u64>, // auto-exclusion list
    pub bump: u8,
}
```

### Escrow Model (MVP — Native SOL)

MVP escrow holds **native SOL as lamports in a program-derived PDA** (system-owned, one escrow PDA per position) — there is **no SPL token account** for native SOL. SPL token accounts (an ATA owned by a PDA) are introduced only when switching to USDC on mainnet; that change is isolated to the escrow module and does not touch RFQ, quoting, or settlement logic.

### Instructions

| Program | Instruction | Who Calls | What It Does |
|---|---|---|---|
| rfq | `post_rfq` | Bettor | Creates RFQ PDA, locks deposit |
| rfq | `submit_quote` | MM | Creates Quote PDA, no SOL yet |
| rfq | `accept_quote` | Bettor / Auto | Creates Position, locks stake + collateral |
| rfq | `cancel_rfq` | Bettor | Before match — returns deposit |
| rfq | `expire_rfq` | Anyone | After expiry — cleans up unmatched |
| settlement | `approve_market` | Council | Marks custom RFQ as approved |
| settlement | `submit_result` | Council member | Records result + evidence |
| settlement | `sign_settlement` | Council member | Adds vote (needs 3-of-5 majority) |
| settlement | `contest_result` | Anyone | Submits counter-evidence |
| settlement | `execute_settlement` | Anyone | After 5 sigs — releases funds via CPI |
| reputation | `update_reputation` | settlement CPI | Updates MM + bettor stats |

### Council Exclusion (On-Chain Enforcement)
```rust
// In sign_settlement instruction:
fn sign_settlement(ctx: Context<SignSettlement>, market_id: u64) -> Result<()> {
    let council_member = &ctx.accounts.council_member;
    let reputation = &ctx.accounts.reputation_account;
    
    // Check if council member has active position in this market
    require!(
        !reputation.council_markets_excluded.contains(&market_id),
        ErrorCode::CouncilMemberExcluded
    );
    
    // Proceed with signature...
}
```

### Collateral Calculation
```
Bettor stakes: X SOL at odds Y
Payout if correct: X * Y SOL
MM must lock: X * Y - X = X * (Y - 1) SOL

Example:
Bettor stakes 0.5 SOL at 2.4x
Payout = 0.5 * 2.4 = 1.2 SOL
MM locks = 0.5 * (2.4 - 1) = 0.7 SOL
```

---

## 10. Manipulation Prevention (On-Chain)

### Rule 1 — Market Creation Deposit
```
Every RFQ requires 0.01 SOL deposit
→ Returned if RFQ is matched and settled cleanly
→ Burned if market deemed ungradeable by council
→ Prevents: "Will ball be round?" spam markets
→ Enforced in: post_rfq instruction
```

### Rule 2 — Council Auto-Exclusion
```
When council member submits a quote or position for a market:
→ reputation_program adds that market_id to council_markets_excluded[]
→ sign_settlement checks this list
→ Excluded member cannot sign that market's settlement
→ Enforced in: submit_quote + sign_settlement instructions
→ Prevents: council member betting on market they then settle
```

### Rule 3 — Evidence Window (Post-MVP — deferred)
```
After match ends, 2hr window opens
→ Anyone can call contest_result with counter-evidence URI
→ URI stored on-chain in tx memo (permanent, auditable)
→ Council must acknowledge contest before executing settlement
→ Prevents: council rubber-stamping wrong results quietly
```

### Rule 4 — Minimum Council Signatures
```
3-of-5 (strict majority) required for MVP — threshold = COUNCIL_SIZE / 2 + 1
→ Scalable to 5-of-9 by changing one constant (COUNCIL_SIZE)
→ Cannot be changed without program upgrade
→ Upgrade authority will be transferred to the council (not a single wallet)
→ Prevents: single admin corrupting settlement
```

### Rule 5 — Kickoff Lockout
```
No new quotes accepted after kickoff timestamp
→ Kickoff time stored in MatchAccount on-chain
→ Enforced in submit_quote instruction
→ Prevents: someone quoting after knowing the result
```

---

## 11. Error & Edge-Case Handling

The weakest area of v2.0 — specified here so the build and the demo survive contact with judges.

### Transaction Failures
- Every signing action surfaces a human-readable error, never a raw code (map Anchor error codes → plain English).
- On failure: show what went wrong + a one-click retry. e.g. "Settlement vote failed: you've already voted on this market."
- RPC down / timeout: detect, show "Network busy — retrying…", and fall back to a secondary RPC endpoint.

### Insufficient Funds
- Pre-flight balance check before any tx; disable the action and explain if the wallet can't cover stake + network fee.
- `accept_quote` re-validates the MM still holds collateral (quotes lock no funds). If not, the quote is marked "unfunded" and the bettor falls through to the next-best quote.

### RFQ / Quote Race Conditions
- Double-accept guard: once an RFQ is MATCHED, further accept attempts fail with "already matched."
- Expiry race: an accept landing after `expires_at` is rejected on-chain (no same-slot ambiguity).
- Kickoff lockout (Rule 5) rejects quotes/accepts after the kickoff timestamp.

### Settlement Edge Cases
- Council double-vote prevented on-chain (a member's pubkey can appear once in `council_signatures`).
- Excluded council member (active position in market) cannot vote (Rule 2).
- No majority before the result deadline: position stays MATCHED, funds remain in escrow — never released without 3 votes.
- Match postponed / abandoned: council votes a "void" outcome → both parties refunded (stake and collateral returned).

### Empty & Zero States
- Empty RFQ feed shows "No open RFQs yet — post the first one" with a CTA (see Frontend spec).
- Zero-balance devnet wallet: prompt with the airdrop command / faucet link.

---

## 12. AI Features (Claude claude-sonnet-4-6)

All Claude calls are server-side only. API key never exposed to client.

### Feature 1 — RFQ Pricing Advisor (Bettor)
```
Trigger: Bettor fills RFQ form

Input to Claude:
- Event description
- Their proposed minimum odds
- Live odds from The Odds API (for standard markets)
- Historical similar custom market data (if any)

Output (plain English, shown in UI):
- "At 2.0x minimum you're implying Brazil has 50% win chance.
   Current market odds say 47%. Your minimum is realistic.
   Expect quotes between 2.0x and 2.4x based on current lines."
- Warning if odds are unrealistic: "No MM will quote 5.0x on 
   Brazil WIN — market implies only 2.1x. Try 1.9x minimum."
```

### Feature 2 — MM Quote Assistant
```
Trigger: MM clicks "Quote This" on any RFQ

Input to Claude:
- Event + current market odds
- Bettor's requested minimum odds
- MM's proposed odds
- Current best competing quote

Output:
- Break-even analysis
- EV calculation at their proposed odds
- "At 2.3x you have +3.5% edge vs market. Solid quote."
- "At 1.9x you're giving bettor worse than market odds.
   They will likely reject this."
```

### Feature 3 — Plain English Contract Summary
```
Trigger: Before any Phantom signing transaction

Input: Full position details

Output (3-4 sentences shown in modal):
"You are staking 0.5 SOL that Brazil will WIN against France.
Your market maker (8xK2...9mP1, 47 markets settled) has locked
0.7 SOL as collateral. If Brazil wins, you receive 1.2 SOL total.
If Brazil draws or loses, your 0.5 SOL goes to the market maker.
Settlement happens automatically within 2 hours of full time."
```

---

## 13. API Integrations

### The Odds API
```
URL:    https://api.the-odds-api.com/v4/sports/soccer_fifa_world_cup/odds
Params: regions=eu&markets=h2h&apiKey=YOUR_KEY
Use:    Implied probability, AI pricing advice
Free:   500 req/month (cache aggressively, 5min TTL)
```

### api-football.com
```
Fixtures: GET /fixtures?league=1&season=2026
Results:  GET /fixtures?id={fixture_id}
Use:      Match list, kickoff times, settlement results
Free:     100 req/day
```

### Caching Strategy
```
Odds:     Cache 5 minutes (changes slowly pre-match)
Fixtures: Cache 1 hour (kickoff times don't change)
Results:  Poll every 2 mins after expected end time
Never scrape — always official API endpoints
```

---

## 14. Frontend Specification

### Tech Stack
```
Framework:  React + Vite
Styling:    Tailwind CSS
Wallet:     @solana/wallet-adapter-react (Phantom)
Contract:   @coral-xyz/anchor
AI:         @anthropic-ai/sdk (server-side only)
Server:     Express.js (AI proxy + API proxy)
```

### Design Direction
```
Palette:
  Background:   #080C14  (near black, deep navy)
  Surface:      #0F1623  (card background)
  Border:       #1E2D45  (subtle borders)
  Accent:       #00FF85  (electric green — actions, CTAs)
  Warning:      #F59E0B  (amber — risk warnings)
  Danger:       #EF4444  (red — manipulation alerts)
  Text primary: #F0F4F8
  Text muted:   #64748B

Typography:
  Display:  Space Grotesk Bold (headlines, odds numbers)
  Body:     Inter Regular (descriptions, labels)
  Data:     JetBrains Mono (SOL amounts, wallet addresses, odds)

Signature element:
  Odds numbers pulse gently (CSS animation) to signal live data
  Feels like a Bloomberg terminal, not a casino
```

### Transaction UX (every signing action)
- Show a transaction preview before signing: what moves, expected outcome, network fee.
- Three confirmation states after signing — Pending → Confirmed → Finalized — each with a Solana Explorer link (`?cluster=devnet`).
- Human-readable success/failure toasts; failures include a retry (see §11 Error & Edge-Case Handling).
- Optimistic UI where safe (e.g. a submitted quote appears in the list immediately, reconciled on confirm).

### Pages

#### `/` — RFQ Feed (Home)
```
- Live World Cup fixtures banner (scrolling)
- Open RFQ feed (public, no wallet needed to browse)
- Each RFQ card shows:
  → Event description
  → Stake amount in SOL
  → Requested minimum odds
  → Number of quotes received
  → Best current quote
  → Time remaining
  → [Quote This] button (MM) | [View Quotes] button (bettor)
- Filter: All | Standard | Custom | Parlays
- Sort: Newest | Highest Stake | Most Quoted | Expiring Soon
- Empty state: "No open RFQs yet — post the first one" with a CTA to /rfq/new
```

#### `/rfq/new` — Post RFQ (Bettor)
```
- Match selector (from api-football fixtures)
- Event type toggle: Standard | Custom | Parlay
- Standard: dropdown of approvable event types
- Custom: free text input + council review notice
- Parlay builder: add up to 4 legs
- Stake input (SOL)
- Minimum odds input
- Expiry (default: 30 mins or kickoff, whichever first)
- AI Advisor panel (live, updates as user types)
- 0.01 SOL deposit notice
- [Post RFQ] → Phantom signing → confirmation
```

#### `/rfq/:id` — RFQ Detail + Quotes
```
- Full RFQ details
- Approval status badge (Auto-approved | Council Approved | Pending)
- Ranked quote list:
  Rank | MM Wallet (truncated) | Reputation | Offered Odds | [Accept]
- Auto-select countdown timer
- [Submit Competing Quote] (for MMs)
- AI plain-English summary of top quote
```

#### `/portfolio` — My Positions
```
- Active positions (matched, awaiting settlement)
- Pending RFQs (posted, awaiting quotes)
- Settled positions (history + P&L)
- SOL in escrow (locked)
- MM: Active quotes submitted
- Total earned/lost in SOL
```

#### `/settle` — Admin Settlement UI
```
- Protected: only council wallet addresses can access
- Matches pending settlement (from api-football)
- Auto-fetched result shown with source link
- [Sign Settlement] button per council member
- Signature counter: X/9 (needs 5)
- Contest submissions visible with evidence links
- Custom markets: manual result entry + evidence URI
```

#### `/reputation/:wallet` — MM Profile
```
- Public page, no wallet needed
- Markets underwritten (count + volume)
- Win/loss record as MM
- Total SOL paid out (proves honesty)
- Active disputes involved
- Council member badge (if applicable)
- Recent settled markets
```

---

## 15. Project Structure

```
parkthebus/
├── programs/
│   ├── rfq_program/
│   │   └── src/
│   │       ├── lib.rs
│   │       ├── instructions/
│   │       │   ├── post_rfq.rs
│   │       │   ├── submit_quote.rs
│   │       │   ├── accept_quote.rs
│   │       │   ├── cancel_rfq.rs
│   │       │   └── expire_rfq.rs
│   │       ├── state/
│   │       │   ├── rfq_account.rs
│   │       │   ├── quote_account.rs
│   │       │   └── position_account.rs
│   │       └── errors.rs
│   ├── settlement_program/
│   │   └── src/
│   │       ├── lib.rs
│   │       ├── instructions/
│   │       │   ├── approve_market.rs
│   │       │   ├── submit_result.rs
│   │       │   ├── sign_settlement.rs
│   │       │   ├── contest_result.rs
│   │       │   └── execute_settlement.rs
│   │       └── state/
│   │           └── settlement_account.rs
│   └── reputation_program/
│       └── src/
│           ├── lib.rs
│           ├── instructions/
│           │   └── update_reputation.rs
│           └── state/
│               └── reputation_account.rs
├── app/
│   ├── src/
│   │   ├── pages/
│   │   │   ├── Home.tsx           # RFQ feed
│   │   │   ├── NewRFQ.tsx         # Post RFQ
│   │   │   ├── RFQDetail.tsx      # View quotes
│   │   │   ├── Portfolio.tsx      # My positions
│   │   │   ├── AdminSettle.tsx    # Council UI
│   │   │   └── Reputation.tsx     # MM profile
│   │   ├── components/
│   │   │   ├── RFQCard.tsx
│   │   │   ├── QuoteList.tsx
│   │   │   ├── ParlayBuilder.tsx
│   │   │   ├── AIAdvisor.tsx
│   │   │   ├── ContractSummaryModal.tsx
│   │   │   ├── MMAAssistant.tsx
│   │   │   ├── ReputationBadge.tsx
│   │   │   └── OddsDisplay.tsx
│   │   ├── hooks/
│   │   │   ├── useOdds.ts
│   │   │   ├── useFixtures.ts
│   │   │   ├── useRFQProgram.ts
│   │   │   ├── useSettlement.ts
│   │   │   └── useReputation.ts
│   │   └── utils/
│   │       ├── odds.ts            # implied prob calculations
│   │       └── solana.ts          # anchor helpers
│   └── server/
│       ├── ai.ts                  # Claude API (key server-side only)
│       ├── odds.ts                # The Odds API proxy
│       └── fixtures.ts            # api-football proxy
├── tests/
│   ├── rfq_program.ts
│   ├── settlement_program.ts
│   └── reputation_program.ts
├── Anchor.toml
└── .env
```

---

## 16. Environment Variables

```env
# Solana
SOLANA_NETWORK=devnet
RFQ_PROGRAM_ID=<deployed program id>
SETTLEMENT_PROGRAM_ID=<deployed program id>
REPUTATION_PROGRAM_ID=<deployed program id>

# Council wallets — MVP uses COUNCIL_1..5 (3-of-5 majority); COUNCIL_6..9 for scale-up
COUNCIL_1=<pubkey>
COUNCIL_2=<pubkey>
COUNCIL_3=<pubkey>
COUNCIL_4=<pubkey>
COUNCIL_5=<pubkey>
COUNCIL_6=<pubkey>
COUNCIL_7=<pubkey>
COUNCIL_8=<pubkey>
COUNCIL_9=<pubkey>

# APIs (server-side only)
ODDS_API_KEY=<the-odds-api key>
FOOTBALL_API_KEY=<api-football key>
ANTHROPIC_API_KEY=<your key>

# Frontend (public)
VITE_SOLANA_RPC=https://api.devnet.solana.com
VITE_RFQ_PROGRAM_ID=<deployed program id>
VITE_SETTLEMENT_PROGRAM_ID=<deployed program id>
VITE_REPUTATION_PROGRAM_ID=<deployed program id>
```

---

## 17. Development Setup

```bash
# 1. Install Solana + Anchor
curl -fsSL https://www.solana.new/setup.sh | bash

# 2. Verify
solana --version    # >= 1.18
anchor --version    # >= 0.30
node --version      # >= 18

# 3. Set to devnet
solana config set --url devnet

# 4. Create council wallets (5 for MVP council = 3-of-5; up to 9 for scale-up)
solana-keygen new --outfile council-1.json
solana-keygen new --outfile council-2.json
solana-keygen new --outfile council-3.json
solana-keygen new --outfile council-4.json
solana-keygen new --outfile council-5.json

# 5. Fund devnet wallets
solana airdrop 2 $(solana-keygen pubkey council-1.json) --url devnet
solana airdrop 2 $(solana-keygen pubkey council-2.json) --url devnet
solana airdrop 2 $(solana-keygen pubkey council-3.json) --url devnet
solana airdrop 2 $(solana-keygen pubkey council-4.json) --url devnet
solana airdrop 2 $(solana-keygen pubkey council-5.json) --url devnet

# 6. Create test bettor + MM wallets
solana-keygen new --outfile bettor.json
solana-keygen new --outfile market-maker.json
solana airdrop 2 $(solana-keygen pubkey bettor.json) --url devnet
solana airdrop 2 $(solana-keygen pubkey market-maker.json) --url devnet

# 7. Build and deploy the program (single program for MVP; 3-program split post-MVP)
anchor build
anchor deploy --provider.cluster devnet

# 8. Frontend
cd app && npm install && npm run dev

# 9. Server (AI + API proxy)
cd app/server && npm install && npm run dev
```

---

## 18. Demo Flow (Hackathon — Under 3 Minutes)

```
PRE-DEMO SETUP: seed several demo RFQs (varied events/stakes, some already
quoted) and fund all demo wallets — the feed must not open empty.

0:00  Open app — show live RFQ feed with World Cup matches
0:20  Connect Phantom (devnet) as bettor
0:35  Post RFQ: "Brazil WIN, 0.5 SOL, want 2.0x minimum"
      → AI Advisor shows pricing guidance
0:55  Switch to MM wallet
1:05  MM sees RFQ in feed, submits quote: 2.3x
      → AI MM Assistant shows EV analysis
1:20  Switch back to bettor wallet
1:25  Bettor accepts quote
      → Plain English modal: "You are staking 0.5 SOL..."
      → Phantom signing prompt
1:40  Show Solana Explorer: funds locked in PDA escrow
1:55  Council casts votes — the 3rd of 5 vote crosses the majority, settlement executes
2:10  Show Explorer: funds released to bettor (bettor wins)
2:20  Show MM reputation updated on-chain
2:30  Show parlay builder briefly
2:45  Done — hand to judges for exploration
```

---

## 19. Hackathon Judging Rubric Alignment

| Criterion | How We Address It |
|---|---|
| **Problem Clarity** | No platform does custom P2P events with human-quoted odds. Polymarket needs governance. Betfair takes 5%. We don't. One sentence pitch. |
| **Solana Integration** | Anchor program (PDAs, native-SOL lamport escrow), native 3-of-5 threshold-vote council, on-chain reputation. Deep, not surface — the 3-program CPI split is the documented next step. |
| **Working Demo** | Full loop: post RFQ → MM quotes → match → settle → funds move. All on devnet, all verifiable on Explorer. |
| **Creativity** | Custom events ("Ronaldo cries"), P2P parlays, on-chain council exclusion, AI-powered odds advisor. Nobody else has this combination. |
| **Potential Beyond** | Settlement council becomes infrastructure. Other apps read our reputation layer. DAO migration path. Any sport, any event. |

---

## 20. The Pitch (One Slide)

```
┌──────────────────────────────────────────────────────┐
│                                                      │
│   Polymarket:  "Is this market approved?"            │
│   Betfair:     "5% commission please"                │
│   Sportybet:   "Our odds, take it or leave"          │
│                                                      │
│   Park The Bus:                                      │
│   "What do YOU want to bet on?"                      │
│                                                      │
│   P2P · Human odds · Any event · On Solana           │
│                                                      │
└──────────────────────────────────────────────────────┘
```

---

## 21. Post-Hackathon Roadmap

```
Phase 1 (now):     FIFA World Cup 2026, Solana devnet, SOL
Phase 2:           Mainnet + security audit, USDC, any football
Phase 3:           Any sport (NBA, cricket, F1)
Phase 4:           Any event (elections, Oscars, crypto prices)
Phase 5:           Settlement council → public infrastructure
                   Other apps plug into Park The Bus oracle
Phase 6:           DAO governance, $PTB token, community-owned

The real product is the settlement layer.
Betting is just the first use case.
```

---

## 22. Why Solana? (for slides)

**Headline claim:** *A fully on-chain P2P prediction market that's economically impossible on EVM L1.*
Cheap-and-fast is the **mechanism**, not the pitch — never lead with "low fees."

### The core argument
Our mechanic is **competitive P2P quoting** — market makers post *many* quotes, and most never match. That only works where posting a quote costs ~$0. At a dollar-plus per transaction on EVM, posting a losing quote is irrational — which is exactly why **Polymarket runs its order matching off-chain**. On Solana every quote is a fraction of a cent and confirms sub-second, so the **entire** market stays on-chain and verifiable on Explorer.

### Headline answer (~15s, spoken)
> "Because our core mechanic only works where transactions are nearly free. Park The Bus is competitive P2P quoting — market makers post many quotes, and most never match. At a dollar-plus per transaction on EVM, posting losing quotes is irrational — which is exactly why Polymarket runs its order matching off-chain. On Solana every quote is a fraction of a cent and confirms sub-second, so the entire market stays on-chain and verifiable. We do fully on-chain what's economically impossible on EVM L1."

### 7-second version (written / time-pressed)
> "Competitive P2P quoting only works when posting a quote costs ~$0. Solana keeps the whole market on-chain and verifiable; on EVM you'd have to move matching off-chain like Polymarket does."

### The number that makes it land
A single market is **~15–20 transactions** — 1 RFQ + ~10 competing quotes (most never win) + 1 accept + 3 council votes + 1 settlement:

| Chain | ~Cost per market | MM posts a losing quote? |
|---|---|---|
| **Solana** | **~$0.01** | Costs nothing — quote freely |
| EVM L1 (~$2/tx) | ~$32 | Irrational — kills the model |
| Polygon (~$0.02/tx) | ~$0.32 (30× Solana) | Still pay-per-quote — model strains |

> "Most of those transactions are quotes that never win. That's only a sane design when quoting is effectively free."

### Rebuttal cheat-sheet (judges will probe)
- **"Polygon's cheap too."** → ~30–1000× more than Solana, and Polymarket *still* chose off-chain matching despite Polygon's fees — proof even cheap L2s aren't cheap enough for fully on-chain competitive quoting.
- **"Why not an app-chain / L2?"** → Fragmentation. Our endgame is the settlement + reputation layer as **public infrastructure other apps read** (§21) — that needs Solana's single shared state, not an isolated rollup.
- **"Just batch quotes off-chain like Polymarket."** → We could — but then we lose the on-chain manipulation-prevention and verifiability that *are* our differentiator. On Solana we don't have to make that tradeoff.

### Depth follow-up (if judges reward technical depth)
Markets are independent → **Sealevel settles them in parallel** with no global-state contention, and the reputation/settlement layer is **natively composable** for other programs to read via CPI — practical on Solana's single state, painful across fragmented EVM L2s.

---

*End of PRD — Park The Bus v2.0*
*Build on Solana devnet. Win the hackathon. Change how people bet.*
