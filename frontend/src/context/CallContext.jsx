import { useState, useEffect, useCallback, useRef } from "react";
import { useAuth } from "./AuthenticationContext";
import {
  connectWebSocket,
  disconnectWebSocket,
  subscribe,
  unsubscribe,
  send,
} from "../api/wsClient";
import { CallContext } from "./callContextValue";

/**
 * Wraps the app and maintains a WebSocket connection for call signaling.
 * Provides:
 *  - incomingCall   – data about an incoming call (or null)
 *  - outgoingCall   – data about an outgoing call (or null)
 *  - initiateCall(appointmentId, callType)
 *  - acceptCall()
 *  - declineCall()
 *  - endCall()
 *  - callAccepted   – boolean, true when remote accepted
 */
export function CallProvider({ children }) {
  const { token } = useAuth();
  const [incomingCall, setIncomingCall] = useState(null);
  const [outgoingCall, setOutgoingCall] = useState(null);
  const [callAccepted, setCallAccepted] = useState(false);
  const [callEndedByRemote, setCallEndedByRemote] = useState(false);
  const timeoutRef = useRef(null);

  // ---- WebSocket lifecycle ----
  useEffect(() => {
    if (!token) return;
    connectWebSocket(token);

    // Incoming call
    subscribe("incoming-call", "/user/queue/incoming-call", (data) => {
      setIncomingCall(data);
      // Auto-dismiss after 30s if not answered
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => {
        setIncomingCall(null);
      }, 30000);
    });

    // Call accepted by callee
    subscribe("call-accepted", "/user/queue/call-accepted", () => {
      setCallAccepted(true);
    });

    // Call declined by callee
    subscribe("call-declined", "/user/queue/call-declined", () => {
      setOutgoingCall(null);
      setCallAccepted(false);
    });

    // Call ended by either party
    subscribe("call-ended", "/user/queue/call-ended", () => {
      setCallEndedByRemote(true);
      setIncomingCall(null);
      setOutgoingCall(null);
      setCallAccepted(false);
    });

    return () => {
      unsubscribe("incoming-call");
      unsubscribe("call-accepted");
      unsubscribe("call-declined");
      unsubscribe("call-ended");
      disconnectWebSocket();
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [token]);

  // ---- Actions ----
  const initiateCall = useCallback(
    (appointmentId, callType) => {
      setOutgoingCall({ appointmentId, callType });
      setCallAccepted(false);
      send("/app/call.initiate", { appointmentId, callType });
    },
    []
  );

  const acceptCall = useCallback(() => {
    if (!incomingCall) return;
    send("/app/call.accept", { appointmentId: incomingCall.appointmentId });
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    // Keep incomingCall data so the component can open the call
    setCallAccepted(true);
  }, [incomingCall]);

  const declineCall = useCallback(() => {
    if (!incomingCall) return;
    send("/app/call.decline", { appointmentId: incomingCall.appointmentId });
    setIncomingCall(null);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
  }, [incomingCall]);

  const endCall = useCallback(() => {
    const aptId = incomingCall?.appointmentId || outgoingCall?.appointmentId;
    if (aptId) {
      send("/app/call.end", { appointmentId: aptId });
    }
    setIncomingCall(null);
    setOutgoingCall(null);
    setCallAccepted(false);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
  }, [incomingCall, outgoingCall]);

  const clearIncoming = useCallback(() => {
    setIncomingCall(null);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
  }, []);

  const resetCallEnded = useCallback(() => {
    setCallEndedByRemote(false);
  }, []);

  return (
    <CallContext.Provider
      value={{
        incomingCall,
        outgoingCall,
        callAccepted,
        callEndedByRemote,
        initiateCall,
        acceptCall,
        declineCall,
        endCall,
        clearIncoming,
        resetCallEnded,
      }}
    >
      {children}
    </CallContext.Provider>
  );
}
