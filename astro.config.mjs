import { defineConfig } from 'astro/config';
import react from '@astrojs/react';

const site = process.env.SITE_URL ?? process.env.URL ?? 'http://localhost:4321';

export default defineConfig({
  integrations: [react()],
  output: 'static',
  site
});
