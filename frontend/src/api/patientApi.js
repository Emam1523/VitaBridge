import { apiRequest, getApiBaseUrl } from "./httpClient";

export function getProfile(token) {
  return apiRequest("/patient/profile", { token });
}

export function updateProfile(data, token) {
  return apiRequest("/patient/profile", {
    method: "PUT",
    body: data,
    token,
  });
}

export function getAppointments(token) {
  return apiRequest("/patient/appointments", { token });
}

export function getAppointmentById(id, token) {
  return apiRequest(`/patient/appointments/${id}`, { token });
}

export function bookAppointment(data, token) {
  return apiRequest("/patient/appointments", {
    method: "POST",
    body: data,
    token,
  });
}

// Prescriptions
export function getPrescription(appointmentId, token) {
  return apiRequest(`/patient/appointments/${appointmentId}/prescription`, { token });
}

export function getMyPrescriptions(token) {
  return apiRequest("/patient/prescriptions", { token });
}

// Medical documents
export function getMyDocuments(token) {
  return apiRequest("/patient/documents", { token });
}

export async function uploadDocument(file, description, token) {
  const baseUrl = getApiBaseUrl();
  const formData = new FormData();
  formData.append("file", file);
  if (description) formData.append("description", description);

  const response = await fetch(`${baseUrl}/patient/documents`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: formData,
  });

  if (!response.ok) {
    let message = `Upload failed (${response.status})`;
    try {
      const maybeJson = await response.json();
      message = maybeJson?.message || message;
    } catch { /* ignore */ }
    throw new Error(message);
  }
  return response.json();
}

export function getDocumentDownloadUrl(fileUrl) {
  const baseUrl = getApiBaseUrl();
  const origin = baseUrl === "/api" ? window.location.origin : baseUrl.replace(/\/api$/, "");
  return new URL(fileUrl, origin).toString();
}

export function deleteDocument(documentId, token) {
  return apiRequest(`/patient/documents/${documentId}`, { method: "DELETE", token });
}

// Reviews
export function createReviewForAppointment(appointmentId, review, token) {
  return apiRequest(`/patient/appointments/${appointmentId}/review`, { 
    method: "POST", 
    body: review, 
    token 
  });
}

export function getReviewForAppointment(appointmentId, token) {
  return apiRequest(`/patient/appointments/${appointmentId}/review`, { token });
}

// Medical access control
export function grantMedicalAccess(doctorUserId, token) {
  return apiRequest(`/patient/medical-access/grant/${doctorUserId}`, { method: "POST", token });
}

export function revokeMedicalAccess(doctorUserId, token) {
  return apiRequest(`/patient/medical-access/revoke/${doctorUserId}`, { method: "POST", token });
}

export function getMedicalAccessList(token) {
  return apiRequest("/patient/medical-access", { token });
}

// Patient stats
export function getPatientStats(token) {
  return apiRequest("/patient/stats", { token });
}
