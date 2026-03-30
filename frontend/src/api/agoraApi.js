import { apiRequest } from "./httpClient";

export function getAgoraConfig(appointmentId, token) {
  return apiRequest(`/consultation/${appointmentId}/agora`, { token });
}
