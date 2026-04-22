import { apiRequest } from "./httpClient";

export function getPublicStats() {
  return apiRequest("/doctors/stats");
}

export function getAllDoctors() {
  return apiRequest("/doctors");
}

export function searchDoctors(query) {
  return apiRequest(`/doctors/search?q=${encodeURIComponent(query)}`);
}

export function getDoctorById(id) {
  return apiRequest(`/doctors/${id}`);
}

export function getAllSpecialties() {
  return apiRequest("/doctors/specialties");
}

export function getDoctorsBySpecialty(specialty) {
  return apiRequest(`/doctors/specialty/${specialty}`);
}

// Public: Get a doctor's schedules
export function getDoctorSchedules(doctorId) {
  return apiRequest(`/doctors/${doctorId}/schedules`);
}

// Doctor Dashboard APIs
export function getMyAppointments(token) {
  return apiRequest("/doctor/appointments", { token });
}

export function updateAppointmentStatus(id, status, token) {
  return apiRequest(`/doctor/appointments/${id}/status?status=${status}`, {
    method: "PUT",
    token,
  });
}

export function getMySchedules(token) {
  return apiRequest("/doctor/schedules", { token });
}

export function createMySchedule(data, token) {
  return apiRequest("/doctor/schedules", { method: "POST", body: data, token });
}

export function deleteMySchedule(scheduleId, token) {
  return apiRequest(`/doctor/schedules/${scheduleId}`, { method: "DELETE", token });
}

export function stopMySchedule(scheduleId, token) {
  return apiRequest(`/doctor/schedules/${scheduleId}/stop`, { method: "PUT", token });
}

export function resumeMySchedule(scheduleId, token) {
  return apiRequest(`/doctor/schedules/${scheduleId}/resume`, { method: "PUT", token });
}

export function toggleConsultationLock(appointmentId, locked, token) {
  return apiRequest(`/doctor/appointments/${appointmentId}/lock?locked=${locked}`, {
    method: "PUT",
    token,
  });
}

export function updateConsultationNotes(appointmentId, notes, token) {
  return apiRequest(
    `/doctor/appointments/${appointmentId}/consultation-notes`,
    {
      method: "PUT",
      body: notes,
      token,
      headers: { "Content-Type": "text/plain" }, // Notes are sent as plain string body
    },
  );
}

export function createPrescription(appointmentId, prescriptionData, token) {
  return apiRequest(`/doctor/appointments/${appointmentId}/prescription`, {
    method: "POST",
    body: prescriptionData,
    token,
  });
}

export function updatePrescription(prescriptionId, prescriptionData, token) {
  return apiRequest(`/doctor/prescriptions/${prescriptionId}`, {
    method: "PUT",
    body: prescriptionData,
    token,
  });
}

// Doctor profile
export function getDoctorProfile(token) {
  return apiRequest("/doctor/profile", { token });
}

export function updateDoctorProfile(data, token) {
  return apiRequest("/doctor/profile", { method: "PUT", body: data, token });
}

// Get prescription for an appointment
export function getPrescription(appointmentId, token) {
  return apiRequest(`/doctor/appointments/${appointmentId}/prescription`, { token });
}

// Get all prescriptions written by this doctor
export function getAllMyPrescriptions(token) {
  return apiRequest("/doctor/prescriptions", { token });
}

// Assistant management
export function createAssistant(data, token) {
  return apiRequest("/doctor/assistants", { method: "POST", body: data, token });
}

export function getMyAssistants(token) {
  return apiRequest("/doctor/assistants", { token });
}

export function removeAssistant(assistantUserId, token) {
  return apiRequest(`/doctor/assistants/${assistantUserId}/remove`, { method: "DELETE", token });
}

export function updateAssistantStatus(assistantUserId, active, token) {
  return apiRequest(`/doctor/assistants/${assistantUserId}/status?active=${active}`, {
    method: "PUT",
    token,
  });
}

// Patient data access during consultation
export function getPatientDocuments(appointmentId, token) {
  return apiRequest(`/doctor/appointments/${appointmentId}/patient/documents`, { token });
}

// Check if doctor has access to patient's medical records
export function checkPatientAccessStatus(appointmentId, token) {
  return apiRequest(`/doctor/appointments/${appointmentId}/patient/access-status`, { token });
}
