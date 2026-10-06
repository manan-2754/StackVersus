import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const comparisons = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/comparisons' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    category: z.string().optional(),
    tool_a: z.string().optional(),
    tool_b: z.string().optional(),
    slug: z.string().optional(),
  }),
});

export const collections = { comparisons };
