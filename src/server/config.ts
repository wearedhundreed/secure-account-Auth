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
      'audit:read',
      'data:read',
      'data:write',
      'files:read',
      'files:write'
    ],
    manager: [
      'users:read',
      'reports:read',
      'reports:export',
      'data:read',
      'data:write'
    ],
    auditor: [
      'users:read',
      'reports:read',
      'audit:read',
      'data:read'
    ],
    user: [
      'users:read',
      'data:read',
      'data:write'
    ]
  } as Record<UserRole, Permission[]>,
  DEFAULT_ROLE_SCOPES: {
    admin: 'read write offline_access admin:all data:read data:write files:read files:write',
    manager: 'read write offline_access data:read data:write',
    user: 'read write offline_access data:read data:write',
    auditor: 'read offline_access audit:read data:read'
  } as Record<UserRole, string>
};
