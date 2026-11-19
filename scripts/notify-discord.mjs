import { execFileSync } from 'node:child_process'
import { pathToFileURL } from 'node:url'

export function checkedOutCommit(env = process.env) {
  try {
    return execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim()
  } catch {
    return /^[0-9a-f]{40,64}$/i.test(env.GIT_COMMIT || '') ? env.GIT_COMMIT : 'no disponible'
  }
}

export async function sendNotification({ env = process.env, fetchFn = fetch, commit = checkedOutCommit(env) } = {}) {
  const webhook = env.DISCORD_WEBHOOK
  if (!webhook) throw new Error('No está configurada la credencial discord-webhook.')
  const result = env.CI_RESULT || 'UNKNOWN'
  const icon = result === 'SUCCESS' ? '✅' : result === 'ABORTED' ? '⏹️' : '❌'
  const content = [
    `${icon} CrowdStarter: ${result}`,
    `Trabajo: ${env.JOB_NAME || 'Jenkins'} #${env.BUILD_NUMBER || '?'}`,
    `Commit: ${commit}`,
    env.BUILD_URL || '',
  ].join('\n')
  let response
  try {
    response = await fetchFn(webhook, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content, allowed_mentions: { parse: [] } }),
      signal: AbortSignal.timeout(15000),
    })
  } catch {
    throw new Error('Fallo el envío a Discord: error de conexión o timeout.')
  }
  if (!response.ok) throw new Error(`Fallo el envío a Discord: HTTP ${response.status}`)
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    await sendNotification()
    console.log('Notificación enviada a Discord.')
  } catch (error) {
    console.error(error.message)
    process.exitCode = 1
  }
}
