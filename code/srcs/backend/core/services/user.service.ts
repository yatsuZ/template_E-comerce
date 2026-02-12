import bcrypt from 'bcrypt';
import { UserRepository } from '../repositories/user.repository.js';
import { I_User } from '../interfaces/user.interfaces.js';
import { Result, success, failure } from '../../utils/Error/ErrorManagement.js';

const location = 'core/services/user.service.ts';
const MIN_PASSWORD_LENGTH = 6;

export class UserService {
  constructor(private _userRepo: UserRepository) {}

  // ========== VALIDATION (private) ==========

  private isValidEmail(email: string): boolean {
    // Regex simple mais efficace pour valider un email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  private isValidPassword(password: string): boolean {
    return password.length >= MIN_PASSWORD_LENGTH;
  }

  // ========== CREATE ==========

  async createUser(email: string, password: string, googleId?: string): Promise<Result<I_User>> {
    // Validation email
    if (!this.isValidEmail(email))
      return failure('INVALID_ARG', `${location} createUser: invalid email format`, email);

    // Validation password
    if (!this.isValidPassword(password))
      return failure('INVALID_ARG', `${location} createUser: password must be at least ${MIN_PASSWORD_LENGTH} characters`, password.length);

    const hashed = await bcrypt.hash(password, 12);
    return this._userRepo.create({
      email,
      password: hashed,
      google_id: googleId ?? null,
      provider: googleId ? 'google' : 'local',
      is_admin: 0,
    });
  }

  async createAdmin(email: string, password: string, googleId?: string): Promise<Result<I_User>> {
    // Validation email
    if (!this.isValidEmail(email))
      return failure('INVALID_ARG', `${location} createAdmin: invalid email format`, email);

    // Validation password
    if (!this.isValidPassword(password))
      return failure('INVALID_ARG', `${location} createAdmin: password must be at least ${MIN_PASSWORD_LENGTH} characters`, password.length);

    const hashed = await bcrypt.hash(password, 12);
    return this._userRepo.create({
      email,
      password: hashed,
      google_id: googleId ?? null,
      provider: googleId ? 'google' : 'local',
      is_admin: 1,
    });
  }

  // ========== READ ==========

  getUserById(userId: number): Result<I_User> {
    return this._userRepo.findById(userId);
  }

  getUserByEmail(email: string): Result<I_User | null> {
    const result = this._userRepo.findOneByEmail(email);
    if (!result.ok) return result;

    // findOneByEmail retourne un array, on veut le premier ou null
    return success(result.data.length > 0 ? result.data[0] : null);
  }

  getAll(): Result<I_User[]> {
    return this._userRepo.findAll();
  }

  /**
   * Vérifie si un email existe déjà en BDD
   */
  emailExists(email: string): Result<boolean> {
    const result = this._userRepo.findOneByEmail(email);
    if (!result.ok) return result;

    return success(result.data.length > 0);
  }

  // ========== UPDATE ==========

  async updatePassword(userId: number, newPassword: string): Promise<Result<I_User>> {
    // Validation password
    if (!this.isValidPassword(newPassword))
      return failure('INVALID_ARG', `${location} updatePassword: password must be at least ${MIN_PASSWORD_LENGTH} characters`, newPassword.length);

    const hashed = await bcrypt.hash(newPassword, 12);
    return this._userRepo.update(userId, { password: hashed });
  }

  updateEmail(userId: number, newEmail: string): Result<I_User> {
    // Validation email
    if (!this.isValidEmail(newEmail))
      return failure('INVALID_ARG', `${location} updateEmail: invalid email format`, newEmail);

    return this._userRepo.update(userId, { email: newEmail });
  }

  // ========== AUTH ==========

  /**
   * Vérifie si le mot de passe fourni correspond à celui de l'utilisateur
   */
  async verifyPassword(userId: number, plainPassword: string): Promise<Result<boolean>> {
    const userResult = this._userRepo.findById(userId);
    if (!userResult.ok)
      return failure('NOT_FOUND', `${location} verifyPassword: user not found`);

    const user = userResult.data;
    if (!user.password)
      return failure('VALIDATION', `${location} verifyPassword: user has no password (OAuth account)`);

    const match = await bcrypt.compare(plainPassword, user.password);
    if (!match)
      return failure('UNAUTHORIZED', `${location} verifyPassword: password incorrect`);

    return success(true);
  }

  /**
   * Vérifie si currentUser a le droit de supprimer targetUserId
   * - Admin peut supprimer n'importe qui
   * - User normal peut seulement se supprimer lui-même
   */
  canDeleteUser(currentUser: I_User, targetUserId: number): Result<boolean> {
    if (currentUser.is_admin === 1)
      return success(true);

    if (currentUser.id !== targetUserId)
      return failure('FORBIDDEN', `${location} canDeleteUser: not authorized to delete this user`);

    return success(true);
  }

  /**
   * Vérifie l'identité pour les comptes Google (google_id doit matcher)
   */
  verifyGoogleIdentity(currentUser: I_User, targetUser: I_User): Result<boolean> {
    if (targetUser.provider !== 'google')
      return failure('VALIDATION', `${location} verifyGoogleIdentity: user is not a Google account`);

    if (currentUser.google_id !== targetUser.google_id)
      return failure('UNAUTHORIZED', `${location} verifyGoogleIdentity: Google identity mismatch`);

    return success(true);
  }

  // ========== SESSION ==========

  saveRefreshToken(userId: number, refreshToken: string): Result<I_User> {
    return this._userRepo.saveRefreshToken(userId, refreshToken);
  }

  clearRefreshToken(userId: number): Result<I_User> {
    return this._userRepo.clearRefreshToken(userId);
  }

  // ========== DELETE ==========

  /**
   * Supprime un utilisateur (sans vérifications)
   */
  deleteUserById(userId: number): Result<boolean> {
    const userResult = this._userRepo.findById(userId);
    if (!userResult.ok)
      return failure('NOT_FOUND', `${location} deleteUserById: user not found`);

    const deleteResult = this._userRepo.delete(userId);
    if (!deleteResult.ok)
      return failure('DATABASE', `${location} deleteUserById: failed to delete user`);

    return success(true);
  }

  /**
   * Supprime un utilisateur avec toutes les vérifications (auth + permissions)
   * - currentUser: l'utilisateur qui fait la demande
   * - userIdToDel: l'ID de l'utilisateur à supprimer
   * - password: mot de passe pour confirmer (requis si non-admin et compte local)
   */
  async deleteUserWithAuth(
    currentUser: I_User,
    userIdToDel: number,
    password?: string
  ): Promise<Result<boolean>> {
    // 1. Vérifier que l'utilisateur cible existe
    const targetUserResult = this._userRepo.findById(userIdToDel);
    if (!targetUserResult.ok)
      return failure('NOT_FOUND', `${location} deleteUserWithAuth: user not found`);

    const targetUser = targetUserResult.data;

    // 2. Vérifier les permissions
    const canDelete = this.canDeleteUser(currentUser, userIdToDel);
    if (!canDelete.ok)
      return canDelete;

    // 3. Si non-admin, vérifier l'identité (password ou google)
    if (currentUser.is_admin === 0) {
      if (targetUser.provider === 'local') {
        if (!password)
          return failure('VALIDATION', `${location} deleteUserWithAuth: password required to delete account`);
        const passwordCheck = await this.verifyPassword(userIdToDel, password);
        if (!passwordCheck.ok)
          return passwordCheck;
      }
      else if (targetUser.provider === 'google') {
        const googleCheck = this.verifyGoogleIdentity(currentUser, targetUser);
        if (!googleCheck.ok)
          return googleCheck;
      }
    }

    // 4. Supprimer l'utilisateur
    return this.deleteUserById(userIdToDel);
  }
}
