import bcrypt from 'bcrypt';
import { UserRepository } from '../repositories/user.repository.js';
import { I_User } from '../interfaces/user.interfaces.js';
import { Result, success, failure } from '../../utils/Error/ErrorManagement.js';

export class UserService {
  private static _userRepo: UserRepository;

  constructor(userRepo: UserRepository) {
    UserService._userRepo = userRepo;
  }

  // Create
  static async createUser(email: string, password: string, googleId?: string): Promise<Result<I_User>> {
    const hashed = await bcrypt.hash(password, 12);
    return UserService._userRepo.create({
      email,
      password: hashed,
      google_id: googleId ?? null,
      provider: googleId ? 'google' : 'local',
      is_admin: 0,
    });
  }

  static async createAdmin(email: string, password: string, googleId?: string): Promise<Result<I_User>> {
    const hashed = await bcrypt.hash(password, 12);
    return UserService._userRepo.create({
      email,
      password: hashed,
      google_id: googleId ?? null,
      provider: googleId ? 'google' : 'local',
      is_admin: 1,
    });
  }

  // Read
  static getUserById(userId: number): Result<I_User> {
    return UserService._userRepo.findById(userId);
  }

  static getUserByEmail(email: string): Result<I_User[]> {
    return UserService._userRepo.findOneByEmail(email);
  }

  // Update
  static async updatePassword(userId: number, newPassword: string): Promise<Result<I_User>> {
    const hashed = await bcrypt.hash(newPassword, 12);
    return UserService._userRepo.update(userId, { password: hashed });
  }

  static updateEmail(userId: number, newEmail: string): Result<I_User> {
    return UserService._userRepo.update(userId, { email: newEmail });
  }

  // ==================== DELETE ====================

  /**
   * Vérifie si le mot de passe fourni correspond à celui de l'utilisateur
   */
  static async verifyPassword(userId: number, plainPassword: string): Promise<Result<boolean>> {
    const userResult = UserService._userRepo.findById(userId);
    if (!userResult.ok)
      return failure('NOT_FOUND', 'User not found');

    const user = userResult.data;
    if (!user.password)
      return failure('VALIDATION', 'User has no password (OAuth account)');

    const match = await bcrypt.compare(plainPassword, user.password);
    if (!match)
      return failure('UNAUTHORIZED', 'Password incorrect');

    return success(true);
  }

  /**
   * Vérifie si currentUser a le droit de supprimer targetUserId
   * - Admin peut supprimer n'importe qui
   * - User normal peut seulement se supprimer lui-même
   */
  static canDeleteUser(currentUser: I_User, targetUserId: number): Result<boolean> {
    if (currentUser.is_admin === 1)
      return success(true);

    if (currentUser.id !== targetUserId)
      return failure('FORBIDDEN', 'Not authorized to delete this user');

    return success(true);
  }

  /**
   * Vérifie l'identité pour les comptes Google (google_id doit matcher)
   */
  static verifyGoogleIdentity(currentUser: I_User, targetUser: I_User): Result<boolean> {
    if (targetUser.provider !== 'google')
      return failure('VALIDATION', 'User is not a Google account');

    if (currentUser.google_id !== targetUser.google_id)
      return failure('UNAUTHORIZED', 'Google identity mismatch');

    return success(true);
  }

  /**
   * Supprime un utilisateur (sans vérifications)
   */
  static deleteUserById(userId: number): Result<boolean> {
    const userResult = UserService._userRepo.findById(userId);
    if (!userResult.ok)
      return failure('NOT_FOUND', 'User not found');

    const deleteResult = UserService._userRepo.delete(userId);
    if (!deleteResult.ok)
      return failure('DATABASE', 'Failed to delete user');

    return success(true);
  }

  /**
   * Supprime un utilisateur avec toutes les vérifications (auth + permissions)
   * - currentUser: l'utilisateur qui fait la demande
   * - userIdToDel: l'ID de l'utilisateur à supprimer
   * - password: mot de passe pour confirmer (requis si non-admin et compte local)
   */
  static async deleteUserWithAuth(
    currentUser: I_User,
    userIdToDel: number,
    password?: string
  ): Promise<Result<boolean>> {
    // 1. Vérifier que l'utilisateur cible existe
    const targetUserResult = UserService._userRepo.findById(userIdToDel);
    if (!targetUserResult.ok)
      return failure('NOT_FOUND', 'User not found');

    const targetUser = targetUserResult.data;

    // 2. Vérifier les permissions
    const canDelete = UserService.canDeleteUser(currentUser, userIdToDel);
    if (!canDelete.ok)
      return canDelete;

    // 3. Si non-admin, vérifier l'identité (password ou google)
    if (currentUser.is_admin === 0) {
      if (targetUser.provider === 'local') {
        if (!password)
          return failure('VALIDATION', 'Password required to delete account');
        const passwordCheck = await UserService.verifyPassword(userIdToDel, password);
        if (!passwordCheck.ok)
          return passwordCheck;
      }
      else if (targetUser.provider === 'google') {
        const googleCheck = UserService.verifyGoogleIdentity(currentUser, targetUser);
        if (!googleCheck.ok)
          return googleCheck;
      }
    }

    // 4. Supprimer l'utilisateur
    return UserService.deleteUserById(userIdToDel);
  }

}