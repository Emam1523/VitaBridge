import { useState, useEffect, useCallback } from "react";
import DashboardLayout from "../common/DashboardLayout";
import { useAuth } from "../../context/AuthenticationContext";
import { getAllUsers, getAllAppointments, getAllPayments, getAllDoctors, getAppointmentsByDoctorAndDate } from "../../api/adminApi";
import { ADMIN_LINKS } from "./adminLinks";

export default function AdminDashboard() {
  const { token, user } = useAuth();
  const [users, setUsers] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [doctors, setDoctors] = useState([]);
  const [selectedDoctorId, setSelectedDoctorId] = useState("");
  const [dailyAppointments, setDailyAppointments] = useState([]);
  const [dailyLoading, setDailyLoading] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [userData, apptData, payData, docData] = await Promise.all([
        getAllUsers(token),
        getAllAppointments(token),
        getAllPayments(token),
        getAllDoctors(token),
      ]);
      setUsers(userData);
      setAppointments(apptData);
      setPayments(payData);
      setDoctors(docData);
    } catch {
      // Dashboard data load failed
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (token) fetchData();
  }, [token, fetchData]);

  // Today's date
  const now = new Date();
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

  // Fetch daily appointments for selected doctor
  useEffect(() => {
    if (!selectedDoctorId || !token) {
      // If no doctor selected, show today's data for all doctors
      setDailyAppointments(appointments.filter(a => a.appointmentDate === todayStr));
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        setDailyLoading(true);
        const data = await getAppointmentsByDoctorAndDate(selectedDoctorId, todayStr, token);
        if (!cancelled) setDailyAppointments(data);
      } catch { /* ignore */ }
      finally { if (!cancelled) setDailyLoading(false); }
    })();
    return () => { cancelled = true; };
  }, [selectedDoctorId, token, todayStr, appointments]);

  // Stats
  const totalDoctors = users.filter(u => u.role === "DOCTOR").length;
  const totalPatients = users.filter(u => u.role === "PATIENT").length;
  const totalAssistants = users.filter(u => u.role === "ASSISTANT").length;
  const activeUsers = users.filter(u => u.isActive).length;

  // Daily appointment stats
  const dailyByStatus = { PENDING: 0, CONFIRMED: 0, COMPLETED: 0, CANCELLED: 0 };
  dailyAppointments.forEach(a => { if (dailyByStatus[a.status] !== undefined) dailyByStatus[a.status]++; });

  // Payment stats — today only
  const todayPayments = payments.filter(p => {
    const d = p.paymentDate || p.createdAt;
    return d && d.substring(0, 10) === todayStr;
  });
  const totalRevenue = todayPayments
    .filter(p => p.status === "COMPLETED")
    .reduce((sum, p) => sum + (p.amount || 0), 0);
  const completedPayments = todayPayments.filter(p => p.status === "COMPLETED").length;

  // Monthly payment data (last 6 months)
  const monthlyPayments = getMonthlyPayments(payments);

  // Today's consultation type breakdown
  const todayOnline = dailyAppointments.filter(a => a.consultationType === "ONLINE").length;
  const todayOffline = dailyAppointments.filter(a => a.consultationType === "OFFLINE").length;
  const todayTypeData = [
    { label: "Online", value: todayOnline, color: "#6366f1" },
    { label: "Offline", value: todayOffline, color: "#f97316" },
  ];

  // Today's payment breakdown
  const todayPaid = todayPayments.filter(p => p.status === "COMPLETED").length;
  const todayUnpaid = todayPayments.filter(p => p.status !== "COMPLETED").length;
  const todayPaymentData = [
    { label: "Paid", value: todayPaid, color: "#10b981" },
    { label: "Unpaid", value: todayUnpaid, color: "#f97316" },
  ];

  // User distribution for donut chart
  const userDist = [
    { label: "Doctors", value: totalDoctors, color: "#3b82f6" },
    { label: "Patients", value: totalPatients, color: "#10b981" },
    { label: "Assistants", value: totalAssistants, color: "#f59e0b" },
  ];

  return (
    <DashboardLayout title={`Admin: ${user?.name || "Administrator"}`} links={ADMIN_LINKS}>
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-600" />
        </div>
      ) : (
        <div className="space-y-8">
          {/* Stat Cards */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard title="Total Doctors" value={totalDoctors} icon="🩺" color="blue" />
            <StatCard title="Total Patients" value={totalPatients} icon="👥" color="green" />
            <StatCard title="Total Assistants" value={totalAssistants} icon="🤝" color="amber" />
            <StatCard title="Active Users" value={activeUsers} icon="✅" color="purple" />
          </div>

          {/* Revenue Row */}
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-600 p-6 text-white shadow-lg">
              <p className="text-sm font-medium text-emerald-100">Today's Revenue</p>
              <p className="mt-2 text-3xl font-bold">৳{totalRevenue.toLocaleString()}</p>
              <p className="mt-1 text-xs text-emerald-200">{completedPayments} completed payments</p>
            </div>
            <div className="rounded-2xl bg-gradient-to-br from-primary-500 to-primary-600 p-6 text-white shadow-lg">
              <p className="text-sm font-medium text-primary-100">Today's Appointments</p>
              <p className="mt-2 text-3xl font-bold">{dailyAppointments.length}</p>
              <p className="mt-1 text-xs text-primary-200">{dailyByStatus.CONFIRMED + dailyByStatus.COMPLETED} confirmed today</p>
            </div>
            <div className="rounded-2xl bg-gradient-to-br from-violet-500 to-violet-600 p-6 text-white shadow-lg">
              <p className="text-sm font-medium text-violet-100">Consultations Complete</p>
              <p className="mt-2 text-3xl font-bold">{dailyByStatus.COMPLETED}</p>
              <p className="mt-1 text-xs text-violet-200">{dailyByStatus.PENDING} pending · {dailyByStatus.CANCELLED} cancelled</p>
            </div>
          </div>

          {/* Charts Row */}
          <div className="grid gap-6 lg:grid-cols-2">
            {/* User Distribution Donut */}
            <div className="rounded-2xl bg-white p-6 shadow-sm border border-gray-100">
              <h3 className="text-lg font-semibold text-gray-900 mb-6">User Distribution</h3>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-8">
                <DonutChart data={userDist} total={totalDoctors + totalPatients + totalAssistants} />
                <div className="space-y-3">
                  {userDist.map(d => (
                    <div key={d.label} className="flex items-center gap-3">
                      <div className="h-3 w-3 rounded-full" style={{ background: d.color }} />
                      <span className="text-sm text-gray-600">{d.label}</span>
                      <span className="text-sm font-bold text-gray-900">{d.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Daily Appointment Status Bar Chart */}
            <div className="rounded-2xl bg-white p-6 shadow-sm border border-gray-100">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-lg font-semibold text-gray-900">Daily Appointment Status</h3>
              </div>
              <p className="text-xs text-gray-400 mb-3">Today's appointments</p>
              <select
                value={selectedDoctorId}
                onChange={e => setSelectedDoctorId(e.target.value)}
                className="mb-4 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
              >
                <option value="">All Doctors</option>
                {doctors.map(d => (
                  <option key={d.id} value={d.id}>{d.name} — {d.specialty}</option>
                ))}
              </select>
              {dailyLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-600" />
                </div>
              ) : (
                <BarChart data={[
                  { label: "Pending", value: dailyByStatus.PENDING, color: "#eab308" },
                  { label: "Confirmed", value: dailyByStatus.CONFIRMED + dailyByStatus.COMPLETED, color: "#3b82f6" },
                  { label: "Completed", value: dailyByStatus.COMPLETED, color: "#10b981" },
                  { label: "Cancelled", value: dailyByStatus.CANCELLED, color: "#ef4444" },
                ]} />
              )}
            </div>
          </div>

          {/* Online/Offline & Payment Charts */}
          <div className="grid gap-6 sm:grid-cols-2">
            <div className="rounded-2xl bg-white p-6 shadow-sm border border-gray-100">
              <h3 className="text-lg font-semibold text-gray-900 mb-1">Today: Online vs Offline</h3>
              <p className="text-xs text-gray-400 mb-4">Consultation type breakdown for today</p>
              <BarChart data={todayTypeData} />
            </div>
            <div className="rounded-2xl bg-white p-6 shadow-sm border border-gray-100">
              <h3 className="text-lg font-semibold text-gray-900 mb-1">Today: Payment Status</h3>
              <p className="text-xs text-gray-400 mb-4">Paid vs unpaid for today&apos;s appointments</p>
              <BarChart data={todayPaymentData} />
            </div>
          </div>

          {/* Monthly Revenue Chart */}
          <div className="rounded-2xl bg-white p-6 shadow-sm border border-gray-100">
            <h3 className="text-lg font-semibold text-gray-900 mb-6">Monthly Revenue</h3>
            <BarChart data={monthlyPayments} tall />
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}

// ======== Helper: Monthly payments (last 6 months) ========
function getMonthlyPayments(payments) {
  const now = new Date();
  const months = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push({ year: d.getFullYear(), month: d.getMonth(), label: d.toLocaleString("default", { month: "short" }) });
  }
  return months.map(m => {
    const total = payments
      .filter(p => p.status === "COMPLETED" && p.paymentDate)
      .filter(p => {
        const d = new Date(p.paymentDate);
        return d.getFullYear() === m.year && d.getMonth() === m.month;
      })
      .reduce((s, p) => s + (p.amount || 0), 0);
    return { label: m.label, value: total, color: "#10b981" };
  });
}

// ======== Donut Chart (SVG) ========
function DonutChart({ data, total }) {
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
        <span className="text-xs text-gray-500">Users</span>
      </div>
    </div>
  );
}

// ======== Bar Chart (SVG) ========
function BarChart({ data, tall }) {
  const max = Math.max(...data.map(d => d.value), 1);
  const barH = tall ? 160 : 120;
  return (
    <div className="flex items-end gap-3 justify-around" style={{ height: barH + 32 }}>
      {data.map((d, i) => {
        const h = (d.value / max) * barH;
        return (
          <div key={i} className="flex flex-col items-center gap-1" style={{ flex: 1 }}>
            <span className="text-xs font-semibold text-gray-700">{tall ? `৳${d.value.toLocaleString()}` : d.value}</span>
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
function StatCard({ title, value, icon, color }) {
  const colors = {
    blue: "bg-primary-50 text-primary-700 border-primary-200",
    green: "bg-green-50 text-green-700 border-green-200",
    amber: "bg-amber-50 text-amber-700 border-amber-200",
    purple: "bg-purple-50 text-purple-700 border-purple-200",
  };
  return (
    <div className={`rounded-2xl border p-5 shadow-sm ${colors[color]}`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium opacity-80">{title}</p>
          <p className="mt-2 text-3xl font-bold">{value}</p>
        </div>
        <span className="text-3xl">{icon}</span>
      </div>
    </div>
  );
}
