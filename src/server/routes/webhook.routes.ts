import { Router, Request, Response } from 'express';
import { db } from '../db/in-memory-db.ts';
import { WebhookLog, StandardApiResponse } from '../types.ts';

export const webhookRouter = Router();

const DEFAULT_DEV_BASE = 'https://ais-dev-2lwonm6okuyvn36wjjwyms-365889169571.us-east1.run.app';
const DEFAULT_PRE_BASE = 'https://ais-pre-2lwonm6okuyvn36wjjwyms-365889169571.us-east1.run.app';

function getBaseUrl(req: Request): string {
  const host = req.get('host');
  if (host && !host.includes('localhost') && !host.includes('127.0.0.1')) {
    return `${req.protocol}://${host}`;
  }
  return DEFAULT_DEV_BASE;
}

/**
 * GET /api/v1/webhooks/info
 * Returns canonical callback URLs for OAuth, Firebase, and Webhooks.
 */
webhookRouter.get('/info', (req: Request, res: Response) => {
  const currentBase = getBaseUrl(req);

  res.json({
    success: true,
    data: {
      currentBase,
      devAppUrl: DEFAULT_DEV_BASE,
      sharedAppUrl: DEFAULT_PRE_BASE,
      callbackUrls: {
        oauthCallbackUrl: `${currentBase}/api/v1/auth/callback`,
        oauthCallbackUrlDev: `${DEFAULT_DEV_BASE}/api/v1/auth/callback`,
        oauthCallbackUrlShared: `${DEFAULT_PRE_BASE}/api/v1/auth/callback`,
        firebaseAuthHandler: `${currentBase}/__/auth/handler`,
        generalWebhookCallbackUrl: `${currentBase}/api/v1/webhooks/callback`,
        workerEventCallbackUrl: `${currentBase}/api/v1/webhooks/worker-event`
      },
      instructions: {
        oauthProviders: 'Register this OAuth Callback URL in Google Cloud Console or GitHub OAuth Apps: Authorized redirect URIs',
        firebaseAuth: 'Using standard OpenID Connect handlers rather than capturing third-party credentials directly in client app: firebaseapp.com/__/auth/handler',
        webhooks: 'Configure this webhook URL in external services to receive real-time payload callbacks and worker events'
      }
    }
  });
});

/**
 * GET /api/v1/auth/callback
 * Handles OAuth 2.0 redirect callbacks with authorization code or errors.
 */
webhookRouter.get('/auth/callback', (req: Request, res: Response) => {
  const { code, state, error, error_description } = req.query;

  const log: WebhookLog = {
    id: `oauth_cb_${Date.now()}`,
    timestamp: new Date().toISOString(),
    method: 'GET',
    path: '/api/v1/auth/callback',
    headers: req.headers as Record<string, string>,
    query: req.query as Record<string, any>,
    body: {},
    clientIp: req.ip || req.socket.remoteAddress
  };
  db.addWebhookLog(log);

  if (error) {
    res.status(400).json({
      success: false,
      error: {
        code: 'OAUTH_CALLBACK_ERROR',
        message: String(error_description || error),
        timestamp: new Date().toISOString()
      },
      receivedParams: { code, state, error }
    });
    return;
  }

  res.json({
    success: true,
    message: 'OAuth authorization code callback received successfully',
    data: {
      authorizationCode: code ? `${String(code).substring(0, 8)}...[TRUNCATED]` : undefined,
      state,
      loggedAt: log.timestamp,
      nextStep: 'Exchange authorization code with provider token endpoint using client secret'
    }
  });
});

/**
 * POST /api/v1/auth/callback
 * Handles OAuth 2.0 POST callbacks (e.g. form_post response mode).
 */
webhookRouter.post('/auth/callback', (req: Request, res: Response) => {
  const log: WebhookLog = {
    id: `oauth_post_${Date.now()}`,
    timestamp: new Date().toISOString(),
    method: 'POST',
    path: '/api/v1/auth/callback',
    headers: req.headers as Record<string, string>,
    query: req.query as Record<string, any>,
    body: req.body,
    clientIp: req.ip || req.socket.remoteAddress
  };
  db.addWebhookLog(log);

  res.json({
    success: true,
    message: 'OAuth POST callback received and recorded in audit log',
    data: { logId: log.id, bodyKeys: Object.keys(req.body || {}) }
  });
});

/**
 * POST /api/v1/webhooks/callback
 * Universal webhook callback receiver endpoint.
 */
webhookRouter.post('/callback', (req: Request, res: Response) => {
  const log: WebhookLog = {
    id: `hook_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    timestamp: new Date().toISOString(),
    method: 'POST',
    path: '/api/v1/webhooks/callback',
    headers: req.headers as Record<string, string>,
    query: req.query as Record<string, any>,
    body: req.body,
    clientIp: req.ip || req.socket.remoteAddress
  };
  db.addWebhookLog(log);

  res.status(200).json({
    success: true,
    message: 'Webhook callback payload received and persisted in inspection log',
    data: {
      logId: log.id,
      timestamp: log.timestamp,
      bodyPayloadSize: JSON.stringify(req.body || {}).length
    }
  });
});

/**
 * POST /api/v1/webhooks/worker-event
 * Dedicated ingest endpoint for worker callback heartbeats & task results.
 */
webhookRouter.post('/worker-event', (req: Request, res: Response) => {
  const log: WebhookLog = {
    id: `worker_ev_${Date.now()}`,
    timestamp: new Date().toISOString(),
    method: 'POST',
    path: '/api/v1/webhooks/worker-event',
    headers: req.headers as Record<string, string>,
    query: req.query as Record<string, any>,
    body: req.body,
    clientIp: req.ip || req.socket.remoteAddress
  };
  db.addWebhookLog(log);

  res.status(200).json({
    success: true,
    message: 'Worker event acknowledged',
    data: { logId: log.id }
  });
});

/**
 * GET /api/v1/webhooks/logs
 * List all captured webhook and callback logs.
 */
webhookRouter.get('/logs', (req: Request, res: Response) => {
  const logs = db.listWebhookLogs();
  res.json({
    success: true,
    data: {
      logs,
      count: logs.length
    }
  });
});

/**
 * DELETE /api/v1/webhooks/logs
 * Clear webhook logs.
 */
webhookRouter.delete('/logs', (req: Request, res: Response) => {
  db.clearWebhookLogs();
  res.json({
    success: true,
    message: 'Webhook callback logs cleared'
  });
});

/**
 * POST /api/v1/webhooks/simulate
 * Simulates an incoming callback event (e.g. from Google OAuth or Worker Alert) for testing.
 */
webhookRouter.post('/simulate', (req: Request, res: Response) => {
  const { provider, eventType, customBody } = req.body;

  let simulatedBody = customBody;
  if (!simulatedBody) {
    if (provider === 'google') {
      simulatedBody = {
        event: 'oauth.token_exchange_simulation',
        email: 'user.test@enterprise.io',
        verified_email: true,
        scope: 'openid email profile',
        timestamp: new Date().toISOString()
      };
    } else if (provider === 'worker') {
      simulatedBody = {
        workerId: 'worker-audit-logger-02',
        status: 'HEARTBEAT_ACK',
        metrics: { memoryUsageMb: 64, activeConnections: 12 },
        timestamp: new Date().toISOString()
      };
    } else {
      simulatedBody = {
        event: eventType || 'test.webhook_ping',
        payload: { simulated: true, timestamp: new Date().toISOString() }
      };
    }
  }

  const log: WebhookLog = {
    id: `sim_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    timestamp: new Date().toISOString(),
    method: 'POST',
    path: '/api/v1/webhooks/callback',
    headers: {
      'content-type': 'application/json',
      'user-agent': 'AuthForge-Webhook-Simulator/1.0',
      'x-webhook-signature': `sha256=${Math.random().toString(36).substring(2, 18)}`
    },
    query: {},
    body: simulatedBody,
    clientIp: '127.0.0.1'
  };

  db.addWebhookLog(log);

  res.json({
    success: true,
    message: 'Simulated callback event recorded into webhook log',
    data: { log }
  });
});
