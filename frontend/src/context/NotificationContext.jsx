import { useEffect, useState, useCallback } from "react";
import { subscribe, unsubscribe } from "../api/wsClient";
import { useAuth } from "./AuthenticationContext";
import { NotificationContext } from "./notificationContextStore";

export function NotificationProvider({ children }) {
  const { token, user } = useAuth();
  const [notifications, setNotifications] = useState([]);

  const addNotification = useCallback((payload) => {
    setNotifications((prev) =>
      [
        {
          id: Date.now(),
          type: payload.type || "QUEUE_UPDATE",
          message: payload.message || "",
          remaining: payload.remaining ?? null,
          serial: payload.serial ?? null,
          ts: new Date().toLocaleTimeString(),
          read: false,
        },
        ...prev,
      ].slice(0, 50)
    );
  }, []);

  const markAllRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }, []);

  const clearAll = useCallback(() => setNotifications([]), []);

  useEffect(() => {
    if (!token || !user?.id) return;

    const subscriptions = [];

    if (user?.role === "PATIENT") {
      const key = `patient-notifications-${user.id}`;
      subscriptions.push([key, `/topic/patient-notifications/${user.id}`]);
    }

    if (user?.role === "ADMIN") {
      const key = `admin-notifications-${user.id}`;
      subscriptions.push([key, "/topic/admin-notifications"]);
    }

    subscriptions.forEach(([key, destination]) => {
      // Register with the shared wsClient singleton (no-op if WS not yet connected;
      // wsClient re-subscribes automatically on connect/reconnect)
      subscribe(key, destination, addNotification);
    });

    return () => { subscriptions.forEach(([key]) => unsubscribe(key)); };
  }, [token, user?.id, user?.role, addNotification]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <NotificationContext.Provider value={{ notifications, unreadCount, markAllRead, clearAll }}>
      {children}
    </NotificationContext.Provider>
  );
}
