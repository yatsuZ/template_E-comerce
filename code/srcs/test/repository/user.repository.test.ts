import {getENV, updateENV, Logger} from "./../../backend/utils/logger.js"
import { UserRepository } from "./../../backend/core/repositories/user.repository.js"
import {DatabaseManager} from "./../../backend/config/db.js"
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { I_User } from "../../backend/core/interfaces/user.interfaces.js";

updateENV("debug");

const location = "Teste de User Repository";

Logger.debug(location, "Je dois tester Le reposotorie de User avec la bdd avec la methode CRUD")


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
      const rowId : number = userRepo.createUser(email, pwd);

      const user = db.getConnection()
        .prepare(`SELECT * FROM users WHERE id = ?`)
        .get(rowId) as I_User | undefined;

      Logger.debug(location, `rowid[${rowId}] = `, user);
      expect(user).toBeDefined();
      expect(user!.id).toBe(1);
      expect(user!.email).toBe(email);
      expect(user!.password).toBe(pwd);
    });

  });

  describe('createAdmin', () => {
    it('devrait créer un Administrateur avec les données minimales', () => {
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
