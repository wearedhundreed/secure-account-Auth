import express, { Request, Response, NextFunction } from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import authRoutes from './src/server/routes/auth.routes.ts';
import protectedRoutes from './src/server/routes/protected.routes.ts';
import testRoutes from './src/server/routes/test.routes.ts';
import { workerRouter } from './src/server/routes/worker.routes.ts';
import { webhookRouter } from './src/server/routes/webhook.routes.ts';
import { gitRouter } from './src/server/routes/git.routes.ts';

async function startServer() {
  const app = express();
  const PORT = 3000;

  // JSON Body Parser
  app.use(express.json({ limit: '1mb' }));

  // Request logging in development
  app.use((req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
      if (req.path.startsWith('/api/')) {
        const duration = Date.now() - start;
        console.log(`[HTTP] ${req.method} ${req.path} -> ${res.statusCode} (${duration}ms)`);
      }
    });
    next();
  });

  // Health check endpoint
  app.get('/api/health', (req, res) => {
    res.json({
      status: 'ok',
      service: 'AuthForge RBAC & Token Service',
      version: '1.0.0',
      timestamp: new Date().toISOString()
    });
  });

  // API Routes
  app.use('/api/v1/auth', authRoutes);
  app.use('/api/v1/protected', protectedRoutes);
  app.use('/api/v1/tests', testRoutes);
  app.use('/api/v1/workers', workerRouter);
  app.use('/api/v1/webhooks', webhookRouter);
  app.use('/api/v1/git', gitRouter);

  // Global Error Handler for API Routes
  app.use('/api/*', (err: any, req: Request, res: Response, _next: NextFunction) => {
    console.error('[API ERROR]', err);
    const status = typeof err.status === 'number' ? err.status : 500;
    res.status(status).json({
      success: false,
      error: {
        code: err.code || 'INTERNAL_SERVER_ERROR',
        message: err.message || 'An unexpected server error occurred',
        timestamp: new Date().toISOString()
      }
    });
  });

  // Vite middleware for development vs static build in production
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[AuthForge] Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
