import { Router, Request, Response } from 'express';
import { db } from '../db/index.js';
import { authenticate } from '../middleware/auth.js';
import { AppError } from '../middleware/errorHandler.js';

const router = Router();
router.use(authenticate);

// GET /api/notifications - User's notifications with unread count
router.get('/', async (req: Request, res: Response, next) => {
  try {
    const user = req.user!;

    const notifsRes = await db.query(
      `SELECT n.*, p.title as project_title, t.title as task_title
       FROM notifications n
       LEFT JOIN projects p ON n.project_id = p.id
       LEFT JOIN tasks t ON n.task_id = t.id
       WHERE n.user_id = $1
       ORDER BY n.created_at DESC
       LIMIT 30`,
      [user.id]
    );

    const countRes = await db.query(
      'SELECT COUNT(*) as unread_count FROM notifications WHERE user_id = $1 AND is_read = false',
      [user.id]
    );

    const unreadCount = parseInt(countRes.rows[0]?.unread_count || '0', 10);

    return res.json({
      success: true,
      data: {
        notifications: notifsRes.rows,
        unreadCount,
      },
    });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/notifications/:id/read - Mark single as read
router.patch('/:id/read', async (req: Request, res: Response, next) => {
  try {
    const user = req.user!;
    const notifId = parseInt(req.params.id, 10);
    if (isNaN(notifId)) throw new AppError('Invalid notification ID.', 400);

    const resUpdate = await db.query(
      'UPDATE notifications SET is_read = true WHERE id = $1 AND user_id = $2 RETURNING *',
      [notifId, user.id]
    );

    if (!resUpdate.rows[0]) {
      throw new AppError('Notification not found or unauthorized.', 404);
    }

    const countRes = await db.query(
      'SELECT COUNT(*) as unread_count FROM notifications WHERE user_id = $1 AND is_read = false',
      [user.id]
    );

    return res.json({
      success: true,
      data: {
        notification: resUpdate.rows[0],
        unreadCount: parseInt(countRes.rows[0]?.unread_count || '0', 10),
      },
    });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/notifications/read-all - Mark all as read
router.patch('/read-all', async (req: Request, res: Response, next) => {
  try {
    const user = req.user!;

    await db.query('UPDATE notifications SET is_read = true WHERE user_id = $1', [user.id]);

    return res.json({
      success: true,
      data: {
        message: 'All notifications marked as read.',
        unreadCount: 0,
      },
    });
  } catch (err) {
    next(err);
  }
});

export default router;
