export type UserRole = 'admin' | 'manager' | 'user' | 'auditor';

export type Permission = 
  | 'users:read' 
  | 'users:write' 
  | 'reports:read' 
  | 'reports:export' 
  | 'system:admin' 
  | 'audit:read';

export interface User {
  id: string;
  email: string;
  passwordHash: string;
  name: string;
  role: UserRole;
  permissions: Permission[];
  authProvider: 'local' | 'firebase-google' | 'firebase-github';
  firebaseUid?: string;
  createdAt: string;
  updatedAt: string;
}

export interface JWTAccessTokenPayload {
  sub: string;
  email: string;
  role: UserRole;
  permissions: Permission[];
  type: 'access';
  iat?: number;
  exp?: number;
}

export interface RefreshTokenRecord {
  id: string;
  token: string;
  userId: string;
  expiresAt: number;
  isRevoked: boolean;
  familyId: string;
  createdAt: string;
}

export interface StandardApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
    timestamp: string;
  };
}

export interface FirebaseVerifyPayload {
  idToken: string;
  providerId?: string;
  email?: string;
  displayName?: string;
  photoUrl?: string;
}

export interface TestWorker {
  id: string;
  name: string;
  role: string;
  environment: string;
  type: 'queue' | 'webhook' | 'push' | 'cron';
  status: 'ONLINE' | 'BUSY' | 'IDLE' | 'OFFLINE';
  lastHeartbeat: string;
  topics: string[];
  endpoint?: string;
  messagesReceived: number;
}

export interface WorkerMessage {
  id: string;
  workerId: string;
  workerName: string;
  topic: string;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  payload: any;
  sentAt: string;
  status: 'DELIVERED' | 'ACKNOWLEDGED' | 'FAILED';
  latencyMs: number;
  response?: any;
}

export interface WebhookLog {
  id: string;
  timestamp: string;
  method: string;
  path: string;
  headers: Record<string, string>;
  query: Record<string, any>;
  body: any;
  clientIp?: string;
}

