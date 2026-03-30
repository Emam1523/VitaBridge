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
    // Only patients receive queue notifications
    if (!token || !user?.id || user?.role !== "PATIENT") return;

    const key = `patient-notifications-${user.id}`;
    // Register with the shared wsClient singleton (no-op if WS not yet connected;
    // wsClient re-subscribes automatically on connect/reconnect)
    subscribe(key, `/topic/patient-notifications/${user.id}`, addNotification);

    return () => { unsubscribe(key); };
  }, [token, user?.id, user?.role, addNotification]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <NotificationContext.Provider value={{ notifications, unreadCount, markAllRead, clearAll }}>
      {children}
    </NotificationContext.Provider>
  );
}
