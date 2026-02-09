import { z } from 'zod';

// ========== SCHEMAS D'ENTREE ==========

export const addToCartSchema = z.object({
  product_id: z.number().int().positive(),
  quantity: z.number().int().positive(),
});

export const updateCartSchema = z.object({
  quantity: z.number().int().positive(),
});

// ========== SCHEMAS DE REPONSE ==========

export const cartItemResponse = z.object({
  success: z.literal(true),
  data: z.object({
    id: z.number(),
    user_id: z.number(),
    product_id: z.number(),
    quantity: z.number(),
    created_at: z.string(),
    updated_at: z.string(),
  }),
});

export const cartListResponse = z.object({
  success: z.literal(true),
  data: z.array(cartItemResponse.shape.data),
});
