import { z } from 'zod';

export const createArticleSchema = z.object({
  title: z.string().min(1).max(255),
  slug: z.string().min(1).max(255).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug must be lowercase alphanumeric with hyphens'),
  content: z.string().default(''),
  parent_id: z.number().int().positive().nullable().optional().default(null),
  published: z.number().int().min(0).max(1).optional().default(0),
});

export const updateArticleSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  slug: z.string().min(1).max(255).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug must be lowercase alphanumeric with hyphens').optional(),
  content: z.string().optional(),
  parent_id: z.number().int().positive().nullable().optional(),
  published: z.number().int().min(0).max(1).optional(),
});
