import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'node:path'
import remoteProxyPlugin from '../vite-plugin-remote-proxy'

// https://vite.dev/config/
export default defineConfig({
  server: {
    port: 3001,
  },
  build: {
    minify: false,
    lib: {
      entry: resolve(__dirname, './src/App.tsx'),
      name: 'remote',
      formats: ['es'], // Only build ES module format
      fileName: 'App',
    },
    rolldownOptions: {
      external: ['react', 'react-dom', 'react/jsx-runtime'],
    },
  },
  plugins: [
    react({ reactRefreshHost: 'http://localhost:3000' }),
    remoteProxyPlugin({
      host: false,
      remoteUrl: 'http://localhost:3000/node_modules/.vite/deps',
      modules: [
        // Case A: React (Needs the 'cjs_interop' shim, which is the default for strings)
        'react',
        'react-dom/client',

        // Case B: A package with ONLY named exports (no default)
        // You MUST specify type: 'named' here
        // { name: '@tanstack/react-router', type: 'named' },
      ],
    }),
  ],
})
