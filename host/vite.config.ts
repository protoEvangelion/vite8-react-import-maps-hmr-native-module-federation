import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

import x from '../externals-plugin'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    x({
      externals: [
        'react', // Externalize "react", and all of its subexports (react/*), such as react/jsx-runtime
        'react-dom',
        'remote/App',
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
