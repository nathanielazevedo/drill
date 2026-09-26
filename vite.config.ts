import { createReadStream, existsSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig, type Plugin } from 'vite'

// The voice lab (voice-lab.html) plays the voice samples in .voice-samples/ and saves which OpenAI
// voices to record the Mandarin sentences with. Only the dev server has this, so it only works
// locally; the built site has neither the page, the samples nor the endpoint.
function voiceLab(): Plugin {
  const file = path.resolve(import.meta.dirname, 'scripts/sentence-voices.json')
  const samples = path.resolve(import.meta.dirname, '.voice-samples')
  return {
    name: 'voice-lab',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use('/voice-samples', (req, res) => {
        const target = path.join(samples, decodeURIComponent((req.url ?? '/').split('?')[0]))
        if (!target.startsWith(samples + path.sep) || !existsSync(target) || !statSync(target).isFile()) {
          res.statusCode = 404
          res.end()
          return
        }
        res.setHeader('Content-Type', target.endsWith('.json') ? 'application/json' : 'audio/mpeg')
        createReadStream(target).pipe(res)
      })
      server.middlewares.use('/__voice-lab/choice', (req, res) => {
        res.setHeader('Content-Type', 'application/json')
        if (req.method === 'GET') {
          res.end(existsSync(file) ? readFileSync(file) : '{"voices":[]}')
          return
        }
        if (req.method !== 'POST') {
          res.statusCode = 405
          res.end('{}')
          return
        }
        let body = ''
        req.on('data', (chunk) => (body += chunk))
        req.on('end', () => {
          try {
            const { voices } = JSON.parse(body)
            const ok = Array.isArray(voices) && voices.length > 0 && voices.length <= 20 && voices.every((v) => typeof v === 'string' && /^[a-z]+$/.test(v))
            if (!ok) throw new Error('voices must be a list of voice names')
            writeFileSync(file, JSON.stringify({ voices }, null, 2) + '\n')
            res.end(JSON.stringify({ voices }))
          } catch (err) {
            res.statusCode = 400
            res.end(JSON.stringify({ error: String(err) }))
          }
        })
      })
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss(), voiceLab()],
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, './src'),
    },
  },
})
