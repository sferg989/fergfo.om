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
      // Production configuration - let Cloudflare Pages handle bindings
      runtime: {
        mode: 'remote',
        type: 'pages'
      }
    }
  ),
  output: 'server',
  vite: {
    ssr: {
      external: ['node:buffer'],
    },
  },
  integrations: [tailwind()],
})