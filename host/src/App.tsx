import { lazy, Suspense } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
import './App.css'

const remotePath = 'remote/App'
const RemoteApp = lazy(() => import(/* @vite-ignore */ remotePath))

function App() {
  return (
    <Suspense fallback={null}>
      <div>
        <a href="https://vite.dev" target="_blank">
          <img src={viteLogo} className="logo" alt="Vite logo" />
        </a>
        <a href="https://react.dev" target="_blank">
          <img src={reactLogo} className="logo react" alt="React logo" />
        </a>
      </div>

      <RemoteApp />
    </Suspense>
  )
}

export default App
