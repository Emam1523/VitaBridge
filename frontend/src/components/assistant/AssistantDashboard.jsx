import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import DashboardLayout from "../common/DashboardLayout";
import { useAuth } from "../../context/AuthenticationContext";
import {
  getAssistantAppointments,
  getAssignedDoctorInfo,
  confirmAppointment,
  cancelAppointment,
} from "../../api/assistantApi";

const ASSISTANT_LINKS = [
  {
    to: "/assistant/dashboard",
    label: "Dashboard",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
      </svg>
    ),
  },
  {
    to: "/assistant/appointments",
    label: "Appointments",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    ),
  },
  {
    to: "/assistant/schedules",
    label: "Schedules",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  {
    to: "/assistant/profile",
    label: "My Profile",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
      </svg>
    ),
  },
];


export { ASSISTANT_LINKS };

export default function AssistantDashboard() {
  const { token } = useAuth();
  const [appointments, setAppointments] = useState([]);
  const [doctorInfo, setDoctorInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState({});
  const [actionError, setActionError] = useState("");

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [apptData, docInfo] = await Promise.all([
        getAssistantAppointments(token),
        getAssignedDoctorInfo(token),
      ]);
      setAppointments(apptData);
      setDoctorInfo(docInfo);
    } catch {
      console.error("Failed to load dashboard data");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (token) fetchData();
  }, [token, fetchData]);

  const handleConfirm = async (id) => {
    setActionError("");
    setActionLoading(prev => ({ ...prev, [id]: "pending" }));
    try {
      await confirmAppointment(id, token);
      await fetchData();
    } catch (err) {
      setActionError("Failed to confirm appointment: " + (err?.message || "Unknown error"));
    } finally {
      setActionLoading(prev => { const n = { ...prev }; delete n[id]; return n; });
    }
  };

  const handleCancel = async (id) => {
    setActionError("");
    setActionLoading(prev => ({ ...prev, [id]: "cancelling" }));
    try {
      await cancelAppointment(id, token);
      await fetchData();
    } catch (err) {
      setActionError("Failed to cancel appointment: " + (err?.message || "Unknown error"));
    } finally {
      setActionLoading(prev => { const n = { ...prev }; delete n[id]; return n; });
    }
  };

  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

  const todayAppointments = appointments.filter((a) => a.appointmentDate === today);
  const todayByStatus = { PENDING: 0, CONFIRMED: 0, COMPLETED: 0, CANCELLED: 0 };
  todayAppointments.forEach((a) => { if (todayByStatus[a.status] !== undefined) todayByStatus[a.status]++; });

  const stats = {
    pending: todayByStatus.PENDING,
    confirmed: todayByStatus.CONFIRMED + todayByStatus.COMPLETED,
    cancelled: todayByStatus.CANCELLED,
    completed: todayByStatus.COMPLETED,
    todayCount: todayAppointments.length,
  };

  const pendingAppointments = [...todayAppointments]
    .filter((a) => a.status === "PENDING")
    .sort((a, b) => (a.appointmentDate > b.appointmentDate ? 1 : -1));

  const todayChartData = [
    { label: "Total", value: todayAppointments.length, color: "#6366f1" },
    { label: "Confirmed", value: todayByStatus.CONFIRMED + todayByStatus.COMPLETED, color: "#10b981" },
    { label: "Pending", value: todayByStatus.PENDING, color: "#eab308" },
    { label: "Cancelled", value: todayByStatus.CANCELLED, color: "#ef4444" },
    { label: "Completed", value: todayByStatus.COMPLETED, color: "#3b82f6" },
  ];

  const paymentChartData = [
    { label: "Paid", value: todayAppointments.filter((a) => a.paymentStatus === "COMPLETED").length, color: "#10b981" },
    { label: "Unpaid", value: todayAppointments.filter((a) => a.paymentStatus !== "COMPLETED").length, color: "#f97316" },
  ];

  const typeChartData = [
    { label: "Online", value: todayAppointments.filter((a) => a.consultationType === "ONLINE").length, color: "#6366f1" },
    { label: "Offline", value: todayAppointments.filter((a) => a.consultationType === "OFFLINE").length, color: "#f97316" },
  ];

  return (
    <DashboardLayout title="Assistant Dashboard" links={ASSISTANT_LINKS}>
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-600"></div>
        </div>
      ) : (
        <div className="space-y-8">
          {actionError && (
            <div className="flex items-center gap-2 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
              <svg className="h-4 w-4 shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd"/></svg>
              {actionError}
              <button onClick={() => setActionError("")} className="ml-auto text-red-400 hover:text-red-600">✕</button>
            </div>
          )}
          {/* Doctor Info Banner */}
          {doctorInfo && (
            <div className="bg-primary-600 rounded-2xl p-6 text-white">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <p className="text-primary-100 text-sm font-medium">
                    Assigned Doctor
                  </p>
                  <h2 className="text-2xl font-bold mt-1">
                    Dr. {doctorInfo.name}
                  </h2>
                  <p className="text-primary-200 mt-1">
                    {doctorInfo.specialty} &middot; Fee: &#2547;
                    {doctorInfo.consultationFee}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span
                    className={`px-3 py-1 rounded-full text-sm font-semibold ${
                      doctorInfo.availability === "Available"
                        ? "bg-green-400/20 text-green-100"
                        : "bg-red-400/20 text-red-100"
                    }`}
                  >
                    {doctorInfo.availability}
                  </span>
                  <p className="text-primary-100 text-xs opacity-80">
                    Auto-updated from schedule
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Stats Grid */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              title="Today's Appointments"
              value={stats.todayCount}
              color="blue"
              icon={
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              }
            />
            <StatCard
              title="Pending"
              value={stats.pending}
              color="yellow"
              icon={
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              }
            />
            <StatCard
              title="Confirmed"
              value={stats.confirmed}
              color="green"
              icon={
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              }
            />
            <StatCard
              title="Completed"
              value={stats.completed}
              subtitle={`${stats.cancelled} cancelled`}
              color="purple"
              icon={
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              }
            />
          </div>

          {/* Pending Appointments — needs action */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-semibold text-gray-900">Pending Appointments</h3>
                {pendingAppointments.length > 0 && (
                  <span className="px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-700 text-xs font-bold">{pendingAppointments.length}</span>
                )}
              </div>
              <Link to="/assistant/appointments" className="text-sm font-medium text-primary-600 hover:text-primary-700">View All &rarr;</Link>
            </div>
            {pendingAppointments.length === 0 ? (
              <div className="text-center py-10 text-gray-500">No pending appointments</div>
            ) : (
              <div className="divide-y divide-gray-50">
                {pendingAppointments.map((appt) => (
                  <div key={appt.id} className="px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors gap-4">
                    <div className="flex items-center gap-4 min-w-0">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-yellow-400 to-yellow-500 flex items-center justify-center overflow-hidden text-white font-semibold text-sm shrink-0">
                        {appt.patientProfileImageUrl ? (
                          <img src={appt.patientProfileImageUrl} alt={appt.patientName} className="h-full w-full object-cover" />
                        ) : (
                          appt.patientName?.charAt(0) || "P"
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-gray-900 truncate">{appt.patientName}</p>
                        <p className="text-sm text-gray-500">{appt.appointmentDate} &middot; Serial #{appt.serialNumber} &middot; {appt.consultationType}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => handleConfirm(appt.id)}
                        disabled={!!actionLoading[appt.id]}
                        className="px-3 py-1.5 bg-green-500 hover:bg-green-600 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
                      >
                        {actionLoading[appt.id] === "pending" ? "..." : "Pending"}
                      </button>
                      <button
                        onClick={() => handleCancel(appt.id)}
                        disabled={!!actionLoading[appt.id]}
                        className="px-3 py-1.5 bg-red-100 hover:bg-red-200 text-red-700 text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
                      >
                        {actionLoading[appt.id] === "cancelling" ? "..." : "Cancel"}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Today's Appointment Chart */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-6">Today's Appointment Overview</h3>
            <BarChart data={todayChartData} />
          </div>

          {/* Payment & Consultation Type Charts */}
          <div className="grid gap-6 sm:grid-cols-2">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-6">Payment Status</h3>
              <BarChart data={paymentChartData} />
            </div>
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-6">Online vs Offline</h3>
              <BarChart data={typeChartData} />
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}

function StatCard({ title, value, subtitle, color, icon }) {
  const colorMap = {
    blue: "bg-primary-50 text-primary-600",
    green: "bg-green-50 text-green-600",
    yellow: "bg-yellow-50 text-yellow-600",
    purple: "bg-purple-50 text-purple-600",
    red: "bg-red-50 text-red-600",
  };
  return (
    <div className="rounded-2xl bg-white p-5 shadow-sm border border-gray-100">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-500">{title}</p>
          <p className="mt-2 text-3xl font-bold text-gray-900">{value}</p>
          {subtitle && <p className="mt-1 text-xs text-gray-400">{subtitle}</p>}
        </div>
        <div className={`rounded-xl p-3 ${colorMap[color]}`}>{icon}</div>
      </div>
    </div>
  );
}

function BarChart({ data }) {
  const max = Math.max(...data.map((d) => d.value), 1);
  const barH = 120;
  return (
    <div className="flex items-end gap-3 justify-around" style={{ height: barH + 32 }}>
      {data.map((d, i) => {
        const h = (d.value / max) * barH;
        return (
          <div key={i} className="flex flex-col items-center gap-1" style={{ flex: 1 }}>
            <span className="text-xs font-semibold text-gray-700">{d.value}</span>
            <div
              className="w-full max-w-[48px] rounded-t-lg transition-all duration-500"
              style={{ height: Math.max(h, 4), background: d.color }}
            />
            <span className="text-xs text-gray-500 mt-1">{d.label}</span>
          </div>
        );
      })}
    </div>
  );
}
