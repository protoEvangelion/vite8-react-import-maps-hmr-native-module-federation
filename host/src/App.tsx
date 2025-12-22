import {  lazy, Suspense } from "react";
import reactLogo from "./assets/react.svg";
import viteLogo from "/vite.svg";
import "./App.css";

// @ts-expect-error - Module Federation
const RemoteApp = lazy(() => import("remote/App"));

function App() {
  return (
    <Suspense fallback={"!!!!!!"}>
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
  );
}

export default App;
