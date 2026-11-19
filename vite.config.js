import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vite'

const baseUrl = new URL(process.env.CYPRESS_BASE_URL || process.env.BASE_URL || 'http://localhost:5173')
const web = {
  host: baseUrl.hostname,
  port: Number(baseUrl.port || (baseUrl.protocol === 'https:' ? 443 : 80)),
  strictPort: true,
  proxy: { '/api': 'http://127.0.0.1:' + (process.env.PORT || 3000) },
}

export default defineConfig({ plugins: [vue()], server: web, preview: web })
