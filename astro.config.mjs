import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import rehypeAffiliateLinks from './src/plugins/rehypeAffiliateLinks.js';
import ogImages from './src/integrations/og-images.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function getLastmodFromUrl(url) {
  const pathname = url.replace('https://stackversus.pages.dev', '').replace(/\/$/, '') || '/';

  let targetPath;
  if (pathname.startsWith('/comparisons/')) {
    const slug = pathname.replace('/comparisons/', '');
    targetPath = path.join(__dirname, 'src', 'content', 'comparisons', `${slug}.md`);
  } else if (pathname.startsWith('/categories/')) {
    const slug = pathname.replace('/categories/', '');
    if (!slug) {
      targetPath = path.join(__dirname, 'src', 'pages', 'categories', 'index.astro');
    } else {
      targetPath = path.join(__dirname, 'src', 'pages', 'categories', '[category].astro');
    }
  } else if (pathname === '/') {
    targetPath = path.join(__dirname, 'src', 'pages', 'index.astro');
  } else if (pathname.startsWith('/tools/') || pathname === '/tools' || pathname === '/trending') {
    targetPath = path.join(__dirname, 'src', 'data', 'catalog.ts');
  } else if (pathname === '/about') {
    targetPath = path.join(__dirname, 'src', 'pages', 'about.astro');
  } else if (pathname === '/editorial-policy') {
    targetPath = path.join(__dirname, 'src', 'pages', 'editorial-policy.astro');
  } else if (pathname === '/privacy-policy') {
    targetPath = path.join(__dirname, 'src', 'pages', 'privacy-policy.astro');
  } else {
    return undefined;
  }

  try {
    const stats = fs.statSync(targetPath);
    return stats.mtime.toISOString().split('T')[0];
  } catch {
    return undefined;
  }
}

export default defineConfig({
  site: 'https://stackversus.pages.dev',
  output: 'static',
  integrations: [
    ogImages(),
    sitemap({
      changefreq: 'weekly',
      priority: 0.7,
      // Keep noindex utility pages out of the sitemap so Search Console doesn't report conflicts.
      filter: (page) => !/\/(search|random|compare|404)\/?$/.test(new URL(page).pathname),
      serialize(item) {
        const lastmod = getLastmodFromUrl(item.url);
        if (lastmod) {
          item.lastmod = lastmod;
        }
        return item;
      },
    }),
  ],
  prefetch: true,
  markdown: {
    rehypePlugins: [rehypeAffiliateLinks],
  },
});
