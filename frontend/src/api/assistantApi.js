import { apiRequest } from "./httpClient";

// Profile
export function getAssistantProfile(token) {
  return apiRequest("/assistant/profile", { token });
}

export function updateAssistantProfile(data, token) {
  return apiRequest("/assistant/profile", { method: "PUT", body: data, token });
}

// Schedules
export function getMyDoctorSchedules(token) {
  return apiRequest("/assistant/schedules", { token });
}

export function createSchedule(data, token) {
  return apiRequest("/assistant/schedules", { method: "POST", body: data, token });
}

export function deleteSchedule(scheduleId, token) {
  return apiRequest(`/assistant/schedules/${scheduleId}`, { method: "DELETE", token });
}

export function stopSchedule(scheduleId, token) {
  return apiRequest(`/assistant/schedules/${scheduleId}/stop`, { method: "PATCH", token });
}

export function resumeSchedule(scheduleId, token) {
  return apiRequest(`/assistant/schedules/${scheduleId}/resume`, { method: "PATCH", token });
}

// Appointment Management
export function getAssistantAppointments(token) {
  return apiRequest("/assistant/appointments", { token });
}

export function confirmAppointment(appointmentId, token) {
  return apiRequest(`/assistant/appointments/${appointmentId}/confirm`, {
    method: "PUT",
    token
  });
}

export function confirmPayment(appointmentId, paymentMethod, transactionId, token) {
  const params = new URLSearchParams({ paymentMethod });
  if (transactionId) params.append("transactionId", transactionId);
  return apiRequest(`/assistant/appointments/${appointmentId}/payment?${params}`, {
    method: "PUT",
    token
  });
}

export function cancelAppointment(appointmentId, token) {
  return apiRequest(`/assistant/appointments/${appointmentId}/cancel`, {
    method: "PUT",
    token
  });
}

export function getAssignedDoctorInfo(token) {
  return apiRequest("/assistant/doctor/info", { token });
}
