import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';
import sitemap from '@astrojs/sitemap';
import path from 'node:path';

export default defineConfig({
  site: 'https://n8nguide.com',
  srcDir: './template/src',
  integrations: [tailwind(), sitemap()],
  markdown: {
    shikiConfig: { theme: 'github-dark' }
  },
  vite: {
    resolve: {
      alias: {
        'blog.config': path.resolve('./blog.config.ts'),
      }
    }
  }
});
