import { createRequire } from 'module'
import type { Plugin } from 'vite'

const require = createRequire(import.meta.url)

export interface ModuleOptions {
  name: string
  type?: 'named' | 'cjs_interop'
  [key: string]: any
}

export interface RemoteProxyPluginOptions {
  remoteUrl: string
  /**
   * - `true`: Adds modules to optimizeDeps.include (for the Host app consuming the modules).
   * - `false` (default): Adds modules to optimizeDeps.exclude (for the Remote app serving the modules).
   */
  host: boolean
  modules?: (string | ModuleOptions)[]
}

interface NormalizedModuleConfig extends ModuleOptions {
  type: 'named' | 'cjs_interop'
}

export default function remoteProxyPlugin({
  remoteUrl,
  host,
  modules = [],
}: RemoteProxyPluginOptions): Plugin {
  // Normalize the input list into a map for easy lookup
  const moduleConfig = new Map<string, NormalizedModuleConfig>()

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

    // Config Hook: Toggle include/exclude based on the 'host' boolean
    config() {
      if (moduleNames.length === 0) return

      return {
        optimizeDeps: {
          [host ? 'include' : 'exclude']: moduleNames,
        },
      }
    },

    resolveId(source) {
      if (moduleConfig.has(source)) {
        return '\0virtual:remote-proxy:' + source
      }
    },

    load(id) {
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

        // CJS Interop logic
        let namedExports: string[] = []
        try {
          const localModule = require(moduleName)
          namedExports = Object.keys(localModule).filter((k) => k !== 'default')
        } catch (e) {
          console.warn(`[remote-proxy] Could not inspect ${moduleName}.`)
        }

        return `
          import RemoteModule from "${remotePath}";
          export default RemoteModule;
          export const { ${namedExports.join(', ')} } = RemoteModule;
        `
      }
    },
  }
}
