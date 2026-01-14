import type { Plugin } from 'vite'
import lsm from 'load-esm'
const { loadEsm } = lsm

const moduleCache = new Map<string, Record<string, any>>()

export interface RemoteProxyPluginOptions {
  remoteUrl?: string
  sharedNpmDeps?: string[]
  importMap?: { imports: Record<string, string> }
  /**
   * - `true`: Adds modules to optimizeDeps.include (for the Host app consuming the modules).
   * - `false` (default): Adds modules to optimizeDeps.exclude (for the Remote app serving the modules).
   */
  host?: boolean
}

export default function remoteProxyPlugin({
  remoteUrl,
  host = false,
  sharedNpmDeps = [],
  importMap = { imports: {} },
}: RemoteProxyPluginOptions): Plugin {
  const moduleConfig = new Map<string, { name: string; entryAlias: string }>()

  sharedNpmDeps.forEach((name) => {
    const entryAlias = `${name.replaceAll('/', '-')}-entry`

    moduleConfig.set(name, {
      name,
      entryAlias,
    })
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
        const moduleInputs = Object.fromEntries(
          Array.from(moduleConfig.values()).map((m) => [
            m.entryAlias,
            `virtual:entry-${m.name}`,
          ])
        )

        const existingInput = (config.build as any)?.rolldownOptions?.input
        const userInputs = existingInput ? existingInput : {}

        return {
          build: {
            rolldownOptions: {
              // Fixes esm modules with only named exports
              preserveEntrySignatures: 'strict',
              input: {
                ...moduleInputs,
                ...userInputs,
              },
              // We need entry proxies to npm modules to not include a hash because we have no way of grabbing that during index.hml import map injection phase
              output: {
                chunkFileNames: 'assets/[name]-[hash].js',
                entryFileNames: 'assets/[name].js',
              },
            },
          },
        }
      } else if (!host && isBuild) {
        return {
          build: {
            rolldownOptions: {
              external: sharedNpmDeps,
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
      if (sharedNpmDeps.length === 0) return

      return {
        optimizeDeps: {
          [host ? 'include' : 'exclude']: sharedNpmDeps,
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
          // Return source to tell vite that this file exists & will be handled during load phase
          return source
        }
        // Returns null to let default vite resolution handle everything else
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
        ? `import RemoteModule from "${modulePath}"; export default RemoteModule;`
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

    /**
     * Injects import map into index.html for host only
     * Note that we cannot inject npm deps into import map for dev because it is currently
     * impossible to get vite dev server not to change npm module imports.
     * E.G. vite dev converts:
     *  `import React from 'react'`
     *  `import __vite__cjsImport0_react from '/node_modules/.vite/deps/react.js?v=a2584c15'`
     * However in production we can use build.externals to tell vite "hands off" my npm imports
     */
    transformIndexHtml(html) {
      const buildImports =
        host && isBuild
          ? Object.fromEntries(
              Array.from(moduleConfig.values()).map(({ name, entryAlias }) => [
                name,
                `/assets/${entryAlias}.js?t=${Date.now()}`,
              ])
            )
          : {}

      const finalImportMap = {
        ...importMap,
        imports: {
          ...importMap?.imports,
          ...buildImports,
        },
      }

      return html.replace('<%- importMap %>', JSON.stringify(finalImportMap))
    },

    /** Mimic production caching to ensure shared modules fetch the latest */
    configurePreviewServer(server) {
      server.middlewares.use((req, res, next) => {
        const cleanUrl = req.url?.split('?')[0]
        if (cleanUrl?.match(/\.(js|css|png|jpg|jpeg|gif|ico|svg)$/)) {
          res.setHeader('Cache-Control', 'public, max-age=31536000, immutable')
        } else if (
          !cleanUrl ||
          cleanUrl === '/' ||
          cleanUrl.endsWith('.html')
        ) {
          res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate')
        }
        next()
      })
    },
  }
}
