import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { env } from '../../config/env';
import { AppError } from '../../middleware/errorHandler';
import * as authRepo from './auth.repository';
import type { JwtPayload, Role } from '../../middleware/auth';

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Parse duration strings like '15m', '7d', '1h', '30d' → milliseconds.
 */
function parseDurationMs(duration: string): number {
  const match = duration.match(/^(\d+)([smhd])$/);
  if (!match) return 30 * 24 * 60 * 60 * 1000; // default 30 days
  const value = parseInt(match[1], 10);
  const unit = match[2];
  const multipliers: Record<string, number> = {
    s: 1_000,
    m: 60 * 1_000,
    h: 60 * 60 * 1_000,
    d: 24 * 60 * 60 * 1_000,
  };
  return value * multipliers[unit];
}

/**
 * Issue an access token + refresh token pair for the given payload.
 * Returns the raw refresh token (to send to client) and its hash (to store in DB).
 */
function issueTokenPair(payload: JwtPayload): {
  accessToken: string;
  refreshToken: string;
  refreshTokenHash: string;
  refreshExpiresAt: Date;
} {
  const accessToken = jwt.sign(payload, env.jwtSecret, {
    expiresIn: env.jwtExpiresIn as jwt.SignOptions['expiresIn'],
  });

  const refreshTokenRaw = crypto.randomBytes(40).toString('hex');
  const refreshTokenHash = crypto
    .createHash('sha256')
    .update(refreshTokenRaw)
    .digest('hex');

  const refreshExpiresAt = new Date(
    Date.now() + parseDurationMs(env.jwtRefreshExpiresIn)
  );

  return { accessToken, refreshToken: refreshTokenRaw, refreshTokenHash, refreshExpiresAt };
}

// ─── Auth Operations ──────────────────────────────────────────────────────────

export async function register(data: {
  email: string;
  password: string;
  name: string;
  tenantName: string;
}): Promise<{ accessToken: string; refreshToken: string }> {
  const existing = await authRepo.findUserByEmailGlobal(data.email);
  if (existing) throw new AppError('Email already registered', 409);

  const { user, tenant } = await authRepo.createUserAndTenant(data);

  const payload: JwtPayload = {
    userId: user._id.toString(),
    tenantId: tenant._id.toString(),
    role: user.role as Role,
  };

  const { accessToken, refreshToken, refreshTokenHash, refreshExpiresAt } =
    issueTokenPair(payload);

  await authRepo.storeRefreshToken(
    payload.userId,
    payload.tenantId,
    refreshTokenHash,
    refreshExpiresAt
  );

  return { accessToken, refreshToken };
}

export async function login(data: {
  email: string;
  password: string;
  tenantId?: string;
}): Promise<{ accessToken: string; refreshToken: string }> {
  const user = data.tenantId
    ? await authRepo.findUserByEmail(data.email, data.tenantId)
    : await import('../../models/User').then(({ User }) =>
        User.findOne({ email: data.email.toLowerCase() })
      );

  if (!user) throw new AppError('Invalid credentials', 401);
  if (!user.isActive) throw new AppError('Account is inactive', 401);

  const valid = await authRepo.verifyPassword(user, data.password);
  if (!valid) throw new AppError('Invalid credentials', 401);

  const payload: JwtPayload = {
    userId: user._id.toString(),
    tenantId: user.tenantId.toString(),
    role: user.role as Role,
  };

  const { accessToken, refreshToken, refreshTokenHash, refreshExpiresAt } =
    issueTokenPair(payload);

  await Promise.all([
    authRepo.storeRefreshToken(
      payload.userId,
      payload.tenantId,
      refreshTokenHash,
      refreshExpiresAt
    ),
    authRepo.updateLastLogin(payload.userId),
  ]);

  return { accessToken, refreshToken };
}

/**
 * Verify a refresh token and issue a new access + refresh token pair (rotation).
 * The old refresh token is revoked on use.
 */
export async function refresh(
  token: string
): Promise<{ accessToken: string; refreshToken: string }> {
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  const stored = await authRepo.findRefreshToken(tokenHash);

  if (!stored || stored.expiresAt < new Date()) {
    throw new AppError('Invalid or expired refresh token', 401);
  }

  const user = await authRepo.findUserById(stored.userId.toString());
  if (!user || !user.isActive) {
    throw new AppError('User not found or inactive', 401);
  }

  const payload: JwtPayload = {
    userId: user._id.toString(),
    tenantId: user.tenantId.toString(),
    role: user.role as Role,
  };

  // Rotate: revoke old token, issue new pair
  await authRepo.deleteRefreshToken(tokenHash);

  const {
    accessToken,
    refreshToken: newRefreshToken,
    refreshTokenHash,
    refreshExpiresAt,
  } = issueTokenPair(payload);

  await authRepo.storeRefreshToken(
    payload.userId,
    payload.tenantId,
    refreshTokenHash,
    refreshExpiresAt
  );

  return { accessToken, refreshToken: newRefreshToken };
}

/**
 * Revoke a single refresh token (single-device logout).
 */
export async function logout(token: string): Promise<void> {
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  await authRepo.deleteRefreshToken(tokenHash);
}

/**
 * Revoke all refresh tokens for a user (logout from all devices).
 */
export async function logoutAll(userId: string): Promise<void> {
  await authRepo.deleteAllUserRefreshTokens(userId);
}

export async function getMe(userId: string) {
  const user = await authRepo.findUserById(userId);
  if (!user) throw new AppError('User not found', 404);

  const tenant = await authRepo.findTenantById(user.tenantId.toString());
  return {
    id: user._id,
    email: user.email,
    name: user.name,
    role: user.role,
    isActive: user.isActive,
    lastLoginAt: user.lastLoginAt,
    tenant: tenant
      ? { id: tenant._id, name: tenant.name, pageId: tenant.pageId }
      : null,
  };
}
