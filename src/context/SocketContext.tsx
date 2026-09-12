import React, { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react';
import { useAuth } from './AuthContext.js';
import { TaskActivityLog, Notification } from '../types/index.js';

interface SocketContextType {
  isConnected: boolean;
  onlineCount: number;
  onlineUsers: { id: number; name: string; email: string; role: string }[];
  activities: TaskActivityLog[];
  notifications: Notification[];
  unreadCount: number;
  subscribeProject: (projectId: number) => void;
  unsubscribeProject: () => void;
  markNotificationRead: (id: number) => Promise<void>;
  markAllNotificationsRead: () => Promise<void>;
  fetchRecentActivities: () => Promise<void>;
  latestTaskUpdate: any | null;
}

const SocketContext = createContext<SocketContextType | undefined>(undefined);

export function SocketProvider({ children }: { children: React.ReactNode }) {
  const { user, accessToken, authFetch } = useAuth();
  const [isConnected, setIsConnected] = useState(false);
  const [onlineCount, setOnlineCount] = useState(1);
  const [onlineUsers, setOnlineUsers] = useState<{ id: number; name: string; email: string; role: string }[]>([]);
  const [activities, setActivities] = useState<TaskActivityLog[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [latestTaskUpdate, setLatestTaskUpdate] = useState<any | null>(null);

  const socketRef = useRef<WebSocket | null>(null);
  const subscribedProjectIdRef = useRef<number | null>(null);
  const reconnectTimeoutRef = useRef<any>(null);

  // 1. Fetch missed activity events from database (Requirement: last 20 events from DB on reconnect/load)
  const fetchRecentActivities = useCallback(async () => {
    if (!user) return;
    try {
      const res = await authFetch('/api/activity?limit=20');
      if (res.ok) {
        const json = await res.json();
        if (json.success && Array.isArray(json.data.activities)) {
          setActivities(json.data.activities);
        }
      }
    } catch (err) {
      console.error('Failed to fetch activity logs:', err);
    }
  }, [user, authFetch]);

  // 2. Fetch user's notifications
  const fetchNotifications = useCallback(async () => {
    if (!user) return;
    try {
      const res = await authFetch('/api/notifications');
      if (res.ok) {
        const json = await res.json();
        if (json.success) {
          setNotifications(json.data.notifications || []);
          setUnreadCount(json.data.unreadCount || 0);
        }
      }
    } catch (err) {
      console.error('Failed to fetch notifications:', err);
    }
  }, [user, authFetch]);

  useEffect(() => {
    if (user) {
      fetchRecentActivities();
      fetchNotifications();
    } else {
      setActivities([]);
      setNotifications([]);
      setUnreadCount(0);
    }
  }, [user, fetchRecentActivities, fetchNotifications]);

  // 3. Connect to WebSocket
  useEffect(() => {
    if (!user || !accessToken) {
      if (socketRef.current) {
        socketRef.current.close();
      }
      setIsConnected(false);
      return;
    }

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws?token=${encodeURIComponent(accessToken)}`;

    let ws: WebSocket;

    function connect() {
      ws = new WebSocket(wsUrl);
      socketRef.current = ws;

      ws.onopen = () => {
        setIsConnected(true);
        // Re-subscribe if we had a project open
        if (subscribedProjectIdRef.current) {
          ws.send(JSON.stringify({
            type: 'subscribe:project',
            projectId: subscribedProjectIdRef.current,
          }));
        }
      };

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);

          if (msg.type === 'connected') {
            setOnlineCount(msg.onlineCount || 1);
          } else if (msg.type === 'presence:update') {
            setOnlineCount(msg.onlineCount || 1);
            if (Array.isArray(msg.users)) {
              setOnlineUsers(msg.users);
            }
          } else if (msg.type === 'activity:new') {
            // Prepend new real-time activity event (idempotent check)
            setActivities((prev) => {
              if (prev.some((a) => a.id === msg.activity.id)) return prev;
              return [msg.activity, ...prev].slice(0, 50);
            });
          } else if (msg.type === 'notification:new') {
            // Prepend new notification and increment unread badge count
            setNotifications((prev) => [msg.notification, ...prev]);
            setUnreadCount((count) => count + 1);
          } else if (msg.type === 'task:updated') {
            setLatestTaskUpdate(msg.task);
          }
        } catch (err) {
          console.error('WS parse error:', err);
        }
      };

      ws.onclose = () => {
        setIsConnected(false);
        // Automatic reconnection attempt with backoff
        if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = setTimeout(() => {
          if (user && accessToken) {
            connect();
          }
        }, 3000);
      };

      ws.onerror = () => {
        // Handle socket error gracefully without throwing uncaught console errors
        try {
          if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
            ws.close();
          }
        } catch {
          // ignore
        }
      };
    }

    connect();

    // Heartbeat keepalive ping every 25s
    const pingInterval = setInterval(() => {
      if (socketRef.current?.readyState === WebSocket.OPEN) {
        try {
          socketRef.current.send(JSON.stringify({ type: 'ping' }));
        } catch {
          // ignore
        }
      }
    }, 25000);

    // Fallback periodic sync every 15s to guarantee fresh data even during reconnection
    const fallbackPollInterval = setInterval(() => {
      if (user) {
        fetchRecentActivities();
        fetchNotifications();
      }
    }, 15000);

    return () => {
      clearInterval(pingInterval);
      clearInterval(fallbackPollInterval);
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      if (socketRef.current) {
        try {
          socketRef.current.close();
        } catch {
          // ignore
        }
      }
    };
  }, [user, accessToken]);

  const subscribeProject = useCallback((projectId: number) => {
    subscribedProjectIdRef.current = projectId;
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({
        type: 'subscribe:project',
        projectId,
      }));
    }
  }, []);

  const unsubscribeProject = useCallback(() => {
    subscribedProjectIdRef.current = null;
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({
        type: 'unsubscribe:project',
      }));
    }
  }, []);

  const markNotificationRead = async (id: number) => {
    try {
      const res = await authFetch(`/api/notifications/${id}/read`, { method: 'PATCH' });
      if (res.ok) {
        const data = await res.json();
        setNotifications((prev) =>
          prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
        );
        setUnreadCount(data.data.unreadCount);
      }
    } catch (err) {
      console.error('Failed to mark notification read:', err);
    }
  };

  const markAllNotificationsRead = async () => {
    try {
      const res = await authFetch('/api/notifications/read-all', { method: 'PATCH' });
      if (res.ok) {
        setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
        setUnreadCount(0);
      }
    } catch (err) {
      console.error('Failed to mark all notifications read:', err);
    }
  };

  return (
    <SocketContext.Provider
      value={{
        isConnected,
        onlineCount,
        onlineUsers,
        activities,
        notifications,
        unreadCount,
        subscribeProject,
        unsubscribeProject,
        markNotificationRead,
        markAllNotificationsRead,
        fetchRecentActivities,
        latestTaskUpdate,
      }}
    >
      {children}
    </SocketContext.Provider>
  );
}

export function useSocket() {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
}
