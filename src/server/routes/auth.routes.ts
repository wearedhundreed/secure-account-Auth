import { Router, Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { db } from '../db/in-memory-db.ts';
import { CONFIG } from '../config.ts';
import { PasswordService } from '../services/password.service.ts';
import { JwtService } from '../services/jwt.service.ts';
import { FirebaseAdminService } from '../services/firebase-admin.service.ts';
import { requireAuth } from '../middleware/auth.middleware.ts';
import {
  validateBody,
  RegisterSchema,
  LoginSchema,
  RefreshTokenSchema,
  FirebaseVerifySchema
} from '../middleware/validation.middleware.ts';
import { User } from '../types.ts';

const router = Router();

function sanitizeUser(user: User) {
  const { passwordHash, ...safe } = user;
  return safe;
}

/**
 * POST /api/v1/auth/register
 * Requirement 1: Expose POST /api/v1/auth/register
 * Requirement 2: Implement bcrypt for password hashing with cost factor of 12
 * Requirement 3: Return JWT tokens with 15-minute expiration and a refresh token strategy
 */
router.post(
  '/register',
  validateBody(RegisterSchema),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { email, password, name, role } = req.body;

      const existingUser = db.findUserByEmail(email);
      if (existingUser) {
        res.status(409).json({
          success: false,
          error: {
            code: 'EMAIL_ALREADY_EXISTS',
            message: `A user account with email '${email}' already exists`,
            timestamp: new Date().toISOString()
          }
        });
        return;
      }

      // Hash password using bcrypt with strict cost factor of 12
      const passwordHash = await PasswordService.hashPassword(password);
      const userRole = role || 'user';
      const permissions = [...CONFIG.DEFAULT_ROLE_PERMISSIONS[userRole]];
      const scope = req.body.scope || CONFIG.DEFAULT_ROLE_SCOPES[userRole] || 'read write offline_access';

      const newUser: User = {
        id: `usr_${crypto.randomBytes(8).toString('hex')}`,
        email,
        name,
        passwordHash,
        role: userRole,
        permissions,
        scope,
        authProvider: 'local',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      db.createUser(newUser);

      // Generate 15-minute JWT Access Token & Refresh Token
      const accessToken = JwtService.signAccessToken(newUser);
      const refreshTokenRecord = JwtService.generateRefreshTokenRecord(newUser.id);
      db.saveRefreshToken(refreshTokenRecord);

      res.status(201).json({
        success: true,
        message: 'User registered successfully',
        data: {
          user: sanitizeUser(newUser),
          tokens: {
            accessToken,
            tokenType: 'Bearer',
            scope: newUser.scope,
            expiresIn: CONFIG.JWT_ACCESS_EXPIRES_IN_SECONDS,
            expiresInHuman: CONFIG.JWT_ACCESS_EXPIRES_IN_HUMAN,
            refreshToken: refreshTokenRecord.token,
            refreshExpiresAt: new Date(refreshTokenRecord.expiresAt).toISOString()
          },
          securityMetadata: {
            bcryptCostFactor: CONFIG.BCRYPT_SALT_ROUNDS,
            tokenExpirySeconds: CONFIG.JWT_ACCESS_EXPIRES_IN_SECONDS
          }
        }
      });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * POST /api/v1/auth/login
 * Requirement 1: Expose POST /api/v1/auth/login
 * Requirement 2: Compare bcrypt password hash
 * Requirement 3: Return JWT with 15-minute expiration & refresh token
 */
router.post(
  '/login',
  validateBody(LoginSchema),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { email, password } = req.body;

      const user = db.findUserByEmail(email);
      if (!user) {
        res.status(401).json({
          success: false,
          error: {
            code: 'INVALID_CREDENTIALS',
            message: 'Invalid email or password combination',
            timestamp: new Date().toISOString()
          }
        });
        return;
      }

      const isMatch = await PasswordService.comparePassword(password, user.passwordHash);
      if (!isMatch) {
        res.status(401).json({
          success: false,
          error: {
            code: 'INVALID_CREDENTIALS',
            message: 'Invalid email or password combination',
            timestamp: new Date().toISOString()
          }
        });
        return;
      }

      const accessToken = JwtService.signAccessToken(user);
      const refreshTokenRecord = JwtService.generateRefreshTokenRecord(user.id);
      db.saveRefreshToken(refreshTokenRecord);

      res.status(200).json({
        success: true,
        message: 'Login successful',
        data: {
          user: sanitizeUser(user),
          tokens: {
            accessToken,
            tokenType: 'Bearer',
            scope: user.scope || CONFIG.DEFAULT_ROLE_SCOPES[user.role] || 'read write offline_access',
            expiresIn: CONFIG.JWT_ACCESS_EXPIRES_IN_SECONDS,
            expiresInHuman: CONFIG.JWT_ACCESS_EXPIRES_IN_HUMAN,
            refreshToken: refreshTokenRecord.token,
            refreshExpiresAt: new Date(refreshTokenRecord.expiresAt).toISOString()
          }
        }
      });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * POST /api/v1/auth/refresh
 * Refresh token rotation with reuse detection strategy
 */
router.post(
  '/refresh',
  validateBody(RefreshTokenSchema),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { refreshToken } = req.body;

      const tokenRecord = db.findRefreshToken(refreshToken);

      if (!tokenRecord) {
        res.status(401).json({
          success: false,
          error: {
            code: 'INVALID_REFRESH_TOKEN',
            message: 'Refresh token does not exist or has been purged',
            timestamp: new Date().toISOString()
          }
        });
        return;
      }

      // Reuse detection: If an already revoked token is used, assume breach and revoke family
      if (tokenRecord.isRevoked) {
        db.revokeFamily(tokenRecord.familyId);
        res.status(401).json({
          success: false,
          error: {
            code: 'TOKEN_REUSE_DETECTED',
            message: 'Revoked refresh token reuse detected. All tokens in this family have been invalidated for security.',
            timestamp: new Date().toISOString()
          }
        });
        return;
      }

      // Expiry check
      if (tokenRecord.expiresAt <= Date.now()) {
        tokenRecord.isRevoked = true;
        res.status(401).json({
          success: false,
          error: {
            code: 'EXPIRED_REFRESH_TOKEN',
            message: 'Refresh token has expired. Please log in again.',
            timestamp: new Date().toISOString()
          }
        });
        return;
      }

      const user = db.findUserById(tokenRecord.userId);
      if (!user) {
        res.status(401).json({
          success: false,
          error: {
            code: 'USER_NOT_FOUND',
            message: 'User associated with refresh token no longer exists',
            timestamp: new Date().toISOString()
          }
        });
        return;
      }

      // Rotate: Revoke the current refresh token
      tokenRecord.isRevoked = true;

      // Issue new access token + new refresh token in same family
      const newAccessToken = JwtService.signAccessToken(user);
      const newRefreshTokenRecord = JwtService.generateRefreshTokenRecord(user.id, tokenRecord.familyId);
      db.saveRefreshToken(newRefreshTokenRecord);

      res.status(200).json({
        success: true,
        message: 'Token refreshed successfully with rotation',
        data: {
          tokens: {
            accessToken: newAccessToken,
            tokenType: 'Bearer',
            scope: user.scope || CONFIG.DEFAULT_ROLE_SCOPES[user.role] || 'read write offline_access',
            expiresIn: CONFIG.JWT_ACCESS_EXPIRES_IN_SECONDS,
            expiresInHuman: CONFIG.JWT_ACCESS_EXPIRES_IN_HUMAN,
            refreshToken: newRefreshTokenRecord.token,
            refreshExpiresAt: new Date(newRefreshTokenRecord.expiresAt).toISOString()
          }
        }
      });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * POST /api/v1/auth/logout
 * Invalidate refresh token
 */
router.post(
  '/logout',
  async (req: Request, res: Response): Promise<void> => {
    const { refreshToken } = req.body || {};
    if (refreshToken) {
      db.revokeRefreshToken(refreshToken);
    }
    if (req.user) {
      db.revokeAllUserTokens(req.user.id);
    }

    res.status(200).json({
      success: true,
      message: 'Logged out successfully. Tokens revoked.',
      timestamp: new Date().toISOString()
    });
  }
);

/**
 * GET /api/v1/auth/me
 * Protected user profile
 */
router.get(
  '/me',
  requireAuth,
  (req: Request, res: Response): void => {
    res.status(200).json({
      success: true,
      data: {
        user: sanitizeUser(req.user!),
        tokenMetadata: {
          sub: req.tokenPayload?.sub,
          role: req.tokenPayload?.role,
          permissions: req.tokenPayload?.permissions,
          scope: req.tokenPayload?.scope || req.user?.scope || 'read write offline_access',
          issuedAt: req.tokenPayload?.iat ? new Date(req.tokenPayload.iat * 1000).toISOString() : null,
          expiresAt: req.tokenPayload?.exp ? new Date(req.tokenPayload.exp * 1000).toISOString() : null,
          remainingSeconds: req.tokenPayload?.exp ? Math.max(0, req.tokenPayload.exp - Math.floor(Date.now() / 1000)) : 0
        }
      }
    });
  }
);

/**
 * POST /api/v1/auth/firebase-verify
 * Verifies third-party OAuth 2.0 / OpenID Connect ID token from Firebase SDK handler
 * Backend token verification via Firebase Admin SDK
 */
router.post(
  '/firebase-verify',
  validateBody(FirebaseVerifySchema),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { idToken } = req.body;

      // Backend token verification via Firebase Admin SDK
      const decodedFirebase = await FirebaseAdminService.verifyIdToken(idToken);

      const email = decodedFirebase.email || `${decodedFirebase.uid}@firebase.oauth`;
      let user = db.findUserByFirebaseUid(decodedFirebase.uid) || db.findUserByEmail(email);

      if (!user) {
        // Provision user account from verified OAuth claims
        user = {
          id: `usr_${crypto.randomBytes(8).toString('hex')}`,
          email,
          name: decodedFirebase.name || email.split('@')[0],
          passwordHash: '[OAUTH_MANAGED_NO_LOCAL_PASSWORD]',
          role: 'user',
          permissions: [...CONFIG.DEFAULT_ROLE_PERMISSIONS.user],
          authProvider: decodedFirebase.firebase.sign_in_provider.includes('github') 
            ? 'firebase-github' 
            : 'firebase-google',
          firebaseUid: decodedFirebase.uid,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        db.createUser(user);
      }

      const accessToken = JwtService.signAccessToken(user);
      const refreshTokenRecord = JwtService.generateRefreshTokenRecord(user.id);
      db.saveRefreshToken(refreshTokenRecord);

      res.status(200).json({
        success: true,
        message: 'Firebase OAuth token verified successfully via Firebase Admin SDK',
        data: {
          verifiedClaims: {
            uid: decodedFirebase.uid,
            email: decodedFirebase.email,
            emailVerified: decodedFirebase.email_verified,
            issuer: decodedFirebase.iss,
            audience: decodedFirebase.aud,
            authProvider: decodedFirebase.firebase.sign_in_provider,
            authTime: new Date(decodedFirebase.auth_time * 1000).toISOString()
          },
          user: sanitizeUser(user),
          tokens: {
            accessToken,
            tokenType: 'Bearer',
            scope: user.scope || CONFIG.DEFAULT_ROLE_SCOPES[user.role] || 'read write offline_access',
            expiresIn: CONFIG.JWT_ACCESS_EXPIRES_IN_SECONDS,
            expiresInHuman: CONFIG.JWT_ACCESS_EXPIRES_IN_HUMAN,
            refreshToken: refreshTokenRecord.token
          }
        }
      });
    } catch (err: any) {
      res.status(401).json({
        success: false,
        error: {
          code: 'FIREBASE_VERIFICATION_FAILED',
          message: err.message || 'Firebase Admin SDK failed to verify ID token',
          timestamp: new Date().toISOString()
        }
      });
    }
  }
);

/**
 * POST /api/v1/auth/mock-firebase-token
 * Sandbox helper: Generates realistic mock Firebase ID tokens for interactive testing
 */
router.post(
  '/mock-firebase-token',
  (req: Request, res: Response): void => {
    const { email, name, provider, tamperAudience, tamperExpired } = req.body || {};
    const token = FirebaseAdminService.createMockFirebaseIdToken({
      email: email || 'colleague@enterprise.com',
      name: name || 'Jordan Taylor',
      provider: provider || 'google.com',
      tamperAudience: Boolean(tamperAudience),
      tamperExpired: Boolean(tamperExpired)
    });

    res.status(200).json({
      success: true,
      data: {
        idToken: token,
        handlerOrigin: 'firebaseapp.com/__/auth/handler',
        audience: tamperAudience ? 'unauthorized-project-id' : CONFIG.FIREBASE_PROJECT_ID,
        provider: provider || 'google.com',
        isTampered: Boolean(tamperAudience || tamperExpired)
      }
    });
  }
);

export default router;
