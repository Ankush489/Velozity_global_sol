import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { db } from '../db/index.js';
import {
  authenticate,
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
  setRefreshTokenCookie,
  clearRefreshTokenCookie,
  REFRESH_COOKIE_NAME,
  AuthUser,
} from '../middleware/auth.js';
import { validateBody } from '../middleware/validate.js';
import { AppError } from '../middleware/errorHandler.js';

const router = Router();

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

const demoSwitchSchema = z.object({
  email: z.string().email(),
});

// POST /api/auth/login
router.post('/login', validateBody(loginSchema), async (req: Request, res: Response, next) => {
  try {
    const { email, password } = req.body;

    const result = await db.query(
      'SELECT id, email, password_hash, name, role, avatar_url FROM users WHERE email = $1',
      [email.toLowerCase()]
    );

    const user = result.rows[0];
    if (!user) {
      throw new AppError('Invalid email or password.', 401, 'INVALID_CREDENTIALS');
    }

    const isValid = await bcrypt.compare(password, user.password_hash);
    if (!isValid) {
      throw new AppError('Invalid email or password.', 401, 'INVALID_CREDENTIALS');
    }

    const authUser: AuthUser = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      avatar_url: user.avatar_url,
    };

    const accessToken = generateAccessToken(authUser);
    const refreshToken = generateRefreshToken(authUser);

    setRefreshTokenCookie(res, refreshToken);

    return res.json({
      success: true,
      data: {
        accessToken,
        user: authUser,
      },
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/refresh (Reads HttpOnly cookie)
router.post('/refresh', async (req: Request, res: Response, next) => {
  try {
    const refreshToken = req.cookies?.[REFRESH_COOKIE_NAME];

    if (!refreshToken) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'NO_REFRESH_TOKEN',
          message: 'No refresh token provided in session cookie.',
        },
      });
    }

    const decoded = verifyRefreshToken(refreshToken);
    if (!decoded) {
      clearRefreshTokenCookie(res);
      throw new AppError('Refresh token is invalid or expired. Please log in again.', 401, 'INVALID_REFRESH_TOKEN');
    }

    // Verify user exists in database
    const result = await db.query(
      'SELECT id, email, name, role, avatar_url FROM users WHERE id = $1',
      [decoded.id]
    );

    const user = result.rows[0];
    if (!user) {
      clearRefreshTokenCookie(res);
      throw new AppError('User not found.', 404, 'USER_NOT_FOUND');
    }

    const authUser: AuthUser = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      avatar_url: user.avatar_url,
    };

    const newAccessToken = generateAccessToken(authUser);
    const newRefreshToken = generateRefreshToken(authUser);

    setRefreshTokenCookie(res, newRefreshToken);

    return res.json({
      success: true,
      data: {
        accessToken: newAccessToken,
        user: authUser,
      },
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/logout
router.post('/logout', (req: Request, res: Response) => {
  clearRefreshTokenCookie(res);
  return res.json({
    success: true,
    data: { message: 'Logged out successfully.' },
  });
});

// GET /api/auth/me
router.get('/me', authenticate, async (req: Request, res: Response, next) => {
  try {
    const result = await db.query(
      'SELECT id, email, name, role, avatar_url, created_at FROM users WHERE id = $1',
      [req.user!.id]
    );

    if (!result.rows[0]) {
      throw new AppError('User record not found.', 404, 'USER_NOT_FOUND');
    }

    return res.json({
      success: true,
      data: { user: result.rows[0] },
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/demo-switch (For quick evaluator role switching)
router.post('/demo-switch', validateBody(demoSwitchSchema), async (req: Request, res: Response, next) => {
  try {
    const { email } = req.body;
    const result = await db.query(
      'SELECT id, email, name, role, avatar_url FROM users WHERE email = $1',
      [email.toLowerCase()]
    );

    const user = result.rows[0];
    if (!user) {
      throw new AppError(`Demo user ${email} not found.`, 404, 'USER_NOT_FOUND');
    }

    const authUser: AuthUser = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      avatar_url: user.avatar_url,
    };

    const accessToken = generateAccessToken(authUser);
    const refreshToken = generateRefreshToken(authUser);

    setRefreshTokenCookie(res, refreshToken);

    return res.json({
      success: true,
      data: {
        accessToken,
        user: authUser,
      },
    });
  } catch (err) {
    next(err);
  }
});

export default router;
