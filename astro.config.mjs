import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import rehypeAffiliateLinks from './src/plugins/rehypeAffiliateLinks.js';
import ogImages from './src/integrations/og-images.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Only comparison pages get a lastmod, read from frontmatter (`lastmod`, then `date`).
 * File mtimes are deliberately not used: on CI every file is freshly cloned, so every
 * URL would claim "modified today" and Google learns to ignore the sitemap's lastmod.
 */
function getLastmodFromUrl(url) {
  const match = new URL(url).pathname.match(/^\/comparisons\/([^/]+)\/?$/);
  if (!match) return undefined;
  try {
    const text = fs.readFileSync(path.join(__dirname, 'src', 'content', 'comparisons', `${match[1]}.md`), 'utf-8');
    const frontmatter = text.match(/^---\r?\n([\s\S]*?)\r?\n---/)?.[1] ?? '';
    const read = (key) => frontmatter.match(new RegExp(`^${key}:\\s*["']?(\\d{4}-\\d{2}-\\d{2})`, 'm'))?.[1];
    return read('lastmod') || read('date');
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
