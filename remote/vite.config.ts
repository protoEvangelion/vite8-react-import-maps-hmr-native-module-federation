import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import x from '../externals-plugin'
import { resolve } from 'node:path'

// https://vite.dev/config/
export default defineConfig({
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
    react({ reactRefreshHost: 'http://localhost:5173' }),
    x({
      externals: [
        'react', // Externalize "react", and all of its subexports (react/*), such as react/jsx-runtime
        'react-dom', // Externalize "react", and all of its subexports (react/*), such as react/jsx-runtime
      ],
    }),
  ],
})
