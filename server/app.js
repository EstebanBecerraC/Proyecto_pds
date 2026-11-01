import { createAuth } from './auth.js'
import { createCampaignApi } from './campaigns.js'
import { createProfileApi } from './profile.js'
import { createFavoritesApi } from './favorites.js'

export function createApp(databasePath, options = {}) {
  const auth = createAuth(databasePath, options)
  const campaigns = createCampaignApi(auth.db, auth.getUser, options)
  const profile = createProfileApi(auth.db, auth.getUser, options)
  const favorites = createFavoritesApi(auth.db, auth.getUser, options)
  return {
    db: auth.db,
    close: auth.close,
    async fetch(request, ip) {
      try {
        const path = new URL(request.url).pathname
        if (path === '/api/favorites' || path.startsWith('/api/favorites/')) return await favorites(request)
        if (path === '/api/campaigns' || path.startsWith('/api/campaigns/')) return await campaigns(request)
        if (path === '/api/profile') return await profile(request)
        return await auth.fetch(request, ip)
      } catch (error) {
        console.error('Error de la API:', error)
        return Response.json({ error: 'Ocurrió un error en el servidor. Intenta nuevamente.' }, { status: 500 })
      }
    },
  }
}
