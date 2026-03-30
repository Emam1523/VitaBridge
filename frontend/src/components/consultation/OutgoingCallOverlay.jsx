import { useEffect, useState } from "react";
import { useCall } from "../../context/useCall";

/**
 * Overlay shown to the CALLER while waiting for the callee to accept/decline.
 */
export default function OutgoingCallOverlay() {
  const { outgoingCall, callAccepted, endCall } = useCall();
  const [dots, setDots] = useState("");

  useEffect(() => {
    if (!outgoingCall || callAccepted) return;
    const interval = setInterval(() => {
      setDots((d) => (d.length >= 3 ? "" : d + "."));
    }, 500);
    return () => clearInterval(interval);
  }, [outgoingCall, callAccepted]);

  // Don't show if there's no outgoing call or if already accepted
  if (!outgoingCall || callAccepted) return null;

  const isVideo = outgoingCall.callType === "video";

  return (
    <div className="fixed inset-0 z-[9998] flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-xs mx-4">
        <div className="rounded-3xl bg-gradient-to-br from-gray-900 to-gray-800 p-8 text-center shadow-2xl border border-gray-700">
          {/* Animated ring */}
          <div className="relative mx-auto mb-6">
            <div className="mx-auto w-20 h-20 rounded-full border-4 border-dashed animate-spin-slow"
              style={{ borderColor: isVideo ? "#3b82f6" : "#22c55e", animationDuration: "3s" }} />
            <div className="absolute inset-0 flex items-center justify-center">
              {isVideo ? (
                <svg className="w-8 h-8 text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              ) : (
                <svg className="w-8 h-8 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
              )}
            </div>
          </div>

          <h3 className="text-lg font-bold text-white mb-1">
            Calling{dots}
          </h3>
          <p className="text-gray-400 text-sm mb-6">
            Waiting for the other party to answer
          </p>

          {/* Cancel button */}
          <button
            onClick={endCall}
            className="w-14 h-14 mx-auto rounded-full bg-red-600 hover:bg-red-700 flex items-center justify-center transition shadow-lg shadow-red-600/30 active:scale-95"
          >
            <svg className="w-7 h-7 text-white rotate-[135deg]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
            </svg>
          </button>
          <p className="text-xs text-gray-500 mt-3">Tap to cancel</p>
        </div>
      </div>

      <style>{`
        @keyframes spin-slow {
          to { transform: rotate(360deg); }
        }
        .animate-spin-slow {
          animation: spin-slow 3s linear infinite;
        }
      `}</style>
    </div>
  );
}
