import { Router, Request, Response } from 'express';
import { AuthTestSuiteRunner } from '../test-suite/auth.test-runner.ts';
import { db } from '../db/in-memory-db.ts';

const router = Router();

/**
 * POST /api/v1/tests/run
 * Executes the full unit and integration test suite
 */
router.post('/run', async (_req: Request, res: Response): Promise<void> => {
  try {
    const report = await AuthTestSuiteRunner.runAllTests();
    res.status(200).json({
      success: true,
      data: report
    });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      error: {
        code: 'TEST_SUITE_EXECUTION_ERROR',
        message: err.message || 'Error executing test suite',
        timestamp: new Date().toISOString()
      }
    });
  }
});

/**
 * POST /api/v1/tests/reset-db
 * Resets the in-memory database to original seed state
 */
router.post('/reset-db', (_req: Request, res: Response): void => {
  db.seedDefaultUsers();
  res.status(200).json({
    success: true,
    message: 'Database reset to initial security seeds successfully',
    timestamp: new Date().toISOString()
  });
});

export default router;
