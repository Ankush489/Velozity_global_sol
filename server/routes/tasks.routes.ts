import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { db } from '../db/index.js';
import { authenticate, requireRole } from '../middleware/auth.js';
import { validateBody } from '../middleware/validate.js';
import { AppError } from '../middleware/errorHandler.js';
import { wsManager } from '../services/websocket.js';

const router = Router();

const createTaskSchema = z.object({
  project_id: z.number().int().positive(),
  title: z.string().min(3).max(255),
  description: z.string().optional().default(''),
  assigned_to: z.number().int().positive(),
  status: z.enum(['To Do', 'In Progress', 'In Review', 'Done']).default('To Do'),
  priority: z.enum(['Low', 'Medium', 'High', 'Critical']).default('Medium'),
  due_date: z.string().datetime().or(z.string().regex(/^\d{4}-\d{2}-\d{2}/)),
});

const updateTaskStatusSchema = z.object({
  status: z.enum(['To Do', 'In Progress', 'In Review', 'Done']),
});

const updateTaskSchema = z.object({
  title: z.string().min(3).max(255).optional(),
  description: z.string().optional(),
  assigned_to: z.number().int().positive().optional(),
  status: z.enum(['To Do', 'In Progress', 'In Review', 'Done']).optional(),
  priority: z.enum(['Low', 'Medium', 'High', 'Critical']).optional(),
  due_date: z.string().datetime().or(z.string().regex(/^\d{4}-\d{2}-\d{2}/)).optional(),
});

router.use(authenticate);

// GET /api/tasks - Filterable list with strict role enforcement
// Query parameters: status, priority, dueDateFrom, dueDateTo, projectId, search
router.get('/', async (req: Request, res: Response, next) => {
  try {
    const user = req.user!;
    const { status, priority, dueDateFrom, dueDateTo, projectId, search } = req.query;

    const conditions: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    // 1. Role-based isolation
    if (user.role === 'Admin') {
      // Admin sees all
    } else if (user.role === 'Project Manager') {
      // PM can only see tasks from projects they created
      conditions.push(`p.created_by = $${paramIndex++}`);
      params.push(user.id);
    } else if (user.role === 'Developer') {
      // Developer can ONLY see tasks assigned to them
      conditions.push(`t.assigned_to = $${paramIndex++}`);
      params.push(user.id);
    }

    // 2. Query Filters
    if (status && typeof status === 'string' && status !== 'ALL') {
      conditions.push(`t.status = $${paramIndex++}`);
      params.push(status);
    }

    if (priority && typeof priority === 'string' && priority !== 'ALL') {
      conditions.push(`t.priority = $${paramIndex++}`);
      params.push(priority);
    }

    if (projectId && typeof projectId === 'string' && projectId !== 'ALL') {
      conditions.push(`t.project_id = $${paramIndex++}`);
      params.push(parseInt(projectId, 10));
    }

    if (dueDateFrom && typeof dueDateFrom === 'string') {
      conditions.push(`t.due_date >= $${paramIndex++}`);
      params.push(dueDateFrom);
    }

    if (dueDateTo && typeof dueDateTo === 'string') {
      conditions.push(`t.due_date <= $${paramIndex++}`);
      params.push(dueDateTo);
    }

    if (search && typeof search === 'string' && search.trim()) {
      conditions.push(`(t.title ILIKE $${paramIndex} OR t.description ILIKE $${paramIndex})`);
      params.push(`%${search.trim()}%`);
      paramIndex++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const query = `
      SELECT t.*,
             p.title as project_title, p.created_by as project_creator_id,
             u.name as assigned_to_name, u.avatar_url as assigned_to_avatar, u.email as assigned_to_email
      FROM tasks t
      JOIN projects p ON t.project_id = p.id
      JOIN users u ON t.assigned_to = u.id
      ${whereClause}
      ORDER BY
        CASE t.priority
          WHEN 'Critical' THEN 1
          WHEN 'High' THEN 2
          WHEN 'Medium' THEN 3
          WHEN 'Low' THEN 4
          ELSE 5
        END,
        t.due_date ASC
    `;

    const result = await db.query(query, params);

    return res.json({
      success: true,
      data: { tasks: result.rows },
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/tasks/:id
router.get('/:id', async (req: Request, res: Response, next) => {
  try {
    const user = req.user!;
    const taskId = parseInt(req.params.id, 10);
    if (isNaN(taskId)) throw new AppError('Invalid task ID.', 400);

    const taskRes = await db.query(
      `SELECT t.*,
              p.title as project_title, p.created_by as project_creator_id,
              u.name as assigned_to_name, u.avatar_url as assigned_to_avatar
       FROM tasks t
       JOIN projects p ON t.project_id = p.id
       JOIN users u ON t.assigned_to = u.id
       WHERE t.id = $1`,
      [taskId]
    );

    const task = taskRes.rows[0];
    if (!task) throw new AppError('Task not found.', 404);

    // Enforce role access:
    if (user.role === 'Project Manager' && task.project_creator_id !== user.id) {
      throw new AppError('Access denied. You can only view tasks from your projects.', 403);
    }
    if (user.role === 'Developer' && task.assigned_to !== user.id) {
      throw new AppError('Access denied. You can only view tasks assigned to you.', 403);
    }

    // Fetch activity logs for this task
    const logsRes = await db.query(
      `SELECT l.*, u.name as user_name, u.avatar_url as user_avatar
       FROM task_activity_logs l
       JOIN users u ON l.user_id = u.id
       WHERE l.task_id = $1
       ORDER BY l.created_at DESC`,
      [taskId]
    );

    return res.json({
      success: true,
      data: {
        task,
        activity_logs: logsRes.rows,
      },
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/tasks - Admin and PM only
router.post('/', requireRole(['Admin', 'Project Manager']), validateBody(createTaskSchema), async (req: Request, res: Response, next) => {
  try {
    const user = req.user!;
    const { project_id, title, description, assigned_to, status, priority, due_date } = req.body;

    // Check project exists and permission
    const projectRes = await db.query('SELECT * FROM projects WHERE id = $1', [project_id]);
    const project = projectRes.rows[0];
    if (!project) throw new AppError('Project not found.', 404);

    if (user.role === 'Project Manager' && project.created_by !== user.id) {
      throw new AppError('Access denied. You can only create tasks in projects you created.', 403);
    }

    // Verify assigned user is a Developer
    const devRes = await db.query("SELECT id, name, email FROM users WHERE id = $1 AND role = 'Developer'", [assigned_to]);
    const developer = devRes.rows[0];
    if (!developer) {
      throw new AppError('Assigned user must be an active Developer.', 400, 'INVALID_DEVELOPER');
    }

    const dueDateParsed = new Date(due_date);
    const isOverdue = dueDateParsed < new Date() && status !== 'Done';

    const insertTaskRes = await db.query(
      `INSERT INTO tasks (project_id, title, description, assigned_to, status, priority, due_date, is_overdue)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [project_id, title, description || '', assigned_to, status || 'To Do', priority || 'Medium', due_date, isOverdue]
    );

    const newTask = insertTaskRes.rows[0];

    // Record activity log
    const activityText = `${user.name} created Task #${newTask.id} "${newTask.title}"`;
    const logRes = await db.query(
      `INSERT INTO task_activity_logs (task_id, project_id, user_id, action, old_status, new_status, details)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, created_at`,
      [newTask.id, project_id, user.id, 'TASK_CREATED', null, newTask.status, activityText]
    );

    // Send in-app notification to the assigned developer
    const notifRes = await db.query(
      `INSERT INTO notifications (user_id, type, title, message, task_id, project_id)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, created_at`,
      [
        assigned_to,
        'TASK_ASSIGNED',
        'New Task Assignment',
        `You were assigned to Task #${newTask.id} "${newTask.title}" in project "${project.title}"`,
        newTask.id,
        project_id,
      ]
    );

    // Broadcast real-time notification to developer
    wsManager.sendNotification(assigned_to, {
      id: notifRes.rows[0].id,
      user_id: assigned_to,
      type: 'TASK_ASSIGNED',
      title: 'New Task Assignment',
      message: `You were assigned to Task #${newTask.id} "${newTask.title}" in project "${project.title}"`,
      task_id: newTask.id,
      project_id,
      is_read: false,
      created_at: notifRes.rows[0].created_at,
    });

    // Broadcast activity
    wsManager.broadcastActivity(
      {
        id: logRes.rows[0].id,
        task_id: newTask.id,
        project_id,
        project_title: project.title,
        user_id: user.id,
        user_name: user.name,
        action: 'TASK_CREATED',
        new_status: newTask.status,
        details: activityText,
        created_at: logRes.rows[0].created_at,
      },
      {
        projectCreatorId: project.created_by,
        taskAssigneeId: assigned_to,
      }
    );

    return res.status(201).json({
      success: true,
      data: { task: newTask },
    });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/tasks/:id/status - Status change with real-time broadcast and activity log
router.patch('/:id/status', validateBody(updateTaskStatusSchema), async (req: Request, res: Response, next) => {
  try {
    const user = req.user!;
    const taskId = parseInt(req.params.id, 10);
    if (isNaN(taskId)) throw new AppError('Invalid task ID.', 400);

    const { status: newStatus } = req.body;

    const taskRes = await db.query(
      `SELECT t.*, p.title as project_title, p.created_by as project_creator_id
       FROM tasks t
       JOIN projects p ON t.project_id = p.id
       WHERE t.id = $1`,
      [taskId]
    );

    const task = taskRes.rows[0];
    if (!task) throw new AppError('Task not found.', 404);

    // Strict access control:
    // Developer can only update status of their own assigned task
    if (user.role === 'Developer' && task.assigned_to !== user.id) {
      throw new AppError('Access denied. Developers can only update status for their assigned tasks.', 403);
    }
    // PM can only update status of tasks in their own project
    if (user.role === 'Project Manager' && task.project_creator_id !== user.id) {
      throw new AppError('Access denied. Project Managers can only update tasks in their projects.', 403);
    }

    const oldStatus = task.status;
    if (oldStatus === newStatus) {
      return res.json({ success: true, data: { task } });
    }

    // Check overdue flag logic: if marked Done, is_overdue becomes false
    const isOverdue = newStatus === 'Done' ? false : task.is_overdue;

    const updateRes = await db.query(
      `UPDATE tasks
       SET status = $1, is_overdue = $2, updated_at = CURRENT_TIMESTAMP
       WHERE id = $3
       RETURNING *`,
      [newStatus, isOverdue, taskId]
    );

    const updatedTask = updateRes.rows[0];

    // Format human-friendly details: "Ravi moved Task #12 from In Progress → In Review"
    const details = `${user.name} moved Task #${taskId} from ${oldStatus} → ${newStatus}`;

    // Record immutable audit log in database
    const logRes = await db.query(
      `INSERT INTO task_activity_logs (task_id, project_id, user_id, action, old_status, new_status, details)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, created_at`,
      [taskId, task.project_id, user.id, 'STATUS_CHANGE', oldStatus, newStatus, details]
    );

    const activityPayload = {
      id: logRes.rows[0].id,
      task_id: taskId,
      project_id: task.project_id,
      project_title: task.project_title,
      user_id: user.id,
      user_name: user.name,
      action: 'STATUS_CHANGE',
      old_status: oldStatus,
      new_status: newStatus,
      details,
      created_at: logRes.rows[0].created_at,
    };

    // Broadcast activity to WebSocket clients with proper role filtering
    wsManager.broadcastActivity(activityPayload, {
      projectCreatorId: task.project_creator_id,
      taskAssigneeId: task.assigned_to,
    });

    // Broadcast task update so all users viewing this project see status change in real time!
    wsManager.broadcastTaskUpdate(updatedTask, task.project_creator_id);

    // Requirement: "When a task they own is moved to In Review, the PM receives a notification"
    if (newStatus === 'In Review' && task.project_creator_id !== user.id) {
      const pmNotif = await db.query(
        `INSERT INTO notifications (user_id, type, title, message, task_id, project_id)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING id, created_at`,
        [
          task.project_creator_id,
          'TASK_IN_REVIEW',
          'Task Ready for Review',
          `${user.name} moved Task #${taskId} "${task.title}" to In Review.`,
          taskId,
          task.project_id,
        ]
      );

      wsManager.sendNotification(task.project_creator_id, {
        id: pmNotif.rows[0].id,
        user_id: task.project_creator_id,
        type: 'TASK_IN_REVIEW',
        title: 'Task Ready for Review',
        message: `${user.name} moved Task #${taskId} "${task.title}" to In Review.`,
        task_id: taskId,
        project_id: task.project_id,
        is_read: false,
        created_at: pmNotif.rows[0].created_at,
      });
    }

    return res.json({
      success: true,
      data: {
        task: updatedTask,
        activity: activityPayload,
      },
    });
  } catch (err) {
    next(err);
  }
});

// PUT /api/tasks/:id - Edit task (Admin or PM only)
router.put('/:id', requireRole(['Admin', 'Project Manager']), validateBody(updateTaskSchema), async (req: Request, res: Response, next) => {
  try {
    const user = req.user!;
    const taskId = parseInt(req.params.id, 10);
    if (isNaN(taskId)) throw new AppError('Invalid task ID.', 400);

    const taskRes = await db.query(
      `SELECT t.*, p.title as project_title, p.created_by as project_creator_id
       FROM tasks t
       JOIN projects p ON t.project_id = p.id
       WHERE t.id = $1`,
      [taskId]
    );

    const task = taskRes.rows[0];
    if (!task) throw new AppError('Task not found.', 404);

    if (user.role === 'Project Manager' && task.project_creator_id !== user.id) {
      throw new AppError('Access denied. You can only edit tasks in your own projects.', 403);
    }

    const { title, description, assigned_to, status, priority, due_date } = req.body;

    // If assigned_to changed, verify new assignee is developer
    if (assigned_to && assigned_to !== task.assigned_to) {
      const devCheck = await db.query("SELECT id FROM users WHERE id = $1 AND role = 'Developer'", [assigned_to]);
      if (!devCheck.rows[0]) throw new AppError('Assigned user must be a Developer.', 400);
    }

    let isOverdue = task.is_overdue;
    if (due_date) {
      isOverdue = new Date(due_date) < new Date() && (status || task.status) !== 'Done';
    }

    const updateRes = await db.query(
      `UPDATE tasks
       SET title = COALESCE($1, title),
           description = COALESCE($2, description),
           assigned_to = COALESCE($3, assigned_to),
           status = COALESCE($4, status),
           priority = COALESCE($5, priority),
           due_date = COALESCE($6, due_date),
           is_overdue = $7,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $8
       RETURNING *`,
      [title ?? null, description ?? null, assigned_to ?? null, status ?? null, priority ?? null, due_date ?? null, isOverdue, taskId]
    );

    const updatedTask = updateRes.rows[0];

    // Notify new assignee if developer changed
    if (assigned_to && assigned_to !== task.assigned_to) {
      const notifRes = await db.query(
        `INSERT INTO notifications (user_id, type, title, message, task_id, project_id)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING id, created_at`,
        [
          assigned_to,
          'TASK_ASSIGNED',
          'New Task Reassignment',
          `You have been assigned to Task #${taskId} "${updatedTask.title}" in ${task.project_title}`,
          taskId,
          task.project_id,
        ]
      );

      wsManager.sendNotification(assigned_to, {
        id: notifRes.rows[0].id,
        user_id: assigned_to,
        type: 'TASK_ASSIGNED',
        title: 'New Task Reassignment',
        message: `You have been assigned to Task #${taskId} "${updatedTask.title}" in ${task.project_title}`,
        task_id: taskId,
        project_id: task.project_id,
        is_read: false,
        created_at: notifRes.rows[0].created_at,
      });
    }

    wsManager.broadcastTaskUpdate(updatedTask, task.project_creator_id);

    return res.json({
      success: true,
      data: { task: updatedTask },
    });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/tasks/:id - Admin or PM
router.delete('/:id', requireRole(['Admin', 'Project Manager']), async (req: Request, res: Response, next) => {
  try {
    const user = req.user!;
    const taskId = parseInt(req.params.id, 10);
    if (isNaN(taskId)) throw new AppError('Invalid task ID.', 400);

    const taskRes = await db.query(
      `SELECT t.*, p.created_by as project_creator_id
       FROM tasks t
       JOIN projects p ON t.project_id = p.id
       WHERE t.id = $1`,
      [taskId]
    );

    const task = taskRes.rows[0];
    if (!task) throw new AppError('Task not found.', 404);

    if (user.role === 'Project Manager' && task.project_creator_id !== user.id) {
      throw new AppError('Access denied. You can only delete tasks in your own projects.', 403);
    }

    await db.query('DELETE FROM tasks WHERE id = $1', [taskId]);

    return res.json({
      success: true,
      data: { message: 'Task deleted successfully.' },
    });
  } catch (err) {
    next(err);
  }
});

export default router;
