import { createAuth } from './auth.js'
import { createCampaignApi } from './campaigns.js'

export function createApp(databasePath, options = {}) {
  const auth = createAuth(databasePath, options)
  const campaigns = createCampaignApi(auth.db, auth.getUser, options)
  return {
    db: auth.db,
    close: auth.close,
    async fetch(request, ip) {
      try {
        const path = new URL(request.url).pathname
        if (path === '/api/campaigns' || path.startsWith('/api/campaigns/')) return await campaigns(request)
        return await auth.fetch(request, ip)
      } catch (error) {
        console.error('Error de la API:', error)
        return Response.json({ error: 'Ocurrió un error en el servidor. Intenta nuevamente.' }, { status: 500 })
      }
    },
  }
}
