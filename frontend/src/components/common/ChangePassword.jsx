import { useState } from "react";
import DashboardLayout from "./DashboardLayout";
import { useAuth } from "../../context/AuthenticationContext";
import {
  changePassword,
  sendChangePasswordOtp,
  verifyChangePasswordOtp,
} from "../../api/authenticationApi";

// Role-based nav links (mirrors each dashboard's LINKS)
function getLinks(role) {
  switch (role?.toUpperCase()) {
    case "DOCTOR":
      return [
        { to: "/doctor/dashboard", label: "Dashboard", icon: <NavIcon d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /> },
        { to: "/doctor/profile", label: "My Profile", icon: <NavIcon d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /> },
        { to: "/doctor/appointments", label: "Appointments", icon: <NavIcon d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /> },
        { to: "/change-password", label: "Change Password", icon: <NavIcon d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /> },
      ];
    case "ADMIN":
      return [
        { to: "/admin/dashboard", label: "Dashboard", icon: <NavIcon d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /> },
        { to: "/admin/users", label: "Manage Users", icon: <NavIcon d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /> },
        { to: "/change-password", label: "Change Password", icon: <NavIcon d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /> },
      ];
    case "ASSISTANT":
      return [
        { to: "/assistant/dashboard", label: "Dashboard", icon: <NavIcon d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /> },
        { to: "/assistant/profile", label: "My Profile", icon: <NavIcon d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /> },
        { to: "/assistant/appointments", label: "Appointments", icon: <NavIcon d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /> },
        { to: "/change-password", label: "Change Password", icon: <NavIcon d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /> },
      ];
    default: // PATIENT
      return [
        { to: "/patient/dashboard", label: "Dashboard", icon: <NavIcon d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /> },
        { to: "/patient/profile", label: "My Profile", icon: <NavIcon d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /> },
        { to: "/patient/appointments", label: "Appointments", icon: <NavIcon d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /> },
        { to: "/change-password", label: "Change Password", icon: <NavIcon d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /> },
      ];
  }
}

function NavIcon({ d }) {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={d} />
    </svg>
  );
}

const inputCls =
  "mt-1.5 block w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-900 transition outline-none focus:border-primary-500 focus:ring-4 focus:ring-primary-500/10";

// Step indicators
const STEPS = ["Send OTP", "Verify OTP", "New Password"];

function StepIndicator({ current }) {
  return (
    <div className="flex items-center justify-center gap-2 mb-6">
      {STEPS.map((label, idx) => {
        const stepNum = idx + 1;
        const isCompleted = stepNum < current;
        const isActive = stepNum === current;
        return (
          <div key={label} className="flex items-center gap-2">
            <div className="flex flex-col items-center">
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold transition-all ${
                  isCompleted
                    ? "bg-green-500 text-white"
                    : isActive
                    ? "bg-primary-600 text-white shadow-lg shadow-primary-500/30"
                    : "bg-gray-100 text-gray-400"
                }`}
              >
                {isCompleted ? (
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  stepNum
                )}
              </div>
              <span
                className={`mt-1 text-xs font-medium ${
                  isActive ? "text-primary-600" : isCompleted ? "text-green-600" : "text-gray-400"
                }`}
              >
                {label}
              </span>
            </div>
            {idx < STEPS.length - 1 && (
              <div
                className={`mb-4 h-0.5 w-10 rounded-full transition-all ${
                  isCompleted ? "bg-green-400" : "bg-gray-200"
                }`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

export default function ChangePassword() {
  const { token, user } = useAuth();

  // step: 1 = send OTP, 2 = verify OTP, 3 = set new password
  const [step, setStep] = useState(1);

  // Step 1 state
  const [sendingOtp, setSendingOtp] = useState(false);

  // Step 2 state
  const [otpCode, setOtpCode] = useState("");
  const [verifyingOtp, setVerifyingOtp] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  // Step 3 state
  const [form, setForm] = useState({ newPassword: "", confirmNewPassword: "" });
  const [saving, setSaving] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  // Shared state
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const links = getLinks(user?.role);

  // ── Step 1: Send OTP ──────────────────────────────────────────────────────
  const handleSendOtp = async () => {
    setError("");
    setSuccess("");
    try {
      setSendingOtp(true);
      await sendChangePasswordOtp(token);
      setStep(2);
      setSuccess(`A 6-digit verification code has been sent to ${user?.email}. Please check your inbox.`);
      startResendCooldown();
    } catch (err) {
      setError(err.message || "Failed to send OTP. Please try again.");
    } finally {
      setSendingOtp(false);
    }
  };

  const startResendCooldown = () => {
    setResendCooldown(60);
    const interval = setInterval(() => {
      setResendCooldown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleResendOtp = async () => {
    if (resendCooldown > 0) return;
    setError("");
    setSuccess("");
    try {
      setSendingOtp(true);
      await sendChangePasswordOtp(token);
      setOtpCode("");
      setSuccess(`A new verification code has been sent to ${user?.email}.`);
      startResendCooldown();
    } catch (err) {
      setError(err.message || "Failed to resend OTP. Please try again.");
    } finally {
      setSendingOtp(false);
    }
  };

  // ── Step 2: Verify OTP ────────────────────────────────────────────────────
  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    if (otpCode.length !== 6) {
      setError("Please enter the 6-digit verification code.");
      return;
    }
    try {
      setVerifyingOtp(true);
      await verifyChangePasswordOtp(otpCode, token);
      setStep(3);
      setSuccess("OTP verified successfully. Please set your new password.");
    } catch (err) {
      setError(err.message || "Invalid OTP. Please try again.");
    } finally {
      setVerifyingOtp(false);
    }
  };

  // ── Step 3: Change Password ───────────────────────────────────────────────
  const change = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    if (form.newPassword !== form.confirmNewPassword) {
      setError("New passwords do not match.");
      return;
    }
    if (form.newPassword.length < 6) {
      setError("New password must be at least 6 characters.");
      return;
    }
    try {
      setSaving(true);
      await changePassword({ newPassword: form.newPassword, confirmNewPassword: form.confirmNewPassword }, token);
      setSuccess("Password changed successfully!");
      setForm({ newPassword: "", confirmNewPassword: "" });
      setOtpCode("");
      setStep(1);
    } catch (err) {
      setError(err.message || "Failed to change password.");
    } finally {
      setSaving(false);
    }
  };

  // Password strength
  const strength = (() => {
    const p = form.newPassword;
    if (!p) return null;
    let score = 0;
    if (p.length >= 8) score++;
    if (/[A-Z]/.test(p)) score++;
    if (/[0-9]/.test(p)) score++;
    if (/[^A-Za-z0-9]/.test(p)) score++;
    if (score <= 1) return { label: "Weak", color: "bg-red-400", width: "w-1/4" };
    if (score === 2) return { label: "Fair", color: "bg-yellow-400", width: "w-2/4" };
    if (score === 3) return { label: "Good", color: "bg-blue-400", width: "w-3/4" };
    return { label: "Strong", color: "bg-green-500", width: "w-full" };
  })();

  return (
    <DashboardLayout title="Change Password" links={links}>
      <div className="mx-auto max-w-lg">
        {/* Header Card */}
        <div className="mb-6 overflow-hidden rounded-2xl bg-gradient-to-br from-primary-700 via-primary-600 to-primary-500 p-6 text-white shadow-xl">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/20 backdrop-blur">
              <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-bold">Change Password</h2>
              <p className="text-sm text-primary-200">Update your account password securely</p>
            </div>
          </div>
          <div className="mt-4 rounded-xl bg-white/10 px-4 py-2.5 text-sm text-primary-100">
            Signed in as <span className="font-semibold text-white">{user?.email}</span>
          </div>
        </div>

        {/* Step Indicator */}
        <StepIndicator current={step} />

        {/* Messages */}
        {error && (
          <div className="mb-4 flex items-center gap-2 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
            <svg className="h-4 w-4 shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            {error}
          </div>
        )}
        {success && (
          <div className="mb-4 flex items-center gap-2 rounded-xl border border-green-100 bg-green-50 px-4 py-3 text-sm text-green-700">
            <svg className="h-4 w-4 shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            {success}
          </div>
        )}

        {/* ── Step 1: Send OTP ── */}
        {step === 1 && (
          <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm md:p-8">
            <div className="mb-6 text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary-50">
                <svg className="h-8 w-8 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <h3 className="text-base font-semibold text-gray-900">Verify Your Identity</h3>
              <p className="mt-1.5 text-sm text-gray-500">
                To change your password, we'll send a 6-digit verification code to{" "}
                <span className="font-medium text-gray-700">{user?.email}</span>
              </p>
            </div>

            <div className="rounded-xl bg-blue-50 px-4 py-3 text-xs text-blue-700 mb-6">
              <p className="font-semibold mb-1">🔒 Security step</p>
              <p>This OTP confirms it's really you before allowing a password change.</p>
            </div>

            <button
              type="button"
              onClick={handleSendOtp}
              disabled={sendingOtp}
              className="w-full rounded-xl bg-gradient-to-r from-primary-600 to-primary-500 py-3 text-sm font-semibold text-white shadow-lg shadow-primary-500/25 transition hover:brightness-110 disabled:opacity-60"
            >
              {sendingOtp ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Sending OTP...
                </span>
              ) : (
                "Send Verification Code"
              )}
            </button>
          </div>
        )}

        {/* ── Step 2: Verify OTP ── */}
        {step === 2 && (
          <form onSubmit={handleVerifyOtp} className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm md:p-8">
            <div className="mb-6 text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-orange-50">
                <svg className="h-8 w-8 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <h3 className="text-base font-semibold text-gray-900">Enter Verification Code</h3>
              <p className="mt-1.5 text-sm text-gray-500">
                Enter the 6-digit code sent to{" "}
                <span className="font-medium text-gray-700">{user?.email}</span>
              </p>
            </div>

            <div className="mb-5">
              <label className="text-sm font-medium text-gray-700">Verification Code</label>
              <input
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder="Enter 6-digit code"
                className={`${inputCls} text-center text-2xl font-bold tracking-[0.5em] mt-1.5`}
                autoFocus
              />
              {otpCode.length > 0 && otpCode.length < 6 && (
                <p className="mt-1.5 text-xs text-gray-400">{6 - otpCode.length} more digit(s) needed</p>
              )}
            </div>

            <button
              type="submit"
              disabled={verifyingOtp || otpCode.length !== 6}
              className="w-full rounded-xl bg-gradient-to-r from-primary-600 to-primary-500 py-3 text-sm font-semibold text-white shadow-lg shadow-primary-500/25 transition hover:brightness-110 disabled:opacity-60 mb-3"
            >
              {verifyingOtp ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Verifying...
                </span>
              ) : (
                "Verify Code"
              )}
            </button>

            {/* Resend OTP */}
            <div className="text-center">
              <p className="text-xs text-gray-500">
                Didn't receive the code?{" "}
                {resendCooldown > 0 ? (
                  <span className="text-gray-400">Resend in {resendCooldown}s</span>
                ) : (
                  <button
                    type="button"
                    onClick={handleResendOtp}
                    disabled={sendingOtp}
                    className="font-medium text-primary-600 hover:text-primary-700 disabled:opacity-50"
                  >
                    Resend OTP
                  </button>
                )}
              </p>
            </div>
          </form>
        )}

        {/* ── Step 3: Set New Password ── */}
        {step === 3 && (
          <form onSubmit={handleChangePassword} className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm md:p-8">
            <div className="mb-6 text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-green-50">
                <svg className="h-8 w-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <h3 className="text-base font-semibold text-gray-900">Set New Password</h3>
              <p className="mt-1.5 text-sm text-gray-500">
                Identity verified! Choose a strong new password.
              </p>
            </div>

            <div className="space-y-5">
              {/* New Password */}
              <div>
                <label className="text-sm font-medium text-gray-700">New Password</label>
                <div className="relative">
                  <input
                    type={showNew ? "text" : "password"}
                    name="newPassword"
                    required
                    value={form.newPassword}
                    onChange={change}
                    placeholder="Enter new password (min. 6 characters)"
                    className={inputCls}
                  />
                  <button
                    type="button"
                    onClick={() => setShowNew((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showNew ? (
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                      </svg>
                    ) : (
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    )}
                  </button>
                </div>
                {/* Strength bar */}
                {strength && (
                  <div className="mt-2 space-y-1">
                    <div className="h-1.5 w-full rounded-full bg-gray-100">
                      <div className={`h-1.5 rounded-full transition-all duration-300 ${strength.color} ${strength.width}`} />
                    </div>
                    <p className="text-xs text-gray-500">
                      Password strength: <span className="font-medium">{strength.label}</span>
                    </p>
                  </div>
                )}
              </div>

              {/* Confirm New Password */}
              <div>
                <label className="text-sm font-medium text-gray-700">Confirm New Password</label>
                <div className="relative">
                  <input
                    type={showConfirm ? "text" : "password"}
                    name="confirmNewPassword"
                    required
                    value={form.confirmNewPassword}
                    onChange={change}
                    placeholder="Re-enter your new password"
                    className={`${inputCls} ${
                      form.confirmNewPassword && form.newPassword !== form.confirmNewPassword
                        ? "border-red-300 focus:border-red-400 focus:ring-red-400/10"
                        : form.confirmNewPassword && form.newPassword === form.confirmNewPassword
                        ? "border-green-300 focus:border-green-400 focus:ring-green-400/10"
                        : ""
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showConfirm ? (
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                      </svg>
                    ) : (
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    )}
                  </button>
                </div>
                {form.confirmNewPassword && form.newPassword !== form.confirmNewPassword && (
                  <p className="mt-1.5 text-xs text-red-500">Passwords do not match</p>
                )}
                {form.confirmNewPassword && form.newPassword === form.confirmNewPassword && (
                  <p className="mt-1.5 text-xs text-green-500">Passwords match ✓</p>
                )}
              </div>

              {/* Tips */}
              <div className="rounded-xl bg-blue-50 px-4 py-3 text-xs text-blue-700">
                <p className="font-semibold mb-1">Password tips:</p>
                <ul className="space-y-0.5 list-disc list-inside">
                  <li>At least 6 characters long</li>
                  <li>Mix uppercase and lowercase letters</li>
                  <li>Include numbers and symbols for better security</li>
                </ul>
              </div>

              <button
                type="submit"
                disabled={saving}
                className="w-full rounded-xl bg-gradient-to-r from-primary-600 to-primary-500 py-3 text-sm font-semibold text-white shadow-lg shadow-primary-500/25 transition hover:brightness-110 disabled:opacity-60"
              >
                {saving ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Updating Password...
                  </span>
                ) : (
                  "Update Password"
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </DashboardLayout>
  );
}
