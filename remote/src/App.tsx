import { useState } from 'react'
import './App.css'
import Confetti from 'react-confetti-boom'
import { add } from 'lodash-es'
// Ensuring other deps that import react are rewritten by plugin as well.
import useLocalStorageState from 'use-local-storage-state'
import { nanoid } from 'nanoid' // Throws Error: The requested module 'nanoid' does not provide an export named 'default'

function App() {
  const [count, setCount] = useState(0)

  const [todos] = useLocalStorageState('todos', {
    defaultValue: ['buy avocado', 'do 50 push-ups'],
  })

  console.log('!todos', todos)

  return (
    <>
      <h1>Look ma I'm a remote</h1>
      {/* Using confetti package to demo esm default only (no named export) module */}
      <Confetti />
      <p>lodash demo shared npm esm default + named `add(1,2)`: {add(1, 2)}</p>
      <p>
        nanoid demo shared npm esm only named exports `nanoid()`: {nanoid()}
      </p>
      <div>
        <p>react demo shared npm cjs export `useState`</p>
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
