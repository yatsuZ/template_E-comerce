import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Logger, updateENV } from '../../backend/utils/logger.js';
import {
  ApiTestContext,
  createApiTestContext,
  closeApiTestContext,
} from '../helpers/test.helper.js';

updateENV("debug");
Logger.debug("Test Auth API", "Tests des routes /api/auth (register, login, refresh, logout)");

describe('Auth API', () => {
  let ctx: ApiTestContext;

  beforeEach(async () => { ctx = await createApiTestContext(); });
  afterEach(async () => { await closeApiTestContext(ctx); });

  // ========== REGISTER ==========

  describe('POST /api/auth/register', () => {
    it('Crée un compte et retourne un accessToken + cookie', async () => {
      const res = await ctx.fastify.inject({
        method: 'POST',
        url: '/api/auth/register',
        payload: { email: 'test@example.com', password: 'password123' },
      });

      expect(res.statusCode).toBe(201);

      const body = res.json();
      expect(body.success).toBe(true);
      expect(body.accessToken).toBeDefined();
      expect(typeof body.accessToken).toBe('string');

      // Vérifie le cookie refresh_token
      const cookies = res.cookies;
      const refreshCookie = cookies.find((c: any) => c.name === 'refresh_token');
      expect(refreshCookie).toBeDefined();
      expect(refreshCookie!.httpOnly).toBe(true);
    });

    it('Erreur 400 si email invalide', async () => {
      const res = await ctx.fastify.inject({
        method: 'POST',
        url: '/api/auth/register',
        payload: { email: 'invalid', password: 'password123' },
      });

      expect(res.statusCode).toBe(400);
      expect(res.json().success).toBe(false);
    });

    it('Erreur 400 si password trop court', async () => {
      const res = await ctx.fastify.inject({
        method: 'POST',
        url: '/api/auth/register',
        payload: { email: 'test@example.com', password: '123' },
      });

      expect(res.statusCode).toBe(400);
      expect(res.json().success).toBe(false);
    });

    it('Erreur 400 si body vide', async () => {
      const res = await ctx.fastify.inject({
        method: 'POST',
        url: '/api/auth/register',
        payload: {},
      });

      expect(res.statusCode).toBe(400);
      expect(res.json().success).toBe(false);
    });

    it('Erreur 409 si email déjà existant', async () => {
      await ctx.fastify.inject({
        method: 'POST',
        url: '/api/auth/register',
        payload: { email: 'dup@example.com', password: 'password123' },
      });

      const res = await ctx.fastify.inject({
        method: 'POST',
        url: '/api/auth/register',
        payload: { email: 'dup@example.com', password: 'password456' },
      });

      expect(res.statusCode).toBe(409);
      expect(res.json().success).toBe(false);
    });
  });

  // ========== LOGIN ==========

  describe('POST /api/auth/login', () => {
    it('Login valide retourne accessToken + cookie', async () => {
      // D'abord créer un compte
      await ctx.fastify.inject({
        method: 'POST',
        url: '/api/auth/register',
        payload: { email: 'user@example.com', password: 'password123' },
      });

      // Puis login
      const res = await ctx.fastify.inject({
        method: 'POST',
        url: '/api/auth/login',
        payload: { email: 'user@example.com', password: 'password123' },
      });

      expect(res.statusCode).toBe(200);

      const body = res.json();
      expect(body.success).toBe(true);
      expect(body.accessToken).toBeDefined();

      const cookies = res.cookies;
      const refreshCookie = cookies.find((c: any) => c.name === 'refresh_token');
      expect(refreshCookie).toBeDefined();
    });

    it('Erreur 401 si email inexistant', async () => {
      const res = await ctx.fastify.inject({
        method: 'POST',
        url: '/api/auth/login',
        payload: { email: 'nobody@example.com', password: 'password123' },
      });

      expect(res.statusCode).toBe(401);
      expect(res.json().success).toBe(false);
    });

    it('Erreur 401 si password incorrect', async () => {
      await ctx.fastify.inject({
        method: 'POST',
        url: '/api/auth/register',
        payload: { email: 'user@example.com', password: 'password123' },
      });

      const res = await ctx.fastify.inject({
        method: 'POST',
        url: '/api/auth/login',
        payload: { email: 'user@example.com', password: 'wrongpassword' },
      });

      expect(res.statusCode).toBe(401);
      expect(res.json().success).toBe(false);
    });

    it('Erreur 400 si body invalide', async () => {
      const res = await ctx.fastify.inject({
        method: 'POST',
        url: '/api/auth/login',
        payload: { email: 'invalid', password: '123' },
      });

      expect(res.statusCode).toBe(400);
      expect(res.json().success).toBe(false);
    });
  });

  // ========== REFRESH ==========

  describe('POST /api/auth/refresh', () => {
    it('Retourne un nouveau accessToken avec un cookie valide', async () => {
      // Register pour obtenir le refresh cookie
      const registerRes = await ctx.fastify.inject({
        method: 'POST',
        url: '/api/auth/register',
        payload: { email: 'user@example.com', password: 'password123' },
      });

      const refreshCookie = registerRes.cookies.find((c: any) => c.name === 'refresh_token');
      expect(refreshCookie).toBeDefined();

      // Appeler refresh avec le cookie
      const res = await ctx.fastify.inject({
        method: 'POST',
        url: '/api/auth/refresh',
        cookies: { refresh_token: refreshCookie!.value },
      });

      expect(res.statusCode).toBe(200);

      const body = res.json();
      expect(body.success).toBe(true);
      expect(body.accessToken).toBeDefined();
    });

    it('Erreur 401 si pas de cookie', async () => {
      const res = await ctx.fastify.inject({
        method: 'POST',
        url: '/api/auth/refresh',
      });

      expect(res.statusCode).toBe(401);
      expect(res.json().success).toBe(false);
    });

    it('Erreur 401 si cookie invalide', async () => {
      const res = await ctx.fastify.inject({
        method: 'POST',
        url: '/api/auth/refresh',
        cookies: { refresh_token: 'invalid_token_value' },
      });

      expect(res.statusCode).toBe(401);
      expect(res.json().success).toBe(false);
    });
  });

  // ========== LOGOUT ==========

  describe('POST /api/auth/logout', () => {
    it('Supprime le cookie et retourne 200', async () => {
      const res = await ctx.fastify.inject({
        method: 'POST',
        url: '/api/auth/logout',
      });

      expect(res.statusCode).toBe(200);

      const body = res.json();
      expect(body.success).toBe(true);
      expect(body.message).toBe('Logged out');

      // Le cookie doit être clear (maxAge = 0 ou expires dans le passé)
      const cookies = res.cookies;
      const refreshCookie = cookies.find((c: any) => c.name === 'refresh_token');
      if (refreshCookie) {
        expect(refreshCookie.value).toBe('');
      }
    });
  });

  // ========== FLOW COMPLET ==========

  describe('Flow complet register → login → refresh → logout', () => {
    it('Le flow entier fonctionne', async () => {
      // 1. Register
      const registerRes = await ctx.fastify.inject({
        method: 'POST',
        url: '/api/auth/register',
        payload: { email: 'flow@example.com', password: 'password123' },
      });
      expect(registerRes.statusCode).toBe(201);
      const registerBody = registerRes.json();
      expect(registerBody.accessToken).toBeDefined();

      // 2. Login avec les mêmes credentials
      const loginRes = await ctx.fastify.inject({
        method: 'POST',
        url: '/api/auth/login',
        payload: { email: 'flow@example.com', password: 'password123' },
      });
      expect(loginRes.statusCode).toBe(200);
      const loginBody = loginRes.json();
      expect(loginBody.accessToken).toBeDefined();

      // 3. Refresh avec le cookie du login
      const refreshCookie = loginRes.cookies.find((c: any) => c.name === 'refresh_token');
      expect(refreshCookie).toBeDefined();

      const refreshRes = await ctx.fastify.inject({
        method: 'POST',
        url: '/api/auth/refresh',
        cookies: { refresh_token: refreshCookie!.value },
      });
      expect(refreshRes.statusCode).toBe(200);
      expect(refreshRes.json().accessToken).toBeDefined();

      // 4. Logout
      const logoutRes = await ctx.fastify.inject({
        method: 'POST',
        url: '/api/auth/logout',
      });
      expect(logoutRes.statusCode).toBe(200);
      expect(logoutRes.json().success).toBe(true);
    });
  });
});
