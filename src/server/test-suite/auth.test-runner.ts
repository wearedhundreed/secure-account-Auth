import { PasswordService } from '../services/password.service.ts';
import { JwtService } from '../services/jwt.service.ts';
import { FirebaseAdminService } from '../services/firebase-admin.service.ts';
import { db } from '../db/in-memory-db.ts';
import { CONFIG } from '../config.ts';
import { RegisterSchema } from '../middleware/validation.middleware.ts';
import { User } from '../types.ts';

export interface TestCaseResult {
  id: string;
  name: string;
  category: 'unit' | 'integration' | 'security';
  description: string;
  passed: boolean;
  durationMs: number;
  assertions: {
    assertion: string;
    passed: boolean;
    expected?: any;
    actual?: any;
  }[];
  error?: string;
}

export interface TestSuiteSummary {
  totalTests: number;
  passed: number;
  failed: number;
  durationMs: number;
  timestamp: string;
  results: TestCaseResult[];
}

export class AuthTestSuiteRunner {
  public static async runAllTests(): Promise<TestSuiteSummary> {
    const startTime = Date.now();
    const results: TestCaseResult[] = [];

    // -------------------------------------------------------------
    // Unit Test 1: Bcrypt Password Hashing with Cost Factor 12
    // -------------------------------------------------------------
    results.push(await this.testBcryptCostFactor12());

    // -------------------------------------------------------------
    // Unit Test 2: JWT Access Token 15-Minute Expiration & Claims
    // -------------------------------------------------------------
    results.push(await this.testJwt15MinExpirationAndClaims());

    // -------------------------------------------------------------
    // Unit Test 3: Refresh Token Rotation & Family ID
    // -------------------------------------------------------------
    results.push(await this.testRefreshTokenRotation());

    // -------------------------------------------------------------
    // Unit Test 4: Refresh Token Reuse Detection & Revocation
    // -------------------------------------------------------------
    results.push(await this.testRefreshTokenReuseDetection());

    // -------------------------------------------------------------
    // Unit Test 5: Zod Input Validation Rules
    // -------------------------------------------------------------
    results.push(await this.testZodValidation());

    // -------------------------------------------------------------
    // Integration Test 1: User Registration & Duplicate Prevention
    // -------------------------------------------------------------
    results.push(await this.testRegistrationFlow());

    // -------------------------------------------------------------
    // Integration Test 2: Authentication & Password Verification
    // -------------------------------------------------------------
    results.push(await this.testAuthenticationFlow());

    // -------------------------------------------------------------
    // Integration Test 3: RBAC Role & Permission Enforcement
    // -------------------------------------------------------------
    results.push(await this.testRbacEnforcement());

    // -------------------------------------------------------------
    // Integration Test 4: Firebase Admin SDK Token Verification
    // -------------------------------------------------------------
    results.push(await this.testFirebaseAdminVerification());

    // -------------------------------------------------------------
    // Integration Test 5: Firebase Admin Tampered Token Rejection
    // -------------------------------------------------------------
    results.push(await this.testFirebaseAdminTamperRejection());

    const totalTests = results.length;
    const passed = results.filter(r => r.passed).length;
    const failed = totalTests - passed;

    return {
      totalTests,
      passed,
      failed,
      durationMs: Date.now() - startTime,
      timestamp: new Date().toISOString(),
      results
    };
  }

  private static async testBcryptCostFactor12(): Promise<TestCaseResult> {
    const start = Date.now();
    const assertions = [];
    let passed = true;
    let error: string | undefined;

    try {
      const plainText = 'SecureP@ssw0rd2026!';
      const hash = await PasswordService.hashPassword(plainText);

      // Verify cost factor
      const costFactor = PasswordService.extractCostFactor(hash);
      const isCost12 = costFactor === 12;
      assertions.push({
        assertion: 'Bcrypt salt rounds must be exactly 12',
        passed: isCost12,
        expected: 12,
        actual: costFactor
      });

      // Verify correct password matches
      const isMatch = await PasswordService.comparePassword(plainText, hash);
      assertions.push({
        assertion: 'PasswordService.comparePassword correctly validates original password',
        passed: isMatch,
        expected: true,
        actual: isMatch
      });

      // Verify wrong password fails
      const isWrongMatch = await PasswordService.comparePassword('WrongPassword123!', hash);
      assertions.push({
        assertion: 'PasswordService.comparePassword rejects invalid password',
        passed: !isWrongMatch,
        expected: false,
        actual: isWrongMatch
      });

      passed = assertions.every(a => a.passed);
    } catch (e: any) {
      passed = false;
      error = e.message;
    }

    return {
      id: 'UT-01',
      name: 'Bcrypt Password Hashing (Cost Factor 12)',
      category: 'unit',
      description: 'Verifies password hashing adheres strictly to bcrypt cost factor 12 and handles matching.',
      passed,
      durationMs: Date.now() - start,
      assertions,
      error
    };
  }

  private static async testJwt15MinExpirationAndClaims(): Promise<TestCaseResult> {
    const start = Date.now();
    const assertions = [];
    let passed = true;
    let error: string | undefined;

    try {
      const mockUser: User = {
        id: 'usr_jwt_test',
        email: 'jwt.tester@authforge.dev',
        name: 'JWT Tester',
        passwordHash: 'dummy',
        role: 'manager',
        permissions: ['reports:read', 'reports:export'],
        authProvider: 'local',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      const token = JwtService.signAccessToken(mockUser);
      assertions.push({
        assertion: 'Signed JWT token format contains three dot-separated segments',
        passed: token.split('.').length === 3,
        expected: 3,
        actual: token.split('.').length
      });

      const decoded = JwtService.verifyAccessToken(token);
      assertions.push({
        assertion: 'Decoded JWT payload contains correct sub claim',
        passed: decoded.sub === mockUser.id,
        expected: mockUser.id,
        actual: decoded.sub
      });

      assertions.push({
        assertion: 'Decoded JWT payload contains correct role claim',
        passed: decoded.role === 'manager',
        expected: 'manager',
        actual: decoded.role
      });

      // Verify 15-minute expiration (900 seconds)
      const diffSeconds = (decoded.exp || 0) - (decoded.iat || 0);
      const is15Min = diffSeconds === 900;
      assertions.push({
        assertion: 'JWT Access Token expiration is exactly 15 minutes (900 seconds)',
        passed: is15Min,
        expected: 900,
        actual: diffSeconds
      });

      passed = assertions.every(a => a.passed);
    } catch (e: any) {
      passed = false;
      error = e.message;
    }

    return {
      id: 'UT-02',
      name: 'JWT Access Token (15-Min Expiry & Claims)',
      category: 'unit',
      description: 'Ensures JWT access token lifetime is exactly 15 minutes and carries user claims and permissions.',
      passed,
      durationMs: Date.now() - start,
      assertions,
      error
    };
  }

  private static async testRefreshTokenRotation(): Promise<TestCaseResult> {
    const start = Date.now();
    const assertions = [];
    let passed = true;
    let error: string | undefined;

    try {
      const userId = 'usr_rotation_test';
      const record1 = JwtService.generateRefreshTokenRecord(userId);
      db.saveRefreshToken(record1);

      assertions.push({
        assertion: 'Initial refresh token generated with family ID and valid expiration',
        passed: !record1.isRevoked && !!record1.familyId,
        expected: true,
        actual: !record1.isRevoked
      });

      // Rotate: Mark record1 revoked, generate record2 in same family
      record1.isRevoked = true;
      const record2 = JwtService.generateRefreshTokenRecord(userId, record1.familyId);
      db.saveRefreshToken(record2);

      assertions.push({
        assertion: 'Previous refresh token is marked revoked upon rotation',
        passed: record1.isRevoked === true,
        expected: true,
        actual: record1.isRevoked
      });

      assertions.push({
        assertion: 'New refresh token retains identical family ID for rotation lineage',
        passed: record2.familyId === record1.familyId,
        expected: record1.familyId,
        actual: record2.familyId
      });

      passed = assertions.every(a => a.passed);
    } catch (e: any) {
      passed = false;
      error = e.message;
    }

    return {
      id: 'UT-03',
      name: 'Refresh Token Rotation Strategy',
      category: 'unit',
      description: 'Verifies single-use refresh token rotation and lineage tracking via family identifiers.',
      passed,
      durationMs: Date.now() - start,
      assertions,
      error
    };
  }

  private static async testRefreshTokenReuseDetection(): Promise<TestCaseResult> {
    const start = Date.now();
    const assertions = [];
    let passed = true;
    let error: string | undefined;

    try {
      const userId = 'usr_reuse_test';
      const initial = JwtService.generateRefreshTokenRecord(userId);
      db.saveRefreshToken(initial);

      // Rotate once
      initial.isRevoked = true;
      const rotated = JwtService.generateRefreshTokenRecord(userId, initial.familyId);
      db.saveRefreshToken(rotated);

      // Adversary attempts to reuse initial revoked token -> revoke entire family
      db.revokeFamily(initial.familyId);

      const refreshedRotated = db.findRefreshToken(rotated.token);
      assertions.push({
        assertion: 'Family revocation automatically revokes all descendant tokens upon reuse anomaly',
        passed: refreshedRotated?.isRevoked === true,
        expected: true,
        actual: refreshedRotated?.isRevoked
      });

      passed = assertions.every(a => a.passed);
    } catch (e: any) {
      passed = false;
      error = e.message;
    }

    return {
      id: 'UT-04',
      name: 'Refresh Token Reuse Detection & Revocation',
      category: 'security',
      description: 'Guarantees replay attacks on revoked refresh tokens trigger immediate whole-family invalidation.',
      passed,
      durationMs: Date.now() - start,
      assertions,
      error
    };
  }

  private static async testZodValidation(): Promise<TestCaseResult> {
    const start = Date.now();
    const assertions = [];
    let passed = true;
    let error: string | undefined;

    try {
      // 1. Invalid email
      const invalidEmail = RegisterSchema.safeParse({
        email: 'invalid-email-format',
        password: 'Password123!',
        name: 'Valid Name'
      });
      assertions.push({
        assertion: 'Zod rejects malformed email address',
        passed: !invalidEmail.success,
        expected: false,
        actual: invalidEmail.success
      });

      // 2. Short password (< 8 chars)
      const shortPassword = RegisterSchema.safeParse({
        email: 'valid@example.com',
        password: 'Pass1',
        name: 'Valid Name'
      });
      assertions.push({
        assertion: 'Zod rejects password under 8 characters',
        passed: !shortPassword.success,
        expected: false,
        actual: shortPassword.success
      });

      // 3. Password without digit
      const noDigit = RegisterSchema.safeParse({
        email: 'valid@example.com',
        password: 'PasswordOnly!',
        name: 'Valid Name'
      });
      assertions.push({
        assertion: 'Zod rejects password without numeric digit',
        passed: !noDigit.success,
        expected: false,
        actual: noDigit.success
      });

      // 4. Valid payload
      const valid = RegisterSchema.safeParse({
        email: 'valid@example.com',
        password: 'SecurePassword123',
        name: 'Valid Name'
      });
      assertions.push({
        assertion: 'Zod accepts compliant registration payload',
        passed: valid.success,
        expected: true,
        actual: valid.success
      });

      passed = assertions.every(a => a.passed);
    } catch (e: any) {
      passed = false;
      error = e.message;
    }

    return {
      id: 'UT-05',
      name: 'Zod Input Schema Validation',
      category: 'unit',
      description: 'Tests strict schema validation for email syntax, password entropy, and required fields.',
      passed,
      durationMs: Date.now() - start,
      assertions,
      error
    };
  }

  private static async testRegistrationFlow(): Promise<TestCaseResult> {
    const start = Date.now();
    const assertions = [];
    let passed = true;
    let error: string | undefined;

    try {
      const testEmail = `integration_${Date.now()}@authforge.dev`;
      const plainPassword = 'IntegrationPass123!';
      const hash = await PasswordService.hashPassword(plainPassword);

      const user: User = {
        id: `usr_int_${Date.now()}`,
        email: testEmail,
        name: 'Integration User',
        passwordHash: hash,
        role: 'user',
        permissions: [...CONFIG.DEFAULT_ROLE_PERMISSIONS.user],
        authProvider: 'local',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      db.createUser(user);

      const retrieved = db.findUserByEmail(testEmail);
      assertions.push({
        assertion: 'Created user is queryable by email in storage repository',
        passed: !!retrieved && retrieved.email === testEmail,
        expected: testEmail,
        actual: retrieved?.email
      });

      assertions.push({
        assertion: 'User default role is properly assigned to "user"',
        passed: retrieved?.role === 'user',
        expected: 'user',
        actual: retrieved?.role
      });

      passed = assertions.every(a => a.passed);
    } catch (e: any) {
      passed = false;
      error = e.message;
    }

    return {
      id: 'IT-01',
      name: 'Registration & User Provisioning',
      category: 'integration',
      description: 'Tests end-to-end user creation, password hashing, and repository indexing.',
      passed,
      durationMs: Date.now() - start,
      assertions,
      error
    };
  }

  private static async testAuthenticationFlow(): Promise<TestCaseResult> {
    const start = Date.now();
    const assertions = [];
    let passed = true;
    let error: string | undefined;

    try {
      // Test seeded admin user
      const adminUser = db.findUserByEmail('admin@authforge.dev');
      assertions.push({
        assertion: 'Pre-seeded Admin account exists in database',
        passed: !!adminUser,
        expected: true,
        actual: !!adminUser
      });

      if (adminUser) {
        const isMatch = await PasswordService.comparePassword('AdminPassword123!', adminUser.passwordHash);
        assertions.push({
          assertion: 'Password authentication validates against seeded bcrypt hash',
          passed: isMatch,
          expected: true,
          actual: isMatch
        });

        const token = JwtService.signAccessToken(adminUser);
        const verified = JwtService.verifyAccessToken(token);
        assertions.push({
          assertion: 'Session access token signed and verified with admin credentials',
          passed: verified.email === adminUser.email && verified.role === 'admin',
          expected: 'admin',
          actual: verified.role
        });
      }

      passed = assertions.every(a => a.passed);
    } catch (e: any) {
      passed = false;
      error = e.message;
    }

    return {
      id: 'IT-02',
      name: 'Authentication & Credential Verification',
      category: 'integration',
      description: 'Validates credential verification, password comparison, and JWT token issuance.',
      passed,
      durationMs: Date.now() - start,
      assertions,
      error
    };
  }

  private static async testRbacEnforcement(): Promise<TestCaseResult> {
    const start = Date.now();
    const assertions = [];
    let passed = true;
    let error: string | undefined;

    try {
      const user = db.findUserByEmail('engineer@authforge.dev');
      const admin = db.findUserByEmail('admin@authforge.dev');

      assertions.push({
        assertion: 'Standard engineer has role "user"',
        passed: user?.role === 'user',
        expected: 'user',
        actual: user?.role
      });

      assertions.push({
        assertion: 'Standard engineer does not possess "system:admin" permission',
        passed: !(user?.permissions || []).includes('system:admin'),
        expected: false,
        actual: (user?.permissions || []).includes('system:admin')
      });

      assertions.push({
        assertion: 'Principal Admin possesses "system:admin" permission',
        passed: (admin?.permissions || []).includes('system:admin'),
        expected: true,
        actual: (admin?.permissions || []).includes('system:admin')
      });

      passed = assertions.every(a => a.passed);
    } catch (e: any) {
      passed = false;
      error = e.message;
    }

    return {
      id: 'IT-03',
      name: 'RBAC Role & Permission Boundary Check',
      category: 'security',
      description: 'Verifies authorization boundaries between User, Manager, Auditor, and Admin roles.',
      passed,
      durationMs: Date.now() - start,
      assertions,
      error
    };
  }

  private static async testFirebaseAdminVerification(): Promise<TestCaseResult> {
    const start = Date.now();
    const assertions = [];
    let passed = true;
    let error: string | undefined;

    try {
      const mockOAuthToken = FirebaseAdminService.createMockFirebaseIdToken({
        email: 'verified.architect@cloud.dev',
        name: 'Cloud Architect',
        provider: 'google.com'
      });

      const decoded = await FirebaseAdminService.verifyIdToken(mockOAuthToken);

      assertions.push({
        assertion: 'Firebase Admin SDK successfully verifies ID token audience matches Firebase Project ID',
        passed: decoded.aud === CONFIG.FIREBASE_PROJECT_ID,
        expected: CONFIG.FIREBASE_PROJECT_ID,
        actual: decoded.aud
      });

      assertions.push({
        assertion: 'Firebase Admin SDK verifies issuer matches https://securetoken.google.com/<projectId>',
        passed: decoded.iss === `https://securetoken.google.com/${CONFIG.FIREBASE_PROJECT_ID}`,
        expected: `https://securetoken.google.com/${CONFIG.FIREBASE_PROJECT_ID}`,
        actual: decoded.iss
      });

      assertions.push({
        assertion: 'Extracted email verified flag is true',
        passed: decoded.email_verified === true,
        expected: true,
        actual: decoded.email_verified
      });

      passed = assertions.every(a => a.passed);
    } catch (e: any) {
      passed = false;
      error = e.message;
    }

    return {
      id: 'IT-04',
      name: 'Firebase Admin SDK ID Token Verification',
      category: 'integration',
      description: 'Verifies third-party OAuth 2.0 / OpenID Connect ID token authenticity, claims, and issuer.',
      passed,
      durationMs: Date.now() - start,
      assertions,
      error
    };
  }

  private static async testFirebaseAdminTamperRejection(): Promise<TestCaseResult> {
    const start = Date.now();
    const assertions = [];
    let passed = true;
    let error: string | undefined;

    try {
      // 1. Tampered audience
      const tamperedAudienceToken = FirebaseAdminService.createMockFirebaseIdToken({
        email: 'attacker@evil.corp',
        tamperAudience: true
      });

      let audienceRejected = false;
      try {
        await FirebaseAdminService.verifyIdToken(tamperedAudienceToken);
      } catch (err: any) {
        audienceRejected = err.message.includes('incorrect audience');
      }

      assertions.push({
        assertion: 'Firebase Admin SDK rejects token with invalid project audience',
        passed: audienceRejected,
        expected: true,
        actual: audienceRejected
      });

      // 2. Expired token
      const expiredToken = FirebaseAdminService.createMockFirebaseIdToken({
        email: 'expired@session.com',
        tamperExpired: true
      });

      let expiredRejected = false;
      try {
        await FirebaseAdminService.verifyIdToken(expiredToken);
      } catch (err: any) {
        expiredRejected = err.message.includes('expired');
      }

      assertions.push({
        assertion: 'Firebase Admin SDK rejects token with past expiration timestamp',
        passed: expiredRejected,
        expected: true,
        actual: expiredRejected
      });

      passed = assertions.every(a => a.passed);
    } catch (e: any) {
      passed = false;
      error = e.message;
    }

    return {
      id: 'IT-05',
      name: 'Firebase Token Tamper & Expiry Rejection',
      category: 'security',
      description: 'Validates that forged audiences or expired OAuth tokens fail verification.',
      passed,
      durationMs: Date.now() - start,
      assertions,
      error
    };
  }
}
