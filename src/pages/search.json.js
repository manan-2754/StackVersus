import { getCollection } from 'astro:content';

export async function GET() {
  const comparisons = await getCollection('comparisons');

  const index = comparisons.map((item) => ({
    slug: item.id.replace(/\.md$/, ''),
    title: item.data.title,
    description: item.data.description,
    category: item.data.category || 'Developer Tools',
    tool_a: item.data.tool_a || '',
    tool_b: item.data.tool_b || '',
    tags: item.data.tags || [],
    popularity: item.data.popularity ?? 50,
    date: item.data.date || '',
    url: `https://stackversus.pages.dev/comparisons/${item.id.replace(/\.md$/, '')}/`,
  }));

  return new Response(JSON.stringify(index), {
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'public, max-age=3600',
    },
  });
}
