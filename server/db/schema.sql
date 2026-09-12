-- PulseBoard Relational PostgreSQL Schema
-- Enforces strict referential integrity, check constraints, and optimal indexes

CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL CHECK (role IN ('Admin', 'Project Manager', 'Developer')),
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS clients (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  company VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS projects (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  client_id INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  created_by INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  status VARCHAR(50) NOT NULL DEFAULT 'Active' CHECK (status IN ('Active', 'On Hold', 'Completed')),
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS tasks (
  id SERIAL PRIMARY KEY,
  project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  assigned_to INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  status VARCHAR(50) NOT NULL DEFAULT 'To Do' CHECK (status IN ('To Do', 'In Progress', 'In Review', 'Done')),
  priority VARCHAR(50) NOT NULL DEFAULT 'Medium' CHECK (priority IN ('Low', 'Medium', 'High', 'Critical')),
  due_date TIMESTAMPTZ NOT NULL,
  is_overdue BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS task_activity_logs (
  id SERIAL PRIMARY KEY,
  task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  action VARCHAR(100) NOT NULL,
  old_status VARCHAR(50),
  new_status VARCHAR(50),
  details TEXT,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS notifications (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  task_id INTEGER REFERENCES tasks(id) ON DELETE SET NULL,
  project_id INTEGER REFERENCES projects(id) ON DELETE SET NULL,
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Performance & Query Optimization Indexes:
-- 1. Authentication & user lookups
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- 2. Project ownership & client relationships
CREATE INDEX IF NOT EXISTS idx_projects_created_by ON projects(created_by);
CREATE INDEX IF NOT EXISTS idx_projects_client_id ON projects(client_id);

-- 3. Task lookups by developer (strictly queried for role isolation) and project
CREATE INDEX IF NOT EXISTS idx_tasks_assigned_to ON tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_tasks_project_id ON tasks(project_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_priority ON tasks(priority);
CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON tasks(due_date);
CREATE INDEX IF NOT EXISTS idx_tasks_is_overdue ON tasks(is_overdue);

-- 4. Activity feed filtering (ordered by recency)
CREATE INDEX IF NOT EXISTS idx_task_activity_logs_project_id ON task_activity_logs(project_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_task_activity_logs_task_id ON task_activity_logs(task_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_task_activity_logs_user_id ON task_activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_task_activity_logs_created_at ON task_activity_logs(created_at DESC);

-- 5. Notifications lookup for fast unread count badges
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON notifications(user_id, is_read, created_at DESC);
