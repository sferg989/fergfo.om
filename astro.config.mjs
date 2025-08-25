import {defineConfig} from "astro/config";
import cloudflare from '@astrojs/cloudflare';
import tailwind from '@astrojs/tailwind';

// Determine if we're in local development or production
const isLocalDev = process.env.NODE_ENV === 'development' || !process.env.CF_PAGES;

export default defineConfig({
  adapter: cloudflare(
    isLocalDev ? {
      // Local development configuration with hardcoded bindings
      runtime: {
        mode: 'local',
        type: 'pages',
        bindings: {
          DB: {
            type: 'd1',
            database_id: 'a89f41ce-342e-4711-8aec-ab0d6f8fdaca',
            database_name: 'options-tracker-local'
          }
        }
      }
    } : {
      // Production configuration for Workers deployment
      runtime: {
        mode: 'remote',
        type: 'module'
      },
      // Ensure assets are properly configured for Workers
      imageService: 'passthrough',
      platformProxy: {
        enabled: true
      },
      routes: {
        strategy: 'auto'
      }
    }
  ),
  output: 'server',
  vite: {
    ssr: {
      external: ['node:buffer'],
    },
    build: {
      // Ensure CSS is properly bundled for Workers
      cssCodeSplit: false,
      assetsInlineLimit: 0,
      rollupOptions: {
        output: {
          // Ensure consistent asset naming
          assetFileNames: '_astro/[name].[hash][extname]'
        }
      }
    }
  },
  integrations: [
    tailwind({
      // Ensure Tailwind CSS is properly optimized for production
      applyBaseStyles: true,
      config: {
        content: ['./src/**/*.{astro,html,js,jsx,ts,tsx,md,mdx}']
      }
    })
  ],
  build: {
    // Ensure proper asset handling in production
    inlineStylesheets: 'never',
    assets: '_astro'
  }
})