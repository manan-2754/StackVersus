import { getCollection } from 'astro:content';
import { OFFICIAL_URLS } from './affiliates';
import { findCatalogTool } from './catalog';

export interface ToolProfile {
  name: string;
  slug: string;
  category?: string;
  description: string;
  officialUrl?: string;
  comparisons: { slug: string; title: string; opponent: string }[];
  tags: string[];
  categories: string[];
}

function slugifyTool(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

export async function getTools(): Promise<ToolProfile[]> {
  const comparisons = await getCollection('comparisons');
  const map = new Map<string, ToolProfile>();

  for (const entry of comparisons) {
    const slug = entry.id.replace(/\.md$/, '');
    const toolA = entry.data.tool_a || '';
    const toolB = entry.data.tool_b || '';
    const title = entry.data.title;
    const category = entry.data.category;
    const tags = entry.data.tags || [];

    for (const [idx, name] of [toolA, toolB].entries()) {
      if (!name) continue;
      const toolSlug = slugifyTool(name);
      const opponent = idx === 0 ? toolB : toolA;
      const existing = map.get(name);
      if (existing) {
        existing.comparisons.push({ slug, title, opponent });
        if (category && !existing.categories.includes(category)) existing.categories.push(category);
        for (const tag of tags) if (!existing.tags.includes(tag)) existing.tags.push(tag);
      } else {
        const catalogTool = findCatalogTool(name);
        map.set(name, {
          name,
          slug: toolSlug,
          category,
          description: catalogTool
            ? `${catalogTool.tagline}. Best for ${catalogTool.bestFor}.`
            : `Compare ${name} against ${opponent || 'alternatives'} across features, pricing, performance, and real-world use cases.`,
          officialUrl: OFFICIAL_URLS[name] || OFFICIAL_URLS[name.toLowerCase()],
          comparisons: [{ slug, title, opponent }],
          tags: [...tags],
          categories: category ? [category] : [],
        });
      }
    }
  }

  return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
}

export async function getToolBySlug(toolSlug: string): Promise<ToolProfile | undefined> {
  const tools = await getTools();
  return tools.find((t) => t.slug === toolSlug);
}
