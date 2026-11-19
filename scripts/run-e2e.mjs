import { spawn } from 'node:child_process'
import { openSync, closeSync, writeSync, mkdirSync, mkdtempSync, rmSync, readdirSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { resolve, dirname, basename, join } from 'node:path'
import { createServer } from 'node:net'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('../', import.meta.url))
const reports = resolve(root, 'reports/entrega-3')
const bun = process.platform === 'win32' ? 'bun.exe' : 'bun'
const children = new Set()
const descriptors = []
let interrupted = false
let temporaryDirectory

function launch(command, args, env, logName, echo = false) {
  const fd = openSync(join(reports, logName), 'w')
  descriptors.push(fd)
  const child = spawn(command, args, {
    cwd: root, env, windowsHide: true, detached: process.platform !== 'win32',
    stdio: ['ignore', echo ? 'pipe' : fd, echo ? 'pipe' : fd],
  })
  children.add(child)
  const completion = new Promise(resolve => {
    child.once('error', error => {
      writeSync(fd, error.message + '\n')
      console.error(`${logName}: ${error.message}`)
      resolve(1)
    })
    child.once('close', code => { children.delete(child); resolve(code ?? 1) })
  })
  if (echo) {
    for (const stream of [child.stdout, child.stderr]) {
      stream.on('data', data => { writeSync(fd, data); process.stdout.write(data) })
    }
  }
  return { child, completion }
}

async function stop(child) {
  if (!child.pid || child.exitCode !== null || child.signalCode !== null) return
  if (process.platform === 'win32') {
    await new Promise(resolve => {
      const killer = spawn('taskkill', ['/PID', String(child.pid), '/T', '/F'], { windowsHide: true, stdio: 'ignore' })
      killer.once('error', resolve)
      killer.once('exit', resolve)
    })
  } else {
    try { process.kill(-child.pid, 'SIGTERM') } catch {}
    await Promise.race([new Promise(resolve => child.once('exit', resolve)), new Promise(resolve => setTimeout(resolve, 2000))])
    try { process.kill(-child.pid, 'SIGKILL') } catch {}
  }
}

function portAvailable(port, host) {
  return new Promise((resolve, reject) => {
    const server = createServer()
    server.once('error', () => reject(new Error(`Puerto ocupado o no disponible: ${host}:${port}. Detén el servicio existente o configura BASE_URL y PORT.`)))
    server.listen(port, host, () => server.close(resolve))
  })
}

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => {
    interrupted = true
    process.exitCode = signal === 'SIGINT' ? 130 : 143
    void Promise.all([...children].map(stop))
  })
}

try {
  const url = new URL(process.env.CYPRESS_BASE_URL || process.env.BASE_URL || 'http://localhost:5173')
  if (url.protocol !== 'http:' || !['localhost', '127.0.0.1'].includes(url.hostname) || url.pathname !== '/' || url.search || url.hash || url.username || url.password) {
    throw new Error('El entorno aislado necesita BASE_URL=http://localhost:PUERTO o http://127.0.0.1:PUERTO. Para un entorno remoto usa test:e2e con sus servicios ya disponibles.')
  }
  const apiPort = Number(process.env.PORT || 3000)
  if (!Number.isInteger(apiPort) || apiPort < 1 || apiPort > 65535) throw new Error('PORT debe ser un puerto válido.')
  if (apiPort === Number(url.port || 80)) throw new Error('La API y el frontend necesitan puertos diferentes.')
  await portAvailable(apiPort, '127.0.0.1')
  await portAvailable(Number(url.port || 80), url.hostname)
  mkdirSync(reports, { recursive: true })
  for (const name of readdirSync(reports)) {
    if (/^cypress-[a-f0-9]+\.xml$/.test(name)) rmSync(join(reports, name))
  }
  temporaryDirectory = mkdtempSync(join(tmpdir(), 'crowdstarter-e2e-'))
  const env = {
    ...process.env, BASE_URL: url.origin, CYPRESS_BASE_URL: url.origin,
    PORT: String(apiPort), APP_ORIGIN: url.origin, NODE_ENV: 'test',
    DATABASE_PATH: join(temporaryDirectory, 'e2e.sqlite'),
  }
  const buildCode = await launch(bun, ['run', 'build'], { ...env, NODE_ENV: 'production' }, 'build.log', true).completion
  if (buildCode !== 0 || interrupted) throw new Error('La compilación no terminó correctamente.')
  const api = launch(bun, ['server/index.js'], env, 'api.log')
  const web = launch(bun, ['--bun', 'node_modules/vite/bin/vite.js', 'preview'], env, 'frontend.log')
  let ready = false
  for (let attempt = 0; attempt < 60 && !interrupted; attempt++) {
    if (!children.has(api.child) || !children.has(web.child)) throw new Error('Un servicio terminó antes de estar disponible. Revisa api.log y frontend.log.')
    try {
      const auth = await fetch(url.origin + '/api/auth/me', { signal: AbortSignal.timeout(1000) })
      const page = await fetch(url.origin, { signal: AbortSignal.timeout(1000) })
      if (auth.status === 401 && page.ok) { ready = true; break }
    } catch {}
    await new Promise(resolve => setTimeout(resolve, 1000))
  }
  if (!ready || interrupted) throw new Error('El entorno E2E no estuvo disponible dentro del plazo.')
  const args = [
    'node_modules/cypress/bin/cypress', 'run', '--browser', 'electron', '--headless',
    '--config', 'video=true', '--reporter', 'junit',
    '--reporter-options', 'mochaFile=reports/entrega-3/cypress-[hash].xml,toConsole=true',
    ...process.argv.slice(2),
  ]
  console.log(`E2E: ${url.origin}; base SQLite temporal; reportes en reports/entrega-3.`)
  const code = await launch(process.execPath, args, env, 'cypress.log', true).completion
  if (!interrupted) process.exitCode = code
} catch (error) {
  console.error(error.message)
  if (!interrupted) process.exitCode = 1
} finally {
  await Promise.all([...children].map(stop))
  for (const fd of descriptors) closeSync(fd)
  // Solo se elimina el directorio temporal creado por esta ejecución.
  if (temporaryDirectory && dirname(resolve(temporaryDirectory)) === resolve(tmpdir()) && basename(temporaryDirectory).startsWith('crowdstarter-e2e-')) {
    rmSync(temporaryDirectory, { recursive: true, force: true })
  }
}
