import jwt from 'jsonwebtoken';
import { failure, Result, success } from '../utils/Error/ErrorManagement.js';

const location = 'config/jwt.ts';

// ========== TYPES ==========

export interface AccessTokenPayload {
  userId: number;
  email: string;
  is_admin: number;
}

export interface RefreshTokenPayload {
  userId: number;
}

// ========== SECRETS ==========

const ACCESS_SECRET = process.env.JWT_TOKEN || '';
const REFRESH_SECRET = process.env.JWT_TOKEN_REFRESH || '';

const ACCESS_EXPIRES_IN = '15m';
const REFRESH_EXPIRES_IN = '7d';

// ========== GENERATE ==========

export function generateAccessToken(payload: AccessTokenPayload): Result<string> {
  if (!ACCESS_SECRET)
    return failure('INTERNAL', `${location} generateAccessToken: JWT_TOKEN is not defined in .env`);

  try {
    const token = jwt.sign(payload, ACCESS_SECRET, { algorithm: 'HS256', expiresIn: ACCESS_EXPIRES_IN });
    return success(token);
  } catch (err) {
    return failure('INTERNAL', `${location} generateAccessToken: failed to sign token`, err);
  }
}

export function generateRefreshToken(payload: RefreshTokenPayload): Result<string> {
  if (!REFRESH_SECRET)
    return failure('INTERNAL', `${location} generateRefreshToken: JWT_TOKEN_REFRESH is not defined in .env`);

  try {
    const token = jwt.sign(payload, REFRESH_SECRET, { algorithm: 'HS256', expiresIn: REFRESH_EXPIRES_IN });
    return success(token);
  } catch (err) {
    return failure('INTERNAL', `${location} generateRefreshToken: failed to sign token`, err);
  }
}

// ========== VERIFY ==========

export function verifyAccessToken(token: string): Result<AccessTokenPayload> {
  if (!ACCESS_SECRET)
    return failure('INTERNAL', `${location} verifyAccessToken: JWT_TOKEN is not defined in .env`);

  try {
    const decoded = jwt.verify(token, ACCESS_SECRET, { algorithms: ['HS256'] }) as AccessTokenPayload;
    return success(decoded);
  } catch (err) {
    if (err instanceof jwt.TokenExpiredError)
      return failure('UNAUTHORIZED', `${location} verifyAccessToken: token expired`);
    return failure('UNAUTHORIZED', `${location} verifyAccessToken: invalid token`, err);
  }
}

export function verifyRefreshToken(token: string): Result<RefreshTokenPayload> {
  if (!REFRESH_SECRET)
    return failure('INTERNAL', `${location} verifyRefreshToken: JWT_TOKEN_REFRESH is not defined in .env`);

  try {
    const decoded = jwt.verify(token, REFRESH_SECRET, { algorithms: ['HS256'] }) as RefreshTokenPayload;
    return success(decoded);
  } catch (err) {
    if (err instanceof jwt.TokenExpiredError)
      return failure('UNAUTHORIZED', `${location} verifyRefreshToken: refresh token expired`);
    return failure('UNAUTHORIZED', `${location} verifyRefreshToken: invalid refresh token`, err);
  }
}
