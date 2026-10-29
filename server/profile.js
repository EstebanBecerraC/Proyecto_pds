import { REGISTERED_EMAIL } from '../shared/auth.js'
import { validateProfile } from '../shared/profile.js'

const json = (body, status = 200, headers = {}) => Response.json(body, {
  status,
  headers: { 'Cache-Control': 'no-store', ...headers },
})
const publicProfile = row => ({
  id: row.id,
  name: row.name,
  email: row.email,
  created_at: row.created_at,
})

async function readJson(request) {
  if (!request.headers.get('content-type')?.startsWith('application/json'))
    return { response: json({ error: 'Se requiere contenido JSON.' }, 415) }
  try {
    const body = await request.text()
    if (body.length > 8192) return { response: json({ error: 'Solicitud demasiado grande.' }, 413) }
    const data = JSON.parse(body)
    if (!data || typeof data !== 'object' || Array.isArray(data))
      return { response: json({ error: 'Los datos enviados no son válidos.' }, 400) }
    return { data }
  } catch {
    return { response: json({ error: 'Los datos enviados no son válidos.' }, 400) }
  }
}

export function createProfileApi(db, getUser, { origin = 'http://localhost:5173', secure = false } = {}) {
  const profile = userId => db.query(`SELECT id, name, email, password_hash, created_at
    FROM users WHERE id = ? AND deleted_at IS NULL`).get(userId)

  return async function handle(request) {
    if (['PUT', 'DELETE'].includes(request.method) && request.headers.get('origin') !== origin)
      return json({ error: 'Origen no permitido.' }, 403)
    const user = getUser(request)
    if (!user) return json({ error: 'Debes iniciar sesión.' }, 401)

    if (request.method === 'GET') return json({ profile: publicProfile(profile(user.id)) })

    if (request.method === 'PUT') {
      const parsed = await readJson(request)
      if (parsed.response) return parsed.response
      const data = parsed.data
      const errors = validateProfile(data)
      if (Object.keys(errors).length) return json({ error: 'Revisa los campos indicados.', errors }, 422)

      const current = profile(user.id)
      const changingPassword = Boolean(data.currentPassword || data.newPassword || data.confirmation)
      if (changingPassword && !await Bun.password.verify(data.currentPassword, current.password_hash))
        return json({ error: 'Revisa los campos indicados.', errors: { currentPassword: 'La contraseña actual es incorrecta.' } }, 422)

      const name = data.name.trim()
      const email = data.email.trim().toLowerCase()
      const passwordHash = changingPassword
        ? await Bun.password.hash(data.newPassword, { algorithm: 'argon2id' })
        : current.password_hash
      try {
        db.query(`UPDATE users SET name = ?, email = ?, password_hash = ?
          WHERE id = ? AND deleted_at IS NULL`).run(name, email, passwordHash, user.id)
      } catch (error) {
        if (String(error).includes('UNIQUE constraint failed: users.email'))
          return json({ error: REGISTERED_EMAIL, errors: { email: REGISTERED_EMAIL } }, 409)
        throw error
      }
      return json({ profile: publicProfile(profile(user.id)) })
    }

    if (request.method === 'DELETE') {
      const removed = db.transaction(() => {
        const active = db.query("SELECT 1 FROM campaigns WHERE owner_id = ? AND status = 'Activa' LIMIT 1").get(user.id)
        if (active) return false
        const anonymousEmail = `deleted+${user.id}+${crypto.randomUUID()}@invalid.local`
        db.query(`UPDATE users SET name = 'Usuario eliminado', email = ?, password_hash = ?, deleted_at = CURRENT_TIMESTAMP
          WHERE id = ? AND deleted_at IS NULL`).run(anonymousEmail, crypto.randomUUID(), user.id)
        db.query('DELETE FROM sessions WHERE user_id = ?').run(user.id)
        return true
      })()
      if (!removed) return json({ error: 'Cancela tus campañas activas antes de eliminar la cuenta.' }, 409)
      const cookie = `session=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secure ? '; Secure' : ''}`
      return new Response(null, { status: 204, headers: { 'Cache-Control': 'no-store', 'Set-Cookie': cookie } })
    }

    return json({ error: 'Ruta no encontrada.' }, 404)
  }
}
