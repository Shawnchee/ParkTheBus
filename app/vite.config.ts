import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Polyfill globals that @solana/web3.js + anchor expect in the browser.
export default defineConfig({
  plugins: [react()],
  define: {
    global: 'globalThis',
    'process.env': {},
  },
  optimizeDeps: {
    include: ['buffer', 'bn.js', '@coral-xyz/anchor', '@solana/web3.js'],
    esbuildOptions: { define: { global: 'globalThis' } },
  },
  server: {
    proxy: {
      // forward API calls to the Express server in dev (keeps keys server-side)
      '/api': { target: 'http://localhost:8787', changeOrigin: true },
    },
  },
})
