import { useState, useEffect } from "react";
import DashboardLayout from "../common/DashboardLayout";
import { useAuth } from "../../context/AuthenticationContext";
import { ADMIN_LINKS } from "./adminLinks";
import { apiRequest } from "../../api/httpClient";

export default function AdminComplaints() {
  const { token } = useAuth();
  const [complaints, setComplaints] = useState([]);
  const [stats, setStats] = useState({ total: 0, pending: 0, reviewed: 0 });
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("ALL");
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);

  const fetchAll = async () => {
    try {
      const [data, s] = await Promise.all([
        apiRequest("/complaints", { token }),
        apiRequest("/complaints/stats", { token }),
      ]);
      setComplaints(Array.isArray(data) ? data : []);
      setStats(s);
    } catch { /* silent */ }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchAll(); }, [token]); // eslint-disable-line react-hooks/exhaustive-deps

  const markReviewed = async (id) => {
    try {
      const updated = await apiRequest(`/complaints/${id}/review`, { method: "PATCH", token });
      setComplaints((prev) => prev.map((c) => (c.id === id ? updated : c)));
      setStats((s) => ({ ...s, pending: s.pending - 1, reviewed: s.reviewed + 1 }));
    } catch { /* silent */ }
  };

  const deleteComplaint = async (id) => {
    try {
      await apiRequest(`/complaints/${id}`, { method: "DELETE", token });
      setComplaints((prev) => prev.filter((c) => c.id !== id));
      setStats((s) => ({ ...s, total: s.total - 1 }));
      setConfirmDeleteId(null);
    } catch { /* silent */ }
  };

  const filtered = complaints.filter((c) => {
    const matchFilter = filter === "ALL" || c.status === filter;
    const q = search.toLowerCase();
    const matchSearch = !q || c.patientName?.toLowerCase().includes(q) || c.title?.toLowerCase().includes(q);
    return matchFilter && matchSearch;
  });

  return (
    <DashboardLayout title="Complaints & Feedback" links={ADMIN_LINKS}>
      <div className="space-y-6">

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: "Total", value: stats.total, color: "bg-blue-50 text-blue-700" },
            { label: "Pending", value: stats.pending, color: "bg-amber-50 text-amber-700" },
            { label: "Reviewed", value: stats.reviewed, color: "bg-green-50 text-green-700" },
          ].map((s) => (
            <div key={s.label} className={`rounded-2xl p-5 text-center ${s.color}`}>
              <p className="text-2xl font-bold">{s.value}</p>
              <p className="text-sm font-medium mt-1">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3 rounded-2xl bg-white p-4 shadow-sm border border-gray-100">
          <input
            type="text"
            placeholder="Search by patient or subject…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 min-w-48 rounded-xl border border-gray-200 px-4 py-2 text-sm outline-none focus:border-primary-500 focus:ring-4 focus:ring-primary-500/10"
          />
          {["ALL", "PENDING", "REVIEWED"].map((f) => (
            <button key={f} onClick={() => setFilter(f)}
              className={`rounded-full px-4 py-1.5 text-xs font-semibold transition ${
                filter === f ? "bg-primary-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}>
              {f === "ALL" ? "All" : f === "PENDING" ? "Pending" : "Reviewed"}
            </button>
          ))}
        </div>

        {/* List */}
        {loading ? (
          <div className="flex justify-center py-16">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-600 border-t-transparent" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center">
            <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-gray-100 text-2xl">💬</div>
            <p className="font-medium text-gray-500">No complaints found</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((c) => (
              <div key={c.id} className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
                <div className="flex flex-wrap items-start gap-3 justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-gray-900">{c.title}</span>
                      <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                        c.status === "REVIEWED" ? "bg-green-50 text-green-700" : "bg-amber-50 text-amber-700"
                      }`}>
                        {c.status === "REVIEWED" ? "Reviewed" : "Pending"}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-gray-500">
                      {c.patientName} · {c.patientEmail} · {c.createdAt?.replace("T", " ")}
                    </p>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <button onClick={() => setExpanded(expanded === c.id ? null : c.id)}
                      className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 transition">
                      {expanded === c.id ? "Collapse" : "View"}
                    </button>
                    {c.status === "PENDING" && (
                      <button onClick={() => markReviewed(c.id)}
                        className="rounded-lg bg-green-50 border border-green-200 px-3 py-1.5 text-xs font-medium text-green-700 hover:bg-green-100 transition">
                        Mark Reviewed
                      </button>
                    )}
                    <button onClick={() => setConfirmDeleteId(c.id)}
                      className="rounded-lg bg-red-50 border border-red-100 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-100 transition">
                      Delete
                    </button>
                  </div>
                </div>
                {expanded === c.id && (
                  <div className="mt-4 rounded-xl bg-gray-50 p-4 text-sm text-gray-700 whitespace-pre-wrap">
                    {c.message}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Delete confirmation modal */}
      {confirmDeleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setConfirmDeleteId(null)}>
          <div className="mx-4 w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl" onClick={e => e.stopPropagation()}>
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100 mx-auto">
              <svg className="h-6 w-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
            </div>
            <h3 className="text-center text-lg font-bold text-gray-900 mb-2">Delete Complaint?</h3>
            <p className="text-center text-sm text-gray-500 mb-6">This will permanently delete the complaint. This cannot be undone.</p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmDeleteId(null)} className="flex-1 rounded-xl border border-gray-200 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50">Cancel</button>
              <button onClick={() => deleteComplaint(confirmDeleteId)} className="flex-1 rounded-xl bg-red-600 py-2.5 text-sm font-semibold text-white hover:bg-red-700">Delete</button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
