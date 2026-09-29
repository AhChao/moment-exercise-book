// Serves dist/ with the asset-class cache policy (docs: static-asset-cache-policy):
// hashed files under /assets/ are immutable, everything else revalidates via ETag.
// Usage: npm run build && npm run serve   (PORT=8080 to change the port)
import { createServer } from 'node:http'
import { createHash } from 'node:crypto'
import { readFile, stat } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { extname, join, normalize, resolve } from 'node:path'

const require = createRequire(import.meta.url)
const { staticCacheControl, isInHashedDir } = require('./lib/cache-policy.cjs')

const root = resolve('dist')
const port = Number(process.env.PORT || 8080)
const types = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.webmanifest': 'application/manifest+json',
  '.png': 'image/png', '.svg': 'image/svg+xml', '.woff2': 'font/woff2',
}

createServer(async (req, res) => {
  if (req.method !== 'GET' && req.method !== 'HEAD') { res.writeHead(405).end(); return }
  let pathname = decodeURIComponent(new URL(req.url, 'http://x').pathname)
  if (pathname.endsWith('/')) pathname += 'index.html'
  const file = normalize(join(root, pathname))
  if (!file.startsWith(root)) { res.writeHead(403).end(); return }
  try {
    const [body, info] = await Promise.all([readFile(file), stat(file)])
    const etag = `"${createHash('sha1').update(body).digest('hex')}"`
    const headers = {
      'content-type': types[extname(file)] || 'application/octet-stream',
      'cache-control': isInHashedDir(pathname) ? staticCacheControl(pathname) : 'no-cache',
      etag,
      'last-modified': info.mtime.toUTCString(),
    }
    if (req.headers['if-none-match'] === etag) { res.writeHead(304, headers).end(); return }
    res.writeHead(200, headers)
    res.end(req.method === 'HEAD' ? undefined : body)
  } catch {
    res.writeHead(404, { 'cache-control': 'no-store' }).end('not found')
  }
}).listen(port, '0.0.0.0', () => console.log(`serving dist on http://0.0.0.0:${port}`))
