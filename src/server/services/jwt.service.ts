import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { CONFIG } from '../config.ts';
import { JWTAccessTokenPayload, RefreshTokenRecord, User } from '../types.ts';

export class JwtService {
  /**
   * Generates a signed JWT Access Token with 15-minute expiration.
   * Includes claims: sub, email, role, permissions, scope (e.g. read write offline_access), and type: 'access'.
   */
  public static signAccessToken(user: User, customScope?: string): string {
    const scope = customScope || user.scope || CONFIG.DEFAULT_ROLE_SCOPES[user.role] || 'read write offline_access';

    const payload: Omit<JWTAccessTokenPayload, 'iat' | 'exp'> = {
      sub: user.id,
      email: user.email,
      role: user.role,
      permissions: user.permissions,
      scope,
      type: 'access'
    };

    return jwt.sign(payload, CONFIG.JWT_ACCESS_SECRET, {
      expiresIn: CONFIG.JWT_ACCESS_EXPIRES_IN_SECONDS,
      algorithm: 'HS256'
    });
  }

  /**
   * Verifies and decodes a signed JWT Access Token.
   */
  public static verifyAccessToken(token: string): JWTAccessTokenPayload {
    try {
      const decoded = jwt.verify(token, CONFIG.JWT_ACCESS_SECRET, {
        algorithms: ['HS256']
      }) as JWTAccessTokenPayload;

      if (decoded.type !== 'access') {
        throw new Error('Invalid token type: expected access token');
      }

      return decoded;
    } catch (err: any) {
      if (err.name === 'TokenExpiredError') {
        throw new Error('Access token has expired (15-minute validity exceeded)');
      }
      throw new Error(`Invalid access token: ${err.message}`);
    }
  }

  /**
   * Generates an opaque, cryptographically secure Refresh Token with a unique family ID
   * to enable refresh token rotation and reuse detection.
   */
  public static generateRefreshTokenRecord(userId: string, existingFamilyId?: string): RefreshTokenRecord {
    const rawRandom = crypto.randomBytes(48).toString('hex');
    const token = `rt_${rawRandom}`;
    const familyId = existingFamilyId || crypto.randomUUID();
    const expiresAt = Date.now() + CONFIG.REFRESH_TOKEN_EXPIRES_IN_SECONDS * 1000;

    return {
      id: crypto.randomUUID(),
      token,
      userId,
      expiresAt,
      isRevoked: false,
      familyId,
      createdAt: new Date().toISOString()
    };
  }

  /**
   * Safely decodes a JWT token without verifying the signature for inspection purposes.
   */
  public static decodeTokenUnsafe(token: string): {
    header: any;
    payload: any;
    signature: string;
  } | null {
    try {
      const parts = token.split('.');
      if (parts.length !== 3) return null;

      const header = JSON.parse(Buffer.from(parts[0], 'base64url').toString('utf8'));
      const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'));
      const signature = parts[2];

      return { header, payload, signature };
    } catch {
      return null;
    }
  }
}
