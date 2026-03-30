import { useState, useEffect } from "react";
import DashboardLayout from "../common/DashboardLayout";
import { useAuth } from "../../context/AuthenticationContext";
import { PATIENT_LINKS } from "./patientLinks";
import { apiRequest } from "../../api/httpClient";

export default function PatientComplaint() {
  const { token } = useAuth();
  const [form, setForm] = useState({ title: "", message: "" });
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [error, setError] = useState("");
  const [history, setHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(true);

  const fetchHistory = async () => {
    try {
      const data = await apiRequest("/complaints/my", { token });
      setHistory(Array.isArray(data) ? data : []);
    } catch { /* silent */ }
    finally { setLoadingHistory(false); }
  };

  useEffect(() => { fetchHistory(); }, [token]); // eslint-disable-line react-hooks/exhaustive-deps

  const change = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    if (!form.title.trim() || !form.message.trim()) {
      setError("Both subject and message are required.");
      return;
    }
    setError("");
    setSubmitting(true);
    try {
      await apiRequest("/complaints", { method: "POST", token, body: form });
      setSuccessMsg("Your complaint has been submitted. We'll review it shortly.");
      setForm({ title: "", message: "" });
      fetchHistory();
      setTimeout(() => setSuccessMsg(""), 5000);
    } catch (err) {
      setError(err.message || "Submission failed. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <DashboardLayout title="Complaints & Feedback" links={PATIENT_LINKS}>
      <div className="mx-auto max-w-3xl space-y-6">

        {/* Submit form */}
        <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
          <h2 className="mb-1 text-lg font-bold text-gray-900">Submit a Complaint or Feedback</h2>
          <p className="mb-5 text-sm text-gray-500">
            Share your concern or opinion with us. Only admins can view your submissions.
          </p>

          {successMsg && (
            <div className="mb-4 flex items-center gap-2 rounded-xl border border-green-100 bg-green-50 px-4 py-3 text-sm text-green-700">
              <svg className="h-4 w-4 shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/></svg>
              {successMsg}
            </div>
          )}
          {error && (
            <div className="mb-4 flex items-center gap-2 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
              <svg className="h-4 w-4 shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd"/></svg>
              {error}
            </div>
          )}

          <form onSubmit={submit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Subject</label>
              <input
                name="title"
                value={form.title}
                onChange={change}
                maxLength={150}
                placeholder="Brief subject of your complaint or feedback"
                className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm outline-none focus:border-primary-500 focus:ring-4 focus:ring-primary-500/10"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Message</label>
              <textarea
                name="message"
                value={form.message}
                onChange={change}
                rows={5}
                placeholder="Describe your complaint or feedback in detail..."
                className="w-full resize-none rounded-xl border border-gray-200 px-4 py-2.5 text-sm outline-none focus:border-primary-500 focus:ring-4 focus:ring-primary-500/10"
              />
            </div>
            <button
              type="submit"
              disabled={submitting}
              className="rounded-xl bg-primary-600 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-primary-700 disabled:opacity-50"
            >
              {submitting ? "Submitting…" : "Submit"}
            </button>
          </form>
        </div>

        {/* History */}
        <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
          <h3 className="mb-4 text-base font-bold text-gray-900">My Submissions</h3>
          {loadingHistory ? (
            <p className="text-sm text-gray-400">Loading…</p>
          ) : history.length === 0 ? (
            <p className="text-sm text-gray-400">You have not submitted any complaints or feedback yet.</p>
          ) : (
            <div className="space-y-3">
              {history.map((c) => (
                <div key={c.id} className="rounded-xl border border-gray-100 bg-gray-50 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <p className="font-semibold text-gray-900 text-sm">{c.title}</p>
                    <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                      c.status === "REVIEWED" ? "bg-green-50 text-green-700" : "bg-amber-50 text-amber-700"
                    }`}>
                      {c.status === "REVIEWED" ? "Reviewed" : "Pending"}
                    </span>
                  </div>
                  <p className="mt-1.5 text-sm text-gray-600 whitespace-pre-wrap">{c.message}</p>
                  <p className="mt-2 text-xs text-gray-400">{c.createdAt?.replace("T", " ")}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
