import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    // По просьбе клиента - игру можно установить на рабочий стол
    // (iOS/Android), как обычное PWA-приложение. vite-plugin-pwa уже был
    // в зависимостях (см. изначальный список 72 модулей), просто не был
    // подключён. manifest: false - НЕ генерируем манифест самим плагином,
    // используем уже существующий public/site.webmanifest (уже верно
    // прописан в index.html, со всеми иконками) - плагин отвечает только
    // за недостающую часть: service worker, без которого Chrome/Android
    // не считает сайт "устанавливаемым" (критерий installability).
    // globPatterns намеренно НЕ включает .glb/.wasm/.mp3 - это были бы
    // десятки МБ 3D-моделей/физики в кэше service worker'а при каждой
    // сборке; они и так эффективно кэшируются обычным HTTP-кэшем браузера
    // (см. комментарии в GameMode.tsx про "модели берутся из кэша").
    // Сервис-воркер кэширует только "оболочку" приложения (JS/CSS/иконки) -
    // этого достаточно, чтобы сайт запускался как отдельное приложение.
    VitePWA({
      registerType: 'autoUpdate',
      manifest: false,
      injectRegister: 'auto',
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2}'],
        // Дефолтный лимит воркбокса (2 МиБ) меньше, чем самый крупный JS-
        // чанк сборки (rapier - физика, ~2.2 МБ) - без увеличения лимита
        // сборка падала бы с ошибкой "file too large to precache".
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
      },
    }),
  ],
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
