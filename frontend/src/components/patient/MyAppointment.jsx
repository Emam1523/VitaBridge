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
  const [datePeriodFilter, setDatePeriodFilter] = useState("ALL");
  const [selected, setSelected] = useState(null);
  const [prescription, setPrescription] = useState(null);
  const [processingId, setProcessingId] = useState(null);
  const [payError, setPayError] = useState("");
  const todayKey = new Date().toISOString().slice(0, 10);

  const fetchAppointments = useCallback(async () => {
    try { setLoading(true); const data = await getAppointments(token); setAppointments(data); }
    catch (e) { console.error("Failed to load appointments", e); }
    finally { setLoading(false); }
  }, [token]);

  useEffect(() => { if (token) fetchAppointments(); }, [token, fetchAppointments]);

  const filtered = appointments.filter((a) => {
    const statusMatch = filter === "ALL" ? true : a.status === filter;
    const datePeriodMatch = (() => {
      if (datePeriodFilter === "ALL") return true;
      if (!a.appointmentDate) return false;
      if (datePeriodFilter === "TODAY") return a.appointmentDate === todayKey;
      if (datePeriodFilter === "PREVIOUS") return a.appointmentDate < todayKey;
      if (datePeriodFilter === "UPCOMING") return a.appointmentDate > todayKey;
      return true;
    })();
    return statusMatch && datePeriodMatch;
  });

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
        window.location.replace(data.paymentUrl);
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
  const totalCount = appointments.length;
  const todayCount = appointments.filter((a) => a.appointmentDate === todayKey).length;
  const upcomingCount = appointments.filter((a) => a.appointmentDate > todayKey).length;
  const previousCount = appointments.filter((a) => a.appointmentDate < todayKey).length;

  return (
    <DashboardLayout title="My Appointments" links={PATIENT_LINKS}>
      {payError && (
        <div className="mb-4 flex items-center gap-2 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
          <svg className="h-4 w-4 shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd"/></svg>
          {payError}
          <button onClick={() => setPayError("")} className="ml-auto text-red-400 hover:text-red-600">✕</button>
        </div>
      )}
      <div className="space-y-6">
        <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary-700 via-primary-600 to-cyan-600 p-6 text-white shadow-lg md:p-8">
          <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/10 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-16 -left-16 h-52 w-52 rounded-full bg-white/10 blur-3xl" />
          <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl">
              <div className="mb-3 inline-flex items-center rounded-full bg-white/15 px-3 py-1 text-xs font-semibold text-white/90 backdrop-blur">
                Appointment overview
              </div>
              <h3 className="text-2xl font-bold md:text-3xl">My Appointments</h3>
              <p className="mt-2 max-w-xl text-sm leading-6 text-white/85 md:text-base">
                Keep track of your medical visits in one calm, organized place.
              </p>
            </div>

            <Link
              to="/patient/doctors"
              className="inline-flex items-center justify-center rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-primary-700 shadow-md shadow-black/10 transition hover:brightness-95"
            >
              + Book New
            </Link>
          </div>

          <div className="relative mt-6 grid gap-3 sm:grid-cols-4">
            {[
              { label: "Total", value: totalCount },
              { label: "Today", value: todayCount },
              { label: "Upcoming", value: upcomingCount },
              { label: "Previous", value: previousCount },
            ].map((item) => (
              <div key={item.label} className="rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur-sm">
                <p className="text-xs uppercase tracking-[0.18em] text-white/70">{item.label}</p>
                <p className="mt-2 text-2xl font-bold">{item.value}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-3xl border border-gray-100 bg-white p-5 shadow-sm md:p-6">
          <div className="space-y-5">
            <div className="grid gap-5 lg:grid-cols-1 lg:items-start">
              <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4">
              <div className="mb-3 flex items-center gap-2">
                <span className="text-sm font-bold text-gray-900">Date Range</span>
                <span className="text-xs text-gray-400">quick filter</span>
                {datePeriodFilter !== "ALL" && (
                  <button
                    type="button"
                    onClick={() => setDatePeriodFilter("ALL")}
                    className="ml-auto rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-100"
                  >
                    Reset Date Range
                  </button>
                )}
              </div>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { key: "ALL", label: "All Dates" },
                  { key: "TODAY", label: "Today" },
                  { key: "PREVIOUS", label: "Previous" },
                  { key: "UPCOMING", label: "Upcoming" },
                ].map((period) => (
                  <button
                    key={period.key}
                    type="button"
                    onClick={() => setDatePeriodFilter(period.key)}
                    className={`rounded-xl border px-3 py-2 text-sm font-semibold transition ${
                      datePeriodFilter === period.key
                        ? "border-primary-600 bg-primary-600 text-white shadow-sm"
                        : "border-gray-200 bg-white text-gray-700 hover:border-primary-200 hover:text-primary-700"
                    }`}
                  >
                    {period.label}
                  </button>
                ))}
              </div>
              </div>
            </div>

            <div>
              <div className="mb-3 flex items-center gap-2">
                <span className="text-sm font-bold text-gray-900">Status</span>
                <span className="text-xs text-gray-400">filter by appointment state</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {FILTERS.map(f => (
                  <button key={f} onClick={() => setFilter(f)}
                    className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                      filter === f
                        ? "bg-primary-600 text-white shadow-md shadow-primary-500/20"
                        : "bg-gray-50 text-gray-700 border border-gray-200 hover:border-primary-200 hover:text-primary-700"
                    }`}>
                    {f === "ALL" ? "All" : f.charAt(0) + f.slice(1).toLowerCase()}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </section>

        {loading ? (
          <div className="rounded-3xl border border-gray-100 bg-white py-16 text-center shadow-sm">
            <svg className="mx-auto h-8 w-8 animate-spin text-primary-400" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
            <p className="mt-4 text-sm text-gray-500">Loading appointments...</p>
          </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-gray-200 bg-white py-16 text-center shadow-sm">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary-50 text-3xl">📅</div>
          <p className="mt-4 text-lg font-semibold text-gray-900">No appointments found</p>
            <p className="mt-2 text-sm text-gray-500">
              {datePeriodFilter !== "ALL"
                ? "Try another date range or reset filters."
                : "Book a doctor to get started."}
            </p>
          <Link to="/patient/doctors" className="mt-5 inline-flex items-center rounded-xl bg-primary-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-primary-500/20 transition hover:brightness-110">
            Find a Doctor
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map(apt => {
            const ct = consultLabel(apt.consultationType);
            return (
              <div key={apt.id} className="group rounded-3xl border border-gray-100 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  {/* Doctor Info */}
                  <div className="flex items-center gap-4">
                    <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-primary-500 to-cyan-500 flex items-center justify-center overflow-hidden text-white font-bold text-lg shadow-md shadow-primary-500/20 ring-4 ring-primary-50">
                      {apt.doctorProfileImageUrl ? (
                        <img src={apt.doctorProfileImageUrl} alt={apt.doctorName} className="h-full w-full object-cover" />
                      ) : (
                        (apt.doctorName || "D")[0]
                      )}
                    </div>
                    <div className="min-w-0">
                      <h4 className="truncate text-base font-bold text-gray-900">{apt.doctorName}</h4>
                      <p className="text-sm text-gray-500">{apt.specialty}</p>
                      <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-gray-400">
                        <span>{apt.appointmentDate}</span>
                        {apt.serialNumber && <span>Serial #{apt.serialNumber}</span>}
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 lg:justify-end">
                    <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${ct.color}`}>
                      {ct.icon} {ct.label}
                    </span>
                    <span className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${statusStyle(apt.status)}`}>
                      {apt.status}
                    </span>
                  </div>
                </div>

                {apt.reason && <p className="mt-4 text-sm leading-6 text-gray-600">{apt.reason}</p>}

                {apt.consultationType === "ONLINE" && apt.status === "CONFIRMED" && (
                  <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-indigo-50 px-3 py-1.5 text-indigo-700">
                    <span className="text-sm">⏱️</span>
                    <span className="text-xs font-semibold text-indigo-700">Join via video, audio, or chat</span>
                  </div>
                )}

                {/* Actions */}
                <div className="mt-5 flex flex-wrap gap-2 border-t border-gray-100 pt-4">
                  <button onClick={() => handleViewDetails(apt)}
                    className="rounded-xl bg-gray-50 px-4 py-2 text-xs font-semibold text-gray-700 transition hover:bg-gray-100">
                    View Details
                  </button>
                  {apt.status === "CONFIRMED" && apt.consultationType === "ONLINE" && (
                    <Link to={`/patient/consultation/${apt.id}`}
                      className="rounded-xl bg-primary-600 px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-primary-700">
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
                      className="rounded-xl bg-emerald-500 px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed">
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
                <div className="mb-4 flex items-center gap-3 rounded-2xl bg-gray-50 p-3">
                  <div className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br from-primary-500 to-cyan-500 font-bold text-white shadow-sm">
                    {selected.doctorProfileImageUrl ? (
                      <img src={selected.doctorProfileImageUrl} alt={selected.doctorName} className="h-full w-full object-cover" />
                    ) : (
                      (selected.doctorName || "D")[0]
                    )}
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
      </div>
    </DashboardLayout>
  );
}
