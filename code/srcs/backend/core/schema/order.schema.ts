import { z } from 'zod';

// ========== SCHEMAS D'ENTREE ==========

export const updateOrderStatusSchema = z.object({
  status: z.enum(['pending', 'paid', 'failed', 'cancelled', 'refunded', 'shipped', 'delivered']),
});

// ========== SCHEMAS DE REPONSE ==========

export const orderResponse = z.object({
  success: z.literal(true),
  data: z.object({
    id: z.number(),
    user_id: z.number(),
    total: z.number(),
    status: z.string(),
    stripe_payment_id: z.string().nullable(),
    created_at: z.string(),
    updated_at: z.string(),
  }),
});

export const orderListResponse = z.object({
  success: z.literal(true),
  data: z.array(orderResponse.shape.data),
});

export const orderItemResponse = z.object({
  id: z.number(),
  order_id: z.number(),
  product_id: z.number(),
  quantity: z.number(),
  price: z.number(),
  created_at: z.string(),
  updated_at: z.string(),
});

export const orderDetailResponse = z.object({
  success: z.literal(true),
  data: orderResponse.shape.data.extend({
    items: z.array(orderItemResponse),
  }),
});
