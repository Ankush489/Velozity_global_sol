import { Router, Request, Response } from 'express';
import { db } from '../db/index.js';
import { authenticate } from '../middleware/auth.js';
import { wsManager } from '../services/websocket.js';

const router = Router();
router.use(authenticate);

// GET /api/stats/dashboard
router.get('/dashboard', async (req: Request, res: Response, next) => {
  try {
    const user = req.user!;
    const onlineUsers = wsManager.getOnlineUsers();
    const onlineCount = onlineUsers.length;

    if (user.role === 'Admin') {
      // 1. Total Projects
      const projectCountRes = await db.query('SELECT COUNT(*) as count FROM projects');
      const totalProjects = parseInt(projectCountRes.rows[0].count, 10);

      // 2. Tasks by Status
      const taskStatusRes = await db.query(`
        SELECT status, COUNT(*) as count
        FROM tasks
        GROUP BY status
      `);

      const tasksByStatus: Record<string, number> = {
        'To Do': 0,
        'In Progress': 0,
        'In Review': 0,
        'Done': 0,
      };
      let totalTasks = 0;
      for (const row of taskStatusRes.rows) {
        tasksByStatus[row.status] = parseInt(row.count, 10);
        totalTasks += parseInt(row.count, 10);
      }

      // 3. Overdue tasks count
      const overdueRes = await db.query(`
        SELECT COUNT(*) as count
        FROM tasks
        WHERE (is_overdue = true OR (due_date < CURRENT_TIMESTAMP AND status != 'Done'))
      `);
      const overdueTaskCount = parseInt(overdueRes.rows[0].count, 10);

      // 4. Tasks by Priority
      const priorityRes = await db.query(`
        SELECT priority, COUNT(*) as count
        FROM tasks
        GROUP BY priority
      `);
      const tasksByPriority: Record<string, number> = {
        'Low': 0,
        'Medium': 0,
        'High': 0,
        'Critical': 0,
      };
      for (const row of priorityRes.rows) {
        tasksByPriority[row.priority] = parseInt(row.count, 10);
      }

      return res.json({
        success: true,
        data: {
          role: 'Admin',
          totalProjects,
          totalTasks,
          tasksByStatus,
          tasksByPriority,
          overdueTaskCount,
          activeUsersOnline: onlineCount,
          onlineUsersList: onlineUsers,
        },
      });
    } else if (user.role === 'Project Manager') {
      // PM dashboard: their projects summary, tasks by priority, upcoming due dates this week
      const myProjectsRes = await db.query(`
        SELECT p.id, p.title, p.status, c.company as client_company,
               COUNT(t.id) as task_count,
               COUNT(CASE WHEN t.status = 'Done' THEN 1 END) as completed_tasks,
               COUNT(CASE WHEN t.is_overdue = true AND t.status != 'Done' THEN 1 END) as overdue_tasks
        FROM projects p
        JOIN clients c ON p.client_id = c.id
        LEFT JOIN tasks t ON t.project_id = p.id
        WHERE p.created_by = $1
        GROUP BY p.id, p.title, p.status, c.company
        ORDER BY p.created_at DESC
      `, [user.id]);

      const myProjects = myProjectsRes.rows;
      const totalProjects = myProjects.length;

      // Tasks by Priority in PM's projects
      const priorityRes = await db.query(`
        SELECT t.priority, COUNT(*) as count
        FROM tasks t
        JOIN projects p ON t.project_id = p.id
        WHERE p.created_by = $1
        GROUP BY t.priority
      `, [user.id]);

      const tasksByPriority: Record<string, number> = {
        'Low': 0,
        'Medium': 0,
        'High': 0,
        'Critical': 0,
      };
      let totalTasks = 0;
      for (const row of priorityRes.rows) {
        tasksByPriority[row.priority] = parseInt(row.count, 10);
        totalTasks += parseInt(row.count, 10);
      }

      // Tasks by Status in PM's projects
      const statusRes = await db.query(`
        SELECT t.status, COUNT(*) as count
        FROM tasks t
        JOIN projects p ON t.project_id = p.id
        WHERE p.created_by = $1
        GROUP BY t.status
      `, [user.id]);

      const tasksByStatus: Record<string, number> = {
        'To Do': 0,
        'In Progress': 0,
        'In Review': 0,
        'Done': 0,
      };
      for (const row of statusRes.rows) {
        tasksByStatus[row.status] = parseInt(row.count, 10);
      }

      // Upcoming due dates this week
      const upcomingRes = await db.query(`
        SELECT t.id, t.title, t.priority, t.status, t.due_date, t.is_overdue,
               p.title as project_title,
               u.name as developer_name, u.avatar_url as developer_avatar
        FROM tasks t
        JOIN projects p ON t.project_id = p.id
        JOIN users u ON t.assigned_to = u.id
        WHERE p.created_by = $1
          AND t.status != 'Done'
          AND t.due_date >= CURRENT_TIMESTAMP
          AND t.due_date <= CURRENT_TIMESTAMP + INTERVAL '7 days'
        ORDER BY t.due_date ASC
      `, [user.id]);

      // Overdue tasks in PM's projects
      const overdueRes = await db.query(`
        SELECT COUNT(*) as count
        FROM tasks t
        JOIN projects p ON t.project_id = p.id
        WHERE p.created_by = $1
          AND (t.is_overdue = true OR (t.due_date < CURRENT_TIMESTAMP AND t.status != 'Done'))
      `, [user.id]);

      return res.json({
        success: true,
        data: {
          role: 'Project Manager',
          totalProjects,
          totalTasks,
          myProjects,
          tasksByPriority,
          tasksByStatus,
          upcomingDueDatesThisWeek: upcomingRes.rows,
          overdueTaskCount: parseInt(overdueRes.rows[0].count, 10),
          activeUsersOnline: onlineCount,
        },
      });
    } else {
      // Developer dashboard: their assigned tasks, sorted by priority then due date
      const devTasksRes = await db.query(`
        SELECT t.*, p.title as project_title, p.created_by as project_creator_id
        FROM tasks t
        JOIN projects p ON t.project_id = p.id
        WHERE t.assigned_to = $1
        ORDER BY
          CASE t.priority
            WHEN 'Critical' THEN 1
            WHEN 'High' THEN 2
            WHEN 'Medium' THEN 3
            WHEN 'Low' THEN 4
            ELSE 5
          END,
          t.due_date ASC
      `, [user.id]);

      const tasks = devTasksRes.rows;
      const totalTasks = tasks.length;
      const completedTasks = tasks.filter((t) => t.status === 'Done').length;
      const inProgressTasks = tasks.filter((t) => t.status === 'In Progress').length;
      const inReviewTasks = tasks.filter((t) => t.status === 'In Review').length;
      const overdueTasks = tasks.filter((t) => t.is_overdue || (new Date(t.due_date) < new Date() && t.status !== 'Done')).length;

      return res.json({
        success: true,
        data: {
          role: 'Developer',
          totalTasks,
          completedTasks,
          inProgressTasks,
          inReviewTasks,
          overdueTasks,
          assignedTasks: tasks,
          activeUsersOnline: onlineCount,
        },
      });
    }
  } catch (err) {
    next(err);
  }
});

export default router;
