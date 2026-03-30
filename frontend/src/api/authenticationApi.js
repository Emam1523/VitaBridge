import { apiRequest } from "./httpClient";

export function register({
  firstName,
  lastName,
  email,
  phoneNumber,
  password,
  confirmPassword,
}) {
  return apiRequest("/auth/register", {
    method: "POST",
    body: {
      firstName,
      lastName,
      email,
      phoneNumber,
      password,
      confirmPassword,
    },
  });
}

export function login({ identifier, password }) {
  return apiRequest("/auth/login", {
    method: "POST",
    body: { identifier, password },
  });
}

export function changePassword(data, token) {
  return apiRequest("/user/change-password", {
    method: "POST",
    body: data,
    token,
  });
}

/** Step 1: Request an OTP to be sent to the given email */
export function sendOtp(email) {
  return apiRequest("/auth/send-otp", {
    method: "POST",
    body: { email },
  });
}

/** Step 2: Verify the OTP entered by the user */
export function verifyOtp(email, otpCode) {
  return apiRequest("/auth/verify-otp", {
    method: "POST",
    body: { email, otpCode },
  });
}

/** Password Change – Step 1: Send OTP to the authenticated user's email */
export function sendChangePasswordOtp(token) {
  return apiRequest("/user/send-change-password-otp", {
    method: "POST",
    token,
  });
}

/** Password Change – Step 2: Verify the OTP for password change */
export function verifyChangePasswordOtp(otpCode, token) {
  return apiRequest("/user/verify-change-password-otp", {
    method: "POST",
    body: { otpCode },
    token,
  });
}
