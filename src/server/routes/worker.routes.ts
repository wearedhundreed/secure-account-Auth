import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { db } from '../db/in-memory-db.ts';
import { validateBody } from '../middleware/validation.middleware.ts';
import { StandardApiResponse, WorkerMessage, TestWorker } from '../types.ts';

export const workerRouter = Router();

// Schema for dispatching test messages to workers
const DispatchMessageSchema = z.object({
  targetWorkerId: z.string().min(1, 'Target worker ID or "all" is required'),
  topic: z.string().min(1, 'Topic or event type is required'),
  priority: z.enum(['low', 'normal', 'high', 'urgent']).default('normal'),
  payload: z.any().default({})
});

const RegisterWorkerSchema = z.object({
  name: z.string().min(2, 'Worker name is required'),
  role: z.string().min(2, 'Worker role is required'),
  environment: z.string().default('test-sandbox-custom'),
  type: z.enum(['queue', 'webhook', 'push', 'cron']).default('webhook'),
  topics: z.array(z.string()).min(1, 'At least one topic is required'),
  endpoint: z.string().optional()
});

/**
 * GET /api/v1/workers
 * List all registered workers in the test environment.
 */
workerRouter.get('/', (req: Request, res: Response) => {
  const workers = db.listWorkers();
  const response: StandardApiResponse<{ workers: TestWorker[]; totalCount: number }> = {
    success: true,
    data: {
      workers,
      totalCount: workers.length
    }
  };
  res.json(response);
});

/**
 * POST /api/v1/workers/dispatch
 * Send a test message or event payload to a worker or all workers in test environment.
 */
workerRouter.post(
  '/dispatch',
  validateBody(DispatchMessageSchema),
  (req: Request, res: Response) => {
    const { targetWorkerId, topic, priority, payload } = req.body;
    const workers = db.listWorkers();

    if (targetWorkerId === 'all') {
      const messages: WorkerMessage[] = [];
      for (const w of workers) {
        const msg = db.dispatchMessageToWorker(w.id, topic, priority, payload);
        messages.push(msg);
      }

      const response: StandardApiResponse<{ messages: WorkerMessage[]; targetCount: number }> = {
        success: true,
        message: `Broadcast message dispatched to ${workers.length} test workers successfully`,
        data: {
          messages,
          targetCount: workers.length
        }
      };
      res.status(200).json(response);
      return;
    }

    const worker = db.findWorkerById(targetWorkerId);
    if (!worker) {
      res.status(404).json({
        success: false,
        error: {
          code: 'WORKER_NOT_FOUND',
          message: `Worker with ID '${targetWorkerId}' was not found in test environment`,
          timestamp: new Date().toISOString()
        }
      });
      return;
    }

    const message = db.dispatchMessageToWorker(targetWorkerId, topic, priority, payload);

    const response: StandardApiResponse<{ message: WorkerMessage; worker: TestWorker }> = {
      success: true,
      message: `Test message dispatched to worker '${worker.name}' (${worker.id})`,
      data: {
        message,
        worker
      }
    };
    res.status(200).json(response);
  }
);

/**
 * GET /api/v1/workers/history
 * Audit logs of all dispatched test messages.
 */
workerRouter.get('/history', (req: Request, res: Response) => {
  const messages = db.listWorkerMessages();
  res.json({
    success: true,
    data: {
      messages,
      count: messages.length
    }
  });
});

/**
 * DELETE /api/v1/workers/history
 * Clear message dispatch history.
 */
workerRouter.delete('/history', (req: Request, res: Response) => {
  db.clearWorkerMessages();
  res.json({
    success: true,
    message: 'Worker message history cleared'
  });
});

/**
 * POST /api/v1/workers/register
 * Add a new test worker to the fleet.
 */
workerRouter.post(
  '/register',
  validateBody(RegisterWorkerSchema),
  (req: Request, res: Response) => {
    const id = `worker-custom-${Date.now().toString().slice(-4)}`;
    const newWorker: TestWorker = {
      id,
      name: req.body.name,
      role: req.body.role,
      environment: req.body.environment,
      type: req.body.type,
      status: 'ONLINE',
      lastHeartbeat: new Date().toISOString(),
      topics: req.body.topics,
      endpoint: req.body.endpoint || `http://localhost:3000/api/v1/webhooks/worker-${id}`,
      messagesReceived: 0
    };

    db.registerWorker(newWorker);

    res.status(201).json({
      success: true,
      message: `Worker '${newWorker.name}' registered in test environment`,
      data: { worker: newWorker }
    });
  }
);
