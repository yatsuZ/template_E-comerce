import { z } from 'zod';

// ========== SCHEMAS D'ENTREE ==========

export const registerSchema = z.object({
  email: z.string().max(255).email(),
  password: z.string().min(6).max(128),
});

export const loginSchema = z.object({
  email: z.string().max(255).email(),
  password: z.string().min(6).max(128),
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
  details: z.record(z.string(), z.array(z.string())).optional(),
});
