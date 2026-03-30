import { useState, useEffect } from "react";
import { useCall } from "../../context/useCall";
import { useNavigate } from "react-router-dom";
import { checkMediaSupport } from "../../utils/mediaCheck";

/**
 * Full-screen overlay shown when someone is calling.
 * Renders on top of everything via fixed positioning.
 */
export default function IncomingCallOverlay() {
  const { incomingCall, callAccepted, acceptCall, declineCall } = useCall();
  const navigate = useNavigate();
  const [pulse, setPulse] = useState(false);
  const [mediaError, setMediaError] = useState("");

  // Pulse animation
  useEffect(() => {
    if (!incomingCall) return;
    const interval = setInterval(() => setPulse((p) => !p), 600);
    return () => clearInterval(interval);
  }, [incomingCall]);

  // Try to play a ringtone sound (simple beep) — stop when accepted or dismissed
  useEffect(() => {
    if (!incomingCall || callAccepted) return;
    
    // Use AudioContext for a ringtone beep pattern
    let ctx;
    let stopped = false;
    let pendingTimer = null;

    const playRing = async () => {
      try {
        ctx = new (window.AudioContext || window.webkitAudioContext)();
        const playBeep = () => {
          if (stopped) return;
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = "sine";
          osc.frequency.value = 440;
          gain.gain.value = 0.3;
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start();
          setTimeout(() => {
            try { osc.stop(); } catch { /* already stopped */ }
            if (!stopped) pendingTimer = setTimeout(playBeep, 1000);
          }, 300);
        };
        playBeep();
      } catch {
        // AudioContext may not be available
      }
    };

    playRing();

    return () => {
      stopped = true;
      if (pendingTimer) clearTimeout(pendingTimer);
      try { ctx?.close(); } catch { /* already closed */ }
    };
  }, [incomingCall, callAccepted]);

  // Hide when there's no incoming call OR when the call has been accepted
  if (!incomingCall || callAccepted) return null;

  const isVideo = incomingCall.callType === "video";

  const handleAccept = () => {
    const { supported, reason } = checkMediaSupport();
    if (!supported) {
      setMediaError(reason);
      return;
    }
    acceptCall();
    // Navigate to the correct consultation page
    const aptId = incomingCall.appointmentId;
    if (incomingCall.callerRole === "PATIENT") {
      // Doctor receiving call from patient
      navigate(`/doctor/consultations/${aptId}`);
    } else {
      // Patient receiving call from doctor
      navigate(`/patient/consultation/${aptId}`);
    }
  };

  const handleDecline = () => {
    declineCall();
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="w-full max-w-sm mx-4">
        <div className="rounded-3xl bg-gradient-to-br from-gray-900 to-gray-800 p-8 text-center shadow-2xl border border-gray-700">
          {/* Pulsing avatar */}
          <div className="relative mx-auto mb-6">
            <div
              className={`absolute inset-0 rounded-full transition-all duration-500 ${
                pulse ? "scale-125 opacity-30" : "scale-100 opacity-0"
              }`}
              style={{
                background: isVideo
                  ? "radial-gradient(circle, rgba(59,130,246,0.5), transparent)"
                  : "radial-gradient(circle, rgba(34,197,94,0.5), transparent)",
                width: "96px",
                height: "96px",
                margin: "0 auto",
              }}
            />
            <div
              className={`relative mx-auto w-24 h-24 rounded-full flex items-center justify-center text-4xl font-bold text-white ${
                isVideo ? "bg-primary-600" : "bg-green-600"
              }`}
            >
              {(incomingCall.callerName || "?")[0].toUpperCase()}
            </div>
          </div>

          {/* Caller info */}
          <h3 className="text-xl font-bold text-white mb-1">
            {incomingCall.callerName || "Unknown"}
          </h3>
          <p className="text-gray-400 text-sm mb-1">
            {incomingCall.callerRole === "PATIENT" ? "Patient" : "Doctor"}
          </p>
          <p className="text-gray-500 text-xs mb-4">
            Incoming {isVideo ? "Video" : "Audio"} Call...
          </p>

          {mediaError && (
            <div className="mb-4 rounded-lg bg-red-900/50 border border-red-500/50 px-4 py-3">
              <p className="text-red-300 text-xs">{mediaError}</p>
            </div>
          )}

          {/* Accept / Decline buttons */}
          <div className="flex items-center justify-center gap-8">
            {/* Decline */}
            <button
              onClick={handleDecline}
              className="group flex flex-col items-center gap-2"
            >
              <div className="w-16 h-16 rounded-full bg-red-600 hover:bg-red-700 flex items-center justify-center transition shadow-lg shadow-red-600/30 active:scale-95">
                <svg
                  className="w-8 h-8 text-white rotate-[135deg]"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                  />
                </svg>
              </div>
              <span className="text-xs text-gray-400">Decline</span>
            </button>

            {/* Accept */}
            <button
              onClick={handleAccept}
              className="group flex flex-col items-center gap-2"
            >
              <div
                className={`w-16 h-16 rounded-full flex items-center justify-center transition shadow-lg active:scale-95 ${
                  isVideo
                    ? "bg-primary-600 hover:bg-primary-700 shadow-primary-600/30"
                    : "bg-green-600 hover:bg-green-700 shadow-green-600/30"
                }`}
              >
                {isVideo ? (
                  <svg
                    className="w-8 h-8 text-white"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
                    />
                  </svg>
                ) : (
                  <svg
                    className="w-8 h-8 text-white"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                    />
                  </svg>
                )}
              </div>
              <span className="text-xs text-gray-400">Accept</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
