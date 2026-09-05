import { CONFIG } from '../config.ts';
import { PasswordService } from '../services/password.service.ts';
import { RefreshTokenRecord, User, UserRole, Permission, TestWorker, WorkerMessage, WebhookLog } from '../types.ts';

export class InMemoryDatabase {
  private users: Map<string, User> = new Map();
  private usersByEmail: Map<string, string> = new Map();
  private usersByFirebaseUid: Map<string, string> = new Map();
  private refreshTokens: Map<string, RefreshTokenRecord> = new Map();
  private workers: Map<string, TestWorker> = new Map();
  private workerMessages: WorkerMessage[] = [];
  private webhookLogs: WebhookLog[] = [];

  constructor() {
    this.seedDefaultUsers();
    this.seedDefaultWorkers();
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
}

export const db = new InMemoryDatabase();
