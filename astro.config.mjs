// D:\JB\site\astro.config.mjs
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://stackversus.pages.dev',
  integrations: [sitemap()],
  redirects: {
    // Clean outbound affiliate redirects
    '/go/clerk': 'https://clerk.com?via=stackversus',
    '/go/auth0': 'https://auth0.com',
    '/go/supabase': 'https://supabase.com?ref=stackversus',
    '/go/neon': 'https://neon.tech?fpr=stackversus',
    '/go/qdrant': 'https://qdrant.tech',
    '/go/drizzle': 'https://orm.drizzle.team',
  }
});