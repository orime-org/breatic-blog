import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';
const posts = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/posts' }),
  schema: z.object({
    title: z.string(), description: z.string(), date: z.coerce.date(),
    category: z.enum(['Engineering', 'Product Updates']),
    author: z.string().default('Breatic team'), draft: z.boolean().default(false),
    discussion: z.number().int().positive().optional(),
  }),
});
export const collections = { posts };
