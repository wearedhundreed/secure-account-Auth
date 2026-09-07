import { Request, Response, NextFunction } from 'express';
import { Permission, UserRole } from '../types.ts';

/**
 * RBAC Role Guard:
 * Ensures the authenticated user possesses one of the allowed roles.
 */
export function requireRole(...allowedRoles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHENTICATED',
          message: 'Authentication required before verifying role access',
          timestamp: new Date().toISOString()
        }
      });
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN_ROLE',
          message: `Access denied. Requires one of roles: [${allowedRoles.join(', ')}]. Current role: '${req.user.role}'`,
          details: {
            requiredRoles: allowedRoles,
            userRole: req.user.role,
            userId: req.user.id
          },
          timestamp: new Date().toISOString()
        }
      });
      return;
    }

    next();
  };
}

/**
 * RBAC Permission Guard:
 * Ensures the authenticated user possesses all specified permissions.
 */
export function requirePermission(...requiredPermissions: Permission[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHENTICATED',
          message: 'Authentication required before verifying permissions',
          timestamp: new Date().toISOString()
        }
      });
      return;
    }

    const userPermissions = new Set(req.user.permissions || []);
    const missingPermissions = requiredPermissions.filter(p => !userPermissions.has(p));

    if (missingPermissions.length > 0) {
      res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN_PERMISSION',
          message: `Access denied. Missing required permissions: [${missingPermissions.join(', ')}]`,
          details: {
            missing: missingPermissions,
            userPermissions: req.user.permissions
          },
          timestamp: new Date().toISOString()
        }
      });
      return;
    }

    next();
  };
}

/**
 * Scope Guard:
 * Ensures the authenticated Bearer token possesses the requested scopes (e.g., 'read', 'write').
 * Supports wildcard '*' and 'admin:all' for administrator accounts.
 */
export function requireScope(...requiredScopes: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.tokenPayload && !req.user) {
      res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHENTICATED',
          message: 'Authentication required before verifying token scopes',
          timestamp: new Date().toISOString()
        }
      });
      return;
    }

    const rawScope = req.tokenPayload?.scope || req.user?.scope || '';
    const grantedScopes = rawScope.split(/\s+/).filter(Boolean);

    // If super-admin or wildcard scope is granted, permit access
    if (grantedScopes.includes('*') || grantedScopes.includes('admin:all')) {
      next();
      return;
    }

    const missingScopes = requiredScopes.filter(scope => !grantedScopes.includes(scope));

    if (missingScopes.length > 0) {
      res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN_SCOPE',
          message: `Access denied. Token missing required scope: [${missingScopes.join(', ')}]. Granted scopes: '${rawScope}'`,
          details: {
            requiredScopes,
            missingScopes,
            grantedScopes
          },
          timestamp: new Date().toISOString()
        }
      });
      return;
    }

    next();
  };
}

