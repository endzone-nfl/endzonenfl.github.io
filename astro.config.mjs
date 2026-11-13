import { defineConfig } from 'astro/config';

// SITE_URL und BASE_PATH setzt der GitHub-Pages-Workflow automatisch.
export default defineConfig({
  site: process.env.SITE_URL || undefined,
  base: process.env.BASE_PATH || '/',
});
