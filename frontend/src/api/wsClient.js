import { Client } from "@stomp/stompjs";
import { getApiBaseUrl } from "./httpClient";

let stompClient = null;
const subscribers = new Map(); // key -> { destination, callback, subscription }

/**
 * Connect to the WebSocket server with JWT auth.
 * @param {string} token – JWT bearer token
 * @param {function} onConnect – optional callback when connected
 */
export function connectWebSocket(token, onConnect) {
  if (stompClient?.connected) {
    onConnect?.();
    return;
  }

  // Deactivate any existing non-connected client to avoid orphaned connections
  if (stompClient) {
    try { stompClient.deactivate(); } catch { /* ignore */ }
    stompClient = null;
  }

  // Derive native WS URL.
  // When API base is relative ("/api"), use window.location.origin so the WS
  // connection goes to the same host (works through Vite proxy AND ngrok).
  const apiBase = getApiBaseUrl();
  const httpBase = apiBase.startsWith("http")
    ? apiBase.replace(/\/api\/?$/, "")
    : window.location.origin;
  const wsUrl = httpBase.replace(/^http/, "ws") + "/ws";

  stompClient = new Client({
    brokerURL: wsUrl,
    connectHeaders: {
      Authorization: `Bearer ${token}`,
    },
    reconnectDelay: 2000,
    heartbeatIncoming: 10000,
    heartbeatOutgoing: 10000,
    onConnect: () => {
      // Re-subscribe any existing subscribers (after reconnect)
      for (const [_, entry] of subscribers.entries()) {
        entry.subscription = stompClient.subscribe(
          entry.destination,
          (message) => entry.callback(JSON.parse(message.body))
        );
      }
      onConnect?.();
    },
    onStompError: (frame) => {
      console.error("[WS] STOMP error", frame.headers?.message);
    },
    onWebSocketClose: () => {},
    onDisconnect: () => {},
  });

  stompClient.activate();
}

/**
 * Subscribe to a user destination.
 * @param {string} key – a unique key for this subscription
 * @param {string} destination – e.g. "/user/queue/incoming-call"
 * @param {function} callback – receives parsed JSON body
 */
export function subscribe(key, destination, callback) {
  const entry = { destination, callback, subscription: null };

  if (stompClient?.connected) {
    entry.subscription = stompClient.subscribe(destination, (message) =>
      callback(JSON.parse(message.body))
    );
  }

  subscribers.set(key, entry);
}

/**
 * Unsubscribe by key.
 */
export function unsubscribe(key) {
  const entry = subscribers.get(key);
  if (entry?.subscription) {
    entry.subscription.unsubscribe();
  }
  subscribers.delete(key);
}

/**
 * Send a message to the server.
 * @param {string} destination – e.g. "/app/call.initiate"
 * @param {object} body – JSON payload
 */
export function send(destination, body) {
  if (!stompClient?.connected) return;
  stompClient.publish({
    destination,
    body: JSON.stringify(body),
  });
}

/**
 * Disconnect from the WebSocket server.
 */
export function disconnectWebSocket() {
  for (const [key] of subscribers) {
    unsubscribe(key);
  }
  stompClient?.deactivate();
  stompClient = null;
}
