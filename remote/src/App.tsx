import { useState } from "react";
import "./App.css";

// import "@holla-at-ya-boi";

// import { add } from "./util";

function App() {
  const [count, setCount] = useState(0);

  return (
    <>
      <div>!!!!ryanzaaa</div>
      <div className="card">
        <button onClick={() => setCount((count) => count + 1)}>
          count is {count}
        </button>
        <p>
          Edit <code>src/App.tsx</code> and save to test HMRz
        </p>
      </div>
    </>
  );
}

export default App;
