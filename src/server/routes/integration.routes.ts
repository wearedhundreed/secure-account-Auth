import { Router, Request, Response } from 'express';
import { db } from '../db/in-memory-db.ts';

export const integrationRouter = Router();

/**
 * GET /api/v1/integrations
 * List all registered integration apps with their status, configuration, and category metrics.
 */
integrationRouter.get('/', (req: Request, res: Response) => {
  const integrations = db.listIntegrations();
  const totalCount = integrations.length;
  const enabledCount = integrations.filter(i => i.enabled).length;

  const categories = {
    identity: integrations.filter(i => i.category === 'identity').length,
    messaging: integrations.filter(i => i.category === 'messaging').length,
    security: integrations.filter(i => i.category === 'security').length,
    communications: integrations.filter(i => i.category === 'communications').length,
    storage: integrations.filter(i => i.category === 'storage').length
  };

  res.json({
    success: true,
    data: {
      integrations,
      summary: {
        totalCount,
        enabledCount,
        disabledCount: totalCount - enabledCount,
        allEnabled: enabledCount === totalCount,
        percentageEnabled: totalCount > 0 ? Math.round((enabledCount / totalCount) * 100) : 0,
        categories
      }
    }
  });
});

/**
 * POST /api/v1/integrations/enable-all
 * Enable all integration apps in the ecosystem.
 */
integrationRouter.post('/enable-all', (req: Request, res: Response) => {
  const updated = db.enableAllIntegrations();

  res.json({
    success: true,
    message: `All ${updated.length} integration applications have been enabled and connected!`,
    data: {
      integrations: updated,
      summary: {
        totalCount: updated.length,
        enabledCount: updated.length,
        disabledCount: 0,
        allEnabled: true,
        percentageEnabled: 100
      }
    }
  });
});

/**
 * POST /api/v1/integrations/disable-all
 * Disable all integration apps in bulk.
 */
integrationRouter.post('/disable-all', (req: Request, res: Response) => {
  const updated = db.disableAllIntegrations();

  res.json({
    success: true,
    message: `All ${updated.length} integration applications have been set to standby/disabled.`,
    data: {
      integrations: updated,
      summary: {
        totalCount: updated.length,
        enabledCount: 0,
        disabledCount: updated.length,
        allEnabled: false,
        percentageEnabled: 0
      }
    }
  });
});

/**
 * PATCH /api/v1/integrations/:id/toggle
 * Toggle enabled state for an individual integration app.
 */
integrationRouter.patch('/:id/toggle', (req: Request, res: Response) => {
  const { id } = req.params;
  const { enabled } = req.body;

  const updated = db.toggleIntegration(id, typeof enabled === 'boolean' ? enabled : undefined);

  if (!updated) {
    res.status(404).json({
      success: false,
      error: {
        code: 'INTEGRATION_NOT_FOUND',
        message: `Integration app with ID '${id}' not found`
      }
    });
    return;
  }

  res.json({
    success: true,
    message: `Integration '${updated.name}' is now ${updated.enabled ? 'ENABLED' : 'DISABLED'}`,
    data: { integration: updated }
  });
});

/**
 * POST /api/v1/integrations/:id/test
 * Perform a real-time health ping and handshake test on the integration app.
 */
integrationRouter.post('/:id/test', (req: Request, res: Response) => {
  const { id } = req.params;

  const result = db.testIntegration(id);

  if (!result) {
    res.status(404).json({
      success: false,
      error: {
        code: 'INTEGRATION_NOT_FOUND',
        message: `Integration app with ID '${id}' not found`
      }
    });
    return;
  }

  res.json({
    success: true,
    message: result.message,
    data: result
  });
});

/**
 * POST /api/v1/integrations/connect-all
 * Connect and handshake all integrations simultaneously with verified receipts.
 */
integrationRouter.post('/connect-all', (req: Request, res: Response) => {
  const result = db.connectAllIntegrations();

  res.json({
    success: true,
    message: `All ${result.connectedCount} integration applications have been connected, handshaked, and verified!`,
    data: {
      integrations: result.integrations,
      receipts: result.receipts,
      summary: {
        totalCount: result.totalCount,
        enabledCount: result.connectedCount,
        disabledCount: 0,
        allEnabled: true,
        percentageEnabled: 100
      }
    }
  });
});

/**
 * POST /api/v1/integrations/auto-fix
 * Deep diagnosis and automatic resolution for integration connectivity issues.
 */
integrationRouter.post('/auto-fix', (req: Request, res: Response) => {
  const result = db.autoFixIntegrations();

  res.json({
    success: true,
    message: `Antigravity AI resolved ${result.repairedCount} connectivity bottlenecks and verified all endpoints.`,
    data: result
  });
});

/**
 * PUT /api/v1/integrations/:id/config
 * Update integration configuration parameters (e.g. data center region or tenant domain).
 */
integrationRouter.put('/:id/config', (req: Request, res: Response) => {
  const { id } = req.params;
  const { config } = req.body;

  if (!config || typeof config !== 'object') {
    res.status(400).json({
      success: false,
      error: { code: 'INVALID_CONFIG', message: 'Config object is required' }
    });
    return;
  }

  const updated = db.updateIntegrationConfig(id, config);
  if (!updated) {
    res.status(404).json({
      success: false,
      error: { code: 'INTEGRATION_NOT_FOUND', message: `Integration '${id}' not found` }
    });
    return;
  }

  res.json({
    success: true,
    message: `Configuration for '${updated.name}' updated successfully.`,
    data: { integration: updated }
  });
});

