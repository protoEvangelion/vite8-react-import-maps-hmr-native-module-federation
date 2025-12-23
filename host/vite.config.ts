import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import remoteProxyPlugin from '../vite-plugin-remote-proxy'

// https://vite.dev/config/
export default defineConfig({
  server: {
    port: 3000,
  },
  plugins: [
    react(),
    // adding plugin in shell as well to ensure no node_modules using the hashed version to ensure singleton.
    remoteProxyPlugin({
      host: true,
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

  build: {
    rolldownOptions: {
      external: [
        'react',
        'react-dom/client',
        'react/jsx-runtime',
        'remote/App',
      ],
    },
  },
})
