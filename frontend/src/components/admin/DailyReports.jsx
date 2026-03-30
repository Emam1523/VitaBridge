import { useState, useEffect, useCallback } from "react";
import DashboardLayout from "../common/DashboardLayout";
import { useAuth } from "../../context/AuthenticationContext";
import {
  getAllDoctors,
  getAppointmentsByDate,
  getAppointmentsByDoctorAndDate,
  getAvailableReportDates,
} from "../../api/adminApi";
import { getApiBaseUrl } from "../../api/httpClient";
import { ADMIN_LINKS } from "./adminLinks";

export default function DailyReports() {
  const { token } = useAuth();
  const [doctors, setDoctors] = useState([]);
  const [dates, setDates] = useState([]);
  const [selectedDate, setSelectedDate] = useState(() => {
    const n = new Date();
    return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, "0")}-${String(n.getDate()).padStart(2, "0")}`;
  });
  const [selectedDoctorId, setSelectedDoctorId] = useState("");
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dataLoading, setDataLoading] = useState(false);

  // Load doctors and available dates
  useEffect(() => {
    if (!token) return;
    (async () => {
      try {
        setLoading(true);
        const [docData, dateData] = await Promise.all([
          getAllDoctors(token),
          getAvailableReportDates(token),
        ]);
        setDoctors(docData);
        setDates(dateData);
      } catch (e) {
        console.error("Failed to load report data", e);
      } finally {
        setLoading(false);
      }
    })();
  }, [token]);

  // Fetch appointments when date or doctor changes
  const fetchAppointments = useCallback(async () => {
    if (!token || !selectedDate) return;
    try {
      setDataLoading(true);
      let data;
      if (selectedDoctorId) {
        data = await getAppointmentsByDoctorAndDate(selectedDoctorId, selectedDate, token);
      } else {
        data = await getAppointmentsByDate(selectedDate, token);
      }
      setAppointments(data);
    } catch {
      setAppointments([]);
    } finally {
      setDataLoading(false);
    }
  }, [token, selectedDate, selectedDoctorId]);

  useEffect(() => {
    fetchAppointments();
  }, [fetchAppointments]);

  // Group appointments by doctor
  const byDoctor = {};
  appointments.forEach((a) => {
    const key = a.doctorId;
    if (!byDoctor[key]) {
      byDoctor[key] = { doctorName: a.doctorName, specialty: a.specialty, appointments: [] };
    }
    byDoctor[key].appointments.push(a);
  });

  const doctorGroups = Object.entries(byDoctor).map(([id, data]) => ({
    doctorId: id,
    ...data,
  }));

  // Download PDF helper
  const downloadPdf = async (doctorId, doctorName) => {
    try {
      const baseUrl = getApiBaseUrl().replace("/api", "");
      const url = `${baseUrl}/api/admin/reports/daily/pdf?doctorId=${doctorId}&date=${selectedDate}`;
      const resp = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!resp.ok) throw new Error("Download failed");
      const blob = await resp.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = `Report_${doctorName.replace(/\s+/g, "_")}_${selectedDate}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(blobUrl);
    } catch (err) {
      alert("Failed to download PDF: " + err.message);
    }
  };

  // Stats for current view
  const totalPatients = appointments.length;
  const completed = appointments.filter((a) => a.status === "COMPLETED").length;
  const cancelled = appointments.filter((a) => a.status === "CANCELLED").length;
  const confirmed = appointments.filter((a) => a.status === "CONFIRMED").length;
  const pending = appointments.filter((a) => a.status === "PENDING").length;
  const onlineCount = appointments.filter((a) => a.consultationType === "ONLINE").length;
  const offlineCount = totalPatients - onlineCount;
  const dayRevenue = appointments
    .filter((a) => a.paymentStatus === "COMPLETED")
    .reduce((s, a) => s + (a.consultationFee || 0), 0);

  return (
    <DashboardLayout title="Daily Reports" links={ADMIN_LINKS}>
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-600" />
        </div>
      ) : (
        <div className="space-y-6">
          {/* Filters */}
          <div className="rounded-2xl bg-white p-6 shadow-sm border border-gray-100">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Select Report</h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">Date</label>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
                />
                {dates.length > 0 && (
                  <p className="mt-1 text-xs text-gray-400">
                    {dates.length} day{dates.length !== 1 ? "s" : ""} with appointments available
                  </p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">Doctor</label>
                <select
                  value={selectedDoctorId}
                  onChange={(e) => setSelectedDoctorId(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
                >
                  <option value="">All Doctors</option>
                  {doctors.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name} — {d.specialty}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Summary Cards */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <MiniCard label="Total Patients" value={totalPatients} icon="👥" color="blue" />
            <MiniCard label="Online" value={onlineCount} icon="🖥️" color="indigo" />
            <MiniCard label="Offline" value={offlineCount} icon="🏥" color="purple" />
            <MiniCard label="Day Revenue" value={`৳${dayRevenue.toLocaleString()}`} icon="💰" color="green" />
          </div>

          {/* Status row */}
          <div className="grid gap-4 sm:grid-cols-4">
            <StatusBadge label="Completed" value={completed} color="green" />
            <StatusBadge label="Confirmed" value={confirmed} color="blue" />
            <StatusBadge label="Pending" value={pending} color="yellow" />
            <StatusBadge label="Cancelled" value={cancelled} color="red" />
          </div>

          {/* Doctor-wise reports */}
          {dataLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
            </div>
          ) : doctorGroups.length === 0 ? (
            <div className="rounded-2xl bg-white p-12 shadow-sm border border-gray-100 text-center">
              <div className="mx-auto w-16 h-16 rounded-full bg-gray-50 flex items-center justify-center mb-4">
                <svg className="w-8 h-8 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <p className="text-gray-500 font-medium">No appointments found for this date</p>
              <p className="text-sm text-gray-400 mt-1">Try selecting a different date or doctor</p>
            </div>
          ) : (
            doctorGroups.map((group) => (
              <DoctorSection
                key={group.doctorId}
                group={group}
                onDownloadPdf={() => downloadPdf(group.doctorId, group.doctorName)}
              />
            ))
          )}
        </div>
      )}
    </DashboardLayout>
  );
}

// ======== Doctor Section ========
function DoctorSection({ group, onDownloadPdf }) {
  const { doctorName, specialty, appointments } = group;
  const online = appointments.filter((a) => a.consultationType === "ONLINE");
  const offline = appointments.filter((a) => a.consultationType !== "ONLINE");
  const completed = appointments.filter((a) => a.status === "COMPLETED").length;
  const cancelled = appointments.filter((a) => a.status === "CANCELLED").length;
  const revenue = appointments
    .filter((a) => a.paymentStatus === "COMPLETED")
    .reduce((s, a) => s + (a.consultationFee || 0), 0);

  return (
    <div className="rounded-2xl bg-white shadow-sm border border-gray-100 overflow-hidden">
      {/* Doctor header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-4 sm:px-6 py-4 bg-gradient-to-r from-primary-50 to-primary-100/50 border-b border-primary-100">
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 rounded-full bg-primary-600 flex items-center justify-center text-lg font-bold text-white">
            {(doctorName || "D")[0]}
          </div>
          <div>
            <h4 className="font-bold text-gray-900">{doctorName}</h4>
            <p className="text-sm text-primary-600">{specialty}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right mr-4">
            <p className="text-xs text-gray-500">{appointments.length} patient{appointments.length !== 1 ? "s" : ""}</p>
            <p className="text-sm font-semibold text-emerald-600">৳{revenue.toLocaleString()}</p>
          </div>
          <button
            onClick={onDownloadPdf}
            className="inline-flex items-center gap-2 rounded-xl bg-primary-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-primary-700 transition"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Download PDF
          </button>
        </div>
      </div>

      {/* Mini stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-px bg-gray-100 border-b">
        <div className="bg-white px-4 py-3 text-center">
          <p className="text-xs text-gray-500">Online</p>
          <p className="text-lg font-bold text-primary-600">{online.length}</p>
        </div>
        <div className="bg-white px-4 py-3 text-center">
          <p className="text-xs text-gray-500">Offline</p>
          <p className="text-lg font-bold text-purple-600">{offline.length}</p>
        </div>
        <div className="bg-white px-4 py-3 text-center">
          <p className="text-xs text-gray-500">Completed</p>
          <p className="text-lg font-bold text-emerald-600">{completed}</p>
        </div>
        <div className="bg-white px-4 py-3 text-center">
          <p className="text-xs text-gray-500">Cancelled</p>
          <p className="text-lg font-bold text-red-500">{cancelled}</p>
        </div>
      </div>

      {/* Online patients table */}
      {online.length > 0 && (
        <>
          <div className="px-6 pt-4 pb-2">
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary-700 bg-primary-50 px-2.5 py-1 rounded-full">
              🖥️ Online — {online.length} patient{online.length !== 1 ? "s" : ""}
            </span>
          </div>
          <PatientTable appointments={online} />
        </>
      )}

      {/* Offline patients table */}
      {offline.length > 0 && (
        <>
          <div className="px-6 pt-4 pb-2">
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-purple-700 bg-purple-50 px-2.5 py-1 rounded-full">
              🏥 Offline — {offline.length} patient{offline.length !== 1 ? "s" : ""}
            </span>
          </div>
          <PatientTable appointments={offline} />
        </>
      )}

      {appointments.length === 0 && (
        <div className="px-6 py-8 text-center text-gray-400 text-sm">No appointments for this doctor on this date.</div>
      )}
    </div>
  );
}

// ======== Patient Table ========
function PatientTable({ appointments }) {
  return (
    <div className="overflow-x-auto px-4 pb-4">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b bg-gray-50">
            <th className="px-4 py-2.5 font-medium text-gray-500 text-xs">#</th>
            <th className="px-4 py-2.5 font-medium text-gray-500 text-xs">Patient Name</th>
            <th className="px-4 py-2.5 font-medium text-gray-500 text-xs">Gender</th>
            <th className="px-4 py-2.5 font-medium text-gray-500 text-xs">Phone</th>
            <th className="px-4 py-2.5 font-medium text-gray-500 text-xs">Serial</th>
            <th className="px-4 py-2.5 font-medium text-gray-500 text-xs">Status</th>
            <th className="px-4 py-2.5 font-medium text-gray-500 text-xs">Payment</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {appointments.map((a, i) => (
            <tr key={a.id} className="hover:bg-gray-50/50">
              <td className="px-4 py-2.5 text-gray-500 text-xs">{i + 1}</td>
              <td className="px-4 py-2.5 font-medium text-gray-900">{a.patientName}</td>
              <td className="px-4 py-2.5 text-gray-600">{a.patientGender || "—"}</td>
              <td className="px-4 py-2.5 text-gray-600">{a.patientPhone || "—"}</td>
              <td className="px-4 py-2.5">
                {a.serialNumber ? (
                  <span className="inline-block bg-amber-50 text-amber-700 text-xs font-semibold px-2 py-0.5 rounded-full">
                    #{a.serialNumber}
                  </span>
                ) : "—"}
              </td>
              <td className="px-4 py-2.5">
                <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${statusColor(a.status)}`}>
                  {a.status}
                </span>
              </td>
              <td className="px-4 py-2.5">
                <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${
                  a.paymentStatus === "COMPLETED" ? "bg-green-50 text-green-700" : "bg-yellow-50 text-yellow-700"
                }`}>
                  {a.paymentStatus || "PENDING"}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ======== Small Components ========
function MiniCard({ label, value, icon, color }) {
  const colors = {
    blue: "bg-primary-50 text-primary-700 border-primary-200",
    green: "bg-green-50 text-green-700 border-green-200",
    indigo: "bg-indigo-50 text-indigo-700 border-indigo-200",
    purple: "bg-purple-50 text-purple-700 border-purple-200",
  };
  return (
    <div className={`rounded-xl border p-4 shadow-sm ${colors[color]}`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-medium opacity-80">{label}</p>
          <p className="mt-1 text-2xl font-bold">{value}</p>
        </div>
        <span className="text-2xl">{icon}</span>
      </div>
    </div>
  );
}

function StatusBadge({ label, value, color }) {
  const colors = {
    green: "bg-green-50 text-green-700 border-green-200",
    blue: "bg-blue-50 text-blue-700 border-blue-200",
    yellow: "bg-yellow-50 text-yellow-700 border-yellow-200",
    red: "bg-red-50 text-red-700 border-red-200",
  };
  return (
    <div className={`rounded-xl border px-4 py-3 flex items-center justify-between ${colors[color]}`}>
      <span className="text-sm font-medium">{label}</span>
      <span className="text-lg font-bold">{value}</span>
    </div>
  );
}

function statusColor(s) {
  const m = {
    CONFIRMED: "bg-blue-50 text-blue-700",
    PENDING: "bg-yellow-50 text-yellow-700",
    COMPLETED: "bg-green-50 text-green-700",
    CANCELLED: "bg-red-50 text-red-700",
  };
  return m[s] || "bg-gray-50 text-gray-700";
}
