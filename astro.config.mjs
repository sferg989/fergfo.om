import {defineConfig} from "astro/config";
import cloudflare from '@astrojs/cloudflare';
import tailwind from '@astrojs/tailwind';

export default defineConfig({
  adapter: cloudflare({
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
  }),
  output: 'server',
  vite: {
    ssr: {
      external: ['node:buffer'],
    },
  },
  integrations: [tailwind()],
})