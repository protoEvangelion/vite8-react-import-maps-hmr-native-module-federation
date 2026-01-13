import type { Plugin } from 'vite'
import lsm from 'load-esm'
const { loadEsm } = lsm

const moduleCache = new Map<string, Record<string, any>>()

export interface ModuleOptions {
  name: string
  entryAlias?: string
}

export interface RemoteProxyPluginOptions {
  remoteUrl?: string
  modules?: ModuleOptions[]
  /**
   * - `true`: Adds modules to optimizeDeps.include (for the Host app consuming the modules).
   * - `false` (default): Adds modules to optimizeDeps.exclude (for the Remote app serving the modules).
   */
  host?: boolean
}

export default function remoteProxyPlugin({
  remoteUrl,
  host = false,
  modules = [],
}: RemoteProxyPluginOptions): Plugin {
  const moduleConfig = new Map<string, ModuleOptions>()
  const moduleNames: string[] = []

  modules.forEach((m) => {
    const name = typeof m === 'string' ? m : m.name

    moduleConfig.set(name, {
      name,
    })

    moduleNames.push(name)
  })

  let isBuild = false

  return {
    name: 'vite-plugin-remote-proxy',
    enforce: 'pre',

    config(config, { command }) {
      isBuild = command === 'build'

      if (host && isBuild) {
        /*
         * --- PRODUCTION BUILD STRATEGY (Host Only) ---
         * In production, we need to generate physical bundles for shared dependencies so the Remote app can consume them.
         * We inject "virtual entries" into the bundler input options so plugin user does not need to add them manually.
         * E.g. 'react-entry' -> 'virtual:entry-react'
         */
        const input: Record<string, string> = {}

        moduleConfig.forEach((m) => {
          const alias = m.entryAlias || `${m.name.replace(/\//g, '-')}-entry`
          input[alias] = `virtual:entry-${m.name}`
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
       * Remote: force exclusion so it doesn't try to bundle what it should legally import from Host.
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

    async load(id) {
      if (
        !id.startsWith('virtual:entry-') &&
        !id.startsWith('\0virtual:remote-proxy:')
      ) {
        return
      }

      const moduleName =
        host && isBuild && id.startsWith('virtual:entry-')
          ? id.replace('virtual:entry-', '')
          : id.split(':')[2]

      const config = moduleConfig.get(moduleName)

      if (!config) return

      if (!moduleCache.has(moduleName)) {
        moduleCache.set(moduleName, await loadEsm(moduleName))
      }

      const moduleExports = moduleCache.get(moduleName) ?? {}
      const remoteFilename = moduleName.replace(/\//g, '_') + '.js'
      const modulePath =
        host && isBuild ? moduleName : `${remoteUrl}/${remoteFilename}`

      const defaultExport = moduleExports.default
        ? `
import RemoteModule from "${modulePath}";
export default RemoteModule;
      `
        : ''

      const keysToExport = Object.keys(moduleExports)
        .filter((x) => x !== 'default')
        .join(', ')

      const namedExportString = moduleExports.default
        ? `export const { ${keysToExport} } = RemoteModule`
        : `export * from '${modulePath}'`

      const exportShimString = `/** VITE PLUGIN ESM EXPORT SHIM */
${defaultExport}
${namedExportString};`

      return exportShimString
    },

    /** Mimic production caching to ensure shared modules fetch the latest */
    configurePreviewServer(server) {
      server.middlewares.use((req, res, next) => {
        if (req.url?.match(/\.(js|css|png|jpg|jpeg|gif|ico|svg)$/)) {
          res.setHeader('Cache-Control', 'public, max-age=31536000, immutable')
        } else if (!req.url || req.url === '/' || req.url.endsWith('.html')) {
          res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate')
        }
        next()
      })
    },
  }
}
