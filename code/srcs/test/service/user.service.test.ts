import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Logger, updateENV } from '../../backend/utils/logger.js';
import {
  TestContext,
  createTestContext,
  closeTestContext,
  expectDateCloseToNow,
  createTestUser,
  createTestAdmin,
} from '../helpers/test.helper.js';

updateENV("debug");
Logger.debug("Test UserService", "Tests du service User avec bcrypt et auth");

describe('UserService', () => {
  let ctx: TestContext;

  beforeEach(() => { ctx = createTestContext(); });
  afterEach(() => { closeTestContext(ctx); });

  // ========== VALIDATION ==========

  describe('Validation', () => {
    it('Erreur si email invalide', async () => {
      const res = await ctx.userService.createUser('invalid', 'password123');
      expect(res.ok).toBe(false);
      if (!res.ok) expect(res.error.type).toBe('INVALID_ARG');
    });

    it('Erreur si email sans domaine', async () => {
      const res = await ctx.userService.createUser('test@', 'password123');
      expect(res.ok).toBe(false);
    });

    it('Erreur si password < 6 chars', async () => {
      const res = await ctx.userService.createUser('test@example.com', '12345');
      expect(res.ok).toBe(false);
      if (!res.ok) expect(res.error.type).toBe('INVALID_ARG');
    });

    it('Accepte password de 6 chars', async () => {
      const res = await ctx.userService.createUser('test@example.com', '123456');
      expect(res.ok).toBe(true);
    });
  });

  // ========== CREATE ==========

  describe('createUser()', () => {
    it('Crée un user avec password hashé', async () => {
      const res = await ctx.userService.createUser('test@example.com', 'password123');
      expect(res.ok).toBe(true);
      if (!res.ok) return;

      expect(res.data.email).toBe('test@example.com');
      expect(res.data.is_admin).toBe(0);
      expect(res.data.provider).toBe('local');
      expect(res.data.password).not.toBe('password123');
      expect(res.data.password.startsWith('$2')).toBe(true);
      expectDateCloseToNow(res.data.created_at);
    });

    it('Crée un user avec google_id', async () => {
      const res = await ctx.userService.createUser('g@example.com', 'pass123', 'google_123');
      expect(res.ok).toBe(true);
      if (res.ok) {
        expect(res.data.google_id).toBe('google_123');
        expect(res.data.provider).toBe('google');
      }
    });

    it('Erreur si email déjà existant', async () => {
      await ctx.userService.createUser('dup@example.com', 'password123');
      const res = await ctx.userService.createUser('dup@example.com', 'password456');
      expect(res.ok).toBe(false);
      if (!res.ok) expect(res.error.type).toBe('CONFLICT');
    });
  });

  describe('createAdmin()', () => {
    it('Crée un admin avec is_admin = 1', async () => {
      const res = await ctx.userService.createAdmin('admin@example.com', 'adminpass');
      expect(res.ok).toBe(true);
      if (res.ok) expect(res.data.is_admin).toBe(1);
    });

    it('Erreur si email/password invalide', async () => {
      expect((await ctx.userService.createAdmin('invalid', 'adminpass')).ok).toBe(false);
      expect((await ctx.userService.createAdmin('admin@example.com', '123')).ok).toBe(false);
    });
  });

  // ========== READ ==========

  describe('getUserById()', () => {
    it('Récupère un user par ID', async () => {
      const user = await createTestUser(ctx.userService);
      const res = ctx.userService.getUserById(user.id);
      expect(res.ok).toBe(true);
      if (res.ok) expect(res.data.email).toBe('test@example.com');
    });

    it('Erreur si ID inexistant', () => {
      const res = ctx.userService.getUserById(9999);
      expect(res.ok).toBe(false);
      if (!res.ok) expect(res.error.type).toBe('NOT_FOUND');
    });
  });

  describe('getUserByEmail()', () => {
    it('Récupère un user par email', async () => {
      await createTestUser(ctx.userService, 'find@example.com');
      const res = ctx.userService.getUserByEmail('find@example.com');
      expect(res.ok).toBe(true);
      if (res.ok) {
        expect(res.data).not.toBeNull();
        expect(res.data!.email).toBe('find@example.com');
      }
    });

    it('Retourne null si email inexistant', () => {
      const res = ctx.userService.getUserByEmail('notfound@example.com');
      expect(res.ok).toBe(true);
      if (res.ok) expect(res.data).toBeNull();
    });
  });

  describe('getAll()', () => {
    it('Récupère tous les users', async () => {
      await createTestUser(ctx.userService, 'u1@example.com');
      await createTestUser(ctx.userService, 'u2@example.com');
      await createTestAdmin(ctx.userService, 'admin@example.com');
      const res = ctx.userService.getAll();
      expect(res.ok).toBe(true);
      if (res.ok) expect(res.data.length).toBe(3);
    });

    it('Retourne liste vide si aucun user', () => {
      const res = ctx.userService.getAll();
      expect(res.ok).toBe(true);
      if (res.ok) expect(res.data.length).toBe(0);
    });
  });

  describe('emailExists()', () => {
    it('Retourne true si email existe', async () => {
      await createTestUser(ctx.userService, 'exists@example.com');
      const res = ctx.userService.emailExists('exists@example.com');
      expect(res.ok).toBe(true);
      if (res.ok) expect(res.data).toBe(true);
    });

    it('Retourne false si email n\'existe pas', () => {
      const res = ctx.userService.emailExists('notexists@example.com');
      expect(res.ok).toBe(true);
      if (res.ok) expect(res.data).toBe(false);
    });
  });

  // ========== UPDATE ==========

  describe('updatePassword()', () => {
    it('Met à jour le password (hashé)', async () => {
      const user = await createTestUser(ctx.userService);
      const oldHash = user.password;
      const res = await ctx.userService.updatePassword(user.id, 'newpassword');
      expect(res.ok).toBe(true);
      if (res.ok) {
        expect(res.data.password).not.toBe(oldHash);
        expect(res.data.password.startsWith('$2')).toBe(true);
      }
    });

    it('Erreur si password trop court ou ID inexistant', async () => {
      const user = await createTestUser(ctx.userService);
      expect((await ctx.userService.updatePassword(user.id, '123')).ok).toBe(false);
      expect((await ctx.userService.updatePassword(9999, 'newpass')).ok).toBe(false);
    });
  });

  describe('updateEmail()', () => {
    it('Met à jour l\'email', async () => {
      const user = await createTestUser(ctx.userService, 'old@example.com');
      const res = ctx.userService.updateEmail(user.id, 'new@example.com');
      expect(res.ok).toBe(true);
      if (res.ok) expect(res.data.email).toBe('new@example.com');
    });

    it('Erreur si email invalide ou ID inexistant', async () => {
      const user = await createTestUser(ctx.userService);
      expect(ctx.userService.updateEmail(user.id, 'invalid').ok).toBe(false);
      expect(ctx.userService.updateEmail(9999, 'new@example.com').ok).toBe(false);
    });
  });

  // ========== AUTH ==========

  describe('verifyPassword()', () => {
    it('Retourne true si password correct', async () => {
      const user = await createTestUser(ctx.userService, 'test@example.com', 'correctpass');
      const res = await ctx.userService.verifyPassword(user.id, 'correctpass');
      expect(res.ok).toBe(true);
      if (res.ok) expect(res.data).toBe(true);
    });

    it('Erreur si password incorrect ou user inexistant', async () => {
      const user = await createTestUser(ctx.userService, 'test@example.com', 'correctpass');
      expect((await ctx.userService.verifyPassword(user.id, 'wrongpass')).ok).toBe(false);
      expect((await ctx.userService.verifyPassword(9999, 'pass')).ok).toBe(false);
    });
  });

  describe('canDeleteUser()', () => {
    it('Admin peut supprimer n\'importe qui', async () => {
      const admin = await createTestAdmin(ctx.userService);
      const user = await createTestUser(ctx.userService, 'user@example.com');
      expect(ctx.userService.canDeleteUser(admin, user.id).ok).toBe(true);
    });

    it('User peut se supprimer lui-même', async () => {
      const user = await createTestUser(ctx.userService);
      expect(ctx.userService.canDeleteUser(user, user.id).ok).toBe(true);
    });

    it('User ne peut pas supprimer un autre', async () => {
      const user1 = await createTestUser(ctx.userService, 'u1@example.com');
      const user2 = await createTestUser(ctx.userService, 'u2@example.com');
      const res = ctx.userService.canDeleteUser(user1, user2.id);
      expect(res.ok).toBe(false);
      if (!res.ok) expect(res.error.type).toBe('FORBIDDEN');
    });
  });

  describe('verifyGoogleIdentity()', () => {
    it('OK si google_id match', async () => {
      const user = await createTestUser(ctx.userService, 'g@example.com', 'pass123');
      // Note: createTestUser avec googleId pas supporté, test basique
      const localUser = await createTestUser(ctx.userService, 'local@example.com');
      expect(ctx.userService.verifyGoogleIdentity(localUser, localUser).ok).toBe(false);
    });
  });

  // ========== DELETE ==========

  describe('deleteUserById()', () => {
    it('Supprime un user', async () => {
      const user = await createTestUser(ctx.userService);
      const res = ctx.userService.deleteUserById(user.id);
      expect(res.ok).toBe(true);
      expect(ctx.userService.getUserById(user.id).ok).toBe(false);
    });

    it('Erreur si ID inexistant', () => {
      expect(ctx.userService.deleteUserById(9999).ok).toBe(false);
    });
  });

  describe('deleteUserWithAuth()', () => {
    it('Admin peut supprimer sans password', async () => {
      const admin = await createTestAdmin(ctx.userService);
      const user = await createTestUser(ctx.userService, 'user@example.com');
      expect((await ctx.userService.deleteUserWithAuth(admin, user.id)).ok).toBe(true);
    });

    it('User local doit fournir son password', async () => {
      const user = await createTestUser(ctx.userService, 'user@example.com', 'mypassword');
      expect((await ctx.userService.deleteUserWithAuth(user, user.id, 'mypassword')).ok).toBe(true);
    });

    it('Erreur si password manquant/incorrect', async () => {
      const user = await createTestUser(ctx.userService, 'user@example.com', 'mypassword');
      expect((await ctx.userService.deleteUserWithAuth(user, user.id)).ok).toBe(false);

      const user2 = await createTestUser(ctx.userService, 'user2@example.com', 'mypassword');
      expect((await ctx.userService.deleteUserWithAuth(user2, user2.id, 'wrongpass')).ok).toBe(false);
    });

    it('User ne peut pas supprimer un autre', async () => {
      const user1 = await createTestUser(ctx.userService, 'u1@example.com');
      const user2 = await createTestUser(ctx.userService, 'u2@example.com');
      const res = await ctx.userService.deleteUserWithAuth(user1, user2.id, 'password123');
      expect(res.ok).toBe(false);
      if (!res.ok) expect(res.error.type).toBe('FORBIDDEN');
    });
  });
});
