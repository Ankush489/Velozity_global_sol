import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { db } from '../db/index.js';
import { authenticate, requireRole } from '../middleware/auth.js';
import { validateBody } from '../middleware/validate.js';
import { AppError } from '../middleware/errorHandler.js';

const router = Router();
router.use(authenticate);

const createUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  name: z.string().min(2),
  role: z.enum(['Admin', 'Project Manager', 'Developer']),
  avatar_url: z.string().url().optional(),
});

// GET /api/users - List team members
router.get('/', async (_req: Request, res: Response, next) => {
  try {
    const result = await db.query(`
      SELECT id, email, name, role, avatar_url, created_at,
             (SELECT COUNT(*) FROM tasks WHERE assigned_to = users.id AND status != 'Done') as active_task_count
      FROM users
      ORDER BY role ASC, name ASC
    `);

    return res.json({
      success: true,
      data: { users: result.rows },
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/users/developers - List developers specifically for task assign dropdowns
router.get('/developers', async (_req: Request, res: Response, next) => {
  try {
    const result = await db.query(`
      SELECT id, email, name, role, avatar_url,
             (SELECT COUNT(*) FROM tasks WHERE assigned_to = users.id AND status != 'Done') as active_task_count
      FROM users
      WHERE role = 'Developer'
      ORDER BY name ASC
    `);

    return res.json({
      success: true,
      data: { developers: result.rows },
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/users - Admin only user creation
router.post('/', requireRole(['Admin']), validateBody(createUserSchema), async (req: Request, res: Response, next) => {
  try {
    const { email, password, name, role, avatar_url } = req.body;

    const existing = await db.query('SELECT id FROM users WHERE email = $1', [email.toLowerCase()]);
    if (existing.rows[0]) {
      throw new AppError('A user with this email already exists.', 400, 'USER_EXISTS');
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const insertRes = await db.query(
      `INSERT INTO users (email, password_hash, name, role, avatar_url)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, email, name, role, avatar_url, created_at`,
      [email.toLowerCase(), passwordHash, name, role, avatar_url || null]
    );

    return res.status(201).json({
      success: true,
      data: { user: insertRes.rows[0] },
    });
  } catch (err) {
    next(err);
  }
});

export default router;
