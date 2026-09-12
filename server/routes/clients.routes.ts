import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { db } from '../db/index.js';
import { authenticate, requireRole } from '../middleware/auth.js';
import { validateBody } from '../middleware/validate.js';
import { AppError } from '../middleware/errorHandler.js';

const router = Router();
router.use(authenticate);

const createClientSchema = z.object({
  name: z.string().min(2).max(255),
  company: z.string().min(2).max(255),
  email: z.string().email(),
});

// GET /api/clients
router.get('/', async (_req: Request, res: Response, next) => {
  try {
    const result = await db.query(`
      SELECT c.*, COUNT(p.id) as project_count
      FROM clients c
      LEFT JOIN projects p ON p.client_id = c.id
      GROUP BY c.id
      ORDER BY c.name ASC
    `);

    return res.json({
      success: true,
      data: { clients: result.rows },
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/clients (Admin & PM)
router.post('/', requireRole(['Admin', 'Project Manager']), validateBody(createClientSchema), async (req: Request, res: Response, next) => {
  try {
    const { name, company, email } = req.body;

    const exists = await db.query('SELECT id FROM clients WHERE email = $1', [email.toLowerCase()]);
    if (exists.rows[0]) {
      throw new AppError('A client with this email already exists.', 400, 'CLIENT_EXISTS');
    }

    const insertRes = await db.query(
      `INSERT INTO clients (name, company, email)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [name, company, email.toLowerCase()]
    );

    return res.status(201).json({
      success: true,
      data: { client: insertRes.rows[0] },
    });
  } catch (err) {
    next(err);
  }
});

export default router;
