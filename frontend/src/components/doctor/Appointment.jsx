import { useState, useEffect, useCallback } from "react";
import DashboardLayout from "../common/DashboardLayout";
import { useAuth } from "../../context/AuthenticationContext";
import { DOCTOR_LINKS } from "./DoctorDashboard";
import { getMyAppointments } from "../../api/doctorApi";

export default function Appointment() {
  const { token } = useAuth();
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("today");
  const [dateFilter, setDateFilter] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [selectedAppointment, setSelectedAppointment] = useState(null);

  const fetchAppointments = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getMyAppointments(token);
      setAppointments(data);
    } catch (e) {
      console.error("Failed to load appointments", e);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (token) fetchAppointments();
  }, [token, fetchAppointments]);

  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

  // Split appointments by tab
  const todayAppointments = appointments
    .filter((a) => a.appointmentDate === today)
    .sort((a, b) => (a.serialNumber || 0) - (b.serialNumber || 0));

  const upcomingAppointments = appointments
    .filter((a) => a.appointmentDate > today)
    .sort((a, b) =>
      a.appointmentDate > b.appointmentDate
        ? 1
        : a.appointmentDate < b.appointmentDate
        ? -1
        : (a.serialNumber || 0) - (b.serialNumber || 0)
    );

  const previousAppointments = appointments
    .filter((a) => a.appointmentDate < today)
    .sort((a, b) => (b.appointmentDate > a.appointmentDate ? 1 : -1));

  // Pick list by tab
  let tabAppointments =
    activeTab === "today"
      ? todayAppointments
      : activeTab === "upcoming"
      ? upcomingAppointments
      : previousAppointments;

  // Apply filters
  let filtered = tabAppointments;
  if (statusFilter !== "ALL")
    filtered = filtered.filter((a) => a.status === statusFilter);
  if (typeFilter !== "ALL")
    filtered = filtered.filter((a) => a.consultationType === typeFilter);
  if (dateFilter)
    filtered = filtered.filter((a) => a.appointmentDate === dateFilter);
  if (searchQuery) {
    const q = searchQuery.toLowerCase();
    filtered = filtered.filter(
      (a) =>
        a.patientName?.toLowerCase().includes(q) ||
        a.patientEmail?.toLowerCase().includes(q)
    );
  }

  const stats = {
    total: appointments.length,
    today: todayAppointments.length,
    upcoming: upcomingAppointments.length,
    previous: previousAppointments.length,
  };

  const tabs = [
    { key: "today", label: "Today", count: stats.today },
    { key: "upcoming", label: "Upcoming", count: stats.upcoming },
    { key: "previous", label: "Previous", count: stats.previous },
  ];

  return (
    <DashboardLayout title="My Appointments" links={DOCTOR_LINKS}>
      <div className="space-y-6">
        {/* Stats summary */}
        <div className="grid gap-3 grid-cols-2 sm:grid-cols-4">
          <MiniStat label="Total" value={stats.total} color="blue" />
          <MiniStat label="Today" value={stats.today} color="green" />
          <MiniStat label="Upcoming" value={stats.upcoming} color="indigo" />
          <MiniStat label="Previous" value={stats.previous} color="purple" />
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-gray-100 p-1 rounded-xl">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => {
                setActiveTab(tab.key);
                setDateFilter("");
                setStatusFilter("ALL");
                setTypeFilter("ALL");
                setSearchQuery("");
              }}
              className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-medium transition-all ${
                activeTab === tab.key
                  ? "bg-white text-primary-700 shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {tab.label}
              <span className={`ml-1.5 px-1.5 py-0.5 rounded-full text-xs font-semibold ${
                activeTab === tab.key
                  ? "bg-primary-100 text-primary-700"
                  : "bg-gray-200 text-gray-600"
              }`}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* Filters */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
          <div className="flex flex-wrap gap-3">
            <input
              type="text"
              placeholder="Search patient..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 min-w-[180px] rounded-lg border border-gray-200 px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
            />
            {(activeTab === "upcoming" || activeTab === "previous") && (
              <input
                type="date"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
              />
            )}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
            >
              <option value="ALL">All Status</option>
              <option value="PENDING">Pending</option>
              <option value="CONFIRMED">Confirmed</option>
              <option value="COMPLETED">Completed</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
            >
              <option value="ALL">All Types</option>
              <option value="OFFLINE">Offline</option>
              <option value="ONLINE">Online</option>
            </select>
            {(statusFilter !== "ALL" ||
              typeFilter !== "ALL" ||
              dateFilter ||
              searchQuery) && (
              <button
                onClick={() => {
                  setStatusFilter("ALL");
                  setTypeFilter("ALL");
                  setDateFilter("");
                  setSearchQuery("");
                }}
                className="text-sm text-red-500 hover:text-red-600 font-medium"
              >
                Clear
              </button>
            )}
          </div>
        </div>

        {/* Appointment List */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-600"></div>
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12 text-center">
            <svg
              className="w-16 h-16 mx-auto text-gray-300 mb-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
              />
            </svg>
            <p className="text-gray-500 text-lg">No appointments found</p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            {/* Desktop Table */}
            <div className="hidden lg:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50">
                    <th className="text-left px-6 py-3 font-medium text-gray-500">Patient</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-500">Date</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-500">Type</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-500">Time / Serial</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-500">Status</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-500">Payment</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-500">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filtered.map((appt) => (
                    <tr key={appt.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary-500 to-primary-500 flex items-center justify-center text-white font-semibold text-xs flex-shrink-0">
                            {appt.patientName?.charAt(0) || "P"}
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">{appt.patientName}</p>
                            {appt.patientEmail && (
                              <p className="text-xs text-gray-400">{appt.patientEmail}</p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-gray-700">{appt.appointmentDate}</td>
                      <td className="px-4 py-4">
                        {appt.consultationType === "OFFLINE" ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-orange-50 text-orange-700 text-xs font-medium">
                            <span className="w-1.5 h-1.5 rounded-full bg-orange-400"></span>
                            Offline
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary-50 text-primary-700 text-xs font-medium">
                            <span className="w-1.5 h-1.5 rounded-full bg-primary-400"></span>
                            Online
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-4 text-gray-700">
                        {appt.serialNumber ? (
                          <span className="font-semibold text-orange-600">
                            #{appt.serialNumber}
                          </span>
                        ) : appt.appointmentTime ? (
                          <span className="text-primary-600">
                            {String(appt.appointmentTime).slice(0, 5)}
                          </span>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>
                      <td className="px-4 py-4">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${statusColor(appt.status)}`}>
                          {appt.status}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                          appt.paymentStatus === "COMPLETED"
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-yellow-50 text-yellow-700"
                        }`}>
                          {appt.paymentStatus}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <button
                          onClick={() => setSelectedAppointment(appt)}
                          className="text-primary-600 hover:text-primary-700 font-medium text-xs"
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards */}
            <div className="lg:hidden divide-y divide-gray-50">
              {filtered.map((appt) => (
                <div
                  key={appt.id}
                  className="p-4 hover:bg-gray-50 transition-colors cursor-pointer"
                  onClick={() => setSelectedAppointment(appt)}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-500 to-primary-500 flex items-center justify-center text-white font-semibold text-sm">
                        {appt.patientName?.charAt(0) || "P"}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{appt.patientName}</p>
                        <p className="text-xs text-gray-500">{appt.appointmentDate}</p>
                      </div>
                    </div>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${statusColor(appt.status)}`}>
                      {appt.status}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2 ml-13">
                    <span className={`text-xs font-medium ${appt.consultationType === "OFFLINE" ? "text-orange-600" : "text-primary-600"}`}>
                      {appt.consultationType === "OFFLINE" ? "Offline" : "Online"}
                      {appt.serialNumber ? ` · #${appt.serialNumber}` : appt.appointmentTime ? ` · ${String(appt.appointmentTime).slice(0, 5)}` : ""}
                    </span>
                    {appt.paymentStatus === "COMPLETED" && (
                      <span className="text-xs text-emerald-600 font-medium">Paid</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Detail Modal */}
        {selectedAppointment && (
          <div
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={() => setSelectedAppointment(null)}
          >
            <div
              className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-6"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-gray-900">
                  Appointment Details
                </h3>
                <button
                  onClick={() => setSelectedAppointment(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Patient info header */}
              <div className="flex items-center gap-4 mb-6 p-4 bg-gray-50 rounded-xl">
                <div className="w-14 h-14 rounded-full bg-gradient-to-br from-primary-500 to-primary-500 flex items-center justify-center text-white font-bold text-xl flex-shrink-0">
                  {selectedAppointment.patientName?.charAt(0) || "P"}
                </div>
                <div>
                  <h4 className="font-bold text-gray-900 text-lg">
                    {selectedAppointment.patientName}
                  </h4>
                  {selectedAppointment.patientEmail && (
                    <p className="text-sm text-gray-500">{selectedAppointment.patientEmail}</p>
                  )}
                  {selectedAppointment.patientPhone && (
                    <p className="text-sm text-gray-500">{selectedAppointment.patientPhone}</p>
                  )}
                </div>
              </div>

              <div className="space-y-3">
                <DetailRow label="Date" value={selectedAppointment.appointmentDate} />
                <DetailRow
                  label="Consultation Type"
                  value={
                    selectedAppointment.consultationType === "OFFLINE"
                      ? `Offline${selectedAppointment.serialNumber ? ` · Serial #${selectedAppointment.serialNumber}` : selectedAppointment.appointmentTime ? ` · ${String(selectedAppointment.appointmentTime).slice(0, 5)}` : ""}`
                      : `Online${selectedAppointment.serialNumber ? ` · Serial #${selectedAppointment.serialNumber}` : selectedAppointment.appointmentTime ? ` · ${String(selectedAppointment.appointmentTime).slice(0, 5)}` : ""}`
                  }
                />
                <DetailRow label="Status">
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${statusColor(selectedAppointment.status)}`}>
                    {selectedAppointment.status}
                  </span>
                </DetailRow>
                <DetailRow label="Payment">
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                    selectedAppointment.paymentStatus === "COMPLETED"
                      ? "bg-emerald-50 text-emerald-700"
                      : "bg-yellow-50 text-yellow-700"
                  }`}>
                    {selectedAppointment.paymentStatus}
                  </span>
                </DetailRow>
                <DetailRow label="Fee" value={`৳${selectedAppointment.consultationFee || 0}`} />
                {selectedAppointment.reason && (
                  <DetailRow label="Reason" value={selectedAppointment.reason} />
                )}
                {selectedAppointment.symptoms && (
                  <DetailRow label="Symptoms" value={selectedAppointment.symptoms} />
                )}
                {selectedAppointment.consultationNotes && (
                  <DetailRow label="Notes" value={selectedAppointment.consultationNotes} />
                )}
              </div>

              <div className="mt-6 flex justify-end">
                <button
                  onClick={() => setSelectedAppointment(null)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg"
                >
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

function MiniStat({ label, value, color }) {
  const colorMap = {
    blue: "border-primary-200 bg-primary-50 text-primary-700",
    yellow: "border-yellow-200 bg-yellow-50 text-yellow-700",
    green: "border-green-200 bg-green-50 text-green-700",
    purple: "border-purple-200 bg-purple-50 text-purple-700",
    red: "border-red-200 bg-red-50 text-red-700",
    orange: "border-orange-200 bg-orange-50 text-orange-700",
    indigo: "border-primary-200 bg-primary-50 text-primary-700",
  };
  return (
    <div className={`rounded-xl border p-3 text-center ${colorMap[color]}`}>
      <p className="text-xs font-medium opacity-80">{label}</p>
      <p className="text-xl font-bold mt-0.5">{value}</p>
    </div>
  );
}

function DetailRow({ label, value, children }) {
  return (
    <div className="flex justify-between items-start gap-4 py-1">
      <span className="text-sm font-medium text-gray-500 flex-shrink-0">{label}</span>
      {children || <span className="text-sm text-gray-900 text-right">{value}</span>}
    </div>
  );
}

function statusColor(s) {
  const m = {
    CONFIRMED: "bg-green-50 text-green-700",
    PENDING: "bg-yellow-50 text-yellow-700",
    COMPLETED: "bg-primary-50 text-primary-700",
    CANCELLED: "bg-red-50 text-red-700",
  };
  return m[s] || "bg-gray-50 text-gray-700";
}
