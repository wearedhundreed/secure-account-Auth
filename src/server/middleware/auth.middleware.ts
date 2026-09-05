import { Request, Response, NextFunction } from 'express';
import { JwtService } from '../services/jwt.service.ts';
import { db } from '../db/in-memory-db.ts';
import { JWTAccessTokenPayload, User } from '../types.ts';

declare global {
  namespace Express {
    interface Request {
      user?: User;
      tokenPayload?: JWTAccessTokenPayload;
    }
  }
}

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({
      success: false,
      error: {
        code: 'UNAUTHORIZED',
        message: 'Missing or malformed Authorization header. Expected Bearer <token>',
        timestamp: new Date().toISOString()
      }
    });
    return;
  }

  const token = authHeader.substring(7).trim();

  try {
    const payload = JwtService.verifyAccessToken(token);
    const user = db.findUserById(payload.sub);

    if (!user) {
      res.status(401).json({
        success: false,
        error: {
          code: 'USER_NOT_FOUND',
          message: 'The user account associated with this token no longer exists',
          timestamp: new Date().toISOString()
        }
      });
      return;
    }

    req.tokenPayload = payload;
    req.user = user;
    next();
  } catch (err: any) {
    res.status(401).json({
      success: false,
      error: {
        code: 'INVALID_TOKEN',
        message: err.message || 'Access token verification failed',
        timestamp: new Date().toISOString()
      }
    });
  }
}
