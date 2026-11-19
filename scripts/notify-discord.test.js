import { expect, test } from 'bun:test'
import { checkedOutCommit, sendNotification } from './notify-discord.mjs'

const commit = 'a'.repeat(40)
const env = { DISCORD_WEBHOOK: 'https://example.test/private-token', JOB_NAME: 'crowdstarter-ci', BUILD_NUMBER: '11', BUILD_URL: 'https://jenkins.example.test/11/' }

test('Discord: informa éxito y fallo con trabajo, commit y enlace sin habilitar menciones', async () => {
  for (const result of ['SUCCESS', 'FAILURE']) {
    let payload
    await sendNotification({ env: { ...env, CI_RESULT: result }, commit, fetchFn: async (url, options) => {
      expect(url).toBe(env.DISCORD_WEBHOOK)
      expect(options.method).toBe('POST')
      payload = JSON.parse(options.body)
      return new Response(null, { status: 204 })
    } })
    expect(payload.content).toContain(result)
    expect(payload.content).toContain('crowdstarter-ci #11')
    expect(payload.content).toContain(commit)
    expect(payload.content).toContain(env.BUILD_URL)
    expect(payload.allowed_mentions.parse).toEqual([])
  }
})

test('Discord: utiliza el commit del checkout aunque GIT_COMMIT tenga otro valor', () => {
  const sha = checkedOutCommit({ GIT_COMMIT: 'valor-obsoleto' })
  expect(sha).toMatch(/^[0-9a-f]{40,64}$/i)
})

test('Discord: credencial ausente y respuesta HTTP fallida hacen fallar el envío', async () => {
  await expect(sendNotification({ env: {}, commit })).rejects.toThrow('credencial discord-webhook')
  await expect(sendNotification({ env, commit, fetchFn: async () => new Response(null, { status: 500 }) })).rejects.toThrow('HTTP 500')
})

test('Discord: un fallo de red no expone el webhook privado', async () => {
  let failure
  try { await sendNotification({ env, commit, fetchFn: async () => { throw new Error(env.DISCORD_WEBHOOK) } }) }
  catch (error) { failure = error }
  expect(failure.message).toContain('conexión o timeout')
  expect(failure.message).not.toContain('private-token')
})
