export type TabType = 
  | 'ai-automator'
  | 'workbench' 
  | 'jwt-inspector' 
  | 'firebase-oauth' 
  | 'rbac-matrix' 
  | 'integrations'
  | 'callback-hub'
  | 'worker-dispatcher'
  | 'sendgrid-dispatcher'
  | 'apk-deployment'
  | 'test-suite' 
  | 'architecture';

export type IntegrationCategory = 'identity' | 'messaging' | 'security' | 'communications' | 'storage' | 'ai';

export interface IntegrationApp {
  id: string;
  name: string;
  category: IntegrationCategory;
  description: string;
  iconName: string;
  enabled: boolean;
  status: 'ENABLED' | 'DISABLED' | 'CONNECTING';
  protocol: string;
  endpoint: string;
  health: 'HEALTHY' | 'SYNCED' | 'STANDBY';
  latencyMs: number;
  lastSynced: string;
  features: string[];
  config: Record<string, string>;
}

export interface UserSession {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'manager' | 'user' | 'auditor';
  permissions: string[];
  scope?: string;
  authProvider: string;
}

export interface AuthTokens {
  accessToken: string;
  tokenType: string;
  scope?: string;
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
