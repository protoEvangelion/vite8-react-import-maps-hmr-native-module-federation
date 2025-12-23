import { useState } from 'react'
import './App.css'

// Ensuring other deps that import react are rewritting by plugin as well.
import useLocalStorageState from 'use-local-storage-state'

function App() {
  const [count, setCount] = useState(0)

  const [todos] = useLocalStorageState('todos', {
    defaultValue: ['buy avocado', 'do 50 push-ups'],
  })

  console.log('!todos', todos)

  return (
    <>
      <h1>Look ma I'm a remote</h1>

      <div className="card">
        <button onClick={() => setCount((count) => count + 1)}>
          count is {count}
        </button>
        <p>
          Edit remote's <code>src/App.tsx</code> and save to test HMR
        </p>
      </div>
    </>
  )
}

export default App
