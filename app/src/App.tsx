import { Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import Home from './pages/Home'
import NewRFQ from './pages/NewRFQ'
import RFQDetail from './pages/RFQDetail'
import Portfolio from './pages/Portfolio'
import AdminSettle from './pages/AdminSettle'
import Reputation from './pages/Reputation'
import MarketMaker from './pages/MarketMaker'

export default function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/rfq/new" element={<NewRFQ />} />
        <Route path="/rfq/:id" element={<RFQDetail />} />
        <Route path="/portfolio" element={<Portfolio />} />
        <Route path="/settle" element={<AdminSettle />} />
        <Route path="/reputation/:wallet" element={<Reputation />} />
        <Route path="/market-maker" element={<MarketMaker />} />
      </Routes>
    </Layout>
  )
}
