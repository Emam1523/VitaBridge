import { useState, useEffect, useRef } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthenticationContext";
import { useNotifications } from "../../context/useNotifications";
import Logo from "../../assets/icon/Logo.jpeg";

// ─── Notification Bell (patients only) ────────────────────────────────────────
function NotificationBell() {
  const { notifications, unreadCount, markAllRead, clearAll } = useNotifications() ?? {};
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  // Close on outside click
  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const toggle = () => {
    setOpen((v) => !v);
    if (!open) markAllRead?.();
  };

  return (
    <div ref={ref} className="relative z-[120]">
      <button
        onClick={toggle}
        className="relative flex h-9 w-9 items-center justify-center rounded-full text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors"
        aria-label="Notifications"
      >
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white ring-2 ring-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-[9998] bg-black/25 backdrop-blur-[1px]" onClick={() => setOpen(false)} />
          <div className="fixed right-4 top-16 z-[9999] w-[22rem] max-w-[calc(100vw-2rem)] rounded-2xl border border-gray-200 bg-white/100 ring-1 ring-black/5 shadow-2xl shadow-gray-400/70 sm:right-6 sm:top-20">
            <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
              <h3 className="text-sm font-semibold text-gray-900">Notifications</h3>
              {notifications?.length > 0 && (
                <button onClick={clearAll} className="text-xs text-gray-400 hover:text-red-500 transition-colors">
                  Clear all
                </button>
              )}
            </div>
            <div className="max-h-72 overflow-y-auto">
              {!notifications?.length ? (
                <div className="px-4 py-8 text-center">
                  <div className="mx-auto mb-2 text-2xl">🔔</div>
                  <p className="text-sm text-gray-400">No notifications yet</p>
                </div>
              ) : (
                notifications.map((n) => (
                  <div key={n.id}
                    className={`border-b border-gray-50 px-4 py-3 last:border-0 ${n.type === "YOUR_TURN" ? "bg-green-50" : ""}`}>
                    <p className={`text-sm font-medium leading-snug ${n.type === "YOUR_TURN" ? "text-green-800" : "text-gray-800"}`}>
                      {n.message}
                    </p>
                    <p className="mt-0.5 text-xs text-gray-400">{n.ts}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ─── Toast pop-up for newest notification ─────────────────────────────────────
function NotificationToast() {
  const { notifications } = useNotifications() ?? {};
  const [dismissedId, setDismissedId] = useState(null);
  const latest = notifications?.[0] ?? null;

  useEffect(() => {
    if (!latest || latest.id === dismissedId) return;
    const t = setTimeout(() => setDismissedId(latest.id), 6000);
    return () => clearTimeout(t);
  }, [latest, dismissedId]);

  const visible = latest && latest.id !== dismissedId ? latest : null;

  if (!visible) return null;

  return (
    <div
      className={`fixed bottom-6 right-6 z-50 w-80 rounded-2xl px-4 py-4 shadow-xl shadow-gray-300/40 transition-all ${
        visible.type === "YOUR_TURN"
          ? "border border-green-200 bg-green-50"
          : "border border-blue-100 bg-white"
      }`}
    >
      <div className="flex items-start gap-3">
        <div className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-base ${
          visible.type === "YOUR_TURN" ? "bg-green-200 text-green-800" : "bg-blue-100 text-blue-700"
        }`}>
          {visible.type === "YOUR_TURN" ? "🎉" : "🔔"}
        </div>
        <div className="flex-1">
          <p className={`text-sm font-semibold ${visible.type === "YOUR_TURN" ? "text-green-900" : "text-gray-900"}`}>
            {visible.type === "YOUR_TURN" ? "It's your turn!" : "Queue Update"}
          </p>
          <p className={`mt-0.5 text-sm leading-snug ${visible.type === "YOUR_TURN" ? "text-green-800" : "text-gray-600"}`}>
            {visible.message}
          </p>
        </div>
        <button onClick={() => setDismissedId(visible.id)}
          className="shrink-0 text-gray-300 hover:text-gray-500 transition-colors mt-0.5">
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
}

// ─── DashboardLayout ──────────────────────────────────────────────────────────
export default function DashboardLayout({ title, links, children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const notifCtx = useNotifications();
  const isPatient = user?.role === "PATIENT";
  const isAdmin = user?.role === "ADMIN";

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const initials = (user?.name || "U")
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const avatarUrl = user?.profileImageUrl || null;

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-gray-900/40 backdrop-blur-sm lg:hidden transition-opacity"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-72 transform transition-transform duration-300 ease-out lg:static lg:translate-x-0 ${
          isSidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex h-full flex-col bg-white border-r border-gray-100">
          {/* Logo Area */}
          <div className="flex h-16 items-center gap-2.5 px-6 border-b border-gray-100">
            <div className="relative">
              <img
                src={Logo}
                alt="VitaBridge Logo"
                className="h-9 w-9 rounded-xl object-cover ring-2 ring-primary-200"
              />
            </div>
            <span className="text-lg font-bold text-gradient">VitaBridge</span>
          </div>

          {/* User Info */}
          <div className="p-5 border-b border-gray-100">
            <div className="flex items-center gap-3 rounded-xl bg-gray-50 p-3">
                <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-primary-500 to-primary-600 text-white text-sm font-bold shadow-md shadow-primary-200/50">
                  {avatarUrl ? (
                    <img src={avatarUrl} alt={user?.name || "Profile"} className="h-full w-full object-cover" />
                  ) : (
                    initials
                  )}
                </div>
              <div className="overflow-hidden flex-1">
                <p className="truncate text-sm font-semibold text-gray-900">{user?.name}</p>
                <p className="truncate text-xs text-gray-500 capitalize">{user?.role?.toLowerCase()}</p>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto px-4 py-4">
            <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-wider text-gray-400">Menu</p>
            <ul className="space-y-1">
              {links.map((link) => {
                const isActive = location.pathname === link.to;
                return (
                  <li key={link.to}>
                    <Link
                      to={link.to}
                      onClick={() => setIsSidebarOpen(false)}
                      className={`group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200 ${
                        isActive
                          ? "bg-primary-50 text-primary-700 shadow-sm"
                          : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                      }`}
                    >
                      <span className={`transition-colors ${isActive ? "text-primary-600" : "text-gray-400 group-hover:text-gray-600"}`}>
                        {link.icon}
                      </span>
                      {link.label}
                      {isActive && (
                        <span className="ml-auto h-1.5 w-1.5 rounded-full bg-primary-500" />
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>

          {/* Logout Button */}
          <div className="border-t border-gray-100 p-4">
            <button
              onClick={handleLogout}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-gray-500 transition-all duration-200 hover:bg-red-50 hover:text-red-600"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              Sign out
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Header */}
        <header className="flex h-16 items-center justify-between border-b border-gray-100 bg-white/80 backdrop-blur-xl px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="rounded-xl p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-700 lg:hidden transition-colors"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
              </svg>
            </button>
            <h1 className="text-lg font-semibold text-gray-900">{title}</h1>
          </div>

          <div className="flex items-center gap-2">
            {/* Notification bell — patients and admins */}
            {(isPatient || isAdmin) && notifCtx && <NotificationBell />}

            <div className="h-8 w-8 flex items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-primary-500 to-primary-600 text-white text-xs font-bold shadow-sm shadow-primary-200/50 select-none">
              {avatarUrl ? (
                <img src={avatarUrl} alt={user?.name || "Profile"} className="h-full w-full object-cover" />
              ) : (
                (user?.name || "U").split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase()
              )}
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          {children}
        </main>
      </div>

      {/* Queue notification toast — patients only */}
      {isPatient && notifCtx && <NotificationToast />}
    </div>
  );
}
