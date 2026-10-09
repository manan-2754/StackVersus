/**
 * Rehype plugin that rewrites Google-search fallback links in generated
 * comparison content to real product URLs.
 *
 * When a tool has an entry in AFFILIATES, the link is marked
 * `rel="nofollow sponsored"` and tracked as an affiliate click. Otherwise the
 * link uses the official URL from OFFICIAL_URLS with
 * `rel="noopener noreferrer nofollow"`.
 */

import { AFFILIATES, OFFICIAL_URLS } from '../data/affiliates.js';

function walk(node: any, callback: (n: any) => void) {
  callback(node);
  if (Array.isArray(node.children)) {
    node.children.forEach((child: any) => walk(child, callback));
  }
}

function resolveUrl(toolName: string): { url: string; isAffiliate: boolean } | undefined {
  const key = toolName.toLowerCase();
  const affiliate = AFFILIATES[toolName] || AFFILIATES[key];
  if (affiliate) return { url: affiliate, isAffiliate: true };
  const official = OFFICIAL_URLS[toolName] || OFFICIAL_URLS[key];
  if (official) return { url: official, isAffiliate: false };
  return undefined;
}

export default function rehypeAffiliateLinks() {
  return (tree: any, file: any) => {
    const frontmatter = file?.data?.astro?.frontmatter || {};
    const toolA = frontmatter.tool_a;
    const toolB = frontmatter.tool_b;

    const toolLinks = new Map<string, { url: string; isAffiliate: boolean }>();
    [toolA, toolB].forEach((tool) => {
      if (!tool) return;
      const resolved = resolveUrl(tool);
      if (resolved) toolLinks.set(tool, resolved);
    });

    walk(tree, (node) => {
      if (node?.type !== 'element' || node.tagName !== 'a') return;
      const href = node.properties?.href;
      if (typeof href !== 'string') return;

      const match = href.match(/^https:\/\/www\.google\.com\/search\?q=(.+)$/);
      if (!match) {
        if (href.startsWith('http')) {
          const isAffiliate = Object.values(AFFILIATES).includes(href);
          node.properties = node.properties || {};
          node.properties.rel = isAffiliate ? 'nofollow sponsored' : 'noopener noreferrer nofollow';
          node.properties.target = '_blank';
          node.properties['data-track'] = isAffiliate ? 'affiliate-outbound' : 'outbound';
        }
        return;
      }

      const query = decodeURIComponent(match[1].replace(/\+/g, ' '));
      const resolved = Array.from(toolLinks.entries()).find(
        ([tool]) => tool.toLowerCase() === query.toLowerCase()
      )?.[1];

      if (!resolved) return;

      node.properties = node.properties || {};
      node.properties.href = resolved.url;
      node.properties.rel = resolved.isAffiliate ? 'nofollow sponsored' : 'noopener noreferrer nofollow';
      node.properties.target = '_blank';
      node.properties.class = Array.isArray(node.properties.class)
        ? [...node.properties.class, resolved.isAffiliate ? 'affiliate-link' : 'outbound-link']
        : [resolved.isAffiliate ? 'affiliate-link' : 'outbound-link'];
      node.properties['data-track'] = resolved.isAffiliate ? 'affiliate-outbound' : 'outbound';
    });
  };
}
