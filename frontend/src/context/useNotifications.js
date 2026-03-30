import { useContext } from "react";
import { NotificationContext } from "./notificationContextStore";

export function useNotifications() {
  return useContext(NotificationContext);
}
