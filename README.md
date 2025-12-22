# Vite Native Module Federation


A proof of concept demonstrating native module federation using Vite 8 (rolldown-vite), Import Maps, and a custom externals plugin.

![App Screenshot](./app.png)

## Overview

This project shows how to achieve module federation in Vite without traditional module federation plugins, instead leveraging browser-native features:

- **Import Maps** for dependency resolution and module aliasing
- **ES Modules** loaded directly from CDN (esm.sh)
- **Custom Externals Plugin** to prevent bundling externalized dependencies
- **Hot Module Replacement (HMR)** working with external React

## Architecture

The workspace contains two vite React applications in a Bun monorepo:

- **host**: The main application that consumes remote modules
- **remote**: A remote application exposing components to the host

### Key Components

#### Import Maps (`host/index.html`)

```html
<script type="importmap">
{
  "imports": {
    "react": "https://esm.sh/react@18.3.1/?dev",
    "react-dom/client": "https://esm.sh/react-dom@18.3.1/client/?dev",
    "react/jsx-runtime": "https://esm.sh/react@18.3.1/jsx-runtime/?dev",
    "react/jsx-dev-runtime": "https://esm.sh/react@18.3.1/jsx-dev-runtime/?dev",
    "remote/App": "http://localhost:4174/App.js"
  }
}
</script>
```

The import map:
- Externalizes React dependencies to load from esm.sh CDN
- Uses `?dev` parameter to enable React DevTools integration (required for HMR)
- Maps `remote/App` to the remote application's build output

#### Externals Plugin (`externals-plugin.ts`)

A custom Vite plugin that prevents bundling of external dependencies during both development and production builds:

- **Development**: Hooks into esbuild's dependency optimization to mark externals
- **Build**: Configures Rolldown to exclude externals from the bundle
- **Transform**: Handles Vite's module prefixing for external imports

## How It Works

### Development Mode

1. The host application runs on `http://localhost:5173`
2. React is loaded from esm.sh via import maps
3. The externals plugin prevents Vite from bundling React
4. Remote modules can be loaded dynamically from other dev servers
5. HMR works because React DevTools hook is enabled via `?dev` parameter & remote vite config specifies correct host url for react-refresh 

### Production Build

1. React and other externals are excluded from the bundle
2. The build output contains only application code
3. Runtime dependencies are resolved via import maps
4. The bundle is significantly smaller since shared dependencies aren't duplicated

## Setup

Install dependencies using Bun:

```bash
bun install
```

## Usage

### Development

Run individual applications:

```bash
bun dev:host     # Runs host on http://localhost:5173
bun dev:remote   # Runs remote on http://localhost:5174
```

### Build

Build applications:

```bash
bun build:host
bun build:remote
```

### Preview

Preview production builds:

```bash
bun preview:host
bun preview:remote
```

## Key Features

### ✅ Native ES Modules
No custom runtime or complex webpack configuration - uses standard browser ES modules.

### ✅ Shared Dependencies
React and React-DOM are loaded once from CDN and shared across all micro-frontends.

### ✅ Hot Module Replacement
HMR works with externalized React by using development builds from esm.sh.

### ✅ Type Safety
Full TypeScript support across all workspaces.

### ✅ Small Bundles
Application bundles only contain app code, not shared dependencies.

## Technical Details

### Why `?dev` Parameter?

The `?dev` parameter in esm.sh URLs forces development builds of React. This is crucial because:

- Production React builds strip DevTools integration
- React Refresh (HMR) requires the reconciler to register with `__REACT_DEVTOOLS_GLOBAL_HOOK__`
- Without this registration, HMR infrastructure works but visual updates fail silently

### Externals Plugin Strategy

The plugin operates at multiple stages:

1. **esbuild plugin** (dependency optimization): Marks imports as external during Vite's dep scanning
2. **Vite resolve hook**: Returns external flag for matching imports
3. **Vite transform hook**: Removes Vite's `/@id/` prefix from externalized imports

This ensures dependencies are never bundled and import specifiers remain untouched for import map resolution.

## Dependencies

- **Vite**: `npm:rolldown-vite@7.2.5` (experimental Vite 8 with Rolldown bundler)
- **React**: 19.2.0 (loaded externally via esm.sh)
- **Bun**: For workspace management and scripts

## Limitations

- Requires browsers with ES Module and Import Maps support (modern browsers)
- CDN-hosted dependencies require network access
- Development builds are larger than production builds due to `?dev` parameter

## Future Enhancements

- Add support for dynamic remote registration
- Implement federated types sharing
- Add fallback strategies for CDN failures
- Support for CSS module federation
- Integration with Vite's native module federation plugin (when available)

## License

MIT
