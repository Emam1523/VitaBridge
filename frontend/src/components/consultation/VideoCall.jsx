import { useState, useEffect, useRef, useCallback } from "react";
import AgoraRTC from "agora-rtc-sdk-ng";

export default function VideoCall({ appId, channel, uid, token, onEnd }) {
  const [joined, setJoined] = useState(false);
  const [remoteUsers, setRemoteUsers] = useState([]);
  const [audioMuted, setAudioMuted] = useState(false);
  const [videoMuted, setVideoMuted] = useState(false);
  const [error, setError] = useState("");
  const [callDuration, setCallDuration] = useState(0);

  const clientRef = useRef(null);
  const localTracksRef = useRef({ audioTrack: null, videoTrack: null });
  const localVideoRef = useRef(null);
  const timerRef = useRef(null);
  const onEndRef = useRef(onEnd);
  const autoEndTimerRef = useRef(null);

  useEffect(() => {
    onEndRef.current = onEnd;
  }, [onEnd]);

  const cleanup = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (autoEndTimerRef.current) clearTimeout(autoEndTimerRef.current);
    localTracksRef.current.audioTrack?.close();
    localTracksRef.current.videoTrack?.close();
    clientRef.current?.leave().catch(() => {});
  }, []);

  useEffect(() => {
    if (!appId || !channel) {
      console.error("VideoCall Error: Missing appId or channel");
      return;
    }

    let isMounted = true;

    const client = AgoraRTC.createClient({ mode: "rtc", codec: "vp8" });
    clientRef.current = client;

    client.on("user-published", async (remoteUser, mediaType) => {
      await client.subscribe(remoteUser, mediaType);
      if (!isMounted) return;
      if (mediaType === "video") {
        setRemoteUsers(prev => {
          const filtered = prev.filter(u => u.uid !== remoteUser.uid);
          return [...filtered, remoteUser];
        });
      }
      if (mediaType === "audio") {
        remoteUser.audioTrack?.play();
      }
    });

    client.on("user-unpublished", (remoteUser, mediaType) => {
      if (mediaType === "video") {
        setRemoteUsers(prev => prev.filter(u => u.uid !== remoteUser.uid));
      }
    });

    client.on("user-left", (remoteUser) => {
      setRemoteUsers(prev => {
        const updated = prev.filter(u => u.uid !== remoteUser.uid);
        // If no remote users left, auto-end after 3s as fallback
        if (updated.length === 0) {
          if (autoEndTimerRef.current) clearTimeout(autoEndTimerRef.current);
          autoEndTimerRef.current = setTimeout(() => {
            if (isMounted) {
              cleanup();
              onEndRef.current();
            }
          }, 3000);
        }
        return updated;
      });
    });

    const joinChannel = async () => {
      try {
        await client.join(appId, channel, token || null, uid);
        if (!isMounted) return;

        const [audioTrack, videoTrack] = await AgoraRTC.createMicrophoneAndCameraTracks();
        if (!isMounted) {
          audioTrack.close();
          videoTrack.close();
          return;
        }
        
        localTracksRef.current = { audioTrack, videoTrack };

        if (localVideoRef.current) {
          videoTrack.play(localVideoRef.current);
        }

        await client.publish([audioTrack, videoTrack]);
        if (!isMounted) return;
        
        setJoined(true);

        // Start call timer
        timerRef.current = setInterval(() => {
          setCallDuration(prev => prev + 1);
        }, 1000);
      } catch (err) {
        if (!isMounted) return;
        if (err.code === "OPERATION_ABORTED") {
          return;
        }
        console.error("Failed to join video call:", err);
        if (err.code === "NOT_SUPPORTED" || err.message?.includes("getUserMedia")) {
          setError("Camera/microphone access is not supported. You must use the HTTPS ngrok URL (not http:// or a plain IP address). Open the app via your ngrok HTTPS link and try again.");
        } else if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
          setError("Camera/microphone permission denied. Please allow access in your browser settings.");
        } else if (err.name === "NotFoundError") {
          setError("No camera or microphone found on this device.");
        } else {
          setError(err.message || "Failed to start video call. Check camera/mic permissions.");
        }
      }
    };

    joinChannel();

    return () => {
      isMounted = false;
      cleanup();
    };
  }, [appId, channel, uid, token, cleanup]);

  // Play remote video when remote users update
  useEffect(() => {
    remoteUsers.forEach(user => {
      const el = document.getElementById(`remote-video-${user.uid}`);
      if (el && user.videoTrack) {
        user.videoTrack.play(el);
      }
    });
  }, [remoteUsers]);

  const handleEnd = () => {
    cleanup();
    onEnd();
  };

  const toggleAudio = () => {
    const track = localTracksRef.current.audioTrack;
    if (track) {
      track.setEnabled(audioMuted);
      setAudioMuted(!audioMuted);
    }
  };

  const toggleVideo = () => {
    const track = localTracksRef.current.videoTrack;
    if (track) {
      track.setEnabled(videoMuted);
      setVideoMuted(!videoMuted);
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
        <h4 className="text-lg font-bold text-red-900 mb-2">Video Call Failed</h4>
        <p className="text-red-700 text-sm mb-4">{error}</p>
        <button onClick={onEnd} className="rounded-lg bg-red-600 px-6 py-2 text-sm font-medium text-white hover:bg-red-700">
          Go Back
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-lg sm:rounded-2xl bg-gray-900 overflow-hidden relative">
      {/* Video Grid */}
      <div className="relative" style={{ minHeight: "250px", height: "clamp(250px, 60vh, 600px)" }}>
        {/* Remote Video (main) */}
        {remoteUsers.length > 0 ? (
          remoteUsers.map(user => (
            <div key={user.uid} id={`remote-video-${user.uid}`}
              className="w-full h-full absolute inset-0 bg-gray-800"
            />
          ))
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gray-800">
            <div className="text-center px-4">
              <div className="mx-auto w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-gray-700 flex items-center justify-center mb-3 sm:mb-4">
                <svg className="w-8 h-8 sm:w-10 sm:h-10 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <p className="text-gray-400 text-xs sm:text-sm">
                {joined ? "Waiting for the other person to join..." : "Connecting..."}
              </p>
            </div>
          </div>
        )}

        {/* Local Video (picture-in-picture) - smaller on mobile */}
        <div className="absolute bottom-2 right-2 sm:bottom-4 sm:right-4 w-24 h-20 sm:w-40 sm:h-30 rounded-lg sm:rounded-xl overflow-hidden bg-gray-700 shadow-lg border border-gray-600 sm:border-2">
          <div ref={localVideoRef} className="w-full h-full" />
          {videoMuted && (
            <div className="absolute inset-0 bg-gray-800 flex items-center justify-center">
              <svg className="w-6 h-6 sm:w-8 sm:h-8 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
          )}
        </div>

        {/* Call Duration Badge */}
        {joined && (
          <div className="absolute top-2 left-2 sm:top-4 sm:left-4 bg-black/60 backdrop-blur-sm rounded-full px-2.5 py-1 sm:px-3 sm:py-1.5 flex items-center gap-1.5 sm:gap-2">
            <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-green-500 animate-pulse" />
            <span className="text-white text-[10px] sm:text-xs font-mono">{formatTime(callDuration)}</span>
          </div>
        )}
      </div>

      {/* Controls - better touch targets on mobile */}
      <div className="flex items-center justify-center gap-3 sm:gap-4 py-3 sm:py-4 bg-gray-900 safe-bottom">
        <button onClick={toggleAudio}
          className={`touch-target w-12 h-12 sm:w-14 sm:h-14 rounded-full flex items-center justify-center transition ${
            audioMuted ? "bg-red-500 hover:bg-red-600" : "bg-gray-700 hover:bg-gray-600"
          }`}
          title={audioMuted ? "Unmute" : "Mute"}
        >
          {audioMuted ? (
            <svg className="w-5 h-5 sm:w-6 sm:h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
            </svg>
          ) : (
            <svg className="w-5 h-5 sm:w-6 sm:h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
            </svg>
          )}
        </button>

        <button onClick={toggleVideo}
          className={`touch-target w-12 h-12 sm:w-14 sm:h-14 rounded-full flex items-center justify-center transition ${
            videoMuted ? "bg-red-500 hover:bg-red-600" : "bg-gray-700 hover:bg-gray-600"
          }`}
          title={videoMuted ? "Turn on camera" : "Turn off camera"}
        >
          {videoMuted ? (
            <svg className="w-5 h-5 sm:w-6 sm:h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
            </svg>
          ) : (
            <svg className="w-5 h-5 sm:w-6 sm:h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          )}
        </button>

        <button onClick={handleEnd}
          className="touch-target w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-red-600 hover:bg-red-700 flex items-center justify-center transition shadow-lg shadow-red-500/30"
          title="End Call"
        >
          <svg className="w-6 h-6 sm:w-7 sm:h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 8l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2M5 3a2 2 0 00-2 2v1c0 8.284 6.716 15 15 15h1a2 2 0 002-2v-3.28a1 1 0 00-.684-.948l-4.493-1.498a1 1 0 00-1.21.502l-1.13 2.257a11.042 11.042 0 01-5.516-5.517l2.257-1.128a1 1 0 00.502-1.21L9.228 3.683A1 1 0 008.279 3H5z" />
          </svg>
        </button>
      </div>
    </div>
  );
}
