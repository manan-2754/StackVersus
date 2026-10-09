import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';

export async function GET(context) {
  const comparisons = await getCollection('comparisons');

  return rss({
    title: 'StackVersus — Developer Tool Comparisons',
    description: 'Unbiased head-to-head software comparisons for modern engineering stacks.',
    site: context.site,
    items: comparisons.map((post) => ({
      title: post.data.title,
      pubDate: new Date(post.data.date || post.data.lastmod || Date.now()),
      description: post.data.description,
      link: `/comparisons/${post.id.replace(/\.md$/, '')}/`,
    })),
    trailingSlash: true,
    customData: `<language>en-us</language>`,
  });
}
