import {defineConfig} from "astro/config";
import cloudflare from '@astrojs/cloudflare';

export default defineConfig({
  adapter: cloudflare({}),
  output: 'server',
  vite: {
    ssr: {
      external: ['node:buffer'],
    },
  },
})