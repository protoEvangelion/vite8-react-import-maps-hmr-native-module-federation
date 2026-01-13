import { createRequire } from 'module'
import type { Plugin } from 'vite'

const require = createRequire(import.meta.url)

export interface ModuleOptions {
  name: string
  type?: 'named' | 'cjs_interop'
  entryAlias?: string
  [key: string]: any
}

export interface RemoteProxyPluginOptions {
  remoteUrl?: string
  /**
   * - `true`: Adds modules to optimizeDeps.include (for the Host app consuming the modules).
   * - `false` (default): Adds modules to optimizeDeps.exclude (for the Remote app serving the modules).
   */
  host?: boolean
  modules?: (string | ModuleOptions)[]
}

interface NormalizedModuleConfig extends ModuleOptions {
  type: 'named' | 'cjs_interop'
}

/*
 * Helper to extract named exports from a CJS module via Node.js require
 * This is critical because ESM Native Module Federation requires explicit named exports
 * to support destructuring (e.g., import { useState } from 'react') which default CJS->ESM
 * interop often misses.
 */
function getNamedExports(moduleName: string): string[] {
  try {
    const pkg = require(moduleName)
    const keys = Object.keys(pkg).filter((k) => k !== 'default')
    console.log(
      `[remote-proxy] Inspection for ${moduleName} found ${keys.length} keys`
    )
    return keys
  } catch (e) {
    console.warn(`[remote-proxy] Could not inspect ${moduleName}. Error:`, e)
    return []
  }
}

export default function remoteProxyPlugin({
  remoteUrl,
  host = false,
  modules = [],
}: RemoteProxyPluginOptions): Plugin {
  // Normalize the input list into a map for easy lookup
  const moduleConfig = new Map<string, NormalizedModuleConfig>()
  let isBuild = false

  // Maintain a simple list of names for optimizeDeps
  const moduleNames: string[] = []

  modules.forEach((m) => {
    if (typeof m === 'string') {
      moduleConfig.set(m, { name: m, type: 'cjs_interop' })
      moduleNames.push(m)
    } else {
      moduleConfig.set(m.name, { type: 'named', ...m })
      moduleNames.push(m.name)
    }
  })

  return {
    name: 'vite-plugin-remote-proxy',
    enforce: 'pre',

    config(config, { command }) {
      isBuild = command === 'build'
      /*
       * --- PRODUCTION BUILD STRATEGY (Host Only) ---
       * In production, we need to generate physical bundles for shared dependencies
       * so the Remote app can consume them.
       * We inject "virtual entries" into the bundler input options so we don't need to add them manually.
       * E.g. 'react-entry' -> 'virtual:entry-react'
       */
      if (host && isBuild) {
        const input: Record<string, string> = {}
        modules.forEach((m) => {
          const name = typeof m === 'string' ? m : m.name
          // Generate a filename-friendly alias (e.g. 'react-dom/client' -> 'react-dom-client-entry')
          const alias =
            typeof m === 'object' && m.entryAlias
              ? m.entryAlias
              : `${name.replace(/\//g, '-')}-entry`

          // Map to a virtual ID that we will intercept in load()
          input[alias] = `virtual:entry-${name}`
        })
        return {
          build: {
            rolldownOptions: {
              input,
            },
          },
        }
      }

      /*
       * --- DEVELOPMENT STRATEGY ---
       * In Dev, we rely on Vite's pre-bundling.
       * Host: force inclusion in optimizeDeps so they are pre-bundled and addressable.
       * Remote: force exclusion so it doesn't try to bundle what it should legally import from Host/CDN.
       */
      if (moduleNames.length === 0) return

      return {
        optimizeDeps: {
          [host ? 'include' : 'exclude']: moduleNames,
        },
      }
    },

    resolveId(source) {
      /*
       * --- BUILD RESOLUTION ---
       * Capture the virtual keys we injected in config() above.
       */
      if (host && isBuild) {
        if (source.startsWith('virtual:entry-')) {
          return source
        }
        return null
      }

      /*
       * --- DEV RESOLUTION ---
       * Capture imports of the shared modules and redirect them to our proxy.
       * e.g. import 'react' -> import '\0virtual:remote-proxy:react'
       */
      if (moduleConfig.has(source)) {
        return '\0virtual:remote-proxy:' + source
      }
    },

    load(id) {
      /*
       * 1. Build Entry Generation (Host Production)
       * Generates a proper ESM facade from the local installation.
       * Output: "export { useState } from 'react'; export default React;"
       * Purpose: Creates a bundle that *actually* exports named members, complying with ESM specs.
       */
      if (host && isBuild && id.startsWith('virtual:entry-')) {
        const moduleName = id.replace('virtual:entry-', '')
        const keys = getNamedExports(moduleName)

        return `
          export { ${keys.join(', ')} } from '${moduleName}';
          import { default as Mod } from '${moduleName}';
          export default Mod;
        `
      }

      /*
       * 2. Dev Proxy Generation (Host/Remote Dev)
       * Generates a proxy to the pre-bundled/served file URL.
       * Output: "import R from 'http://...'; export const { useState } = R;"
       * Purpose: Bridges the gap where Import Maps might be missing or limited in Dev,
       * and unpacks the Default export (which Vite serves) back into Named exports.
       */
      if (id.startsWith('\0virtual:remote-proxy:')) {
        const moduleName = id.split(':')[2]
        const config = moduleConfig.get(moduleName)

        if (!config) return

        const remoteFilename = moduleName.replace(/\//g, '_') + '.js'
        const remotePath = `${remoteUrl}/${remoteFilename}`

        if (config.type === 'named') {
          return `
            export * from "${remotePath}";
          `
        }

        const namedExports = getNamedExports(moduleName)

        return `
          import RemoteModule from "${remotePath}";
          export default RemoteModule;
          export const { ${namedExports.join(', ')} } = RemoteModule;
        `
      }
    },
  }
}
