import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || 'pulseboard_jwt_access_secret_super_secure_key_2026';
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'pulseboard_jwt_refresh_secret_super_secure_key_2026';

export type UserRole = 'Admin' | 'Project Manager' | 'Developer';

export interface AuthUser {
  id: number;
  email: string;
  name: string;
  role: UserRole;
  avatar_url?: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

export function generateAccessToken(user: AuthUser): string {
  return jwt.sign(
    { id: user.id, email: user.email, name: user.name, role: user.role, avatar_url: user.avatar_url },
    ACCESS_SECRET,
    { expiresIn: '1h' }
  );
}

export function generateRefreshToken(user: AuthUser): string {
  return jwt.sign(
    { id: user.id, email: user.email, name: user.name, role: user.role },
    REFRESH_SECRET,
    { expiresIn: '7d' }
  );
}

export function verifyAccessToken(token: string): AuthUser | null {
  try {
    return jwt.verify(token, ACCESS_SECRET) as AuthUser;
  } catch {
    return null;
  }
}

export function verifyRefreshToken(token: string): AuthUser | null {
  try {
    return jwt.verify(token, REFRESH_SECRET) as AuthUser;
  } catch {
    return null;
  }
}

export const REFRESH_COOKIE_NAME = 'pulseboard_refresh_token';

export function setRefreshTokenCookie(res: Response, token: string) {
  res.cookie(REFRESH_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    path: '/',
  });
}

export function clearRefreshTokenCookie(res: Response) {
  res.clearCookie(REFRESH_COOKIE_NAME, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
  });
}

/**
 * Authentication Middleware:
 * Extracts Bearer token, verifies JWT, and attaches user to req.user.
 */
export function authenticate(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      error: {
        code: 'UNAUTHORIZED',
        message: 'Authentication token is missing or invalid.',
      },
    });
  }

  const token = authHeader.split(' ')[1];
  const decoded = verifyAccessToken(token);

  if (!decoded) {
    return res.status(401).json({
      success: false,
      error: {
        code: 'TOKEN_EXPIRED_OR_INVALID',
        message: 'Access token expired or verification failed. Refresh your session.',
      },
    });
  }

  req.user = decoded;
  next();
}

/**
 * Role-based Authorization Middleware:
 * Enforces strict API-level access rules before reaching controller logic.
 */
export function requireRole(allowedRoles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'User authentication required.',
        },
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN_ROLE',
          message: `Access denied. Role '${req.user.role}' is not authorized to access this resource. Allowed roles: ${allowedRoles.join(', ')}.`,
        },
      });
    }

    next();
  };
}
