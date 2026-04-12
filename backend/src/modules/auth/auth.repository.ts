import bcrypt from 'bcryptjs';
import { User, IUser } from '../../models/User';
import { Tenant, ITenant } from '../../models/Tenant';
import { RefreshToken, IRefreshToken } from '../../models/RefreshToken';
import { AppError } from '../../middleware/errorHandler';

export async function findUserByEmail(
  email: string,
  tenantId: string
): Promise<IUser | null> {
  return User.findOne({ email: email.toLowerCase(), tenantId });
}

export async function findUserByEmailGlobal(email: string): Promise<IUser | null> {
  return User.findOne({ email: email.toLowerCase() });
}

export async function findUserById(userId: string): Promise<IUser | null> {
  return User.findById(userId);
}

export async function createUserAndTenant(data: {
  email: string;
  password: string;
  name: string;
  tenantName: string;
}): Promise<{ user: IUser; tenant: ITenant }> {
  const passwordHash = await bcrypt.hash(data.password, 12);

  const tenant = await Tenant.create({
    name: data.tenantName,
    pageId: `pending_${Date.now()}`,
    accessToken: '',
    webhookVerifyToken: require('crypto').randomBytes(16).toString('hex'),
  });

  const user = await User.create({
    tenantId: tenant._id,
    email: data.email.toLowerCase(),
    passwordHash,
    name: data.name,
    role: 'owner', // first user who registers owns the tenant
  });

  return { user, tenant };
}

export async function verifyPassword(user: IUser, password: string): Promise<boolean> {
  return bcrypt.compare(password, user.passwordHash);
}

export async function findTenantById(tenantId: string): Promise<ITenant | null> {
  return Tenant.findById(tenantId);
}

export async function updateLastLogin(userId: string): Promise<void> {
  await User.findByIdAndUpdate(userId, { lastLoginAt: new Date() });
}

// ─── Refresh Token Operations ─────────────────────────────────────────────────

export async function storeRefreshToken(
  userId: string,
  tenantId: string,
  tokenHash: string,
  expiresAt: Date
): Promise<IRefreshToken> {
  return RefreshToken.create({ userId, tenantId, tokenHash, expiresAt });
}

export async function findRefreshToken(tokenHash: string): Promise<IRefreshToken | null> {
  return RefreshToken.findOne({ tokenHash });
}

export async function deleteRefreshToken(tokenHash: string): Promise<void> {
  await RefreshToken.deleteOne({ tokenHash });
}

export async function deleteAllUserRefreshTokens(userId: string): Promise<void> {
  await RefreshToken.deleteMany({ userId });
}
