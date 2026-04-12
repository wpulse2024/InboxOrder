/**
 * Seed script — creates a demo tenant with owner, admin, and staff users.
 *
 * Usage:
 *   cd backend && npm run seed
 *
 * Credentials (all roles):
 *   owner@gmail.com  / 123456
 *   admin@gmail.com  / 123456
 *   staff@gmail.com  / 123456
 */

import 'dotenv/config';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { env } from '../config/env';
import { User } from '../models/User';
import { Tenant } from '../models/Tenant';
import { RefreshToken } from '../models/RefreshToken';

const SEED_PASSWORD = '123456';
const SALT_ROUNDS = 12;
const SEED_TENANT_NAME = 'Demo Tenant';

const SEED_USERS: Array<{ email: string; name: string; role: 'owner' | 'admin' | 'staff' }> = [
  { email: 'owner@gmail.com', name: 'Owner User', role: 'owner' },
  { email: 'admin@gmail.com', name: 'Admin User', role: 'admin' },
  { email: 'staff@gmail.com', name: 'Staff User', role: 'staff' },
];

async function seed(): Promise<void> {
  console.log('Connecting to MongoDB...');
  await mongoose.connect(env.mongodbUri);
  console.log('Connected.\n');

  // ── Cleanup previous seed data ──────────────────────────────────────────────
  const existingTenant = await Tenant.findOne({ name: SEED_TENANT_NAME });
  if (existingTenant) {
    const userIds = await User.find({ tenantId: existingTenant._id }).distinct('_id');
    await RefreshToken.deleteMany({ userId: { $in: userIds } });
    await User.deleteMany({ tenantId: existingTenant._id });
    await Tenant.deleteOne({ _id: existingTenant._id });
    console.log('Removed previous seed data.\n');
  }

  // ── Create tenant ────────────────────────────────────────────────────────────
  const tenant = await Tenant.create({
    name: SEED_TENANT_NAME,
    pageId: `seed_${Date.now()}`,
    accessToken: '',
    webhookVerifyToken: crypto.randomBytes(16).toString('hex'),
    isActive: true,
  });
  console.log(`Tenant created: "${tenant.name}" (${tenant._id})\n`);

  // ── Hash password once (shared by all seed users) ───────────────────────────
  const passwordHash = await bcrypt.hash(SEED_PASSWORD, SALT_ROUNDS);

  // ── Create users ─────────────────────────────────────────────────────────────
  console.log('Creating users:');
  for (const u of SEED_USERS) {
    const user = await User.create({
      tenantId: tenant._id,
      email: u.email,
      passwordHash,
      name: u.name,
      role: u.role,
      isActive: true,
    });
    console.log(`  [${u.role.padEnd(5)}] ${user.email}`);
  }

  console.log('\n──────────────────────────────────────────');
  console.log('Seed complete!');
  console.log(`Password for all accounts: ${SEED_PASSWORD}`);
  console.log('──────────────────────────────────────────\n');

  await mongoose.disconnect();
}

seed().catch((err: Error) => {
  console.error('Seed failed:', err.message);
  process.exit(1);
});
