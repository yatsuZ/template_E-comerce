import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {DatabaseManager} from './../../backend/config/db.js';
import { UserRepository } from '../../backend/core/repositories/user.repository.js';
import { I_User } from '../../backend/core/interfaces/user.interfaces.js';
import { Logger, updateENV } from '../../backend/utils/logger.js';

updateENV("debug");

const location = "Teste de User Repository";

Logger.debug(location, "Je dois tester Le reposotorie de User avec la bdd avec la methode CRUD")

function expectDateCloseToNow(dateValue: string | Date, toleranceMs = 5000) {
  const date = new Date(dateValue);
  const now = new Date();
  const diff = Math.abs(now.getTime() - date.getTime());
  expect(diff).toBeLessThan(toleranceMs);
}

function expectUsersEqual(actual: I_User, expected: Partial<I_User>) {
  expect(actual.id).toBe(expected.id);
  expect(actual.email).toBe(expected.email);
  expect(actual.password).toBe(expected.password);
  expect(actual.google_id).toBe(expected.google_id);
  expect(actual.provider).toBe(expected.provider);
  expect(actual.is_admin).toBe(expected.is_admin);
}

describe('UserRepository', () => {
  let db: DatabaseManager;
  let userRepo: UserRepository;

  beforeEach(() => {
    // Utiliser une BDD en mémoire pour les tests // ou est stocker :memory:
    db = new DatabaseManager(':memory:');
    userRepo = new UserRepository(db.getConnection());

  });

  afterEach(() => {
    db.close();
  });


  // -------------------
  // CREATE
  // -------------------

  it('Crée un utilisateur normal → create()', () => {
    const res = userRepo.create({
      email: 'test@gmail.com',
      password: '123456',
      google_id: null,
      provider: 'local',
      is_admin: 0,
    });

    if (!res.ok) {
      Logger.error(location, "Erreur create:", res.error);
    }
    expect(res.ok).toBe(true);
    if (!res.ok) return;

    const user = res.data;

    expectUsersEqual(user, {
      id: 1,
      email: 'test@gmail.com',
      password: '123456',
      google_id: null,
      provider: 'local',
      is_admin: 0,
    });

    expectDateCloseToNow(user.created_at);
    expectDateCloseToNow(user.updated_at);
  });

  // -------------------
  // READ
  // -------------------
  it('Récupère un user existant → findById()', () => {
    const created = userRepo.create({
      email: 'read@gmail.com',
      password: 'pwd',
      google_id: null,
      provider: 'local',
      is_admin: 0,
      });
      if (!created.ok) {
        Logger.error(location, "Erreur create:", created.error);
        throw new Error();
      }

      const res = userRepo.findById(created.data.id);
      if (!res.ok) {
        Logger.error(location, "Erreur findById:", res.error);
      }
      expect(res.ok).toBe(true);
      if (!res.ok) return;
      
      expect(res.data.email).toBe('read@gmail.com');
      });
      
  it('Récupère un user par email → findOneByEmail()', () => {
    userRepo.create({
      email: 'mail@gmail.com',
      password: 'pwd',
      google_id: null,
      provider: 'local',
      is_admin: 0,
    });

    const res = userRepo.findOneByEmail('mail@gmail.com');
    if (!res.ok) {
      Logger.error(location, "Erreur findOneByEmail:", res.error);
    }
    expect(res.ok).toBe(true);
    if (!res.ok) return;

    expect(res.data.length).toBe(1);
    expect(res.data[0].email).toBe('mail@gmail.com');
  });

  // -------------------
  // UPDATE
  // -------------------

  it('Met à jour email et updated_at → update()', async () => {
    const created = userRepo.create({
      email: 'old@gmail.com',
      password: 'pwd',
      google_id: null,
      provider: 'local',
      is_admin: 0,
    });
    if (!created.ok) {
      Logger.error(location, "Erreur create:", created.error);
      throw new Error();
    }

    const before = created.data.updated_at;

    const updated = userRepo.update(created.data.id, {
      email: 'new@gmail.com'
    });

    if (!updated.ok) {
      Logger.error(location, "Erreur update:", updated.error);
    }
    expect(updated.ok).toBe(true);
    if (!updated.ok) return;

    expect(updated.data.email).toBe('new@gmail.com');
    expect(new Date(updated.data.updated_at).getTime())
      .toBeGreaterThanOrEqual(new Date(before).getTime());
  });

  // -------------------
  // DELETE
  // -------------------

  it('Supprime un user → delete()', () => {
    const created = userRepo.create({
      email: 'delete@gmail.com',
      password: 'pwd',
      google_id: null,
      provider: 'local',
      is_admin: 0,
    });
    if (!created.ok) {
      Logger.error(location, "Erreur create:", created.error);
      throw new Error();
    }

    const del = userRepo.delete(created.data.id);
    if (!del.ok) {
      Logger.error(location, "Erreur delete:", del.error);
    }
    expect(del.ok).toBe(true);

    const find = userRepo.findById(created.data.id);
    expect(find.ok).toBe(false);
  });

  // -------------------
  // ERROR CASES
  // -------------------

  it('Erreur si email déjà existant → create()', () => {
    const first = userRepo.create({
      email: 'duplicate@gmail.com',
      password: 'pwd',
      google_id: null,
      provider: 'local',
      is_admin: 0,
    });
    expect(first.ok).toBe(true);

    const second = userRepo.create({
      email: 'duplicate@gmail.com',
      password: 'pwd2',
      google_id: null,
      provider: 'local',
      is_admin: 0,
    });

    expect(second.ok).toBe(false);
    if (!second.ok) {
      expect(second.error.type).toBe('CONFLICT');
    }
  });

  it('Erreur si ID inexistant → findById()', () => {
    const res = userRepo.findById(9999);

    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.error.type).toBe('NOT_FOUND');
    }
  });

  it('Retourne liste vide si email inexistant → findOneByEmail()', () => {
    const res = userRepo.findOneByEmail('nexistepas@gmail.com');

    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.data.length).toBe(0);
    }
  });

  it('Erreur si ID inexistant → update()', () => {
    const res = userRepo.update(9999, { email: 'new@gmail.com' });

    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.error.type).toBe('NOT_FOUND');
    }
  });

  it('Erreur si ID inexistant → delete()', () => {
    const res = userRepo.delete(9999);

    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.error.type).toBe('NOT_FOUND');
    }
  });
});
