import { mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { createApp } from './app.js'

const databasePath = process.env.DATABASE_PATH
  ? resolve(process.env.DATABASE_PATH)
  : resolve(import.meta.dir, '../data/app.sqlite')
mkdirSync(dirname(databasePath), { recursive: true })
const auth = createApp(databasePath, {
  origin: process.env.APP_ORIGIN || 'http://localhost:5173',
  secure: process.env.NODE_ENV === 'production',
})
const server = Bun.serve({
  hostname: '127.0.0.1',
  port: Number(process.env.PORT || 3000),
  maxRequestBodySize: 6 * 1024 * 1024,
  fetch: (request, server) => auth.fetch(request, server.requestIP(request)?.address),
})
console.log(`API disponible en ${server.url}`)
for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, async () => {
    await server.stop(true)
    auth.close()
    process.exit(0)
  })
}
