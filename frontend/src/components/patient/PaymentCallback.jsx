import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import DashboardLayout from "../common/DashboardLayout";
import { PATIENT_LINKS } from "./patientLinks";
import { useAuth } from "../../context/AuthenticationContext";

const REDIRECT_DELAY = 5;

export default function PaymentCallback({ status }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated } = useAuth();
  const params = new URLSearchParams(location.search);
  const error = params.get("error");
  const appointmentId = params.get("appointmentId");

  const [countdown, setCountdown] = useState(REDIRECT_DELAY);
  const isSuccessState = status === "success";

  // Block browser back-button during success countdown
  useEffect(() => {
    if (!isSuccessState) return;
    // Push current URL so pressing Back just re-lands here
    window.history.pushState(null, "", window.location.href);
    const handlePop = () => {
      window.history.pushState(null, "", window.location.href);
    };
    window.addEventListener("popstate", handlePop);
    return () => window.removeEventListener("popstate", handlePop);
  }, [isSuccessState]);

  // Countdown timer
  useEffect(() => {
    if (!isSuccessState) return;
    const interval = setInterval(() => {
      setCountdown((c) => (c <= 1 ? 0 : c - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [isSuccessState]);

  // Redirect when countdown reaches 0 (separate effect to avoid setState-in-render)
  useEffect(() => {
    if (isSuccessState && countdown === 0) {
      navigate("/patient/appointments", { replace: true });
    }
  }, [isSuccessState, countdown, navigate]);

  const config = {
    success: {
      icon: "🎉",
      color: "text-green-600",
      bg: "bg-green-50",
      ring: "ring-green-200",
      title: "Payment Successful!",
      sub: appointmentId
        ? `Appointment #${appointmentId} confirmed. Redirecting to your appointments in ${countdown}s…`
        : `Payment successful! Redirecting in ${countdown}s…`,
    },
    cancel: {
      icon: "⚠️",
      color: "text-yellow-600",
      bg: "bg-yellow-50",
      ring: "ring-yellow-200",
      title: "Payment Cancelled",
      sub: "You cancelled the payment. Your appointment is not confirmed yet. You can complete payment from your appointments page.",
    },
    fail: {
      icon: "❌",
      color: "text-red-600",
      bg: "bg-red-50",
      ring: "ring-red-200",
      title: "Payment Failed",
      sub: error
        ? decodeURIComponent(error)
        : "An error occurred during payment. Please try again from your appointments page.",
    },
  }[status] || {
    icon: "❓",
    color: "text-gray-600",
    bg: "bg-gray-50",
    ring: "ring-gray-200",
    title: "Unknown Status",
    sub: "Could not determine payment status.",
  };

  const renderContent = () => (
    // pointer-events-none + select-none during success countdown → nothing is clickable
    <div
      className={`flex min-h-[70vh] items-center justify-center px-4 ${isSuccessState ? "pointer-events-none select-none" : ""}`}
    >
      <div className="w-full max-w-md">
        <div className="rounded-3xl border border-gray-100 bg-white p-10 text-center shadow-xl">
          {/* Icon */}
          <div
            className={`mx-auto mb-6 flex h-28 w-28 items-center justify-center rounded-full ${config.bg} ring-8 ${config.ring} text-6xl`}
          >
            {config.icon}
          </div>

          {/* Title */}
          <h2 className={`mb-3 text-3xl font-extrabold ${config.color}`}>
            {config.title}
          </h2>
          <p className="mb-8 text-gray-500 leading-relaxed">{config.sub}</p>

          {/* Progress bar */}
          {isSuccessState && (
            <div className="mb-8 h-2 w-full overflow-hidden rounded-full bg-gray-100">
              <div
                className="h-full rounded-full bg-green-500 transition-all duration-1000"
                style={{
                  width: `${((REDIRECT_DELAY - countdown) / REDIRECT_DELAY) * 100}%`,
                }}
              />
            </div>
          )}

          {/* Countdown badge */}
          {isSuccessState && (
            <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-green-50 border border-green-200 px-4 py-2">
              <svg className="h-4 w-4 animate-spin text-green-500" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              <span className="text-sm font-semibold text-green-700">
                Redirecting in {countdown}s…
              </span>
            </div>
          )}

          {/* Buttons — only shown on fail/cancel (success page is fully locked) */}
          {!isSuccessState && (
            <div className="flex flex-col gap-3">
              <button
                onClick={() =>
                  navigate(
                    isAuthenticated ? "/patient/appointments" : "/login",
                    { replace: true }
                  )
                }
                className="w-full rounded-xl bg-gradient-to-r from-primary-600 to-primary-500 py-3 font-semibold text-white shadow-md shadow-primary-500/25 transition hover:brightness-110"
              >
                {isAuthenticated ? "View My Appointments" : "Login to Continue"}
              </button>
              <button
                onClick={() => navigate("/")}
                className="w-full rounded-xl bg-gray-100 py-3 font-semibold text-gray-700 transition hover:bg-gray-200"
              >
                Return to Home
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  // Full-screen lock overlay on success so sidebar links, back button, etc. are all blocked
  const lockedWrapper = (children) =>
    isSuccessState ? (
      <div className="relative">
        {children}
        {/* Transparent full-screen overlay that swallows all pointer events */}
        <div className="fixed inset-0 z-50 cursor-not-allowed" />
      </div>
    ) : (
      children
    );

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        {lockedWrapper(renderContent())}
      </div>
    );
  }

  return (
    <DashboardLayout title="Payment Status" links={PATIENT_LINKS}>
      {lockedWrapper(renderContent())}
    </DashboardLayout>
  );
}
