import { apiRequest } from "./httpClient";

export function getAllUsers(token) {
  return apiRequest("/admin/users", { token });
}

export function getUsersByRole(role, token) {
  return apiRequest(`/admin/users/role/${role}`, { token });
}

export function toggleUserStatus(userId, token) {
  return apiRequest(`/admin/users/${userId}/toggle-status`, {
    method: "PUT",
    token,
  });
}

export function deleteUser(userId, token) {
  return apiRequest(`/admin/users/${userId}`, {
    method: "DELETE",
    token,
  });
}

// Doctor management
export function createDoctor(data, token) {
  return apiRequest("/admin/doctors", { method: "POST", body: data, token });
}

export function getAllDoctors(token) {
  return apiRequest("/admin/doctors", { token });
}

// Appointments
export function getAllAppointments(token) {
  return apiRequest("/admin/appointments", { token });
}

// Payments
export function getAllPayments(token) {
  return apiRequest("/admin/payments", { token });
}

// Payment Statistics
export function getTodayPaymentStats(token) {
  return apiRequest("/admin/payments/stats/today", { token });
}

export function getAllDoctorPaymentSummaries(token) {
  return apiRequest("/admin/payments/summary/doctors", { token });
}

// Assistant-Doctor Assignments
export function getAllAssistantAssignments(token) {
  return apiRequest("/admin/assistants/assignments", { token });
}

export function getUnassignedAssistants(token) {
  return apiRequest("/admin/assistants/unassigned", { token });
}

// Admin profile
export function getAdminProfile(token) {
  return apiRequest("/admin/profile", { token });
}

export function updateAdminProfile(data, token) {
  return apiRequest("/admin/profile", { method: "PUT", body: data, token });
}

// Daily Reports
export function getAppointmentsByDate(date, token) {
  return apiRequest(`/admin/reports/appointments/date?date=${date}`, { token });
}

export function getAppointmentsByDoctorAndDate(doctorId, date, token) {
  return apiRequest(`/admin/reports/appointments/doctor-date?doctorId=${doctorId}&date=${date}`, { token });
}

export function getAvailableReportDates(token) {
  return apiRequest("/admin/reports/dates", { token });
}
