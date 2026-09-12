import express from 'express';
import http from 'http';
import path from 'path';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';

// Load environment variables
dotenv.config();

import { db } from './server/db/index.js';
import { wsManager } from './server/services/websocket.js';
import { initScheduler } from './server/services/scheduler.js';
import { errorHandler } from './server/middleware/errorHandler.js';

// Route imports
import authRoutes from './server/routes/auth.routes.js';
import projectsRoutes from './server/routes/projects.routes.js';
import tasksRoutes from './server/routes/tasks.routes.js';
import activityRoutes from './server/routes/activity.routes.js';
import notificationsRoutes from './server/routes/notifications.routes.js';
import statsRoutes from './server/routes/stats.routes.js';
import clientsRoutes from './server/routes/clients.routes.js';
import usersRoutes from './server/routes/users.routes.js';

const PORT = 3000;

async function startServer() {
  const app = express();
  const httpServer = http.createServer(app);

  // Standard middlewares
  app.use(express.json({ limit: '5mb' }));
  app.use(express.urlencoded({ extended: true }));
  app.use(cookieParser());

  // Health check endpoint
  app.get('/api/health', (_req, res) => {
    res.json({
      status: 'ok',
      service: 'PulseBoard Real-Time API',
      timestamp: new Date().toISOString(),
    });
  });

  // API Routes
  app.use('/api/auth', authRoutes);
  app.use('/api/projects', projectsRoutes);
  app.use('/api/tasks', tasksRoutes);
  app.use('/api/activity', activityRoutes);
  app.use('/api/notifications', notificationsRoutes);
  app.use('/api/stats', statsRoutes);
  app.use('/api/clients', clientsRoutes);
  app.use('/api/users', usersRoutes);

  // Error Handling Middleware (must be after routes)
  app.use(errorHandler);

  // Initialize Database
  try {
    await db.init();
    console.log('Database initialized successfully.');
  } catch (err) {
    console.error('Failed to initialize database:', err);
  }

  // Initialize WebSockets
  wsManager.init(httpServer);

  // Initialize Overdue Background Scheduler
  initScheduler();

  // Vite middleware for development vs static build for production
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: false,
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`PulseBoard server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Fatal server startup error:', err);
  process.exit(1);
});
