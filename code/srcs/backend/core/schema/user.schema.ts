import { z } from 'zod';

// ========== SCHEMAS D'ENTREE ==========

export const createUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  googleId: z.string().optional(),
});

export const updateEmailSchema = z.object({
  email: z.string().email(),
});

export const updatePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(6),
});

export const deleteAccountSchema = z.object({
  password: z.string().min(1),
});

// ========== SCHEMAS DE REPONSE ==========

export const userResponse = z.object({
  success: z.literal(true),
  data: z.object({
    id: z.number(),
    email: z.string(),
    provider: z.string(),
    is_admin: z.number(),
    created_at: z.string(),
    updated_at: z.string(),
  }),
});

export const userListResponse = z.object({
  success: z.literal(true),
  data: z.array(userResponse.shape.data),
});
