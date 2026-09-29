// Throwaway static server for the capability probe. Serves ./ with no-store and
// accepts POST /report, writing the JSON body to ./reports/<timestamp>.json.
import { createServer } from 'node:http'
import { readFile, writeFile } from 'node:fs/promises'
import { extname, join, normalize, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = dirname(fileURLToPath(import.meta.url))
const port = Number(process.env.PORT || 8787)
const types = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json',
  '.png': 'image/png',
}

createServer(async (req, res) => {
  const url = new URL(req.url, 'http://x')
  res.setHeader('Cache-Control', 'no-store')

  if (req.method === 'POST' && url.pathname === '/report') {
    const chunks = []
    let size = 0
    for await (const c of req) {
      size += c.length
      if (size > 2_000_000) { res.writeHead(413).end('too large'); return }
      chunks.push(c)
    }
    const name = `${new Date().toISOString().replace(/[:.]/g, '-')}.json`
    await writeFile(join(root, 'reports', name), Buffer.concat(chunks))
    console.log('report saved:', name, size, 'bytes')
    res.writeHead(200, { 'content-type': 'application/json' }).end(JSON.stringify({ ok: true, name }))
    return
  }

  const rel = url.pathname === '/' ? '/index.html' : url.pathname
  const file = normalize(join(root, rel))
  if (!file.startsWith(root) || file.includes('/reports/') || file.endsWith('server.mjs')) {
    res.writeHead(404).end('not found'); return
  }
  try {
    const body = await readFile(file)
    res.writeHead(200, { 'content-type': types[extname(file)] || 'application/octet-stream' }).end(body)
  } catch {
    res.writeHead(404).end('not found')
  }
}).listen(port, '127.0.0.1', () => console.log(`probe on http://127.0.0.1:${port}`))
