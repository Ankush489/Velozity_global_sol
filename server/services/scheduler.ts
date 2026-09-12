import cron from 'node-cron';
import { db } from '../db/index.js';
import { wsManager } from './websocket.js';

/**
 * Overdue Task Background Scheduler
 *
 * Runs periodically (default: every minute) to scan for tasks past their due_date
 * that are not in 'Done' status and have not yet been flagged as overdue.
 *
 * Automatically:
 * 1. Updates task `is_overdue = true`
 * 2. Writes an immutable audit log to `task_activity_logs`
 * 3. Triggers in-app notifications for the assigned Developer and Project Manager
 * 4. Dispatches WebSocket events to update feeds and badges in real-time
 */
export async function checkOverdueTasks() {
  try {
    const overdueQuery = `
      SELECT t.id, t.title, t.status, t.priority, t.due_date, t.project_id, t.assigned_to,
             p.title as project_title, p.created_by as project_creator_id,
             u.name as developer_name, u.email as developer_email
      FROM tasks t
      JOIN projects p ON t.project_id = p.id
      JOIN users u ON t.assigned_to = u.id
      WHERE t.due_date < CURRENT_TIMESTAMP
        AND t.status != 'Done'
        AND t.is_overdue = false
    `;

    const res = await db.query(overdueQuery);
    if (res.rows.length === 0) {
      return 0;
    }

    console.log(`[Overdue Scheduler] Found ${res.rows.length} overdue task(s). Processing...`);

    for (const task of res.rows) {
      // 1. Mark task as overdue
      await db.query(
        'UPDATE tasks SET is_overdue = true, updated_at = CURRENT_TIMESTAMP WHERE id = $1',
        [task.id]
      );

      // 2. Insert Activity Log
      const activityText = `Automated scheduler flagged Task #${task.id} "${task.title}" as Overdue`;
      const activityRes = await db.query(
        `INSERT INTO task_activity_logs (task_id, project_id, user_id, action, old_status, new_status, details)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING id, created_at`,
        [task.id, task.project_id, task.project_creator_id, 'OVERDUE_FLAGGED', task.status, task.status, activityText]
      );

      const activityId = activityRes.rows[0].id;
      const createdAt = activityRes.rows[0].created_at;

      // 3. Broadcast real-time activity event
      wsManager.broadcastActivity(
        {
          id: activityId,
          task_id: task.id,
          project_id: task.project_id,
          project_title: task.project_title,
          user_id: task.project_creator_id,
          user_name: 'System Scheduler',
          action: 'OVERDUE_FLAGGED',
          old_status: task.status,
          new_status: task.status,
          details: activityText,
          created_at: createdAt,
        },
        {
          projectCreatorId: task.project_creator_id,
          taskAssigneeId: task.assigned_to,
        }
      );

      // Broadcast task update so UI marks as overdue
      wsManager.broadcastTaskUpdate({
        id: task.id,
        is_overdue: true,
        project_id: task.project_id,
        assigned_to: task.assigned_to,
      }, task.project_creator_id);

      // 4. Create Notification for Developer
      const devNotifRes = await db.query(
        `INSERT INTO notifications (user_id, type, title, message, task_id, project_id)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING id, created_at`,
        [
          task.assigned_to,
          'TASK_OVERDUE',
          'Task Overdue Alert',
          `Task "${task.title}" in ${task.project_title} has passed its due date.`,
          task.id,
          task.project_id,
        ]
      );

      wsManager.sendNotification(task.assigned_to, {
        id: devNotifRes.rows[0].id,
        user_id: task.assigned_to,
        type: 'TASK_OVERDUE',
        title: 'Task Overdue Alert',
        message: `Task "${task.title}" in ${task.project_title} has passed its due date.`,
        task_id: task.id,
        project_id: task.project_id,
        is_read: false,
        created_at: devNotifRes.rows[0].created_at,
      });

      // 5. Create Notification for Project Manager
      if (task.project_creator_id !== task.assigned_to) {
        const pmNotifRes = await db.query(
          `INSERT INTO notifications (user_id, type, title, message, task_id, project_id)
           VALUES ($1, $2, $3, $4, $5, $6)
           RETURNING id, created_at`,
          [
            task.project_creator_id,
            'TASK_OVERDUE',
            'Overdue Task in Your Project',
            `Task "${task.title}" assigned to ${task.developer_name} is now Overdue.`,
            task.id,
            task.project_id,
          ]
        );

        wsManager.sendNotification(task.project_creator_id, {
          id: pmNotifRes.rows[0].id,
          user_id: task.project_creator_id,
          type: 'TASK_OVERDUE',
          title: 'Overdue Task in Your Project',
          message: `Task "${task.title}" assigned to ${task.developer_name} is now Overdue.`,
          task_id: task.id,
          project_id: task.project_id,
          is_read: false,
          created_at: pmNotifRes.rows[0].created_at,
        });
      }
    }

    return res.rows.length;
  } catch (err) {
    console.error('[Overdue Scheduler Error]:', err);
    return 0;
  }
}

export function initScheduler() {
  const cronExpr = process.env.OVERDUE_JOB_CRON || '* * * * *';
  console.log(`Initializing Overdue Task Cron Scheduler with expression: "${cronExpr}"`);

  // Run on startup once to verify state
  checkOverdueTasks().catch((err) => console.error('Initial overdue check failed:', err));

  const task = cron.schedule(cronExpr, async () => {
    await checkOverdueTasks();
  });

  return task;
}
