import {getENV, updateENV, Logger} from "./../../backend/utils/logger.js"
import { UserRepository } from "./../../backend/core/repositories/user.repository.js"
import {DatabaseManager} from "./../../backend/config/db.js"
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { I_User } from "../../backend/core/interfaces/user.interfaces.js";
import { tr } from "zod/locales";

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
  // Logger.debug("dans expectUsersEqual", actual, expected)
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


// Test create
  describe('createUser', () => {
    it('devrait créer un utilisateur avec les données minimales', () => {
      const email : string = 'testUser@gmail.com';
      const pwd : string = "123456";
      const rowId : number = userRepo.create(email, pwd);

      const user: I_User | undefined = db.getConnection()
        .prepare(`SELECT * FROM users WHERE id = ?`)
        .get(rowId) as I_User | undefined;

      // Logger.debug(location, `rowid[${rowId}] = `, user);
      expect(user).toBeDefined();

      expectUsersEqual(user!, {
        id: 1,
        email,
        password: pwd,
        google_id: null,
        provider: "local",
        is_admin: 0,
      });

      expectDateCloseToNow(user!.created_at);
      expectDateCloseToNow(user!.updated_at);

    });

  });

  describe('createAdmin', () => {
    it('devrait créer un Administrateur avec les données minimales', () => {
      const email : string = 'testAdmin@gmail.com';
      const pwd : string = "123456";
      const rowId : number = userRepo.createAdmin(email, pwd);

      const user: I_User | undefined = db.getConnection()
        .prepare(`SELECT * FROM users WHERE id = ?`)
        .get(rowId) as I_User | undefined;

      // Logger.debug(location, `rowid[${rowId}] = `, user);
      expect(user).toBeDefined();

      expectUsersEqual(user!, {
        id: 1,
        email,
        password: pwd,
        google_id: null,
        provider: "local",
        is_admin: 1,
      });

      expectDateCloseToNow(user!.created_at);
      expectDateCloseToNow(user!.updated_at);

    });

  });
/*
// Test Reade
describe('findOneById', () => {
  it('devrait récupérer un utilisateur existant à partir de son ID', () => {
  });
});

describe('findOneByEmail', () => {
  it('devrait récupérer un utilisateur existant à partir de son Email', () => {
  });
});

// Test Update
describe('updateUser', () => {
  it('devrait mettre à jour certaine information du User comme ', () => {
    it('email', () => {
    });
    it('Password', () => {
    });
  });
  it('Et verifier Si la date update à etais pris en compte', () => {
  });
  
});

// Test Delete
describe('delete', () => {
  it('devrait Suprimer un User à partir de son ID.', () => {
  });
});
*/

});
