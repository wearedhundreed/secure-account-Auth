export type TabType = 
  | 'workbench' 
  | 'jwt-inspector' 
  | 'firebase-oauth' 
  | 'rbac-matrix' 
  | 'test-suite' 
  | 'architecture'
  | 'callback-hub'
  | 'worker-dispatcher'
  | 'apk-deployment';

export interface UserSession {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'manager' | 'user' | 'auditor';
  permissions: string[];
  authProvider: string;
}

export interface AuthTokens {
  accessToken: string;
  tokenType: string;
  expiresIn: number;
  expiresInHuman: string;
  refreshToken?: string;
  refreshExpiresAt?: string;
}

export interface TestAssertion {
  assertion: string;
  passed: boolean;
  expected?: any;
  actual?: any;
}

export interface TestCase {
  id: string;
  name: string;
  category: 'unit' | 'integration' | 'security';
  description: string;
  passed: boolean;
  durationMs: number;
  assertions: TestAssertion[];
  error?: string;
}

export interface TestSuiteReport {
  totalTests: number;
  passed: number;
  failed: number;
  durationMs: number;
  timestamp: string;
  results: TestCase[];
}
