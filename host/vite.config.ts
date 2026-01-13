import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
// import { createHtmlPlugin } from 'vite-plugin-html'
import remoteProxyPlugin from '../vite-plugin-remote-proxy'

const sharedModules = [
  { name: 'react', entryAlias: 'react-entry' },
  {
    name: 'react-dom/client',
    entryAlias: 'react-dom-client-entry',
  },
  {
    name: 'react/jsx-runtime',
    entryAlias: 'react-jsx-runtime-entry',
  },
  // all react ones above are cjs
  // this one is only a esm default export
  {
    name: 'react-confetti-boom',
    entryAlias: 'react-confetti-boom-entry',
  },
  // this one has both esm named & default exports
  {
    name: 'lodash-es',
    entryAlias: 'lodash-es-entry',
  },
  // this one has esm named exports only
  {
    name: 'nanoid',
    entryAlias: 'nanoid-entry',
  },
]

// https://vite.dev/config/
export default defineConfig(({ command }) => {
  const isBuild = command === 'build'
  const importMap = {
    imports: {
      'remote/App': isBuild
        ? 'http://localhost:3001/App.js'
        : 'http://localhost:3001/src/App.tsx',
    },
  }

  if (isBuild) {
    sharedModules.forEach((mod) => {
      importMap.imports[mod.name] =
        `/assets/${mod.entryAlias}.js?${Date.now().toString()}`
    })
  }

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
        modules: sharedModules,
      }),
      {
        name: 'html-transform',
        transformIndexHtml(html) {
          return html.replace('<%- importMap %>', JSON.stringify(importMap))
        },
      },
    ],
    // adding plugin in shell as well to ensure no node_modules using the hashed version to ensure singleton.

    build: {
      minify: false,
      rolldownOptions: {
        preserveEntrySignatures: 'strict',
        external: ['remote/App'],
        input: {
          main: 'index.html',
        },
        output: {
          chunkFileNames: 'assets/[name]-[hash].js',
          entryFileNames: 'assets/[name].js',
        },
      },
    },
  }
})
