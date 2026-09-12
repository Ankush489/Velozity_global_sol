import bcrypt from 'bcryptjs';
import { db } from './db/index.js';

export async function seedDatabase() {
  console.log('Seeding database with required users, clients, projects, tasks, and activity logs...');

  const passwordHash = await bcrypt.hash('password123', 10);

  // 1. Seed Users (1 Admin, 2 PMs, 4 Developers)
  const users = [
    { email: 'admin@agency.com', name: 'Alex Vance', role: 'Admin', avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80' },
    { email: 'pm.sarah@agency.com', name: 'Sarah Jenkins', role: 'Project Manager', avatar_url: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150&auto=format&fit=crop&q=80' },
    { email: 'pm.marcus@agency.com', name: 'Marcus Brody', role: 'Project Manager', avatar_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80' },
    { email: 'dev.ravi@agency.com', name: 'Ravi Sharma', role: 'Developer', avatar_url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80' },
    { email: 'dev.elena@agency.com', name: 'Elena Rostova', role: 'Developer', avatar_url: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80' },
    { email: 'dev.alex@agency.com', name: 'Alex Chen', role: 'Developer', avatar_url: 'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=150&auto=format&fit=crop&q=80' },
    { email: 'dev.priya@agency.com', name: 'Priya Patel', role: 'Developer', avatar_url: 'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=150&auto=format&fit=crop&q=80' },
  ];

  const userIds: Record<string, number> = {};
  for (const u of users) {
    const res = await db.query(
      `INSERT INTO users (email, password_hash, name, role, avatar_url)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (email) DO UPDATE SET name = EXCLUDED.name, role = EXCLUDED.role
       RETURNING id, email`,
      [u.email, passwordHash, u.name, u.role, u.avatar_url]
    );
    userIds[u.email] = res.rows[0].id;
  }

  // 2. Seed Clients
  const clients = [
    { name: 'Acme Corporation', company: 'Acme Corp', email: 'accounts@acmeweb.com' },
    { name: 'FinTech Dynamics', company: 'FinTech Global Ltd', email: 'billing@fintechdyn.io' },
    { name: 'HealthPulse Systems', company: 'HealthPulse Medical', email: 'partners@healthpulse.org' },
  ];

  const clientIds: number[] = [];
  for (const c of clients) {
    const res = await db.query(
      `INSERT INTO clients (name, company, email)
       VALUES ($1, $2, $3)
       ON CONFLICT (email) DO UPDATE SET name = EXCLUDED.name
       RETURNING id`,
      [c.name, c.company, c.email]
    );
    clientIds.push(res.rows[0].id);
  }

  // 3. Seed Projects
  // PM Sarah created Project 1 & 2; PM Marcus created Project 3
  const sarahId = userIds['pm.sarah@agency.com'];
  const marcusId = userIds['pm.marcus@agency.com'];
  const adminId = userIds['admin@agency.com'];

  const projects = [
    {
      title: 'FinTech Core Banking API v2',
      description: 'Microservices architecture overhaul with PCI-DSS compliance and idempotency guarantees.',
      client_id: clientIds[1], // FinTech Dynamics
      created_by: sarahId,
      status: 'Active',
    },
    {
      title: 'Acme Customer Portal Redesign',
      description: 'Responsive customer self-service dashboard with automated billing and ticket tracking.',
      client_id: clientIds[0], // Acme
      created_by: sarahId,
      status: 'Active',
    },
    {
      title: 'HealthPulse Telehealth Dashboard',
      description: 'HIPAA compliant patient telemetry streaming and doctor consultation scheduler.',
      client_id: clientIds[2], // HealthPulse
      created_by: marcusId,
      status: 'Active',
    },
  ];

  const projectIds: number[] = [];
  for (const p of projects) {
    const res = await db.query(
      `INSERT INTO projects (title, description, client_id, created_by, status)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id`,
      [p.title, p.description, p.client_id, p.created_by, p.status]
    );
    projectIds.push(res.rows[0].id);
  }

  // Helper date generators
  const now = new Date();
  const pastDays = (d: number) => new Date(now.getTime() - d * 24 * 60 * 60 * 1000).toISOString();
  const futureDays = (d: number) => new Date(now.getTime() + d * 24 * 60 * 60 * 1000).toISOString();

  const raviId = userIds['dev.ravi@agency.com'];
  const elenaId = userIds['dev.elena@agency.com'];
  const alexDevId = userIds['dev.alex@agency.com'];
  const priyaId = userIds['dev.priya@agency.com'];

  // 4. Seed Tasks (5+ tasks per project, including at least 2 OVERDUE tasks)
  const tasksToSeed = [
    // Project 1 (FinTech - PM Sarah)
    {
      project_id: projectIds[0],
      title: 'Implement idempotency keys for /transfer endpoints',
      description: 'Ensure double-clicks on submit do not result in duplicate ledger transactions using Redis/PostgreSQL lock.',
      assigned_to: raviId,
      status: 'In Review',
      priority: 'Critical',
      due_date: futureDays(2),
      is_overdue: false,
    },
    {
      project_id: projectIds[0],
      title: 'PCI-DSS Tokenization Service',
      description: 'Isolate sensitive PAN information into encrypted token storage vaults.',
      assigned_to: raviId,
      status: 'In Progress',
      priority: 'High',
      due_date: pastDays(3), // OVERDUE 1
      is_overdue: true,
    },
    {
      project_id: projectIds[0],
      title: 'Database connection pooling tune-up',
      description: 'Configure PgBouncer max client connections and statement timeouts.',
      assigned_to: elenaId,
      status: 'Done',
      priority: 'Medium',
      due_date: pastDays(1),
      is_overdue: false,
    },
    {
      project_id: projectIds[0],
      title: 'Audit log streaming to Kafka',
      description: 'Stream transaction event logs with RFC 3339 timestamps for forensic audits.',
      assigned_to: raviId,
      status: 'To Do',
      priority: 'High',
      due_date: futureDays(5),
      is_overdue: false,
    },
    {
      project_id: projectIds[0],
      title: 'Two-factor SMS verification fallback',
      description: 'Add Twilio fallback when TOTP authenticator is unavailable.',
      assigned_to: alexDevId,
      status: 'In Progress',
      priority: 'Low',
      due_date: futureDays(7),
      is_overdue: false,
    },

    // Project 2 (Acme - PM Sarah)
    {
      project_id: projectIds[1],
      title: 'Migrate legacy CSS to Tailwind v4',
      description: 'Refactor all styled-components to atomic utility classes and verify responsiveness.',
      assigned_to: elenaId,
      status: 'In Review',
      priority: 'Medium',
      due_date: futureDays(1),
      is_overdue: false,
    },
    {
      project_id: projectIds[1],
      title: 'Subscription invoice PDF exporter',
      description: 'Generate vector PDFs using headless Chromium worker with monthly usage graphs.',
      assigned_to: priyaId,
      status: 'In Progress',
      priority: 'High',
      due_date: pastDays(4), // OVERDUE 2
      is_overdue: true,
    },
    {
      project_id: projectIds[1],
      title: 'SSO SAML integration with Okta',
      description: 'Parse SAML response assertions and map user directory attributes.',
      assigned_to: elenaId,
      status: 'To Do',
      priority: 'Critical',
      due_date: futureDays(6),
      is_overdue: false,
    },
    {
      project_id: projectIds[1],
      title: 'Interactive billing timeline component',
      description: 'Display past 12 months billing milestones with credit memo breakdowns.',
      assigned_to: priyaId,
      status: 'Done',
      priority: 'Low',
      due_date: pastDays(2),
      is_overdue: false,
    },
    {
      project_id: projectIds[1],
      title: 'Zero-downtime Blue/Green deployment pipeline',
      description: 'Write GitHub Actions workflow with synthetic canary tests before traffic switch.',
      assigned_to: alexDevId,
      status: 'To Do',
      priority: 'High',
      due_date: futureDays(4),
      is_overdue: false,
    },

    // Project 3 (HealthPulse - PM Marcus)
    {
      project_id: projectIds[2],
      title: 'WebRTC video room connection resilience',
      description: 'Implement ICE candidate trickle retry and bandwidth adaptive downgrade.',
      assigned_to: alexDevId,
      status: 'In Progress',
      priority: 'Critical',
      due_date: futureDays(3),
      is_overdue: false,
    },
    {
      project_id: projectIds[2],
      title: 'Doctor prescription e-signature flow',
      description: 'Comply with DEA e-prescribing rules for controlled substance validation.',
      assigned_to: priyaId,
      status: 'To Do',
      priority: 'High',
      due_date: futureDays(8),
      is_overdue: false,
    },
    {
      project_id: projectIds[2],
      title: 'Real-time ECG telemetry streaming canvas',
      description: 'Smooth 60fps rendering of patient heart telemetry using WebGL or HTML5 2D Canvas.',
      assigned_to: alexDevId,
      status: 'In Progress',
      priority: 'High',
      due_date: pastDays(2), // OVERDUE 3
      is_overdue: true,
    },
    {
      project_id: projectIds[2],
      title: 'FHIR JSON patient records import adapter',
      description: 'Map HL7/FHIR resource standard definitions into relational tables.',
      assigned_to: raviId,
      status: 'Done',
      priority: 'Medium',
      due_date: pastDays(5),
      is_overdue: false,
    },
    {
      project_id: projectIds[2],
      title: 'Patient appointment push notifications',
      description: 'Send Web Push reminders 15 minutes before scheduled consultation starts.',
      assigned_to: priyaId,
      status: 'In Review',
      priority: 'Medium',
      due_date: futureDays(2),
      is_overdue: false,
    },
    {
      project_id: projectIds[2],
      title: 'Audit compliance report exporter',
      description: 'Generate HIPAA access log report with SHA-256 integrity hash verification.',
      assigned_to: alexDevId,
      status: 'To Do',
      priority: 'Low',
      due_date: futureDays(10),
      is_overdue: false,
    },
  ];

  const taskIds: number[] = [];
  for (const t of tasksToSeed) {
    const res = await db.query(
      `INSERT INTO tasks (project_id, title, description, assigned_to, status, priority, due_date, is_overdue)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id`,
      [t.project_id, t.title, t.description, t.assigned_to, t.status, t.priority, t.due_date, t.is_overdue]
    );
    taskIds.push(res.rows[0].id);
  }

  // 5. Seed Activity Logs (Must not be empty, exact format "Ravi moved Task #1 from In Progress → In Review")
  const activityLogs = [
    {
      task_id: taskIds[0],
      project_id: projectIds[0],
      user_id: raviId,
      action: 'STATUS_CHANGE',
      old_status: 'In Progress',
      new_status: 'In Review',
      details: 'Ravi moved Task #' + taskIds[0] + ' from In Progress → In Review',
      created_at: new Date(now.getTime() - 15 * 60 * 1000).toISOString(), // 15 mins ago
    },
    {
      task_id: taskIds[2],
      project_id: projectIds[0],
      user_id: elenaId,
      action: 'STATUS_CHANGE',
      old_status: 'In Review',
      new_status: 'Done',
      details: 'Elena moved Task #' + taskIds[2] + ' from In Review → Done',
      created_at: new Date(now.getTime() - 45 * 60 * 1000).toISOString(), // 45 mins ago
    },
    {
      task_id: taskIds[5],
      project_id: projectIds[1],
      user_id: elenaId,
      action: 'STATUS_CHANGE',
      old_status: 'In Progress',
      new_status: 'In Review',
      details: 'Elena moved Task #' + taskIds[5] + ' from In Progress → In Review',
      created_at: new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString(),
    },
    {
      task_id: taskIds[1],
      project_id: projectIds[0],
      user_id: sarahId,
      action: 'OVERDUE_FLAGGED',
      old_status: 'In Progress',
      new_status: 'In Progress',
      details: 'Automated scheduler flagged Task #' + taskIds[1] + ' as Overdue',
      created_at: new Date(now.getTime() - 3 * 60 * 60 * 1000).toISOString(),
    },
    {
      task_id: taskIds[10],
      project_id: projectIds[2],
      user_id: alexDevId,
      action: 'STATUS_CHANGE',
      old_status: 'To Do',
      new_status: 'In Progress',
      details: 'Alex moved Task #' + taskIds[10] + ' from To Do → In Progress',
      created_at: new Date(now.getTime() - 4 * 60 * 60 * 1000).toISOString(),
    },
    {
      task_id: taskIds[14],
      project_id: projectIds[2],
      user_id: priyaId,
      action: 'STATUS_CHANGE',
      old_status: 'In Progress',
      new_status: 'In Review',
      details: 'Priya moved Task #' + taskIds[14] + ' from In Progress → In Review',
      created_at: new Date(now.getTime() - 5 * 60 * 60 * 1000).toISOString(),
    },
  ];

  for (const log of activityLogs) {
    await db.query(
      `INSERT INTO task_activity_logs (task_id, project_id, user_id, action, old_status, new_status, details, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [log.task_id, log.project_id, log.user_id, log.action, log.old_status, log.new_status, log.details, log.created_at]
    );
  }

  // 6. Seed Notifications
  const initialNotifications = [
    {
      user_id: sarahId,
      type: 'TASK_IN_REVIEW',
      title: 'Task Ready for Review',
      message: 'Ravi moved "Implement idempotency keys for /transfer endpoints" to In Review',
      task_id: taskIds[0],
      project_id: projectIds[0],
      is_read: false,
    },
    {
      user_id: raviId,
      type: 'TASK_ASSIGNED',
      title: 'New Task Assignment',
      message: 'You have been assigned to "PCI-DSS Tokenization Service" in FinTech Core Banking API v2',
      task_id: taskIds[1],
      project_id: projectIds[0],
      is_read: false,
    },
    {
      user_id: marcusId,
      type: 'TASK_IN_REVIEW',
      title: 'Task Ready for Review',
      message: 'Priya moved "Patient appointment push notifications" to In Review',
      task_id: taskIds[14],
      project_id: projectIds[2],
      is_read: false,
    },
    {
      user_id: priyaId,
      type: 'TASK_ASSIGNED',
      title: 'New Task Assignment',
      message: 'You have been assigned to "Subscription invoice PDF exporter" in Acme Customer Portal Redesign',
      task_id: taskIds[6],
      project_id: projectIds[1],
      is_read: true,
    },
  ];

  for (const n of initialNotifications) {
    await db.query(
      `INSERT INTO notifications (user_id, type, title, message, task_id, project_id, is_read)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [n.user_id, n.type, n.title, n.message, n.task_id, n.project_id, n.is_read]
    );
  }

  console.log('Seed completed successfully!');
}

if (process.argv[1]?.endsWith('seed.ts') || process.argv[1]?.endsWith('seed.js')) {
  seedDatabase().then(() => {
    process.exit(0);
  }).catch((err) => {
    console.error('Seed failed:', err);
    process.exit(1);
  });
}
