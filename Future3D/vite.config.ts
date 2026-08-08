import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    // Явно IPv4 — на некоторых машинах (VPN-клиенты с TUN-адаптером
    // ломают маршрутизацию IPv6-loopback) резолв "localhost" в ::1
    // приводит к тому, что сервер слушает порт, но не может принять
    // соединение (ERR_CONNECTION_REFUSED), хотя процесс "живой".
    host: '127.0.0.1',
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  assetsInclude: ['**/*.glb', '**/*.gltf', '**/*.hdr', '**/*.exr', '**/*.glsl'],
})
