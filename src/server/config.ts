import { Permission, UserRole } from './types.ts';

export const CONFIG = {
  PORT: 3000,
  BCRYPT_SALT_ROUNDS: 12,
  JWT_ACCESS_SECRET: process.env.JWT_SECRET || 'authforge-jwt-super-secret-production-key-256bit-min!',
  JWT_ACCESS_EXPIRES_IN_SECONDS: 15 * 60, // 15 minutes (900 seconds)
  JWT_ACCESS_EXPIRES_IN_HUMAN: '15m',
  REFRESH_TOKEN_EXPIRES_IN_SECONDS: 7 * 24 * 60 * 60, // 7 days
  FIREBASE_PROJECT_ID: process.env.FIREBASE_PROJECT_ID || 'authforge-cloud-sandbox',
  DEFAULT_ROLE_PERMISSIONS: {
    admin: [
      'users:read',
      'users:write',
      'reports:read',
      'reports:export',
      'system:admin',
      'audit:read'
    ],
    manager: [
      'users:read',
      'reports:read',
      'reports:export'
    ],
    auditor: [
      'users:read',
      'reports:read',
      'audit:read'
    ],
    user: [
      'users:read'
    ]
  } as Record<UserRole, Permission[]>
};
