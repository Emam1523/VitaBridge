import { apiRequest } from "./httpClient";

export function getPaymentByAppointment(appointmentId, token) {
  return apiRequest(`/payments/appointment/${appointmentId}`, { token });
}

export function processPayment(appointmentId, paymentMethod, transactionId, token) {
  return apiRequest(
    `/payments/appointment/${appointmentId}/process?paymentMethod=${paymentMethod}&transactionId=${encodeURIComponent(transactionId)}`,
    {
      method: "POST",
      token,
    },
  );
}
export function initAamarPayPayment(appointmentId, token) {
  return apiRequest(`/payments/appointment/${appointmentId}/init-aamarpay`, {
    method: "POST",
    token,
   // Send the browser's origin so the backend can build callback URLs that go back to the frontend, even if it's hosted on a different domain/port during development
    body: { clientOrigin: window.location.origin },
  });
}
