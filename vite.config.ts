import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
const apiProxy = {
  '/api': {
    target: 'http://umax.test',
    changeOrigin: true,
  },
}

export default defineConfig({
  plugins: [react()],
  server: {
    allowedHosts: ['.ngrok-free.dev'],
    proxy: apiProxy,
  },
  preview: {
    allowedHosts: ['.ngrok-free.dev'],
    proxy: apiProxy,
  },
})
