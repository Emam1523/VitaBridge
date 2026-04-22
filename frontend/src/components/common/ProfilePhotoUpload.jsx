import { useState, useEffect, useRef } from "react";
import { useAuth } from "../../context/AuthenticationContext";

/**
 * Drop-in avatar circle for profile headers.
 * Clicking the circle opens the file-picker; a small "Remove" link appears below when a photo is set.
 *
 * Props:
 *  initial  – single letter fallback (e.g. "S")
 *  rounded  – "full" (default) | "2xl"  — matches the shape of the surrounding header
 *  gradient – true uses the admin/assistant gradient bg; false uses solid primary-600
 */
export default function ProfileAvatar({ initial = "U", rounded = "full", gradient = false }) {
  const { token, updateUser } = useAuth();
  const inputRef = useRef(null);

  const [photoUrl, setPhotoUrl] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [error, setError] = useState("");

  const roundedCls = rounded === "2xl" ? "rounded-2xl" : "rounded-full";
  const bgCls = gradient
    ? "bg-gradient-to-br from-primary-600 to-primary-500 shadow-lg shadow-primary-500/25"
    : "bg-primary-600";

  useEffect(() => {
    if (!token) return;
    fetch("/api/user/photo", { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((d) => setPhotoUrl(d.profileImageUrl || null))
      .catch(() => {});
  }, [token]);

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) { setError("Only image files allowed."); return; }
    if (file.size > 5 * 1024 * 1024) { setError("Max 5 MB."); return; }
    setError("");
    setUploading(true);
    try {
      const form = new FormData();
      form.append("photo", file);
      const res = await fetch("/api/user/photo", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: form,
      });
      if (!res.ok) throw new Error("Upload failed");
      const data = await res.json();
      setPhotoUrl(data.profileImageUrl);
      updateUser?.({ profileImageUrl: data.profileImageUrl });
    } catch (err) {
      setError(err.message || "Upload failed.");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const handleRemove = async () => {
    setError("");
    setRemoving(true);
    try {
      const res = await fetch("/api/user/photo", {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Remove failed");
      setPhotoUrl(null);
      updateUser?.({ profileImageUrl: null });
    } catch (err) {
      setError(err.message || "Could not remove.");
    } finally {
      setRemoving(false);
    }
  };

  return (
    <div className="flex flex-col items-center gap-1 shrink-0">
      {/* Clickable circle */}
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        disabled={uploading || removing}
        title="Click to change photo"
        className={`relative flex h-16 w-16 items-center justify-center ${roundedCls} overflow-hidden focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 disabled:cursor-wait ${!photoUrl ? bgCls : ""}`}
      >
        {photoUrl ? (
          <img src={photoUrl} alt="Profile" className="h-full w-full object-cover" />
        ) : (
          <span className="text-2xl font-bold text-white select-none">{initial}</span>
        )}

        {/* Hover / loading overlay */}
        {(hovered || uploading) && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/40">
            {uploading ? (
              <svg className="h-5 w-5 animate-spin text-white" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            ) : (
              <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            )}
          </div>
        )}
      </button>

      <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />

      {/* Remove link */}
      {photoUrl && !uploading && (
        <button
          type="button"
          onClick={handleRemove}
          disabled={removing}
          className="text-[10px] leading-none text-red-500 hover:text-red-700 underline underline-offset-2 transition disabled:opacity-50"
        >
          {removing ? "…" : "Remove"}
        </button>
      )}

      {error && (
        <p className="mt-0.5 max-w-[80px] text-center text-[10px] leading-tight text-red-600">{error}</p>
      )}
    </div>
  );
}
