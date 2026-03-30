import { apiRequest } from "./httpClient";

export function getMessages(appointmentId, token) {
  return apiRequest(`/consultation/${appointmentId}/messages`, { token });
}

export function sendMessage(appointmentId, message, token) {
  return apiRequest(`/consultation/${appointmentId}/messages`, {
    method: "POST",
    body: message,
    token,
  });
}

export function markAsRead(appointmentId, token) {
  return apiRequest(`/consultation/${appointmentId}/messages/read`, {
    method: "PUT",
    token,
  });
}
