import { Server as HttpServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { verifyAccessToken, AuthUser } from '../middleware/auth.js';

interface ClientConnection {
  ws: WebSocket;
  user: AuthUser;
  subscribedProjectId?: number;
  connectedAt: Date;
}

export interface ActivityPayload {
  id: number;
  task_id: number;
  project_id: number;
  project_title?: string;
  user_id: number;
  user_name: string;
  action: string;
  old_status?: string;
  new_status?: string;
  details: string;
  created_at: string;
}

export interface NotificationPayload {
  id: number;
  user_id: number;
  type: string;
  title: string;
  message: string;
  task_id?: number;
  project_id?: number;
  is_read: boolean;
  created_at: string;
}

class WebSocketManager {
  private wss: WebSocketServer | null = null;
  private clients: Map<WebSocket, ClientConnection> = new Map();

  init(server: HttpServer) {
    this.wss = new WebSocketServer({ noServer: true });

    server.on('upgrade', (request, socket, head) => {
      try {
        const host = request.headers.host || 'localhost';
        const url = new URL(request.url || '', `http://${host}`);
        if (url.pathname === '/ws') {
          this.wss!.handleUpgrade(request, socket, head, (ws) => {
            this.wss!.emit('connection', ws, request);
          });
        }
      } catch (err) {
        try {
          socket.destroy();
        } catch {
          // ignore
        }
      }
    });

    this.wss.on('connection', (ws: WebSocket, req) => {
      // Extract token from query params: /ws?token=...
      let token: string | null = null;
      if (req.url) {
        try {
          const parsed = new URL(req.url, 'http://localhost');
          token = parsed.searchParams.get('token');
        } catch {
          // ignore
        }
      }

      let authUser: AuthUser | null = null;
      if (token) {
        authUser = verifyAccessToken(token);
      }

      if (authUser) {
        this.registerClient(ws, authUser);
      }

      ws.on('message', (rawData) => {
        try {
          const data = JSON.parse(rawData.toString());

          // Handle late authentication message
          if (data.type === 'auth') {
            const user = verifyAccessToken(data.token);
            if (user) {
              this.registerClient(ws, user);
              ws.send(JSON.stringify({ type: 'auth:success', user }));
            } else {
              ws.send(JSON.stringify({ type: 'auth:failed', message: 'Invalid token' }));
            }
          }

          // Handle subscribing to a specific project view (e.g. project details page)
          if (data.type === 'subscribe:project') {
            const client = this.clients.get(ws);
            if (client) {
              client.subscribedProjectId = data.projectId ? Number(data.projectId) : undefined;
            }
          }

          // Handle unsubscribe
          if (data.type === 'unsubscribe:project') {
            const client = this.clients.get(ws);
            if (client) {
              client.subscribedProjectId = undefined;
            }
          }

          // Heartbeat ping/pong
          if (data.type === 'ping') {
            ws.send(JSON.stringify({ type: 'pong', timestamp: Date.now() }));
          }
        } catch (err) {
          console.warn('Non-fatal error parsing WS message:', err);
        }
      });

      ws.on('close', () => {
        this.clients.delete(ws);
        this.broadcastPresence();
      });

      ws.on('error', (err) => {
        console.warn('WebSocket socket disconnected/reset:', err?.message || err);
        this.clients.delete(ws);
        this.broadcastPresence();
      });
    });

    console.log('WebSocket server initialized on /ws (manual upgrade)');
  }

  private registerClient(ws: WebSocket, user: AuthUser) {
    this.clients.set(ws, {
      ws,
      user,
      connectedAt: new Date(),
    });

    // Send connected ack
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({
        type: 'connected',
        user: { id: user.id, email: user.email, name: user.name, role: user.role },
        onlineCount: this.getOnlineUserCount(),
      }));
    }

    this.broadcastPresence();
  }

  /**
   * Broadcast presence update to all connected clients (especially Admin dashboard)
   */
  broadcastPresence() {
    const onlineUsers = this.getOnlineUsers();
    const payload = JSON.stringify({
      type: 'presence:update',
      onlineCount: onlineUsers.length,
      users: onlineUsers,
    });

    for (const [ws] of this.clients) {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(payload);
      }
    }
  }

  /**
   * Returns list of unique active authenticated users online
   */
  getOnlineUsers(): { id: number; name: string; email: string; role: string }[] {
    const unique = new Map<number, { id: number; name: string; email: string; role: string }>();
    for (const [, client] of this.clients) {
      if (!unique.has(client.user.id)) {
        unique.set(client.user.id, {
          id: client.user.id,
          name: client.user.name,
          email: client.user.email,
          role: client.user.role,
        });
      }
    }
    return Array.from(unique.values());
  }

  getOnlineUserCount(): number {
    return this.getOnlineUsers().length;
  }

  /**
   * Role-aware Activity Feed Broadcaster:
   * - Admin: sees activity across all projects in a single global feed.
   * - PM: sees activity only from their own projects (projectCreatorId).
   * - Developer: sees activity only on tasks assigned to them (taskAssigneeId).
   * - In addition: any user currently actively viewing this project room receives the live update!
   */
  broadcastActivity(
    activity: ActivityPayload,
    meta: { projectCreatorId?: number; taskAssigneeId?: number }
  ) {
    const payload = JSON.stringify({
      type: 'activity:new',
      activity,
    });

    for (const [, client] of this.clients) {
      if (client.ws.readyState !== WebSocket.OPEN) continue;

      const user = client.user;
      let shouldReceive = false;

      // 1. Admin sees everything globally
      if (user.role === 'Admin') {
        shouldReceive = true;
      }
      // 2. PM sees activity from projects they created
      else if (user.role === 'Project Manager' && meta.projectCreatorId === user.id) {
        shouldReceive = true;
      }
      // 3. Developer sees activity for tasks assigned to them
      else if (user.role === 'Developer' && meta.taskAssigneeId === user.id) {
        shouldReceive = true;
      }
      // 4. Any user actively inside this project view
      else if (client.subscribedProjectId === activity.project_id) {
        // If developer is in project view but role restricted, developer only receives if assigned
        if (user.role !== 'Developer' || meta.taskAssigneeId === user.id) {
          shouldReceive = true;
        }
      }

      if (shouldReceive) {
        client.ws.send(payload);
      }
    }
  }

  /**
   * Broadcast real-time task update so Kanban/Task lists refresh immediately
   */
  broadcastTaskUpdate(task: any, projectCreatorId?: number) {
    const payload = JSON.stringify({
      type: 'task:updated',
      task,
    });

    for (const [, client] of this.clients) {
      if (client.ws.readyState !== WebSocket.OPEN) continue;

      const user = client.user;
      let canSee = false;

      if (user.role === 'Admin') {
        canSee = true;
      } else if (user.role === 'Project Manager' && projectCreatorId === user.id) {
        canSee = true;
      } else if (user.role === 'Developer' && task.assigned_to === user.id) {
        canSee = true;
      }

      if (canSee) {
        client.ws.send(payload);
      }
    }
  }

  /**
   * Send in-app notification to a specific user in real time
   */
  sendNotification(userId: number, notification: NotificationPayload) {
    const payload = JSON.stringify({
      type: 'notification:new',
      notification,
    });

    for (const [, client] of this.clients) {
      if (client.ws.readyState === WebSocket.OPEN && client.user.id === userId) {
        client.ws.send(payload);
      }
    }
  }
}

export const wsManager = new WebSocketManager();
