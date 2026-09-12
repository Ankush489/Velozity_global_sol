import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { db } from '../db/index.js';
import { authenticate, requireRole } from '../middleware/auth.js';
import { validateBody } from '../middleware/validate.js';
import { AppError } from '../middleware/errorHandler.js';

const router = Router();

const createProjectSchema = z.object({
  title: z.string().min(3).max(255),
  description: z.string().optional().default(''),
  client_id: z.number().int().positive(),
  status: z.enum(['Active', 'On Hold', 'Completed']).default('Active'),
});

const updateProjectSchema = z.object({
  title: z.string().min(3).max(255).optional(),
  description: z.string().optional(),
  client_id: z.number().int().positive().optional(),
  status: z.enum(['Active', 'On Hold', 'Completed']).optional(),
});

// All routes require authentication
router.use(authenticate);

// GET /api/projects - Role-enforced list
router.get('/', async (req: Request, res: Response, next) => {
  try {
    const user = req.user!;
    let query = '';
    const params: any[] = [];

    if (user.role === 'Admin') {
      // Admin sees all projects
      query = `
        SELECT p.*, c.name as client_name, c.company as client_company,
               u.name as creator_name,
               COUNT(t.id) as task_count,
               COUNT(CASE WHEN t.status = 'Done' THEN 1 END) as completed_task_count,
               COUNT(CASE WHEN t.is_overdue = true AND t.status != 'Done' THEN 1 END) as overdue_task_count
        FROM projects p
        JOIN clients c ON p.client_id = c.id
        JOIN users u ON p.created_by = u.id
        LEFT JOIN tasks t ON t.project_id = p.id
        GROUP BY p.id, c.name, c.company, u.name
        ORDER BY p.created_at DESC
      `;
    } else if (user.role === 'Project Manager') {
      // PM can ONLY view projects they created
      query = `
        SELECT p.*, c.name as client_name, c.company as client_company,
               u.name as creator_name,
               COUNT(t.id) as task_count,
               COUNT(CASE WHEN t.status = 'Done' THEN 1 END) as completed_task_count,
               COUNT(CASE WHEN t.is_overdue = true AND t.status != 'Done' THEN 1 END) as overdue_task_count
        FROM projects p
        JOIN clients c ON p.client_id = c.id
        JOIN users u ON p.created_by = u.id
        LEFT JOIN tasks t ON t.project_id = p.id
        WHERE p.created_by = $1
        GROUP BY p.id, c.name, c.company, u.name
        ORDER BY p.created_at DESC
      `;
      params.push(user.id);
    } else if (user.role === 'Developer') {
      // Developer can ONLY view projects where they have assigned tasks
      query = `
        SELECT DISTINCT p.*, c.name as client_name, c.company as client_company,
               u.name as creator_name,
               COUNT(t.id) as task_count,
               COUNT(CASE WHEN t.status = 'Done' THEN 1 END) as completed_task_count,
               COUNT(CASE WHEN t.is_overdue = true AND t.status != 'Done' THEN 1 END) as overdue_task_count
        FROM projects p
        JOIN clients c ON p.client_id = c.id
        JOIN users u ON p.created_by = u.id
        JOIN tasks t ON t.project_id = p.id
        WHERE t.assigned_to = $1
        GROUP BY p.id, c.name, c.company, u.name
        ORDER BY p.created_at DESC
      `;
      params.push(user.id);
    }

    const result = await db.query(query, params);

    return res.json({
      success: true,
      data: { projects: result.rows },
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/projects/:id - Role-enforced single project detail
router.get('/:id', async (req: Request, res: Response, next) => {
  try {
    const user = req.user!;
    const projectId = parseInt(req.params.id, 10);
    if (isNaN(projectId)) {
      throw new AppError('Invalid project ID.', 400);
    }

    const projectRes = await db.query(
      `SELECT p.*, c.name as client_name, c.company as client_company,
              u.name as creator_name, u.email as creator_email
       FROM projects p
       JOIN clients c ON p.client_id = c.id
       JOIN users u ON p.created_by = u.id
       WHERE p.id = $1`,
      [projectId]
    );

    const project = projectRes.rows[0];
    if (!project) {
      throw new AppError('Project not found.', 404, 'NOT_FOUND');
    }

    // Role Enforcement check
    if (user.role === 'Project Manager' && project.created_by !== user.id) {
      throw new AppError('Access denied. You can only view projects you created.', 403, 'FORBIDDEN_PROJECT_ACCESS');
    }

    if (user.role === 'Developer') {
      // Check if developer has any task assigned in this project
      const assignedCheck = await db.query(
        'SELECT 1 FROM tasks WHERE project_id = $1 AND assigned_to = $2 LIMIT 1',
        [projectId, user.id]
      );
      if (assignedCheck.rows.length === 0) {
        throw new AppError('Access denied. You do not have assigned tasks in this project.', 403, 'FORBIDDEN_PROJECT_ACCESS');
      }
    }

    // Fetch tasks for this project, adhering to role access
    let taskQuery = `
      SELECT t.*, u.name as assigned_to_name, u.avatar_url as assigned_to_avatar
      FROM tasks t
      JOIN users u ON t.assigned_to = u.id
      WHERE t.project_id = $1
    `;
    const taskParams: any[] = [projectId];

    if (user.role === 'Developer') {
      // Developer can ONLY see tasks assigned to them
      taskQuery += ' AND t.assigned_to = $2';
      taskParams.push(user.id);
    }

    taskQuery += ' ORDER BY t.due_date ASC';

    const tasksRes = await db.query(taskQuery, taskParams);

    return res.json({
      success: true,
      data: {
        project,
        tasks: tasksRes.rows,
      },
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/projects - Admin & Project Manager only
router.post('/', requireRole(['Admin', 'Project Manager']), validateBody(createProjectSchema), async (req: Request, res: Response, next) => {
  try {
    const user = req.user!;
    const { title, description, client_id, status } = req.body;

    // Verify client exists
    const clientCheck = await db.query('SELECT id FROM clients WHERE id = $1', [client_id]);
    if (!clientCheck.rows[0]) {
      throw new AppError('Client does not exist.', 400, 'INVALID_CLIENT');
    }

    const insertRes = await db.query(
      `INSERT INTO projects (title, description, client_id, created_by, status)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [title, description || '', client_id, user.id, status || 'Active']
    );

    return res.status(201).json({
      success: true,
      data: { project: insertRes.rows[0] },
    });
  } catch (err) {
    next(err);
  }
});

// PUT /api/projects/:id - Admin or Project Manager who owns the project
router.put('/:id', requireRole(['Admin', 'Project Manager']), validateBody(updateProjectSchema), async (req: Request, res: Response, next) => {
  try {
    const user = req.user!;
    const projectId = parseInt(req.params.id, 10);
    if (isNaN(projectId)) throw new AppError('Invalid project ID.', 400);

    const projectCheck = await db.query('SELECT * FROM projects WHERE id = $1', [projectId]);
    const project = projectCheck.rows[0];
    if (!project) throw new AppError('Project not found.', 404);

    if (user.role === 'Project Manager' && project.created_by !== user.id) {
      throw new AppError('Access denied. You can only modify projects you created.', 403, 'FORBIDDEN_PROJECT_MODIFY');
    }

    const { title, description, client_id, status } = req.body;

    const updateRes = await db.query(
      `UPDATE projects
       SET title = COALESCE($1, title),
           description = COALESCE($2, description),
           client_id = COALESCE($3, client_id),
           status = COALESCE($4, status),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $5
       RETURNING *`,
      [title ?? null, description ?? null, client_id ?? null, status ?? null, projectId]
    );

    return res.json({
      success: true,
      data: { project: updateRes.rows[0] },
    });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/projects/:id - Admin or Project Manager who owns the project
router.delete('/:id', requireRole(['Admin', 'Project Manager']), async (req: Request, res: Response, next) => {
  try {
    const user = req.user!;
    const projectId = parseInt(req.params.id, 10);
    if (isNaN(projectId)) throw new AppError('Invalid project ID.', 400);

    const projectCheck = await db.query('SELECT * FROM projects WHERE id = $1', [projectId]);
    const project = projectCheck.rows[0];
    if (!project) throw new AppError('Project not found.', 404);

    if (user.role === 'Project Manager' && project.created_by !== user.id) {
      throw new AppError('Access denied. You can only delete projects you created.', 403, 'FORBIDDEN_PROJECT_DELETE');
    }

    await db.query('DELETE FROM projects WHERE id = $1', [projectId]);

    return res.json({
      success: true,
      data: { message: 'Project deleted successfully.' },
    });
  } catch (err) {
    next(err);
  }
});

export default router;
