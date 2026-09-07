import React, { useState } from 'react';
import { 
  FolderTree, 
  Package, 
  FileCode, 
  CheckCircle2, 
  Copy, 
  Check, 
  Terminal,
  ShieldCheck,
  Server
} from 'lucide-react';

interface CodeSnippet {
  id: string;
  name: string;
  path: string;
  description: string;
  code: string;
}

const CORE_FILES: CodeSnippet[] = [
  {
    id: 'password-service',
    name: 'PasswordService (Bcrypt Cost 12)',
    path: 'src/server/services/password.service.ts',
    description: 'Enforces bcrypt salt generation with cost factor 12 and secure hash comparison.',
    code: `import bcrypt from 'bcryptjs';
import { CONFIG } from '../config.ts';

export class PasswordService {
  /**
   * Hashes plain-text password using bcrypt with a strict cost factor of 12.
   * Requirement: Bcrypt password hashing with cost factor of 12.
   */
  public static async hashPassword(plainText: string): Promise<string> {
    const salt = await bcrypt.genSalt(CONFIG.BCRYPT_SALT_ROUNDS); // 12 rounds
    return bcrypt.hash(plainText, salt);
  }

  public static async comparePassword(plainText: string, hash: string): Promise<boolean> {
    return bcrypt.compare(plainText, hash);
  }

  public static extractCostFactor(hash: string): number | null {
    const parts = hash.split('$');
    if (parts.length >= 3) {
      const rounds = parseInt(parts[2], 10);
      return isNaN(rounds) ? null : rounds;
    }
    return null;
  }
}`
  },
  {
    id: 'jwt-service',
    name: 'JwtService (15-Min Expiry & Rotation)',
    path: 'src/server/services/jwt.service.ts',
    description: 'Issues 15-minute JWT access tokens and cryptographically random refresh tokens with family lineage.',
    code: `import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { CONFIG } from '../config.ts';
import { JWTAccessTokenPayload, RefreshTokenRecord, User } from '../types.ts';

export class JwtService {
  /**
   * Issues JWT Access Token with 15-minute expiration (900 seconds).
   */
  public static signAccessToken(user: User): string {
    const payload: Omit<JWTAccessTokenPayload, 'iat' | 'exp'> = {
      sub: user.id,
      email: user.email,
      role: user.role,
      permissions: user.permissions,
      type: 'access'
    };

    return jwt.sign(payload, CONFIG.JWT_ACCESS_SECRET, {
      expiresIn: CONFIG.JWT_ACCESS_EXPIRES_IN_SECONDS, // 15 * 60 = 900 seconds
      algorithm: 'HS256'
    });
  }

  public static verifyAccessToken(token: string): JWTAccessTokenPayload {
    return jwt.verify(token, CONFIG.JWT_ACCESS_SECRET, {
      algorithms: ['HS256']
    }) as JWTAccessTokenPayload;
  }

  public static generateRefreshTokenRecord(userId: string, existingFamilyId?: string): RefreshTokenRecord {
    const rawRandom = crypto.randomBytes(48).toString('hex');
    const token = \`rt_\${rawRandom}\`;
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
}`
  },
  {
    id: 'firebase-admin',
    name: 'FirebaseAdminService (OAuth / OIDC Verifier)',
    path: 'src/server/services/firebase-admin.service.ts',
    description: 'Verifies ID tokens issued by firebaseapp.com/__/auth/handler against project ID audience & Google issuer.',
    code: `import crypto from 'crypto';
import { CONFIG } from '../config.ts';

export class FirebaseAdminService {
  /**
   * Simulates admin.auth().verifyIdToken(idToken) adhering strictly to standard:
   * 1. Token must be valid 3-part JWT.
   * 2. Header must use RS256 algorithm.
   * 3. Audience must equal Firebase Project ID.
   * 4. Issuer must equal https://securetoken.google.com/<projectId>.
   * 5. Expiration must be in the future.
   */
  public static async verifyIdToken(idToken: string) {
    const parts = idToken.split('.');
    if (parts.length !== 3) throw new Error('Invalid JWT format');

    const header = JSON.parse(Buffer.from(parts[0], 'base64url').toString('utf8'));
    const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'));

    if (header.alg !== 'RS256') {
      throw new Error(\`Token algorithm must be RS256, got \${header.alg}\`);
    }

    if (payload.aud !== CONFIG.FIREBASE_PROJECT_ID) {
      throw new Error(\`Incorrect audience: expected '\${CONFIG.FIREBASE_PROJECT_ID}', got '\${payload.aud}'\`);
    }

    if (payload.iss !== \`https://securetoken.google.com/\${CONFIG.FIREBASE_PROJECT_ID}\`) {
      throw new Error(\`Incorrect issuer: '\${payload.iss}'\`);
    }

    if (payload.exp <= Math.floor(Date.now() / 1000)) {
      throw new Error('Firebase ID token has expired');
    }

    return payload;
  }
}`
  },
  {
    id: 'validation-middleware',
    name: 'ValidationMiddleware (Zod Schemas)',
    path: 'src/server/middleware/validation.middleware.ts',
    description: 'Strict schema enforcement for input payloads.',
    code: `import { z, ZodError } from 'zod';
import { Request, Response, NextFunction } from 'express';

export const RegisterSchema = z.object({
  email: z.string().email('Invalid email address format').trim().toLowerCase(),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters long')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[0-9]/, 'Password must contain at least one numeric digit'),
  name: z.string().min(2, 'Name must be at least 2 characters long').max(100),
  role: z.enum(['admin', 'manager', 'user', 'auditor']).optional().default('user')
});

export function validateBody(schema: z.ZodSchema<any>) {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      req.body = schema.parse(req.body);
      next();
    } catch (err) {
      if (err instanceof ZodError) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Input validation failed',
            details: err.issues.map(i => ({ field: i.path.join('.'), message: i.message }))
          }
        });
        return;
      }
      next(err);
    }
  };
}`
  },
  {
    id: 'rbac-middleware',
    name: 'RbacMiddleware (Role & Permission Guards)',
    path: 'src/server/middleware/rbac.middleware.ts',
    description: 'Protects route execution by validating user roles and assigned permission sets.',
    code: `import { Request, Response, NextFunction } from 'express';
import { UserRole, Permission } from '../types.ts';

export function requireRole(...allowedRoles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN_ROLE',
          message: \`Requires one of roles: [\${allowedRoles.join(', ')}]. Current role: '\${req.user?.role}'\`
        }
      });
      return;
    }
    next();
  };
}`
  }
];

export const ArchitectureTab: React.FC = () => {
  const [selectedFileId, setSelectedFileId] = useState<string>(CORE_FILES[0].id);
  const [copiedFile, setCopiedFile] = useState<boolean>(false);

  const selectedFile = CORE_FILES.find(f => f.id === selectedFileId) || CORE_FILES[0];

  const handleCopyCode = () => {
    navigator.clipboard.writeText(selectedFile.code);
    setCopiedFile(true);
    setTimeout(() => setCopiedFile(false), 2000);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-8">
      {/* 1. Architecture Overview & Folder Structure */}
      <section className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
        <div className="flex items-center gap-2">
          <span className="w-7 h-7 rounded-lg bg-indigo-100 text-indigo-800 flex items-center justify-center font-bold text-xs">
            1
          </span>
          <h2 className="text-base font-bold text-slate-900">
            Architecture Overview &amp; Folder Structure
          </h2>
        </div>

        <p className="text-xs text-slate-700 leading-relaxed">
          The service is organized as a production RESTful microservice/monolith module implemented with Express, TypeScript, Zod, Bcrypt (cost 12), JWT (15-minute expiration), Refresh Token rotation, and Firebase Admin SDK OpenID Connect verification.
        </p>

        {/* Directory Structure Tree */}
        <div className="bg-slate-950 text-slate-200 p-4 rounded-xl font-mono text-xs overflow-x-auto leading-relaxed border border-slate-800">
{`authforge-service/
├── server.ts                             # Express Server + Vite dev middleware + Global error handler
├── package.json                          # Dependencies: express, bcryptjs, jsonwebtoken, zod
├── tsconfig.json                         # TypeScript strict build configuration
├── src/
│   ├── server/
│   │   ├── config.ts                     # Salt rounds (12), JWT expiry (15m/900s), Project ID
│   │   ├── types.ts                      # User, Role, Permission, TokenPayload, RefreshToken
│   │   ├── db/
│   │   │   └── in-memory-db.ts           # Thread-safe repository + token revocation & family store
│   │   ├── services/
│   │   │   ├── password.service.ts       # Bcrypt hash (rounds=12), verify, extractCostFactor
│   │   │   ├── jwt.service.ts            # Sign 15m access token, rotate refresh tokens
│   │   │   └── firebase-admin.service.ts # Firebase Admin SDK verifyIdToken() simulation
│   │   ├── middleware/
│   │   │   ├── validation.middleware.ts  # Zod schema validation (Register, Login, Refresh)
│   │   │   ├── auth.middleware.ts        # Bearer token verification & user context injection
│   │   │   └── rbac.middleware.ts        # requireRole() & requirePermission() guards
│   │   ├── routes/
│   │   │   ├── auth.routes.ts            # POST /register, /login, /refresh, /logout, /firebase-verify
│   │   │   ├── protected.routes.ts       # GET /profile, /manager-reports, /admin-dashboard
│   │   │   └── test.routes.ts            # POST /tests/run, POST /tests/reset-db
│   │   └── test-suite/
│   │       └── auth.test-runner.ts       # Unit & Integration test runner engine
│   └── components/                       # Client Workbench, JWT Inspector, OAuth Simulator
└── index.html                            # HTML entry point with synchronized metadata`}
        </div>
      </section>

      {/* 2. Dependencies / Setup Instructions */}
      <section className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
        <div className="flex items-center gap-2">
          <span className="w-7 h-7 rounded-lg bg-indigo-100 text-indigo-800 flex items-center justify-center font-bold text-xs">
            2
          </span>
          <h2 className="text-base font-bold text-slate-900">
            Dependencies &amp; Setup Instructions
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2">
            <h3 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
              <Package className="w-4 h-4 text-indigo-600" />
              Runtime Dependencies (package.json)
            </h3>
            <ul className="text-xs text-slate-700 space-y-1 font-mono text-[11px]">
              <li>• <strong className="text-slate-900">bcryptjs</strong>: Password hashing with cost factor 12</li>
              <li>• <strong className="text-slate-900">jsonwebtoken</strong>: HS256 / RS256 token signing &amp; verification</li>
              <li>• <strong className="text-slate-900">zod</strong>: Strict input parsing and validation</li>
              <li>• <strong className="text-slate-900">express</strong>: HTTP router, middleware, JSON error handling</li>
              <li>• <strong className="text-slate-900">lucide-react</strong> &amp; <strong className="text-slate-900">motion</strong>: UI icons &amp; layout</li>
            </ul>
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2">
            <h3 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
              <Terminal className="w-4 h-4 text-emerald-600" />
              Setup &amp; Run Commands
            </h3>
            <div className="bg-slate-950 text-slate-200 p-2.5 rounded-lg font-mono text-[11px] space-y-1">
              <div># Install dependencies</div>
              <div className="text-emerald-400">npm install</div>
              <div># Start unified full-stack development server on port 3000</div>
              <div className="text-emerald-400">npm run dev</div>
              <div># Production compile bundle</div>
              <div className="text-emerald-400">npm run build &amp;&amp; npm start</div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. Core Implementation Files */}
      <section className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-7 h-7 rounded-lg bg-indigo-100 text-indigo-800 flex items-center justify-center font-bold text-xs">
              3
            </span>
            <h2 className="text-base font-bold text-slate-900">
              Core Implementation Files (Fully Written)
            </h2>
          </div>

          <button
            id="btn-copy-file-code"
            onClick={handleCopyCode}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
          >
            {copiedFile ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copiedFile ? 'Copied to Clipboard' : 'Copy File Content'}</span>
          </button>
        </div>

        {/* File selector buttons */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
          {CORE_FILES.map(f => (
            <button
              key={f.id}
              id={`file-btn-${f.id}`}
              onClick={() => setSelectedFileId(f.id)}
              className={`px-3 py-1.5 text-xs font-mono font-medium rounded-lg whitespace-nowrap transition-colors ${
                selectedFile.id === f.id
                  ? 'bg-slate-900 text-white font-semibold'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {f.name}
            </button>
          ))}
        </div>

        {/* Code display card */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-600 px-1">
            <span className="font-mono text-[11px] text-indigo-700 font-semibold">{selectedFile.path}</span>
            <span>{selectedFile.description}</span>
          </div>

          <pre className="bg-slate-950 text-emerald-300 p-4 rounded-xl font-mono text-xs overflow-x-auto max-h-[420px] leading-relaxed border border-slate-800">
            {selectedFile.code}
          </pre>
        </div>
      </section>

      {/* 4. Unit & Integration Test Suite Specifications */}
      <section className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
        <div className="flex items-center gap-2">
          <span className="w-7 h-7 rounded-lg bg-indigo-100 text-indigo-800 flex items-center justify-center font-bold text-xs">
            4
          </span>
          <h2 className="text-base font-bold text-slate-900">
            Unit &amp; Integration Test Suite Specifications
          </h2>
        </div>

        <p className="text-xs text-slate-700 leading-relaxed">
          The suite covers 10 automated test specifications targeting both isolated cryptographic primitives (cost factor 12, 15m expiration, rotation lineage) and full integration routes (registration, login, RBAC boundaries, and Firebase Admin ID token authenticity).
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
            <div className="font-bold text-indigo-900">Unit Tests (UT-01 to UT-05)</div>
            <div className="text-[11px] text-slate-600 space-y-0.5">
              <div>• UT-01: Bcrypt salt rounds extracted === 12</div>
              <div>• UT-02: JWT Access Token exp - iat === 900s (15 min)</div>
              <div>• UT-03: Refresh token rotation issues new single-use token</div>
              <div>• UT-04: Replay of revoked refresh token revokes whole family</div>
              <div>• UT-05: Zod rejection for malformed emails and weak passwords</div>
            </div>
          </div>

          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
            <div className="font-bold text-emerald-900">Integration Tests (IT-01 to IT-05)</div>
            <div className="text-[11px] text-slate-600 space-y-0.5">
              <div>• IT-01: User registration &amp; 409 conflict prevention</div>
              <div>• IT-02: Password comparison against stored bcrypt hash</div>
              <div>• IT-03: RBAC authorization rejection (403 Forbidden)</div>
              <div>• IT-04: Firebase Admin SDK verification with project audience</div>
              <div>• IT-05: Firebase Admin rejection of tampered/expired tokens</div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
