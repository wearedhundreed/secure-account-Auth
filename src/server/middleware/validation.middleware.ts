import { Request, Response, NextFunction } from 'express';
import { z, ZodError } from 'zod';

export const RegisterSchema = z.object({
  email: z.string().email('Invalid email address format').trim().toLowerCase(),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters long')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[0-9]/, 'Password must contain at least one numeric digit'),
  name: z.string().min(2, 'Name must be at least 2 characters long').max(100),
  role: z.enum(['admin', 'manager', 'user', 'auditor']).optional().default('user')
});

export const LoginSchema = z.object({
  email: z.string().email('Invalid email address format').trim().toLowerCase(),
  password: z.string().min(1, 'Password is required')
});

export const RefreshTokenSchema = z.object({
  refreshToken: z.string().min(10, 'Valid refresh token is required')
});

export const FirebaseVerifySchema = z.object({
  idToken: z.string().min(20, 'Firebase ID token is required')
});

export const AssignRoleSchema = z.object({
  userId: z.string().min(1, 'User ID is required'),
  role: z.enum(['admin', 'manager', 'user', 'auditor'])
});

export function validateBody(schema: z.ZodSchema<any>) {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      req.body = schema.parse(req.body);
      next();
    } catch (err) {
      if (err instanceof ZodError) {
        const issues = err.issues.map(i => ({
          field: i.path.join('.'),
          message: i.message,
          code: i.code
        }));

        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Input validation failed',
            details: issues,
            timestamp: new Date().toISOString()
          }
        });
        return;
      }
      next(err);
    }
  };
}
