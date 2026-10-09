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
    date: z.string().optional(),
    lastmod: z.string().optional(),
    source: z.enum(['editorial', 'catalog']).default('editorial'),
    tags: z.array(z.string()).default([]),
    verdict: z.string().optional(),
    popularity: z.number().default(50),
    difficulty: z.enum(['Beginner', 'Intermediate', 'Advanced']).optional(),
    pricing: z
      .object({
        model: z.string().optional(),
        free_tier: z.boolean().optional(),
        starting_price: z.string().optional(),
      })
      .optional(),
    metrics: z
      .object({
        performance: z.number().min(0).max(100).optional(),
        ecosystem: z.number().min(0).max(100).optional(),
        learning_curve: z.number().min(0).max(100).optional(),
        community: z.number().min(0).max(100).optional(),
      })
      .optional(),
    use_cases: z.array(z.string()).default([]),
    related_tools: z.array(z.string()).default([]),
  }),
});

export const collections = { comparisons };
