import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const posts = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/posts' }),
  schema: z.object({
    title: z.string(),
    date: z.coerce.date(),
    // 未加引号的 YAML 日期会在校验前被转换，无法识别已经进位的日期。
    updatedDate: z.iso.date({ error: '请用引号填写有效的 YYYY-MM-DD 日期' })
      .transform((date) => new Date(date))
      .optional(),
    description: z.string().optional(),
    tags: z.array(z.string()).default([]),
    draft: z.boolean().default(false),
  }),
});

export const collections = { posts };
