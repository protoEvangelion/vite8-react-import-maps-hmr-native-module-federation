import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
// import { createHtmlPlugin } from 'vite-plugin-html'
import remoteProxyPlugin from '../vite-plugin-remote-proxy'

const sharedModules = [
  'react',
  'react-dom/client',
  'react/jsx-runtime',
  'react-confetti-boom',
  'lodash-es',
  'nanoid',
]

// https://vite.dev/config/
export default defineConfig(({ command }) => {
  const isBuild = command === 'build'

  return {
    server: {
      port: 3000,
    },
    preview: {
      port: 3000,
    },
    plugins: [
      react(),
      remoteProxyPlugin({
        host: true,
        remoteUrl: 'http://localhost:3000/node_modules/.vite/deps',
        sharedNpmDeps: sharedModules,
        importMap: {
          imports: {
            'remote/App': isBuild
              ? 'http://localhost:3001/App.js'
              : 'http://localhost:3001/src/App.tsx',
          },
        },
      }),
    ],
    // adding plugin in shell as well to ensure no node_modules using the hashed version to ensure singleton.

    build: {
      minify: false,
      rolldownOptions: {
        input: {
          main: 'index.html',
        },
      },
    },
  }
})
