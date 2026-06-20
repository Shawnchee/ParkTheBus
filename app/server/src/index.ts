import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import { rfqAdvisor, mmAssistant, contractSummary } from './gemini'
import { getOdds } from './odds'
import { getFixtures, getResult } from './fixtures'

const app = express()
app.use(cors())
app.use(express.json())

const api = express.Router()

const wrap =
  (fn: (req: express.Request) => Promise<unknown>) =>
  async (req: express.Request, res: express.Response) => {
    try {
      res.json(await fn(req))
    } catch (e) {
      console.error('[api error]', e)
      res.status(500).json({ error: e instanceof Error ? e.message : String(e) })
    }
  }

api.get('/health', (_req, res) =>
  res.json({
    ok: true,
    ai: !!process.env.GEMINI_API_KEY,
    odds: !!process.env.ODDS_API_KEY,
    fixtures: !!process.env.FOOTBALL_API_KEY,
  }),
)

// AI (Gemini, server-side key only)
api.post('/ai/rfq-advisor', wrap((req) => rfqAdvisor(req.body)))
api.post('/ai/mm-assistant', wrap((req) => mmAssistant(req.body)))
api.post('/ai/contract-summary', wrap((req) => contractSummary(req.body)))

// Market data proxies
api.get('/odds', wrap((req) => getOdds(req.query.sport as string | undefined)))
api.get('/fixtures', wrap(() => getFixtures()))
api.get('/results', wrap((req) => getResult(Number(req.query.fixtureId))))

app.use('/api', api)

const PORT = Number(process.env.PORT ?? 8787)
app.listen(PORT, () => {
  console.log(`[server] Park The Bus proxy on http://localhost:${PORT}`)
  console.log(
    `[server] keys — gemini:${!!process.env.GEMINI_API_KEY} odds:${!!process.env.ODDS_API_KEY} football:${!!process.env.FOOTBALL_API_KEY}`,
  )
})
