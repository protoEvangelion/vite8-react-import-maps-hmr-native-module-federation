# Vite Native Module Federation

A proof of concept demonstrating native module federation using Vite 8 (rolldown-vite), Import Maps, and a small vite plugin.

![App Screenshot](./app.png)

## Quickstart

```
bun i
bun dev
```

## Problem

> How do you share node_modules & src code from different sources at runtime?

## Solution

- Module Federation 2.0 solves this.
  - However it adds great complexity via it's runtime + the build tool plugins required to make this feasible
  - In addition to complexity, the build tool plugins have often gone stale, blocking users from upgrading to the say the latest version of vite.

## Goal

> Solve this using browser native tools where possible & striving for simplicity in build tool integration where necessary.

## My Solution

- Use regular import syntax to share deps.
  - `import React from 'react'`
  - `import('remote/Component.tsx')`

- This involves a hybrid approach using import maps + a small vite plugin to proxy shared node modules like react to shell.

## The Challenges

- Initially I tried to use import maps FULLY to resolve this issue.
  - The problem with import maps, is that it required using the esm.sh cdn for node_modules (not an option at the company I work at)
    - This worked 90% but ran into issues with a package that was deployed to our private CDN that imported react into a sha based import which is subject to change: `import react from 'react-D1324.js'`

- So I settled for import maps just to resolve remote imports & with a small vite plugin to handle the node_module resolution.

## Technical Steps Required

1. Inside the host (shell) app index.html, I added an import map to handle remote imports:

```
    <script type="importmap">
      {
        "imports": {
          "remote/App": "http://localhost:3001/src/App.tsx"
        }
      }
    </script>
```

2. To import it you simply need to import it dynamically & tell vite to not resolve it:

```typescript
const remotePath = 'remote/App'
const RemoteApp = lazy(() => import(/* @vite-ignore */ remotePath))
```

3. For node_modules this is where the vite plugin comes in. To proxy node module imports, inside host & remote vite config do:

```typescript
    remoteProxyPlugin({
      host: true,
      remoteUrl: 'http://localhost:3000/node_modules/.vite/deps',
      modules: [
        // Case A: React (Needs the 'cjs_interop' shim, which is the default for strings)
        'react',
        'react-dom/client',

        // Case B: A package with ONLY named exports (no default)
        // You MUST specify type: 'named' here
        // { name: '@tanstack/react-router', type: 'named' },
      ],
    }),
```

Ensure the `host` option is set correctly. `true` in host vite config, and `false` in remote vite configs. This is critical because in host vite config we will include the deps you pass in optimize deps incase they are not auto discovered during vite's optimization phase. And for remotes we exclude from optimizeDeps so vite does not adjust the import statements that this plugin transforms.


### HMR

As a bonus, to get HMR working, in your remote vite configs react plugin, simply add the host address:

```typescript
    react({ reactRefreshHost: 'http://localhost:3000' }),
```