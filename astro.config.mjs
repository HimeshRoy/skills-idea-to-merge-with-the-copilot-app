import { defineConfig } from 'astro/config';
import preact from '@astrojs/preact';

// Static output. Any browser-only APIs (like localStorage) must run in a
// client-side boundary, never during the build/SSR pass.
export default defineConfig({
  integrations: [preact()],
  server: { host: true, port: 4321 },
});
