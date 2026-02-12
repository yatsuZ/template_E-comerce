import { z } from 'zod';

// ========== SCHEMAS D'ENTREE ==========

export const createProductSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().max(2000).nullable().optional(),
  price: z.number().int().min(0),
  image: z.string().max(2048).url().nullable().optional(),
  stock: z.number().int().min(0),
});

export const updateProductSchema = z.object({
  description: z.string().max(2000).nullable().optional(),
  price: z.number().int().min(0).optional(),
  image: z.string().max(2048).url().nullable().optional(),
  stock: z.number().int().min(0).optional(),
});

// ========== SCHEMAS DE REPONSE ==========

export const productResponse = z.object({
  success: z.literal(true),
  data: z.object({
    id: z.number(),
    name: z.string(),
    description: z.string().nullable(),
    price: z.number(),
    image: z.string().nullable(),
    stock: z.number(),
    created_at: z.string(),
    updated_at: z.string(),
  }),
});

export const productListResponse = z.object({
  success: z.literal(true),
  data: z.array(productResponse.shape.data),
});
