import { Database } from 'bun:sqlite'

const SESSION_SECONDS = 60 * 60 * 24 * 7
const tokenHash = token => new Bun.CryptoHasher('sha256').update(token).digest('hex')
const json = (body, status = 200, headers = {}) => Response.json(body, {
  status, headers: { 'Cache-Control': 'no-store', ...headers },
})

export function createAuth(databasePath, { origin = 'http://localhost:5173', secure = false } = {}) {
  const db = new Database(databasePath, { create: true })
  db.exec(`
    PRAGMA foreign_keys = ON;
    PRAGMA journal_mode = WAL;
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS sessions (
      token_hash TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      expires_at INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS sessions_expiry ON sessions(expires_at);
  `)
  const cookie = (token, age = SESSION_SECONDS) =>
    `session=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${age}${secure ? '; Secure' : ''}`
  const getToken = request => (request.headers.get('cookie') || '')
    .split(';').map(part => part.trim()).find(part => part.startsWith('session='))?.slice(8)
  const publicUser = user => ({ id: user.id, name: user.name, email: user.email })
  const attempts = new Map()
  // Used for unknown accounts too, so password verification follows the same path.
  const dummyHash = Bun.password.hashSync(crypto.randomUUID(), { algorithm: 'argon2id' })

  function getUser(request) {
    const token = getToken(request)
    return token ? db.query(`SELECT users.id, users.name, users.email
      FROM sessions JOIN users ON users.id = sessions.user_id
      WHERE sessions.token_hash = ? AND sessions.expires_at > ?`).get(tokenHash(token), Date.now()) : null
  }
  function session(user, oldToken) {
    const token = Array.from(crypto.getRandomValues(new Uint8Array(32)), byte => byte.toString(16).padStart(2, '0')).join('')
    db.transaction(() => {
      db.query('DELETE FROM sessions WHERE expires_at <= ?').run(Date.now())
      if (oldToken) db.query('DELETE FROM sessions WHERE token_hash = ?').run(tokenHash(oldToken))
      db.query('INSERT INTO sessions (token_hash, user_id, expires_at) VALUES (?, ?, ?)')
        .run(tokenHash(token), user.id, Date.now() + SESSION_SECONDS * 1000)
    })()
    return json({ user: publicUser(user) }, 200, { 'Set-Cookie': cookie(token) })
  }

  async function handle(request, ip = 'local') {
    const path = new URL(request.url).pathname
    if (!path.startsWith('/api/')) return json({ error: 'Ruta no encontrada.' }, 404)
    if (request.method === 'POST' && request.headers.get('origin') !== origin)
      return json({ error: 'Origen no permitido.' }, 403)

    const token = getToken(request)
    if (path === '/api/auth/me' && request.method === 'GET') {
      const user = getUser(request)
      return user ? json({ user }) : json({ error: 'Debes iniciar sesión.' }, 401)
    }
    if (path === '/api/auth/logout' && request.method === 'POST') {
      if (token) db.query('DELETE FROM sessions WHERE token_hash = ?').run(tokenHash(token))
      return json({ message: 'Sesión cerrada.' }, 200, { 'Set-Cookie': cookie('', 0) })
    }
    if (!['/api/auth/register', '/api/auth/login'].includes(path) || request.method !== 'POST')
      return json({ error: 'Ruta no encontrada.' }, 404)

    const now = Date.now()
    for (const [key, value] of attempts) if (value.until <= now) attempts.delete(key)
    const attempt = attempts.get(ip) || { count: 0, until: now + 60_000 }
    attempts.set(ip, attempt)
    if (++attempt.count > 20) return json({ error: 'Demasiados intentos. Espera un minuto.' }, 429, { 'Retry-After': '60' })
    if (!request.headers.get('content-type')?.startsWith('application/json'))
      return json({ error: 'Se requiere contenido JSON.' }, 415)
    let data
    try {
      const body = await request.text()
      if (body.length > 8192) return json({ error: 'Solicitud demasiado grande.' }, 413)
      data = JSON.parse(body)
    } catch { return json({ error: 'Los datos enviados no son válidos.' }, 400) }
    if (!data || typeof data !== 'object' || Array.isArray(data))
      return json({ error: 'Los datos enviados no son válidos.' }, 400)
    const email = typeof data.email === 'string' ? data.email.trim().toLowerCase() : ''
    const password = data.password
    if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      return json({ error: 'Ingresa un correo válido.' }, 400)
    if (typeof password !== 'string' || password.length < 8 || password.length > 128)
      return json({ error: 'La contraseña debe tener entre 8 y 128 caracteres.' }, 400)

    if (path === '/api/auth/register') {
      const name = typeof data.name === 'string' ? data.name.trim() : ''
      if (name.length < 2 || name.length > 80)
        return json({ error: 'El nombre debe tener entre 2 y 80 caracteres.' }, 400)
      const hash = await Bun.password.hash(password, { algorithm: 'argon2id' })
      const result = db.query('INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?) ON CONFLICT(email) DO NOTHING')
        .run(name, email, hash)
      if (!result.changes) return json({ error: 'Ya existe una cuenta con ese correo.' }, 409)
      return json({ message: 'Cuenta creada. Ya puedes iniciar sesión.' }, 201)
    }
    const user = db.query('SELECT * FROM users WHERE email = ?').get(email)
    const valid = await Bun.password.verify(password, user?.password_hash || dummyHash)
    if (!user || !valid) return json({ error: 'Correo o contraseña incorrectos.' }, 401)
    return session(user, token)
  }

  return {
    db,
    getUser,
    async fetch(request, ip) {
      try { return await handle(request, ip) }
      catch (error) {
        console.error('Error de autenticación:', error)
        return json({ error: 'Ocurrió un error en el servidor. Intenta nuevamente.' }, 500)
      }
    },
    close() { db.close() },
  }
}
