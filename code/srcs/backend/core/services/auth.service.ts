import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { Result, success, failure } from '../../utils/Error/ErrorManagement.js';
import { UserService } from './user.service.js';
import {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
  AccessTokenPayload,
} from '../../config/jwt.js';

const location = 'core/services/auth.service.ts';

/** Hash SHA-256 du refresh token avant stockage en BDD */
function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export class AuthService {
  constructor(private _userService: UserService) {}

  // ========== REGISTER ==========

  async register(email: string, password: string): Promise<Result<AuthTokens>> {
    // Vérifier si l'email existe déjà
    const exists = this._userService.emailExists(email);
    if (!exists.ok) return exists;
    if (exists.data)
      return failure('CONFLICT', `${location} register: email already exists`, email);

    // Créer l'utilisateur via UserService (qui gère le hash + validation)
    const userResult = await this._userService.createUser(email, password);
    if (!userResult.ok) return userResult;

    const user = userResult.data;

    // Générer les tokens
    const accessResult = generateAccessToken({
      userId: user.id,
      email: user.email,
      is_admin: user.is_admin,
    });
    if (!accessResult.ok) return accessResult;

    const refreshResult = generateRefreshToken({ userId: user.id });
    if (!refreshResult.ok) return refreshResult;

    // Sauvegarder le hash du refresh token en BDD
    this._userService.saveRefreshToken(user.id, hashToken(refreshResult.data));

    return success({
      accessToken: accessResult.data,
      refreshToken: refreshResult.data,
    });
  }

  // ========== LOGIN ==========

  async login(email: string, password: string): Promise<Result<AuthTokens>> {
    // Chercher l'utilisateur par email
    const userResult = this._userService.getUserByEmail(email);
    if (!userResult.ok) return userResult;

    if (!userResult.data)
      return failure('UNAUTHORIZED', `${location} login: invalid email or password`);

    const user = userResult.data;

    // Vérifier le mot de passe
    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch)
      return failure('UNAUTHORIZED', `${location} login: invalid email or password`);

    // Générer les tokens
    const accessResult = generateAccessToken({
      userId: user.id,
      email: user.email,
      is_admin: user.is_admin,
    });
    if (!accessResult.ok) return accessResult;

    const refreshResult = generateRefreshToken({ userId: user.id });
    if (!refreshResult.ok) return refreshResult;

    // Sauvegarder le hash du refresh token en BDD
    this._userService.saveRefreshToken(user.id, hashToken(refreshResult.data));

    return success({
      accessToken: accessResult.data,
      refreshToken: refreshResult.data,
    });
  }

  // ========== REFRESH ==========

  refresh(refreshToken: string): Result<{ accessToken: string }> {
    // Vérifier le refresh token
    const decoded = verifyRefreshToken(refreshToken);
    if (!decoded.ok) return decoded;

    // Vérifier que l'utilisateur existe toujours
    const userResult = this._userService.getUserById(decoded.data.userId);
    if (!userResult.ok)
      return failure('UNAUTHORIZED', `${location} refresh: user no longer exists`);

    const user = userResult.data;

    // Vérifier que le hash du refresh token en BDD correspond
    if (user.refresh_token !== hashToken(refreshToken))
      return failure('UNAUTHORIZED', `${location} refresh: token revoked`);

    // Générer un nouvel access token
    const accessResult = generateAccessToken({
      userId: user.id,
      email: user.email,
      is_admin: user.is_admin,
    });
    if (!accessResult.ok) return accessResult;

    return success({ accessToken: accessResult.data });
  }

  // ========== LOGOUT ==========

  logout(userId: number): Result<boolean> {
    const result = this._userService.clearRefreshToken(userId);
    if (!result.ok) return result;
    return success(true);
  }
}
