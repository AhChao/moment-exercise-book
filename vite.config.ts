import { defineConfig } from 'vitest/config'
import type { Plugin } from 'vite'
import vue from '@vitejs/plugin-vue'
import { createHash } from 'node:crypto'
import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { join, relative, resolve } from 'node:path'

// Stamps dist/sw.js with the build's file list and a content version, so the
// service worker's cache name changes exactly when the shipped bytes change.
function serviceWorkerStamp(): Plugin {
  return {
    name: 'sw-stamp',
    apply: 'build',
    closeBundle() {
      const dist = resolve('dist')
      const files: string[] = []
      const walk = (dir: string) => {
        for (const name of readdirSync(dir)) {
          const full = join(dir, name)
          if (statSync(full).isDirectory()) walk(full)
          else files.push(relative(dist, full).replace(/\\/g, '/'))
        }
      }
      walk(dist)
      const precache = files.filter((f) => f !== 'sw.js').sort()
      const hash = createHash('sha1')
      for (const f of precache) hash.update(f).update(readFileSync(join(dist, f)))
      const swPath = join(dist, 'sw.js')
      const stamped = readFileSync(swPath, 'utf8')
        .replace('__SW_VERSION__', hash.digest('hex').slice(0, 12))
        .replace('__SW_PRECACHE__', JSON.stringify(precache))
      writeFileSync(swPath, stamped)
    },
  }
}

export default defineConfig({
  base: './',
  plugins: [vue(), serviceWorkerStamp()],
  resolve: { alias: { '@': resolve('src') } },
  build: { target: 'es2022', sourcemap: false },
  test: { environment: 'node', include: ['src/**/*.test.ts'] },
})
