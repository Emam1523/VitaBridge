import { useState, useEffect, useCallback } from "react";
import DashboardLayout from "../common/DashboardLayout";
import { Link } from "react-router-dom";
import { useAuth } from "../../context/AuthenticationContext";
import { getAppointments, getPatientStats } from "../../api/patientApi";
import { initAamarPayPayment } from "../../api/paymentApi";
import { PATIENT_LINKS } from "./patientLinks";

export default function PatientDashboard() {
  const { token, user } = useAuth();
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState(null);
  const [payError, setPayError] = useState("");
  const [stats, setStats] = useState({ prescriptionCount: 0, documentCount: 0 });

  const fetchAppointments = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getAppointments(token);
      setAppointments(data);
    } catch (error) {
      console.error("Failed to load appointments", error);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (token) fetchAppointments();
  }, [token, fetchAppointments]);

  useEffect(() => {
    if (token) {
      getPatientStats(token).then(setStats).catch(() => {});
    }
  }, [token]);

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

  const upcoming = appointments.filter(a => a.status === "CONFIRMED" || a.status === "PENDING").length;
  const completed = appointments.filter(a => a.status === "COMPLETED").length;
  const todayStr = new Date().toISOString().slice(0, 10);
  const todayActiveAppointments = appointments.filter(
    (a) =>
      (a.status === "PENDING" || a.status === "CONFIRMED") &&
      a.appointmentDate === todayStr,
  );

  const firstName = user?.name?.split(" ")[0] || "Patient";

  return (
    <DashboardLayout title="Dashboard" links={PATIENT_LINKS}>
      {payError && (
        <div className="mb-4 flex items-center gap-2 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
          <svg className="h-4 w-4 shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd"/></svg>
          {payError}
          <button onClick={() => setPayError("")} className="ml-auto text-red-400 hover:text-red-600">✕</button>
        </div>
      )}
      {/* Welcome banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary-700 via-primary-600 to-primary-500 p-6 text-white shadow-lg md:p-8">
        <div className="pointer-events-none absolute -right-10 -top-10 h-44 w-44 rounded-full bg-white/10 blur-2xl" />
        <div className="pointer-events-none absolute -bottom-16 -left-16 h-56 w-56 rounded-full bg-accent-400/15 blur-2xl" />
        <h2 className="relative text-2xl font-bold sm:text-3xl">
          Good {new Date().getHours() < 12 ? "morning" : new Date().getHours() < 18 ? "afternoon" : "evening"}, {firstName}!
        </h2>
        <p className="relative mt-2 max-w-lg text-primary-100">
          {upcoming > 0
            ? `You have ${upcoming} upcoming appointment${upcoming > 1 ? "s" : ""}. Stay on top of your health!`
            : "No upcoming appointments. Book one to get started!"}
        </p>
        <div className="relative mt-5 flex flex-wrap gap-3">
          <Link to="/patient/doctors" className="rounded-xl bg-white px-5 py-2.5 text-sm font-semibold text-primary-700 shadow transition hover:shadow-md">
            Book Appointment
          </Link>
          <Link to="/patient/profile" className="rounded-xl border border-white/30 px-5 py-2.5 text-sm font-semibold text-white backdrop-blur transition hover:bg-white/10">
            Complete Profile
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon="📅" title="Upcoming" value={upcoming} color="primary" />
        <StatCard icon="✅" title="Completed" value={completed} color="green" />
        <StatCard icon="💊" title="Prescriptions" value={stats.prescriptionCount} color="purple" />
        <StatCard icon="📄" title="Documents" value={stats.documentCount} color="accent" />
      </div>

      {/* Quick actions */}
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { to: "/patient/doctors", icon: "🔍", label: "Find Doctor", sub: "Search & book" },
          { to: "/patient/appointments", icon: "📋", label: "Appointments", sub: "View all" },
          { to: "/patient/documents", icon: "📁", label: "Documents", sub: "Upload & manage" },
          { to: "/patient/profile", icon: "👤", label: "Profile", sub: "Edit info" },
        ].map((a) => (
          <Link key={a.to} to={a.to} className="group flex items-center gap-4 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm transition hover:shadow-md hover:border-primary-200">
            <span className="text-2xl">{a.icon}</span>
            <div>
              <div className="text-sm font-semibold text-gray-900 group-hover:text-primary-700 transition">{a.label}</div>
              <div className="text-xs text-gray-500">{a.sub}</div>
            </div>
          </Link>
        ))}
      </div>

      {/* Active Appointments (not completed) */}
      <div className="mt-8 rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-gray-900">Today's Activity</h3>
          <Link to="/patient/appointments" className="text-sm font-medium text-primary-600 hover:text-primary-700 transition">
            View all &rarr;
          </Link>
        </div>

        {loading ? (
          <div className="mt-8 flex justify-center">
            <svg className="h-8 w-8 animate-spin text-primary-400" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
          </div>
        ) : todayActiveAppointments.length === 0 ? (
          <div className="mt-8 text-center">
            <p className="text-gray-400">No active appointments for today.</p>
            <Link to="/patient/doctors" className="mt-3 inline-block rounded-xl bg-gradient-to-r from-primary-600 to-primary-500 px-4 py-2 text-sm font-semibold text-white shadow-sm shadow-primary-500/25 hover:shadow-md">
              Book an appointment
            </Link>
          </div>
        ) : (
          <div className="mt-4 space-y-3">
            {todayActiveAppointments.map((apt) => (
                <div key={apt.id} className="group flex flex-col sm:flex-row sm:items-center gap-4 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm transition hover:shadow-md hover:border-primary-200">
                  {/* Doctor */}
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-primary-500 to-primary-500 text-sm font-bold text-white shadow-lg shadow-primary-500/20">
                      {apt.doctorProfileImageUrl ? (
                        <img src={apt.doctorProfileImageUrl} alt={apt.doctorName} className="h-full w-full object-cover" />
                      ) : (
                        (apt.doctorName || "D")[0]
                      )}
                    </div>
                    <div className="min-w-0">
                      <h4 className="font-semibold text-gray-900 truncate">{apt.doctorName}</h4>
                      <p className="text-xs text-gray-500">{apt.specialty}</p>
                    </div>
                  </div>

                  {/* Date & Serial */}
                  <div className="text-sm sm:text-right">
                    <div className="font-semibold text-gray-900">{apt.appointmentDate}</div>
                    {apt.serialNumber && <div className="text-xs text-gray-500">Serial #{apt.serialNumber}</div>}
                  </div>

                  {/* Type badge */}
                  <span className={`self-start sm:self-center rounded-full px-2.5 py-1 text-xs font-semibold ${
                    apt.consultationType === "ONLINE" ? "bg-primary-50 text-primary-600" : "bg-emerald-50 text-emerald-600"
                  }`}>
                    {apt.consultationType === "ONLINE" ? "💻 Online" : "🏥 Offline"}
                  </span>

                  {/* Status badge */}
                  <span className={`self-start sm:self-center rounded-full border px-2.5 py-1 text-xs font-semibold ${
                    apt.status === "CONFIRMED" ? "bg-green-50 text-green-700 border-green-200"
                    : "bg-yellow-50 text-yellow-700 border-yellow-200"
                  }`}>
                    {apt.status}
                  </span>

                  {/* Actions */}
                  <div className="flex gap-2 shrink-0">
                    {apt.status === "PENDING" && apt.paymentStatus !== "COMPLETED" && (
                      <button onClick={() => handlePayment(apt.id)} disabled={processingId === apt.id}
                        className="rounded-xl bg-gradient-to-r from-green-500 to-emerald-500 px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:brightness-110 disabled:opacity-50">
                        {processingId === apt.id ? "..." : "💳 Pay to Confirm"}
                      </button>
                    )}
                    {apt.paymentStatus === "COMPLETED" && apt.status === "CONFIRMED" && (
                      <span className="rounded-xl bg-green-50 px-4 py-2 text-xs font-semibold text-green-600">✓ Paid & Confirmed</span>
                    )}
                  </div>
                </div>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

function StatCard({ icon, title, value, color }) {
  const bg = { primary: "from-primary-50 to-primary-100/50", green: "from-green-50 to-green-100/50", purple: "from-purple-50 to-purple-100/50", accent: "from-accent-50 to-accent-100/50" };
  const text = { primary: "text-primary-700", green: "text-green-700", purple: "text-purple-700", accent: "text-accent-700" };
  return (
    <div className={`rounded-2xl bg-gradient-to-br ${bg[color]} p-5 shadow-sm`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{title}</p>
          <p className={`mt-2 text-3xl font-extrabold ${text[color]}`}>{value}</p>
        </div>
        <span className="text-3xl">{icon}</span>
      </div>
    </div>
  );
}
