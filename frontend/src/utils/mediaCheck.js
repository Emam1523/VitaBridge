/**
 * Checks whether the browser supports camera/mic access (getUserMedia).
 * This requires a secure context (HTTPS or localhost).
 *
 * @returns {{ supported: boolean, reason?: string }}
 */
export function checkMediaSupport() {
  const isSecure =
    window.isSecureContext ||
    location.protocol === "https:" ||
    location.hostname === "localhost" ||
    location.hostname === "127.0.0.1";

  if (!isSecure) {
    return {
      supported: false,
      reason:
        "Camera/microphone access requires HTTPS. " +
        "You are currently on an insecure (HTTP) connection. " +
        "Please access the app through the HTTPS ngrok URL instead of a plain IP address.",
    };
  }

  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    return {
      supported: false,
      reason:
        "Your browser does not support camera/microphone access. " +
        "Please use a modern browser (Chrome, Edge, Firefox, Safari) and make sure you are on HTTPS.",
    };
  }

  return { supported: true };
}
