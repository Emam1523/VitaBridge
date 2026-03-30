import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import DashboardLayout from "../common/DashboardLayout";
import { useAuth } from "../../context/AuthenticationContext";
import { getAppointments, getPrescription } from "../../api/patientApi";
import { initAamarPayPayment } from "../../api/paymentApi";
import { PATIENT_LINKS } from "./patientLinks";

const CONSULTATION_LABELS = {
  OFFLINE: { label: "Offline", icon: "🏥", color: "bg-emerald-50 text-emerald-700" },
  ONLINE: { label: "Online", icon: "💻", color: "bg-primary-50 text-primary-700" },
};

const FILTERS = ["ALL", "PENDING", "CONFIRMED", "COMPLETED", "CANCELLED"];

export default function MyAppointment() {
  const { token } = useAuth();
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("ALL");
  const [selected, setSelected] = useState(null);
  const [prescription, setPrescription] = useState(null);
  const [processingId, setProcessingId] = useState(null);
  const [payError, setPayError] = useState("");

  const fetchAppointments = useCallback(async () => {
    try { setLoading(true); const data = await getAppointments(token); setAppointments(data); }
    catch (e) { console.error("Failed to load appointments", e); }
    finally { setLoading(false); }
  }, [token]);

  useEffect(() => { if (token) fetchAppointments(); }, [token, fetchAppointments]);

  const filtered = filter === "ALL" ? appointments : appointments.filter(a => a.status === filter);

  const handleViewDetails = async (apt) => {
    setSelected(apt); setPrescription(null);
    if (apt.status === "CONFIRMED" || apt.status === "COMPLETED") {
      try { const p = await getPrescription(apt.id, token); setPrescription(p); } catch { /* no prescription */ }
    }
  };

  const handlePayment = async (appointmentId) => {
    setPayError("");
    try {
      setProcessingId(appointmentId);
      const data = await initAamarPayPayment(appointmentId, token);
      if (data && data.paymentUrl) {
        window.location.href = data.paymentUrl;
      } else {
        setPayError("Could not initialize payment. Please try again.");
        setProcessingId(null);
      }
    } catch (err) {
      setPayError("Payment initialization failed: " + (err?.message || "Please try again."));
      setProcessingId(null);
    }
  };

  const statusStyle = (s) => ({
    CONFIRMED: "bg-green-50 text-green-700 border-green-200",
    PENDING: "bg-yellow-50 text-yellow-700 border-yellow-200",
    COMPLETED: "bg-primary-50 text-primary-700 border-primary-200",
    CANCELLED: "bg-red-50 text-red-700 border-red-200",
    RESCHEDULED: "bg-purple-50 text-purple-700 border-purple-200",
  }[s] || "bg-gray-50 text-gray-700 border-gray-200");

  const consultLabel = (type) => CONSULTATION_LABELS[type] || CONSULTATION_LABELS.OFFLINE;

  return (
    <DashboardLayout title="My Appointments" links={PATIENT_LINKS}>
      {payError && (
        <div className="mb-4 flex items-center gap-2 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
          <svg className="h-4 w-4 shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd"/></svg>
          {payError}
          <button onClick={() => setPayError("")} className="ml-auto text-red-400 hover:text-red-600">✕</button>
        </div>
      )}
      {/* Header Row */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-6">
        <p className="text-sm text-gray-500">{filtered.length} appointment{filtered.length !== 1 ? "s" : ""}</p>
        <Link to="/patient/doctors"
          className="rounded-xl bg-primary-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-primary-500/25 transition hover:shadow-primary-500/40 hover:brightness-110">
          + Book New
        </Link>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 mb-6">
        {FILTERS.map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
              filter === f
                ? "bg-primary-600 text-white shadow-md shadow-primary-500/25"
                : "bg-white text-gray-600 border border-gray-200 hover:border-primary-300 hover:text-primary-600"
            }`}>
            {f === "ALL" ? "All" : f.charAt(0) + f.slice(1).toLowerCase()}
          </button>
        ))}
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex justify-center py-16">
          <svg className="h-8 w-8 animate-spin text-primary-400" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
        </div>
      ) : filtered.length === 0 ? (
        <div className="py-16 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gray-100 text-3xl">📅</div>
          <p className="font-medium text-gray-500">No appointments found</p>
          <p className="mt-1 text-sm text-gray-400">Book a doctor to get started.</p>
          <Link to="/patient/doctors" className="mt-4 inline-block rounded-xl bg-primary-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-primary-500/25 transition hover:brightness-110">
            Find a Doctor
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map(apt => {
            const ct = consultLabel(apt.consultationType);
            return (
              <div key={apt.id} className="group rounded-2xl border border-gray-100 bg-white p-5 shadow-sm transition hover:shadow-md hover:border-primary-200">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  {/* Doctor Info */}
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-full bg-gradient-to-br from-primary-500 to-primary-500 flex items-center justify-center text-white font-bold text-lg shadow-lg shadow-primary-500/20">
                      {(apt.doctorName || "D")[0]}
                    </div>
                    <div>
                      <h4 className="font-bold text-gray-900">{apt.doctorName}</h4>
                      <p className="text-sm text-gray-500">{apt.specialty}</p>
                    </div>
                  </div>

                  {/* Right side: date, type, status */}
                  <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-sm">
                    <div className="text-right">
                      <div className="font-semibold text-gray-900">{apt.appointmentDate}</div>
                      {apt.serialNumber && <div className="text-gray-500">Serial #{apt.serialNumber}</div>}
                    </div>
                    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${ct.color}`}>
                      {ct.icon} {ct.label}
                    </span>
                    <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${statusStyle(apt.status)}`}>
                      {apt.status}
                    </span>
                  </div>
                </div>

                {apt.reason && <p className="mt-3 text-sm text-gray-500 italic">"{apt.reason}"</p>}

                {apt.consultationType === "ONLINE" && apt.status === "CONFIRMED" && (
                  <div className="mt-3">
                    <div className="inline-flex items-center gap-2 rounded-lg bg-indigo-50 border border-indigo-100 px-3 py-1.5">
                      <span className="text-sm">⏱️</span>
                      <span className="text-xs font-semibold text-indigo-700">Join via video, audio, or chat</span>
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="mt-4 flex flex-wrap gap-2">
                  <button onClick={() => handleViewDetails(apt)}
                    className="rounded-xl bg-gray-100 px-4 py-2 text-xs font-semibold text-gray-700 transition hover:bg-gray-200">
                    View Details
                  </button>
                  {apt.status === "CONFIRMED" && (
                    <Link to={`/patient/consultation/${apt.id}`}
                      className="rounded-xl bg-primary-50 px-4 py-2 text-xs font-semibold text-primary-600 transition hover:bg-primary-100">
                      🎥 Join Consultation
                    </Link>
                  )}
                  {apt.status === "COMPLETED" && (
                    <Link to={`/patient/consultation/${apt.id}`}
                      className="rounded-xl bg-amber-50 px-4 py-2 text-xs font-semibold text-amber-700 transition hover:bg-amber-100">
                      ⭐ Review
                    </Link>
                  )}
                  {apt.status === "PENDING" && apt.paymentStatus !== "COMPLETED" && (
                    <button onClick={() => handlePayment(apt.id)} disabled={processingId === apt.id}
                      className="rounded-xl bg-gradient-to-r from-green-500 to-emerald-500 px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed">
                      {processingId === apt.id ? (
                        <span className="flex items-center gap-1">
                          <svg className="h-3 w-3 animate-spin" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
                          Processing...
                        </span>
                      ) : "💳 Pay to Confirm"}
                    </button>
                  )}
                  {apt.paymentStatus === "COMPLETED" && apt.status === "CONFIRMED" && (
                    <span className="rounded-xl bg-green-50 px-4 py-2 text-xs font-semibold text-green-600">✓ Paid</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Detail Modal */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={() => setSelected(null)}>
          <div className="mx-4 w-full max-w-lg rounded-2xl bg-white shadow-2xl" onClick={e => e.stopPropagation()}>
            {/* Modal Header */}
            <div className="rounded-t-2xl bg-primary-600 px-6 py-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-white">Appointment Details</h3>
                <button onClick={() => setSelected(null)} className="text-white/70 hover:text-white text-xl">&times;</button>
              </div>
            </div>

            <div className="p-6 max-h-[70vh] overflow-y-auto">
              {/* Doctor Row */}
              <div className="mb-4 flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-gradient-to-br from-primary-500 to-primary-500 flex items-center justify-center text-white font-bold shadow-lg shadow-primary-500/20">
                  {(selected.doctorName || "D")[0]}
                </div>
                <div>
                  <p className="font-bold text-gray-900">{selected.doctorName}</p>
                  <p className="text-sm text-gray-500">{selected.specialty}</p>
                </div>
              </div>

              <dl className="space-y-3 text-sm">
                <div className="flex justify-between items-center"><dt className="text-gray-500">Date</dt><dd className="font-semibold">{selected.appointmentDate}</dd></div>
                {selected.serialNumber && (
                  <div className="flex justify-between items-center">
                    <dt className="text-gray-500">Serial #</dt>
                    <dd className="font-bold text-primary-700">#{selected.serialNumber}</dd>
                  </div>
                )}
                <div className="flex justify-between items-center"><dt className="text-gray-500">Status</dt><dd><span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${statusStyle(selected.status)}`}>{selected.status}</span></dd></div>
                {selected.consultationType && (
                  <div className="flex justify-between items-center">
                    <dt className="text-gray-500">Consultation</dt>
                    <dd><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${consultLabel(selected.consultationType).color}`}>
                      {consultLabel(selected.consultationType).icon} {consultLabel(selected.consultationType).label}
                    </span></dd>
                  </div>
                )}
                {selected.consultationType === "ONLINE" && (
                  <div className="flex justify-between items-center"><dt className="text-gray-500">Duration</dt><dd className="font-semibold">30 minutes</dd></div>
                )}
                {selected.paymentStatus && (
                  <div className="flex justify-between items-center">
                    <dt className="text-gray-500">Payment</dt>
                    <dd><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${selected.paymentStatus === "COMPLETED" ? "bg-green-50 text-green-700" : "bg-yellow-50 text-yellow-700"}`}>
                      {selected.paymentStatus === "COMPLETED" ? "✓ Paid" : "Pending"}
                    </span></dd>
                  </div>
                )}
                {selected.reason && <div className="flex justify-between"><dt className="text-gray-500">Reason</dt><dd className="text-right max-w-[60%]">{selected.reason}</dd></div>}
                {selected.consultationNotes && (
                  <div>
                    <dt className="text-gray-500 mb-1.5">Consultation Notes</dt>
                    <dd className="rounded-xl bg-gray-50 p-3 text-gray-700">{selected.consultationNotes}</dd>
                  </div>
                )}
              </dl>

              {/* Prescription */}
              {prescription && (
                <div className="mt-5 rounded-xl bg-gradient-to-br from-primary-50 to-primary-50 border border-primary-100 p-5">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-bold text-primary-800 flex items-center gap-2">💊 Prescription</h4>
                    <Link 
                      to="/patient/documents"
                      className="text-xs font-semibold text-primary-600 hover:text-primary-700 underline"
                    >
                      View PDF
                    </Link>
                  </div>
                  {prescription.chiefComplaints && <p className="text-sm mb-2"><span className="font-semibold text-gray-700">Chief Complaints:</span> {prescription.chiefComplaints}</p>}
                  {prescription.diagnosis && <p className="text-sm mb-2"><span className="font-semibold text-gray-700">Diagnosis:</span> {prescription.diagnosis}</p>}
                  {prescription.medications?.length > 0 && (
                    <div className="mt-2">
                      <p className="text-sm font-semibold text-gray-700 mb-1.5">Medications:</p>
                      <div className="space-y-1.5">
                        {prescription.medications.map((m, i) => (
                          <div key={i} className="rounded-lg bg-white/60 px-3 py-2 text-sm text-gray-700">
                            <span className="font-semibold">{m.name}</span>
                            {m.dosage && ` — ${m.dosage}`}
                            {m.quantity && ` (${m.quantity})`}
                            {m.frequency && ` — ${m.frequency}`}
                            {m.duration && ` for ${m.duration}`}
                            {m.instructions && ` — ${m.instructions}`}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {prescription.advice && (
                    <p className="mt-3 text-sm"><span className="font-semibold text-gray-700">Advice:</span> {prescription.advice}</p>
                  )}
                </div>
              )}
            </div>

            <div className="border-t border-gray-100 px-6 py-4">
              <button onClick={() => setSelected(null)}
                className="w-full rounded-xl bg-gray-100 py-2.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-200">
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
