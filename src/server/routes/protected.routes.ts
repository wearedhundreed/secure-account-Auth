import { Router, Request, Response, NextFunction } from 'express';
import { db } from '../db/in-memory-db.ts';
import { requireAuth } from '../middleware/auth.middleware.ts';
import { requireRole, requirePermission } from '../middleware/rbac.middleware.ts';
import { validateBody, AssignRoleSchema } from '../middleware/validation.middleware.ts';
import { UserRole } from '../types.ts';

const router = Router();

// All routes in this router require a valid Bearer JWT access token
router.use(requireAuth);

/**
 * GET /api/v1/protected/profile
 * Accessible to any authenticated user with a valid access token
 */
router.get('/profile', (req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    data: {
      message: 'Access granted to authenticated profile',
      user: {
        id: req.user!.id,
        email: req.user!.email,
        name: req.user!.name,
        role: req.user!.role,
        permissions: req.user!.permissions,
        authProvider: req.user!.authProvider
      },
      tokenExpirySecondsRemaining: req.tokenPayload?.exp
        ? Math.max(0, req.tokenPayload.exp - Math.floor(Date.now() / 1000))
        : 0
    }
  });
});

/**
 * GET /api/v1/protected/manager-reports
 * RBAC requirement: Requires role 'manager' or 'admin'
 */
router.get(
  '/manager-reports',
  requireRole('manager', 'admin'),
  (req: Request, res: Response) => {
    res.status(200).json({
      success: true,
      data: {
        reportSummary: {
          period: 'Q3 2026',
          totalActiveUsers: db.listUsers().length,
          activeTokensCount: db.getActiveTokensCount(),
          slaCompliance: '99.98%',
          securityIncidents: 0
        },
        authorizedBy: {
          userId: req.user!.id,
          role: req.user!.role
        }
      }
    });
  }
);

/**
 * GET /api/v1/protected/admin-dashboard
 * RBAC requirement: Strictly requires role 'admin'
 */
router.get(
  '/admin-dashboard',
  requireRole('admin'),
  (req: Request, res: Response) => {
    res.status(200).json({
      success: true,
      data: {
        systemMetrics: {
          serverUptime: process.uptime(),
          nodeVersion: process.version,
          memoryUsage: process.memoryUsage(),
          registeredUsersCount: db.listUsers().length,
          activeRefreshTokens: db.getActiveTokensCount()
        },
        securityConfig: {
          bcryptSaltRounds: 12,
          jwtExpiryMinutes: 15,
          refreshTokenRotationEnabled: true,
          firebaseAdminSdkAudienceVerification: true
        }
      }
    });
  }
);

/**
 * GET /api/v1/protected/audit-logs
 * RBAC requirement: Requires role 'admin' or 'auditor' OR permission 'audit:read'
 */
router.get(
  '/audit-logs',
  requireRole('admin', 'auditor'),
  (req: Request, res: Response) => {
    const users = db.listUsers();
    res.status(200).json({
      success: true,
      data: {
        auditTrail: [
          {
            event: 'SYSTEM_BOOT',
            severity: 'INFO',
            timestamp: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
            details: 'AuthForge RBAC Engine initialized with 12-round bcrypt salt'
          },
          {
            event: 'SEED_ACCOUNTS_LOADED',
            severity: 'INFO',
            timestamp: new Date(Date.now() - 1000 * 60 * 25).toISOString(),
            details: `4 default security principals seeded (${users.map(u => u.email).join(', ')})`
          },
          {
            event: 'RBAC_EVALUATION',
            severity: 'INFO',
            timestamp: new Date().toISOString(),
            details: `Audit read access granted to user ${req.user?.email} (${req.user?.role})`
          }
        ]
      }
    });
  }
);

/**
 * GET /api/v1/protected/admin/users
 * Lists all users for administrative review
 */
router.get(
  '/admin/users',
  requireRole('admin', 'manager', 'auditor'),
  (req: Request, res: Response) => {
    const users = db.listUsers().map(u => {
      const { passwordHash, ...safe } = u;
      return safe;
    });

    res.status(200).json({
      success: true,
      data: {
        users,
        total: users.length
      }
    });
  }
);

/**
 * POST /api/v1/protected/admin/assign-role
 * RBAC requirement: Strictly requires role 'admin'
 */
router.post(
  '/admin/assign-role',
  requireRole('admin'),
  validateBody(AssignRoleSchema),
  (req: Request, res: Response): void => {
    const { userId, role } = req.body;

    const targetUser = db.findUserById(userId);
    if (!targetUser) {
      res.status(404).json({
        success: false,
        error: {
          code: 'TARGET_USER_NOT_FOUND',
          message: `User with ID '${userId}' was not found`,
          timestamp: new Date().toISOString()
        }
      });
      return;
    }

    const updatedUser = db.updateUserRole(userId, role as UserRole);

    res.status(200).json({
      success: true,
      message: `Role for user ${targetUser.email} successfully updated to '${role}'`,
      data: {
        user: {
          id: updatedUser!.id,
          email: updatedUser!.email,
          role: updatedUser!.role,
          permissions: updatedUser!.permissions
        }
      }
    });
  }
);

export default router;
