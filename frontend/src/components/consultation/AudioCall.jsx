import { useState, useEffect, useRef, useCallback } from "react";
import AgoraRTC from "agora-rtc-sdk-ng";

const WAVE_STYLES = [1, 2, 3, 4, 5, 6, 7].map(i => ({
  height: `${12 + Math.random() * 24}px`,
  animationDelay: `${i * 0.1}s`,
  animationDuration: `${0.4 + Math.random() * 0.4}s`,
}));

export default function AudioCall({ appId, channel, uid, token, remoteName, onEnd }) {
  const [joined, setJoined] = useState(false);
  const [audioMuted, setAudioMuted] = useState(false);
  const [remoteJoined, setRemoteJoined] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [error, setError] = useState("");

  const clientRef = useRef(null);
  const localTrackRef = useRef(null);
  const timerRef = useRef(null);
  const onEndRef = useRef(onEnd);
  const autoEndTimerRef = useRef(null);

  useEffect(() => {
    onEndRef.current = onEnd;
  }, [onEnd]);

  const cleanup = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (autoEndTimerRef.current) clearTimeout(autoEndTimerRef.current);
    localTrackRef.current?.close();
    clientRef.current?.leave().catch(() => {});
  }, []);

  useEffect(() => {
    if (!appId || !channel) return;

    let isMounted = true;

    const client = AgoraRTC.createClient({ mode: "rtc", codec: "vp8" });
    clientRef.current = client;

    client.on("user-published", async (remoteUser, mediaType) => {
      await client.subscribe(remoteUser, mediaType);
      if (!isMounted) return;
      if (mediaType === "audio") {
        remoteUser.audioTrack?.play();
        setRemoteJoined(true);
      }
    });

    client.on("user-left", () => {
      setRemoteJoined(false);
      // Remote user left Agora — auto-end after 3s if STOMP signal hasn't already ended it
      if (autoEndTimerRef.current) clearTimeout(autoEndTimerRef.current);
      autoEndTimerRef.current = setTimeout(() => {
        if (isMounted) {
          cleanup();
          onEndRef.current();
        }
      }, 3000);
    });

    const joinChannel = async () => {
      try {
        await client.join(appId, channel, token || null, uid);
        if (!isMounted) return;

        const audioTrack = await AgoraRTC.createMicrophoneAudioTrack();
        if (!isMounted) {
            audioTrack.close();
            return;
        }

        localTrackRef.current = audioTrack;
        await client.publish([audioTrack]);
        if (!isMounted) return;

        setJoined(true);

        timerRef.current = setInterval(() => {
          setCallDuration(prev => prev + 1);
        }, 1000);
      } catch (err) {
        if (!isMounted) return;
        if (err.code === "OPERATION_ABORTED") {
            return;
        }
        console.error("Failed to join audio call:", err);
        if (err.code === "NOT_SUPPORTED" || err.message?.includes("getUserMedia")) {
          setError("Microphone access is not supported. You must use the HTTPS ngrok URL (not http:// or a plain IP address). Open the app via your ngrok HTTPS link and try again.");
        } else if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
          setError("Microphone permission denied. Please allow access in your browser settings.");
        } else if (err.name === "NotFoundError") {
          setError("No microphone found on this device.");
        } else {
          setError(err.message || "Failed to start audio call. Check microphone permissions.");
        }
      }
    };

    joinChannel();

    return () => {
        isMounted = false;
        cleanup();
    };
  }, [appId, channel, uid, token, cleanup]);

  const handleEnd = () => {
    cleanup();
    onEnd();
  };

  const toggleAudio = () => {
    const track = localTrackRef.current;
    if (track) {
      track.setEnabled(audioMuted);
      setAudioMuted(!audioMuted);
    }
  };

  const formatTime = (s) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")}`;
  };

  if (error) {
    return (
      <div className="rounded-2xl bg-red-50 border border-red-200 p-8 text-center">
        <div className="mx-auto w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mb-4">
          <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
        </div>
        <h4 className="text-lg font-bold text-red-900 mb-2">Audio Call Failed</h4>
        <p className="text-red-700 text-sm mb-4">{error}</p>
        <button onClick={onEnd} className="rounded-lg bg-red-600 px-6 py-2 text-sm font-medium text-white hover:bg-red-700">
          Go Back
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-lg sm:rounded-2xl bg-gradient-to-br from-green-600 to-teal-700 p-6 sm:p-8 text-center">
      {/* Avatar */}
      <div className="mx-auto w-24 h-24 sm:w-28 sm:h-28 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center mb-3 sm:mb-4">
        <span className="text-4xl sm:text-5xl font-bold text-white">
          {(remoteName || "D")[0].toUpperCase()}
        </span>
      </div>

      <h4 className="text-lg sm:text-xl font-bold text-white mb-1">{remoteName || "Doctor"}</h4>
      <p className="text-green-200 text-xs sm:text-sm mb-2">
        {!joined ? "Connecting..." : remoteJoined ? "Connected" : "Calling..."}
      </p>

      {/* Duration */}
      {joined && (
        <div className="inline-flex items-center gap-1.5 sm:gap-2 bg-black/20 rounded-full px-3 py-1 sm:px-4 sm:py-1.5 mb-6 sm:mb-8">
          <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-green-400 animate-pulse" />
          <span className="text-white text-xs sm:text-sm font-mono">{formatTime(callDuration)}</span>
        </div>
      )}

      {/* Sound wave animation */}
      {joined && remoteJoined && (
        <div className="flex items-center justify-center gap-0.5 sm:gap-1 mb-6 sm:mb-8 h-8">
          {WAVE_STYLES.map((style, i) => (
            <div key={i} className="w-1 bg-white/60 rounded-full animate-pulse"
              style={style}
            />
          ))}
        </div>
      )}

      {/* Controls */}
      <div className="flex items-center justify-center gap-4 sm:gap-6 mt-4 sm:mt-6 safe-bottom">
        <button onClick={toggleAudio}
          className={`touch-target w-14 h-14 sm:w-16 sm:h-16 rounded-full flex items-center justify-center transition shadow-lg ${
            audioMuted ? "bg-red-500 hover:bg-red-600 shadow-red-500/30" : "bg-white/20 hover:bg-white/30 backdrop-blur-sm"
          }`}
          title={audioMuted ? "Unmute" : "Mute"}
        >
          {audioMuted ? (
            <svg className="w-6 h-6 sm:w-7 sm:h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
            </svg>
          ) : (
            <svg className="w-6 h-6 sm:w-7 sm:h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
            </svg>
          )}
        </button>

        <button onClick={handleEnd}
          className="touch-target w-16 h-16 sm:w-18 sm:h-18 rounded-full bg-red-600 hover:bg-red-700 flex items-center justify-center transition shadow-lg shadow-red-500/40"
          title="End Call"
        >
          <svg className="w-7 h-7 sm:w-8 sm:h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 8l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2M5 3a2 2 0 00-2 2v1c0 8.284 6.716 15 15 15h1a2 2 0 002-2v-3.28a1 1 0 00-.684-.948l-4.493-1.498a1 1 0 00-1.21.502l-1.13 2.257a11.042 11.042 0 01-5.516-5.517l2.257-1.128a1 1 0 00.502-1.21L9.228 3.683A1 1 0 008.279 3H5z" />
          </svg>
        </button>
      </div>
    </div>
  );
}
