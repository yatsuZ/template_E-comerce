import { z } from 'zod';

// ========== SCHEMAS D'ENTREE ==========

export const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

// ========== SCHEMAS DE REPONSE ==========

export const authSuccessResponse = z.object({
  success: z.literal(true),
  accessToken: z.string(),
});

export const refreshSuccessResponse = z.object({
  success: z.literal(true),
  accessToken: z.string(),
});

export const logoutSuccessResponse = z.object({
  success: z.literal(true),
  message: z.string(),
});

export const authErrorResponse = z.object({
  success: z.literal(false),
  error: z.string(),
  details: z.record(z.array(z.string())).optional(),
});
