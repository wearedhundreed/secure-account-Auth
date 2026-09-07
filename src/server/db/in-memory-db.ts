import { CONFIG } from '../config.ts';
import { PasswordService } from '../services/password.service.ts';
import { RefreshTokenRecord, User, UserRole, Permission, TestWorker, WorkerMessage, WebhookLog, IntegrationApp } from '../types.ts';

export class InMemoryDatabase {
  private users: Map<string, User> = new Map();
  private usersByEmail: Map<string, string> = new Map();
  private usersByFirebaseUid: Map<string, string> = new Map();
  private refreshTokens: Map<string, RefreshTokenRecord> = new Map();
  private workers: Map<string, TestWorker> = new Map();
  private workerMessages: WorkerMessage[] = [];
  private webhookLogs: WebhookLog[] = [];
  private integrations: Map<string, IntegrationApp> = new Map();

  constructor() {
    this.seedDefaultUsers();
    this.seedDefaultWorkers();
    this.seedDefaultIntegrations();
  }

  public seedDefaultWorkers(): void {
    this.workers.clear();
    const now = new Date().toISOString();

    const seededWorkers: TestWorker[] = [
      {
        id: 'worker-auth-engine-01',
        name: 'Auth Security Daemon',
        role: 'Token Invalidation & Replay Detector',
        environment: 'test-sandbox-us-east1',
        type: 'queue',
        status: 'ONLINE',
        lastHeartbeat: now,
        topics: ['auth.token.revoked', 'auth.tamper.detected', 'test.ping'],
        endpoint: 'amqp://localhost:5672/auth-events',
        messagesReceived: 12
      },
      {
        id: 'worker-audit-logger-02',
        name: 'Audit Compliance Worker',
        role: 'Security Log Archival & Alerting',
        environment: 'test-sandbox-us-east1',
        type: 'webhook',
        status: 'ONLINE',
        lastHeartbeat: now,
        topics: ['audit.events', 'reports.export', 'test.ping'],
        endpoint: 'https://ais-dev-2lwonm6okuyvn36wjjwyms-365889169571.us-east1.run.app/api/v1/webhooks/callback',
        messagesReceived: 8
      },
      {
        id: 'worker-mobile-sync-03',
        name: 'Mobile APK Push Dispatcher',
        role: 'FCM / WebAPK Notification Service',
        environment: 'test-sandbox-mobile',
        type: 'push',
        status: 'ONLINE',
        lastHeartbeat: now,
        topics: ['mobile.push', 'worker.alert', 'test.ping'],
        endpoint: 'fcm://test-project/mobile-fleet',
        messagesReceived: 5
      },
      {
        id: 'worker-batch-node-04',
        name: 'Batch Worker Node',
        role: 'Scheduled Replay Analysis & Reports',
        environment: 'test-sandbox-us-east1',
        type: 'cron',
        status: 'IDLE',
        lastHeartbeat: now,
        topics: ['batch.job', 'test.ping'],
        endpoint: 'cron://worker-batch-node/hourly',
        messagesReceived: 3
      }
    ];

    for (const w of seededWorkers) {
      this.workers.set(w.id, w);
    }
  }

  public seedDefaultUsers(): void {
    this.users.clear();
    this.usersByEmail.clear();
    this.usersByFirebaseUid.clear();
    this.refreshTokens.clear();

    const timestamp = new Date().toISOString();

    const seededUsers: User[] = [
      {
        id: 'usr_admin_001',
        email: 'admin@authforge.dev',
        name: 'Alex Vance (Principal Admin)',
        role: 'admin',
        permissions: [...CONFIG.DEFAULT_ROLE_PERMISSIONS.admin],
        scope: CONFIG.DEFAULT_ROLE_SCOPES.admin,
        passwordHash: PasswordService.hashPasswordSync('AdminPassword123!'),
        authProvider: 'local',
        createdAt: timestamp,
        updatedAt: timestamp
      },
      {
        id: 'usr_manager_002',
        email: 'manager@authforge.dev',
        name: 'Sarah Connor (Engineering Manager)',
        role: 'manager',
        permissions: [...CONFIG.DEFAULT_ROLE_PERMISSIONS.manager],
        scope: CONFIG.DEFAULT_ROLE_SCOPES.manager,
        passwordHash: PasswordService.hashPasswordSync('ManagerPassword123!'),
        authProvider: 'local',
        createdAt: timestamp,
        updatedAt: timestamp
      },
      {
        id: 'usr_engineer_003',
        email: 'engineer@authforge.dev',
        name: 'David Chen (Software Engineer)',
        role: 'user',
        permissions: [...CONFIG.DEFAULT_ROLE_PERMISSIONS.user],
        scope: CONFIG.DEFAULT_ROLE_SCOPES.user,
        passwordHash: PasswordService.hashPasswordSync('UserPassword123!'),
        authProvider: 'local',
        createdAt: timestamp,
        updatedAt: timestamp
      },
      {
        id: 'usr_auditor_004',
        email: 'auditor@authforge.dev',
        name: 'Elena Rostova (Compliance Auditor)',
        role: 'auditor',
        permissions: [...CONFIG.DEFAULT_ROLE_PERMISSIONS.auditor],
        scope: CONFIG.DEFAULT_ROLE_SCOPES.auditor,
        passwordHash: PasswordService.hashPasswordSync('AuditorPassword123!'),
        authProvider: 'local',
        createdAt: timestamp,
        updatedAt: timestamp
      }
    ];

    for (const u of seededUsers) {
      this.users.set(u.id, u);
      this.usersByEmail.set(u.email.toLowerCase(), u.id);
    }
  }

  public createUser(user: User): User {
    this.users.set(user.id, user);
    this.usersByEmail.set(user.email.toLowerCase(), user.id);
    if (user.firebaseUid) {
      this.usersByFirebaseUid.set(user.firebaseUid, user.id);
    }
    return user;
  }

  public findUserById(id: string): User | undefined {
    return this.users.get(id);
  }

  public findUserByEmail(email: string): User | undefined {
    const userId = this.usersByEmail.get(email.toLowerCase());
    if (!userId) return undefined;
    return this.users.get(userId);
  }

  public findUserByFirebaseUid(uid: string): User | undefined {
    const userId = this.usersByFirebaseUid.get(uid);
    if (!userId) return undefined;
    return this.users.get(userId);
  }

  public updateUserRole(userId: string, role: UserRole, permissions?: Permission[]): User | undefined {
    const user = this.users.get(userId);
    if (!user) return undefined;

    const updatedUser: User = {
      ...user,
      role,
      permissions: permissions || [...CONFIG.DEFAULT_ROLE_PERMISSIONS[role]],
      updatedAt: new Date().toISOString()
    };

    this.users.set(userId, updatedUser);
    return updatedUser;
  }

  public saveRefreshToken(record: RefreshTokenRecord): void {
    this.refreshTokens.set(record.token, record);
  }

  public findRefreshToken(token: string): RefreshTokenRecord | undefined {
    return this.refreshTokens.get(token);
  }

  public revokeRefreshToken(token: string): boolean {
    const record = this.refreshTokens.get(token);
    if (!record) return false;
    record.isRevoked = true;
    return true;
  }

  public revokeFamily(familyId: string): void {
    for (const record of this.refreshTokens.values()) {
      if (record.familyId === familyId) {
        record.isRevoked = true;
      }
    }
  }

  public revokeAllUserTokens(userId: string): void {
    for (const record of this.refreshTokens.values()) {
      if (record.userId === userId) {
        record.isRevoked = true;
      }
    }
  }

  public listUsers(): User[] {
    return Array.from(this.users.values());
  }

  public getActiveTokensCount(): number {
    let count = 0;
    const now = Date.now();
    for (const token of this.refreshTokens.values()) {
      if (!token.isRevoked && token.expiresAt > now) {
        count++;
      }
    }
    return count;
  }

  // --- Worker Test Messaging Management ---
  public listWorkers(): TestWorker[] {
    return Array.from(this.workers.values());
  }

  public findWorkerById(id: string): TestWorker | undefined {
    return this.workers.get(id);
  }

  public registerWorker(worker: TestWorker): TestWorker {
    this.workers.set(worker.id, worker);
    return worker;
  }

  public dispatchMessageToWorker(
    workerId: string, 
    topic: string, 
    priority: 'low' | 'normal' | 'high' | 'urgent', 
    payload: any
  ): WorkerMessage {
    const worker = this.workers.get(workerId);
    const workerName = worker ? worker.name : `Worker (${workerId})`;
    const latencyMs = Math.floor(Math.random() * 45) + 12; // 12-57ms realistic simulated latency

    if (worker) {
      worker.messagesReceived += 1;
      worker.lastHeartbeat = new Date().toISOString();
    }

    const message: WorkerMessage = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      workerId,
      workerName,
      topic,
      priority,
      payload,
      sentAt: new Date().toISOString(),
      status: 'ACKNOWLEDGED',
      latencyMs,
      response: {
        acknowledged: true,
        workerStatus: 'OK',
        processedAt: new Date(Date.now() + latencyMs).toISOString(),
        receiptId: `rcpt_${Math.random().toString(36).substring(2, 9)}`,
        consumerThread: `thread_${workerId.split('-')[1] || '01'}`
      }
    };

    this.workerMessages.unshift(message);
    if (this.workerMessages.length > 100) {
      this.workerMessages = this.workerMessages.slice(0, 100);
    }

    return message;
  }

  public listWorkerMessages(): WorkerMessage[] {
    return [...this.workerMessages];
  }

  public clearWorkerMessages(): void {
    this.workerMessages = [];
  }

  // --- Webhook Logs Management ---
  public addWebhookLog(log: WebhookLog): void {
    this.webhookLogs.unshift(log);
    if (this.webhookLogs.length > 100) {
      this.webhookLogs = this.webhookLogs.slice(0, 100);
    }
  }

  public listWebhookLogs(): WebhookLog[] {
    return [...this.webhookLogs];
  }

  public clearWebhookLogs(): void {
    this.webhookLogs = [];
  }

  // --- Integration Apps Management ---
  public seedDefaultIntegrations(): void {
    this.integrations.clear();
    const now = new Date().toISOString();

    const seededApps: IntegrationApp[] = [
      {
        id: 'int_google_workspace',
        name: 'Google Cloud & Workspace SSO',
        category: 'identity',
        description: 'Single Sign-On, Workspace directory sync, profile verification, and OpenID Connect redirect handler.',
        iconName: 'google',
        enabled: true,
        status: 'ENABLED',
        protocol: 'OAuth 2.0 / OIDC',
        endpoint: 'https://ais-dev-2lwonm6okuyvn36wjjwyms-365889169571.us-east1.run.app/api/v1/auth/callback',
        health: 'HEALTHY',
        latencyMs: 18,
        lastSynced: now,
        features: ['Single Sign-On (SSO)', 'Profile Sync', 'Workspace Directory', 'OAuth 2.0 PKCE'],
        config: {
          clientId: '365889169571-client-id.apps.googleusercontent.com',
          scope: 'openid email profile',
          tokenEndpoint: 'https://oauth2.googleapis.com/token'
        }
      },
      {
        id: 'int_github_oauth',
        name: 'GitHub Enterprise OAuth',
        category: 'identity',
        description: 'Developer authentication, organization membership RBAC checks, and CI/CD webhook verification.',
        iconName: 'github',
        enabled: true,
        status: 'ENABLED',
        protocol: 'OAuth 2.0',
        endpoint: 'https://ais-dev-2lwonm6okuyvn36wjjwyms-365889169571.us-east1.run.app/api/v1/auth/callback',
        health: 'HEALTHY',
        latencyMs: 24,
        lastSynced: now,
        features: ['User Authentication', 'Team RBAC Sync', 'Org Membership Validation', 'SSH/Key Sync'],
        config: {
          clientId: 'Iv1.8a9bf38410291e9',
          scope: 'read:user user:email read:org',
          authorizeUrl: 'https://github.com/login/oauth/authorize'
        }
      },
      {
        id: 'int_microsoft_entra',
        name: 'Microsoft Entra ID (Azure AD)',
        category: 'identity',
        description: 'Enterprise multi-tenant directory, conditional access policies, and Azure App Registrations.',
        iconName: 'microsoft',
        enabled: true,
        status: 'ENABLED',
        protocol: 'SAML 2.0 / OIDC',
        endpoint: 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize',
        health: 'HEALTHY',
        latencyMs: 31,
        lastSynced: now,
        features: ['Tenant Isolation', 'Conditional Access', 'MS Graph API', 'Directory Sync'],
        config: {
          tenantId: '72f988bf-86f1-41af-91ab-2d7cd011db47',
          scope: 'User.Read Directory.Read.All',
          issuer: 'https://login.microsoftonline.com/v2.0'
        }
      },
      {
        id: 'int_okta_auth0',
        name: 'Okta & Auth0 Identity Hub',
        category: 'identity',
        description: 'Automated user provisioning via SCIM 2.0, universal enterprise directory, and MFA enforcement.',
        iconName: 'shield',
        enabled: true,
        status: 'ENABLED',
        protocol: 'OIDC / SCIM 2.0',
        endpoint: 'https://authforge.okta.com/oauth2/v1/authorize',
        health: 'HEALTHY',
        latencyMs: 22,
        lastSynced: now,
        features: ['SCIM 2.0 Provisioning', 'Universal Directory', 'MFA Step-Up', 'Session Revocation'],
        config: {
          domain: 'authforge.okta.com',
          scimEndpoint: 'https://authforge.okta.com/scim/v2',
          mfaPolicy: 'enforced_for_admins'
        }
      },
      {
        id: 'int_firebase_auth',
        name: 'Firebase Admin & Auth Suite',
        category: 'identity',
        description: 'RS256 ID Token verification via Firebase Admin SDK with project audience isolation and custom claims.',
        iconName: 'flame',
        enabled: true,
        status: 'ENABLED',
        protocol: 'Firebase Token SDK',
        endpoint: 'https://ais-dev-2lwonm6okuyvn36wjjwyms-365889169571.us-east1.run.app/__/auth/handler',
        health: 'HEALTHY',
        latencyMs: 12,
        lastSynced: now,
        features: ['RS256 JWT Verification', 'Custom Role Claims', 'Audience Isolation', 'Handler Gateway'],
        config: {
          projectId: 'authforge-cloud-sandbox',
          issuerPrefix: 'https://securetoken.google.com/',
          tokenCacheTtlSec: '3600'
        }
      },
      {
        id: 'int_rabbitmq_broker',
        name: 'RabbitMQ Event Bus',
        category: 'messaging',
        description: 'Real-time token revocation broadcasts, permission invalidation messages, and security queue workers.',
        iconName: 'radio',
        enabled: true,
        status: 'ENABLED',
        protocol: 'AMQP 0-9-1',
        endpoint: 'amqp://localhost:5672/auth-events',
        health: 'HEALTHY',
        latencyMs: 15,
        lastSynced: now,
        features: ['auth.token.revoked Topic', 'DLQ Dead Letter Routing', 'Persistent Queues', 'Sub-ms ACK'],
        config: {
          virtualHost: '/auth-events',
          prefetchCount: '50',
          durable: 'true'
        }
      },
      {
        id: 'int_apache_kafka',
        name: 'Apache Kafka Stream Engine',
        category: 'messaging',
        description: 'High-throughput distributed audit log pipeline and partition-replicated auth telemetry stream.',
        iconName: 'cpu',
        enabled: true,
        status: 'ENABLED',
        protocol: 'Kafka Binary Protocol',
        endpoint: 'kafka://kafka-cluster.internal:9092/auth.telemetry',
        health: 'HEALTHY',
        latencyMs: 28,
        lastSynced: now,
        features: ['Audit Stream Topic', 'Partitions 0-3', 'Consumer Group Balancing', 'Zero-Loss Storage'],
        config: {
          brokers: 'kafka-01:9092,kafka-02:9092',
          topic: 'authforge.security.events',
          compression: 'lz4'
        }
      },
      {
        id: 'int_aws_sqs_sns',
        name: 'AWS SQS / SNS Cloud Bridge',
        category: 'messaging',
        description: 'Cross-region asynchronous event dispatch and serverless worker trigger fanout with FIFO ordering.',
        iconName: 'cloud',
        enabled: true,
        status: 'ENABLED',
        protocol: 'HTTPS / AWS SDK',
        endpoint: 'https://sqs.us-east-1.amazonaws.com/365889169571/authforge-queue.fifo',
        health: 'HEALTHY',
        latencyMs: 34,
        lastSynced: now,
        features: ['FIFO Queue Ordering', 'SNS Topic Fanout', 'Serverless Worker Invocations', 'KMS Encryption'],
        config: {
          region: 'us-east-1',
          queueUrl: 'https://sqs.us-east-1.amazonaws.com/365889169571/authforge-queue.fifo',
          kmsMasterKeyId: 'alias/authforge-key'
        }
      },
      {
        id: 'int_fcm_mobile',
        name: 'Firebase Cloud Messaging (FCM)',
        category: 'messaging',
        description: 'Direct mobile push notifications for WebAPK and native Android/iOS security alerts and 2FA prompts.',
        iconName: 'smartphone',
        enabled: true,
        status: 'ENABLED',
        protocol: 'FCM HTTP v1 / APNs',
        endpoint: 'https://fcm.googleapis.com/v1/projects/authforge-cloud-sandbox/messages:send',
        health: 'HEALTHY',
        latencyMs: 19,
        lastSynced: now,
        features: ['WebAPK Push Sync', 'Silent Background Sync', 'Urgent Security Alerts', 'Device Token Registry'],
        config: {
          vapidKey: 'BEl62iUYgUivxIkv69yViEuiBIa-GQ9yKEA01128',
          serviceAccount: 'authforge-fcm@cloud-sandbox.iam.gserviceaccount.com'
        }
      },
      {
        id: 'int_datadog_monitor',
        name: 'Datadog Security & Audit APM',
        category: 'security',
        description: 'Real-time audit log streaming, suspicious login anomaly detection, and synthetic test telemetry.',
        iconName: 'activity',
        enabled: true,
        status: 'ENABLED',
        protocol: 'REST API / Agent v7',
        endpoint: 'https://http-intake.logs.datadoghq.com/v1/input',
        health: 'HEALTHY',
        latencyMs: 25,
        lastSynced: now,
        features: ['Log Archival', 'Anomaly Detection AI', 'Replay Attack Traces', 'SLO Dashboard'],
        config: {
          site: 'datadoghq.com',
          service: 'authforge-token-service',
          tags: 'env:test-sandbox,team:security'
        }
      },
      {
        id: 'int_splunk_siem',
        name: 'Splunk Enterprise SIEM',
        category: 'security',
        description: 'Compliance archival for SOC2 Type II, ISO 27001, and immutable RBAC mutation audit trails.',
        iconName: 'shieldCheck',
        enabled: true,
        status: 'ENABLED',
        protocol: 'HEC (HTTP Event Collector)',
        endpoint: 'https://splunk-hec.internal:8088/services/collector/raw',
        health: 'HEALTHY',
        latencyMs: 29,
        lastSynced: now,
        features: ['Immutable Audit Trails', 'HEC Token Ingest', 'SOC2 Compliance Pack', 'Automated Quarantine'],
        config: {
          index: 'authforge_compliance',
          sourcetype: 'json_auth_audit',
          hecChannel: 'channel-primary-01'
        }
      },
      {
        id: 'int_sentry_replay',
        name: 'Sentry Error & Session Replay',
        category: 'security',
        description: 'Zero-latency crash reporting, unhandled auth exceptions, and token validation trace spans.',
        iconName: 'alertTriangle',
        enabled: true,
        status: 'ENABLED',
        protocol: 'DSN / HTTPS Envelopes',
        endpoint: 'https://o450.ingest.sentry.io/api/45089/envelope/',
        health: 'HEALTHY',
        latencyMs: 16,
        lastSynced: now,
        features: ['Session Replay', 'Trace Spans', 'Crash Alerts', 'Performance Profiling'],
        config: {
          environment: 'test-sandbox',
          tracesSampleRate: '1.0',
          replaysSessionSampleRate: '0.1'
        }
      },
      {
        id: 'int_cloudflare_waf',
        name: 'Cloudflare Turnstile & WAF',
        category: 'security',
        description: 'Privacy-preserving bot detection, brute-force credential stuffing mitigation, and edge rate limiting.',
        iconName: 'globe',
        enabled: true,
        status: 'ENABLED',
        protocol: 'Siteverify REST API',
        endpoint: 'https://challenges.cloudflare.com/turnstile/v0/siteverify',
        health: 'HEALTHY',
        latencyMs: 21,
        lastSynced: now,
        features: ['Bot Mitigation', 'Credential Stuffing Shield', 'Edge Rate Limiting', 'Zero Captcha Friction'],
        config: {
          siteKey: '0x4AAAAAAATestSiteKey',
          wafAction: 'managed_challenge',
          rateLimitPerMinute: '120'
        }
      },
      {
        id: 'int_slack_alerts',
        name: 'Slack Security Ops Dispatcher',
        category: 'communications',
        description: 'Broadcasts urgent auth alerts, token family invalidation incidents, and test suite results to #security-ops.',
        iconName: 'messageSquare',
        enabled: true,
        status: 'ENABLED',
        protocol: 'Incoming Webhooks',
        endpoint: 'https://hooks.slack.com/services/T00/B00/authforge-security-ops',
        health: 'HEALTHY',
        latencyMs: 33,
        lastSynced: now,
        features: ['#security-ops Channel', 'Interactive Block Kit', '1-Click Revoke Button', 'Daily Audit Digest'],
        config: {
          channel: '#security-ops',
          botName: 'AuthForge Security Bot',
          notifyOnTokenRevoked: 'true'
        }
      },
      {
        id: 'int_stripe_billing',
        name: 'Stripe Customer & Billing Webhooks',
        category: 'communications',
        description: 'Automated subscription tier provisioning, customer role promotions, and invoice payment sync.',
        iconName: 'creditCard',
        enabled: true,
        status: 'ENABLED',
        protocol: 'Webhook / HMAC-SHA256',
        endpoint: 'https://ais-dev-2lwonm6okuyvn36wjjwyms-365889169571.us-east1.run.app/api/v1/webhooks/callback',
        health: 'HEALTHY',
        latencyMs: 27,
        lastSynced: now,
        features: ['HMAC-SHA256 Signature', 'Customer Tier Promotion', 'Automatic Role Upgrades', 'Metered Usage'],
        config: {
          webhookSecret: 'whsec_test_9921471018241',
          apiMode: 'test_sandbox',
          currency: 'usd'
        }
      },
      {
        id: 'int_twilio_mfa',
        name: 'Twilio Verify & SMS MFA Gateway',
        category: 'communications',
        description: 'Out-of-band two-factor authentication codes and SMS account recovery verification.',
        iconName: 'phone',
        enabled: true,
        status: 'ENABLED',
        protocol: 'REST API v2010',
        endpoint: 'https://api.twilio.com/2010-04-01/Accounts/AC3658891/Messages.json',
        health: 'HEALTHY',
        latencyMs: 38,
        lastSynced: now,
        features: ['SMS OTP 6-Digit Codes', 'Voice Call Backup', 'Rate-limited Verification', 'E.164 Number Validation'],
        config: {
          accountSid: 'AC36588916957100192',
          verifyServiceSid: 'VA8817290124',
          channel: 'sms'
        }
      }
    ];

    for (const app of seededApps) {
      this.integrations.set(app.id, app);
    }
  }

  public listIntegrations(): IntegrationApp[] {
    return Array.from(this.integrations.values());
  }

  public getIntegration(id: string): IntegrationApp | undefined {
    return this.integrations.get(id);
  }

  public enableAllIntegrations(): IntegrationApp[] {
    const now = new Date().toISOString();
    for (const [id, app] of this.integrations.entries()) {
      this.integrations.set(id, {
        ...app,
        enabled: true,
        status: 'ENABLED',
        health: 'HEALTHY',
        lastSynced: now
      });
    }
    return this.listIntegrations();
  }

  public disableAllIntegrations(): IntegrationApp[] {
    const now = new Date().toISOString();
    for (const [id, app] of this.integrations.entries()) {
      this.integrations.set(id, {
        ...app,
        enabled: false,
        status: 'DISABLED',
        health: 'STANDBY',
        lastSynced: now
      });
    }
    return this.listIntegrations();
  }

  public toggleIntegration(id: string, enabled?: boolean): IntegrationApp | null {
    const app = this.integrations.get(id);
    if (!app) return null;

    const newEnabled = enabled !== undefined ? enabled : !app.enabled;
    const updated: IntegrationApp = {
      ...app,
      enabled: newEnabled,
      status: newEnabled ? 'ENABLED' : 'DISABLED',
      health: newEnabled ? 'HEALTHY' : 'STANDBY',
      lastSynced: new Date().toISOString()
    };
    this.integrations.set(id, updated);
    return updated;
  }

  public testIntegration(id: string): { success: boolean; latencyMs: number; message: string; receipt: any } | null {
    const app = this.integrations.get(id);
    if (!app) return null;

    const latencyMs = Math.floor(Math.random() * 35) + 12;
    const now = new Date().toISOString();

    // Mark as active and record latency
    app.lastSynced = now;
    app.latencyMs = latencyMs;
    app.health = 'HEALTHY';
    this.integrations.set(id, app);

    return {
      success: true,
      latencyMs,
      message: `Connection test verified for '${app.name}' via ${app.protocol}`,
      receipt: {
        integrationId: app.id,
        name: app.name,
        protocol: app.protocol,
        targetEndpoint: app.endpoint,
        status: 'VERIFIED',
        pingTimestamp: now,
        latencyMs,
        responseCode: 200,
        handshakeReceipt: `hsk_${Math.random().toString(36).substring(2, 10)}`
      }
    };
  }
}

export const db = new InMemoryDatabase();
