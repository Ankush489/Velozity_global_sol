import { Router, Request, Response } from 'express';
import { db } from '../db/index.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();
router.use(authenticate);

// GET /api/activity - Role-filtered activity feed history
// Returns last 20 (or ?limit=N) events directly from database
router.get('/', async (req: Request, res: Response, next) => {
  try {
    const user = req.user!;
    const limit = Math.min(parseInt(req.query.limit as string, 10) || 20, 50);
    const projectId = req.query.projectId ? parseInt(req.query.projectId as string, 10) : undefined;

    let query = '';
    const params: any[] = [];
    let paramIndex = 1;

    if (user.role === 'Admin') {
      // Admin sees activity across all projects
      let where = '';
      if (projectId) {
        where = `WHERE l.project_id = $${paramIndex++}`;
        params.push(projectId);
      }
      query = `
        SELECT l.*,
               u.name as user_name, u.avatar_url as user_avatar, u.role as user_role,
               p.title as project_title,
               t.title as task_title
        FROM task_activity_logs l
        JOIN users u ON l.user_id = u.id
        JOIN projects p ON l.project_id = p.id
        JOIN tasks t ON l.task_id = t.id
        ${where}
        ORDER BY l.created_at DESC
        LIMIT $${paramIndex}
      `;
      params.push(limit);
    } else if (user.role === 'Project Manager') {
      // PM sees activity only from their own projects
      let where = `WHERE p.created_by = $${paramIndex++}`;
      params.push(user.id);

      if (projectId) {
        where += ` AND l.project_id = $${paramIndex++}`;
        params.push(projectId);
      }

      query = `
        SELECT l.*,
               u.name as user_name, u.avatar_url as user_avatar, u.role as user_role,
               p.title as project_title,
               t.title as task_title
        FROM task_activity_logs l
        JOIN users u ON l.user_id = u.id
        JOIN projects p ON l.project_id = p.id
        JOIN tasks t ON l.task_id = t.id
        ${where}
        ORDER BY l.created_at DESC
        LIMIT $${paramIndex}
      `;
      params.push(limit);
    } else if (user.role === 'Developer') {
      // Developer sees activity only on tasks assigned to them
      let where = `WHERE t.assigned_to = $${paramIndex++}`;
      params.push(user.id);

      if (projectId) {
        where += ` AND l.project_id = $${paramIndex++}`;
        params.push(projectId);
      }

      query = `
        SELECT l.*,
               u.name as user_name, u.avatar_url as user_avatar, u.role as user_role,
               p.title as project_title,
               t.title as task_title
        FROM task_activity_logs l
        JOIN users u ON l.user_id = u.id
        JOIN projects p ON l.project_id = p.id
        JOIN tasks t ON l.task_id = t.id
        ${where}
        ORDER BY l.created_at DESC
        LIMIT $${paramIndex}
      `;
      params.push(limit);
    }

    const result = await db.query(query, params);

    return res.json({
      success: true,
      data: {
        activities: result.rows,
      },
    });
  } catch (err) {
    next(err);
  }
});

export default router;
