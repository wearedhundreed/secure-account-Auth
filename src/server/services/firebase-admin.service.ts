import crypto from 'crypto';
import { CONFIG } from '../config.ts';

export interface DecodedFirebaseToken {
  iss: string;
  aud: string;
  sub: string;
  uid: string;
  email?: string;
  email_verified?: boolean;
  name?: string;
  picture?: string;
  auth_time: number;
  iat: number;
  exp: number;
  firebase: {
    identities: Record<string, string[]>;
    sign_in_provider: string;
  };
}

export class FirebaseAdminService {
  /**
   * Simulates the Firebase Admin SDK's `admin.auth().verifyIdToken(idToken, checkRevoked)`
   * Following the official Google OpenID Connect / Firebase specification:
   * 1. Token must be a valid JWT with 3 parts.
   * 2. Header must use RS256 algorithm.
   * 3. Audience must match Firebase Project ID.
   * 4. Issuer must be https://securetoken.google.com/<projectId>
   * 5. Expiration must be in the future.
   * 6. Subject must be a non-empty string (UID).
   */
  public static async verifyIdToken(idToken: string): Promise<DecodedFirebaseToken> {
    if (!idToken || typeof idToken !== 'string') {
      throw new Error('Firebase ID token must be a non-empty string');
    }

    const parts = idToken.split('.');
    if (parts.length !== 3) {
      throw new Error('Firebase ID token has invalid JWT format (expected 3 segments)');
    }

    let header: any;
    let payload: any;

    try {
      header = JSON.parse(Buffer.from(parts[0], 'base64url').toString('utf8'));
      payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'));
    } catch {
      throw new Error('Failed to parse Firebase ID token segments');
    }

    // Header checks
    if (header.alg !== 'RS256') {
      throw new Error(`Firebase ID token algorithm must be RS256, received: ${header.alg}`);
    }

    // Verify Project ID / Audience
    const expectedAudience = CONFIG.FIREBASE_PROJECT_ID;
    if (payload.aud !== expectedAudience) {
      throw new Error(
        `Firebase ID token has incorrect audience. Expected: '${expectedAudience}', received: '${payload.aud}'`
      );
    }

    // Verify Issuer
    const expectedIssuer = `https://securetoken.google.com/${expectedAudience}`;
    if (payload.iss !== expectedIssuer) {
      throw new Error(
        `Firebase ID token has incorrect issuer. Expected: '${expectedIssuer}', received: '${payload.iss}'`
      );
    }

    // Verify Expiration
    const nowInSeconds = Math.floor(Date.now() / 1000);
    if (payload.exp <= nowInSeconds) {
      throw new Error(
        `Firebase ID token has expired. Expired at: ${new Date(payload.exp * 1000).toISOString()}`
      );
    }

    // Verify Subject
    if (!payload.sub || typeof payload.sub !== 'string') {
      throw new Error('Firebase ID token must contain a valid subject (uid)');
    }

    return {
      iss: payload.iss,
      aud: payload.aud,
      sub: payload.sub,
      uid: payload.uid || payload.sub,
      email: payload.email,
      email_verified: payload.email_verified ?? true,
      name: payload.name || payload.email?.split('@')[0] || 'Firebase User',
      picture: payload.picture,
      auth_time: payload.auth_time || payload.iat || nowInSeconds,
      iat: payload.iat || nowInSeconds,
      exp: payload.exp,
      firebase: payload.firebase || {
        identities: { 'google.com': [payload.sub] },
        sign_in_provider: 'google.com'
      }
    };
  }

  /**
   * Helper utility for testing and sandbox simulation:
   * Generates a realistic, syntactically valid Firebase ID token payload conforming to
   * tokens issued by firebaseapp.com/__/auth/handler.
   */
  public static createMockFirebaseIdToken(params: {
    uid?: string;
    email: string;
    name?: string;
    provider?: string;
    expiresInSeconds?: number;
    tamperAudience?: boolean;
    tamperExpired?: boolean;
  }): string {
    const nowInSeconds = Math.floor(Date.now() / 1000);
    const uid = params.uid || `fb_usr_${crypto.randomBytes(8).toString('hex')}`;
    const provider = params.provider || 'google.com';
    const projectId = CONFIG.FIREBASE_PROJECT_ID;

    const exp = params.tamperExpired 
      ? nowInSeconds - 300 
      : nowInSeconds + (params.expiresInSeconds || 3600);

    const header = {
      alg: 'RS256',
      kid: `key_${crypto.randomBytes(6).toString('hex')}`,
      typ: 'JWT'
    };

    const payload = {
      iss: `https://securetoken.google.com/${projectId}`,
      aud: params.tamperAudience ? 'unauthorized-project-id' : projectId,
      auth_time: nowInSeconds,
      user_id: uid,
      sub: uid,
      iat: nowInSeconds,
      exp: exp,
      email: params.email,
      email_verified: true,
      firebase: {
        identities: {
          [provider]: [uid]
        },
        sign_in_provider: provider
      },
      name: params.name || params.email.split('@')[0],
      picture: `https://api.dicebear.com/7.x/bottts/svg?seed=${uid}`
    };

    const b64Header = Buffer.from(JSON.stringify(header)).toString('base64url');
    const b64Payload = Buffer.from(JSON.stringify(payload)).toString('base64url');
    const mockSignature = crypto.randomBytes(64).toString('base64url');

    return `${b64Header}.${b64Payload}.${mockSignature}`;
  }
}
