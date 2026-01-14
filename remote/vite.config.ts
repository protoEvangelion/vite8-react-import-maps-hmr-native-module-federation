import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'node:path'
import remoteProxyPlugin from '../vite-plugin-remote-proxy'

export default defineConfig(({ command }) => {
  const isBuild = command === 'build'

  return {
    server: {
      port: 3001,
    },
    preview: {
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
    },
    plugins: [
      react({ reactRefreshHost: 'http://localhost:3000' }),

      remoteProxyPlugin({
        host: false,
        remoteUrl: isBuild
          ? 'http://localhost:3000'
          : 'http://localhost:3000/node_modules/.vite/deps',
        sharedNpmDeps: [
          'react',
          'react-dom/client',
          'react/jsx-runtime',
          'react-confetti-boom',
          'lodash-es',
          'nanoid',
        ],
      }),
    ],
  }
})
