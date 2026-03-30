import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import DashboardLayout from "../common/DashboardLayout";
import { useAuth } from "../../context/AuthenticationContext";
import { getMyAppointments, getDoctorProfile } from "../../api/doctorApi";

const DOCTOR_LINKS = [
  {
    to: "/doctor/dashboard",
    label: "Dashboard",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
      </svg>
    ),
  },
  {
    to: "/doctor/appointments",
    label: "Appointments",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    ),
  },
  {
    to: "/doctor/consultations",
    label: "Consultations",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z" />
      </svg>
    ),
  },
  {
    to: "/doctor/assistants",
    label: "Assistants",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
      </svg>
    ),
  },
  {
    to: "/doctor/schedule",
    label: "My Schedule",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  {
    to: "/doctor/reviews",
    label: "Reviews",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
      </svg>
    ),
  },
  {
    to: "/doctor/profile",
    label: "My Profile",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0zm6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
];

export { DOCTOR_LINKS };

export default function DoctorDashboard() {
  const { token } = useAuth();
  const [appointments, setAppointments] = useState([]);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [apptData, profData] = await Promise.all([
        getMyAppointments(token),
        getDoctorProfile(token),
      ]);
      setAppointments(apptData);
      setProfile(profData);
    } catch (e) {
      console.error("Failed to load dashboard data", e);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (token) fetchData();
  }, [token, fetchData]);

  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

  // Stats
  const totalPatients = new Set(appointments.map((a) => a.patientId)).size;
  const todayAppointments = appointments.filter((a) => a.appointmentDate === today);
  const todayCount = todayAppointments.length;
  const apptByStatus = { PENDING: 0, CONFIRMED: 0, COMPLETED: 0, CANCELLED: 0 };
  todayAppointments.forEach((a) => { if (apptByStatus[a.status] !== undefined) apptByStatus[a.status]++; });

  // Gender distribution (all-time, unique patients)
  const genderCounts = { Male: 0, Female: 0, Other: 0 };
  const seenPatients = new Set();
  appointments.forEach((a) => {
    if (!seenPatients.has(a.patientId)) {
      seenPatients.add(a.patientId);
      const g = a.patientGender;
      if (g === "Male") genderCounts.Male++;
      else if (g === "Female") genderCounts.Female++;
      else genderCounts.Other++;
    }
  });

  // Consultation type distribution — today only
  const typeCounts = {
    online: todayAppointments.filter((a) => a.consultationType === "ONLINE").length,
    offline: todayAppointments.filter((a) => a.consultationType === "OFFLINE").length,
  };

  // Payment distribution — today only
  const paymentCounts = {
    completed: todayAppointments.filter((a) => a.paymentStatus === "COMPLETED").length,
    pending: todayAppointments.filter((a) => a.paymentStatus !== "COMPLETED").length,
  };

  // Monthly appointment data (last 6 months)
  const monthlyData = getMonthlyAppointments(appointments);

  // Gender donut data
  const genderData = [
    { label: "Male", value: genderCounts.Male, color: "#3b82f6" },
    { label: "Female", value: genderCounts.Female, color: "#ec4899" },
    ...(genderCounts.Other > 0 ? [{ label: "Other", value: genderCounts.Other, color: "#8b5cf6" }] : []),
  ];

  // Status bar data
  const statusData = [
    { label: "Pending", value: apptByStatus.PENDING, color: "#eab308" },
    { label: "Confirmed", value: apptByStatus.CONFIRMED + apptByStatus.COMPLETED, color: "#3b82f6" },
    { label: "Completed", value: apptByStatus.COMPLETED, color: "#10b981" },
    { label: "Cancelled", value: apptByStatus.CANCELLED, color: "#ef4444" },
  ];

  // Consultation type donut data
  const typeData = [
    { label: "Online", value: typeCounts.online, color: "#6366f1" },
    { label: "Offline", value: typeCounts.offline, color: "#f97316" },
  ];

  return (
    <DashboardLayout title="Doctor Dashboard" links={DOCTOR_LINKS}>
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-600"></div>
        </div>
      ) : (
        <div className="space-y-8">
          {/* Profile Banner */}
          {profile && (
            <div className="relative overflow-hidden bg-gradient-to-br from-primary-700 via-primary-600 to-primary-500 rounded-2xl p-6 text-white shadow-lg">
              <div className="pointer-events-none absolute -right-10 -top-10 h-44 w-44 rounded-full bg-white/10 blur-2xl" />
              <div className="pointer-events-none absolute -bottom-16 -left-16 h-56 w-56 rounded-full bg-accent-400/15 blur-2xl" />
              <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <p className="text-primary-100 text-sm font-medium">Welcome back</p>
                  <h2 className="text-2xl font-bold mt-1"> {profile.name}</h2>
                  <p className="text-primary-200 mt-1">
                    {profile.specialty} &middot; {profile.experience} experience
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
                    profile.availability === "Available"
                      ? "bg-green-400/20 text-green-100"
                      : "bg-red-400/20 text-red-100"
                  }`}>
                    {profile.availability}
                  </span>
                  {profile.rating > 0 && (
                    <span className="px-3 py-1 rounded-full bg-yellow-400/20 text-yellow-100 text-sm font-semibold">
                      ★ {profile.rating?.toFixed(1)} ({profile.totalReviews})
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Stat Cards */}
          <div className="grid gap-4 grid-cols-2 lg:grid-cols-5">
            <StatCard title="Total Patients" value={totalPatients} icon="👥" color="blue" />
            <StatCard title="Today" value={todayCount} icon="📅" color="green" subtitle={`${apptByStatus.CONFIRMED + apptByStatus.COMPLETED} confirmed`} />
            <StatCard title="Pending" value={apptByStatus.PENDING} icon="⏳" color="amber" />
            <StatCard title="Completed" value={apptByStatus.COMPLETED} icon="✅" color="purple" subtitle={`${apptByStatus.CANCELLED} cancelled`} />
            <StatCard title="Total" value={appointments.length} icon="📋" color="indigo" />
          </div>

          {/* Quick Actions */}
          <div className="grid gap-4 sm:grid-cols-3">
            <Link to="/doctor/appointments" className="group rounded-2xl bg-white p-5 shadow-sm hover:shadow-md transition-all border border-gray-100">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary-50 rounded-lg text-primary-600 group-hover:bg-primary-100 transition-colors">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 text-sm">All Appointments</h3>
                  <p className="text-xs text-gray-500 mt-0.5">View all patient appointments</p>
                </div>
              </div>
            </Link>
            <Link to="/doctor/consultations" className="group rounded-2xl bg-white p-5 shadow-sm hover:shadow-md transition-all border border-gray-100">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-50 rounded-lg text-green-600 group-hover:bg-green-100 transition-colors">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 text-sm">Consultations</h3>
                  <p className="text-xs text-gray-500 mt-0.5">Start or manage consultations</p>
                </div>
              </div>
            </Link>
            <Link to="/doctor/schedule" className="group rounded-2xl bg-white p-5 shadow-sm hover:shadow-md transition-all border border-gray-100">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-50 rounded-lg text-purple-600 group-hover:bg-purple-100 transition-colors">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 text-sm">My Schedule</h3>
                  <p className="text-xs text-gray-500 mt-0.5">View weekly schedule</p>
                </div>
              </div>
            </Link>
          </div>

          {/* Charts Row 1 — Gender Distribution & Appointment Status */}
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Male / Female Patient Distribution */}
            <div className="rounded-2xl bg-white p-6 shadow-sm border border-gray-100">
              <h3 className="text-lg font-semibold text-gray-900 mb-6">Patient Gender Distribution</h3>
              <div className="flex items-center justify-center gap-8">
                <DonutChart data={genderData} total={totalPatients} centerLabel="Patients" />
                <div className="space-y-3">
                  {genderData.map((d) => (
                    <div key={d.label} className="flex items-center gap-3">
                      <div className="h-3 w-3 rounded-full" style={{ background: d.color }} />
                      <span className="text-sm text-gray-600">{d.label}</span>
                      <span className="text-sm font-bold text-gray-900">{d.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Appointment Status Bar Chart */}
            <div className="rounded-2xl bg-white p-6 shadow-sm border border-gray-100">
              <h3 className="text-lg font-semibold text-gray-900 mb-1">Appointment Status</h3>
              <p className="text-xs text-gray-400 mb-6">Today&apos;s appointments</p>
              <BarChart data={statusData} />
            </div>
          </div>

          {/* Charts Row 2 — Online/Offline & Payment Distribution */}
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Online vs Offline */}
            <div className="rounded-2xl bg-white p-6 shadow-sm border border-gray-100">
              <h3 className="text-lg font-semibold text-gray-900 mb-1">Consultation Type</h3>
              <p className="text-xs text-gray-400 mb-5">Today&apos;s appointments</p>
              <div className="flex items-center justify-center gap-8">
                <DonutChart data={typeData} total={typeCounts.online + typeCounts.offline} centerLabel="Appointments" />
                <div className="space-y-3">
                  {typeData.map((d) => (
                    <div key={d.label} className="flex items-center gap-3">
                      <div className="h-3 w-3 rounded-full" style={{ background: d.color }} />
                      <span className="text-sm text-gray-600">{d.label}</span>
                      <span className="text-sm font-bold text-gray-900">{d.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Payment status */}
            <div className="rounded-2xl bg-white p-6 shadow-sm border border-gray-100">
              <h3 className="text-lg font-semibold text-gray-900 mb-1">Payment Status</h3>
              <p className="text-xs text-gray-400 mb-6">Today&apos;s appointments</p>
              <BarChart data={[
                { label: "Paid", value: paymentCounts.completed, color: "#10b981" },
                { label: "Pending", value: paymentCounts.pending, color: "#eab308" },
              ]} />
            </div>
          </div>

          {/* Monthly Appointments Chart */}
          <div className="rounded-2xl bg-white p-6 shadow-sm border border-gray-100">
            <h3 className="text-lg font-semibold text-gray-900 mb-6">Monthly Appointments</h3>
            <BarChart data={monthlyData} tall />
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}

// ======== Helper: Monthly appointments (last 6 months) ========
function getMonthlyAppointments(appointments) {
  const now = new Date();
  const months = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push({ year: d.getFullYear(), month: d.getMonth(), label: d.toLocaleString("default", { month: "short" }) });
  }
  return months.map((m) => {
    const count = appointments.filter((a) => {
      const d = new Date(a.appointmentDate);
      return d.getFullYear() === m.year && d.getMonth() === m.month;
    }).length;
    return { label: m.label, value: count, color: "#3b82f6" };
  });
}

// ======== Donut Chart (SVG) ========
function DonutChart({ data, total, centerLabel }) {
  const size = 140;
  const stroke = 28;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;

  const segments = data.reduce((acc, d) => {
    const prevOffset = acc.length > 0 ? acc[acc.length - 1]._offset : 0;
    const pct = total > 0 ? d.value / total : 0;
    const dashArray = `${pct * circumference} ${circumference}`;
    const rotation = prevOffset * 360;
    acc.push({ ...d, dashArray, rotation, _offset: prevOffset + pct });
    return acc;
  }, []);

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#f3f4f6" strokeWidth={stroke} />
        {segments.map((seg, i) => (
          <circle
            key={i}
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={seg.color}
            strokeWidth={stroke}
            strokeDasharray={seg.dashArray}
            strokeDashoffset={0}
            transform={`rotate(${seg.rotation - 90} ${size / 2} ${size / 2})`}
            strokeLinecap="round"
          />
        ))}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-bold text-gray-900">{total}</span>
        <span className="text-xs text-gray-500">{centerLabel}</span>
      </div>
    </div>
  );
}

// ======== Bar Chart (SVG) ========
function BarChart({ data, tall }) {
  const max = Math.max(...data.map((d) => d.value), 1);
  const barH = tall ? 160 : 120;
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

// ======== Stat Card ========
function StatCard({ title, value, icon, color, subtitle }) {
  const colors = {
    blue: "bg-primary-50 text-primary-700 border-primary-200",
    green: "bg-green-50 text-green-700 border-green-200",
    amber: "bg-amber-50 text-amber-700 border-amber-200",
    purple: "bg-purple-50 text-purple-700 border-purple-200",
    indigo: "bg-indigo-50 text-indigo-700 border-indigo-200",
  };
  return (
    <div className={`rounded-2xl border p-5 shadow-sm ${colors[color]}`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium opacity-80">{title}</p>
          <p className="mt-2 text-3xl font-bold">{value}</p>
          {subtitle && <p className="mt-1 text-xs opacity-70">{subtitle}</p>}
        </div>
        <span className="text-3xl">{icon}</span>
      </div>
    </div>
  );
}
