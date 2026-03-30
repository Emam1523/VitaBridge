import { useState, useEffect, useCallback } from "react";
import DashboardLayout from "../common/DashboardLayout";
import { useAuth } from "../../context/AuthenticationContext";
import { 
  getAllPayments, 
  getTodayPaymentStats, 
  getAllDoctorPaymentSummaries 
} from "../../api/adminApi";
import { formatCurrency, formatDate } from "../../utils/formatters";
import { ADMIN_LINKS } from "./adminLinks";

export default function Payment() {
  const { token } = useAuth();
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [todayStats, setTodayStats] = useState(null);
  const [doctorSummaries, setDoctorSummaries] = useState([]);
  const [showDoctorSummaries, setShowDoctorSummaries] = useState(false);

  const fetchPayments = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getAllPayments(token);
      setPayments(data);
    } catch (e) {
      console.error("Failed to load payments", e);
    } finally {
      setLoading(false);
    }
  }, [token]);

  const fetchTodayStats = useCallback(async () => {
    try {
      const stats = await getTodayPaymentStats(token);
      setTodayStats(stats);
    } catch (e) {
      console.error("Failed to load today's stats", e);
    }
  }, [token]);

  const fetchDoctorSummaries = useCallback(async () => {
    try {
      const summaries = await getAllDoctorPaymentSummaries(token);
      setDoctorSummaries(summaries);
    } catch (e) {
      console.error("Failed to load doctor summaries", e);
    }
  }, [token]);

  useEffect(() => { 
    if (token) {
      fetchPayments();
      fetchTodayStats();
    }
  }, [token, fetchPayments, fetchTodayStats]);

  const toggleDoctorSummaries = () => {
    if (!showDoctorSummaries && doctorSummaries.length === 0) {
      fetchDoctorSummaries();
    }
    setShowDoctorSummaries(!showDoctorSummaries);
  };

  let filtered = statusFilter === "ALL" ? payments : payments.filter(p => p.status === statusFilter);
  if (searchQuery) {
    const q = searchQuery.toLowerCase();
    filtered = filtered.filter(p =>
      p.patientName?.toLowerCase().includes(q) || p.doctorName?.toLowerCase().includes(q) || p.transactionId?.toLowerCase().includes(q)
    );
  }

  const statusColor = (s) => {
    const m = { COMPLETED: "bg-green-50 text-green-700", PENDING: "bg-yellow-50 text-yellow-700", FAILED: "bg-red-50 text-red-700", REFUNDED: "bg-purple-50 text-purple-700" };
    return m[s] || "bg-gray-50 text-gray-700";
  };

  const totalRevenue = payments.filter(p => p.status === "COMPLETED").reduce((sum, p) => sum + (p.amount || 0), 0);

  return (
    <DashboardLayout title="Payment Management" links={ADMIN_LINKS}>
      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-4 mb-6">
        {[
          { label: "Total Payments", value: payments.length, display: payments.length },
          { label: "Total Revenue", value: totalRevenue, display: formatCurrency(totalRevenue) },
          { label: "Today's Revenue", value: todayStats?.totalAmount || 0, display: formatCurrency(todayStats?.totalAmount || 0) },
          { label: "Today's Payments", value: todayStats?.totalPayments || 0, display: todayStats?.totalPayments || 0 },
        ].map(s => (
          <div key={s.label} className="rounded-xl bg-white p-4 shadow-sm">
            <p className="text-sm text-gray-500">{s.label}</p>
            <p className="mt-1 text-2xl font-bold text-gray-900">{s.display}</p>
          </div>
        ))}
      </div>

      {/* Action Buttons */}
      <div className="mb-4 flex gap-2">
        <button onClick={toggleDoctorSummaries}
          className="rounded-lg px-4 py-2 text-sm font-medium bg-green-600 text-white hover:bg-green-700">
          {showDoctorSummaries ? "Hide" : "Show"} Doctor Summaries
        </button>
        <button onClick={() => fetchPayments()}
          className="rounded-lg px-4 py-2 text-sm font-medium bg-gray-600 text-white hover:bg-gray-700">
          Refresh All
        </button>
      </div>

      {/* Doctor Summaries */}
      {showDoctorSummaries && (
        <div className="rounded-xl bg-white p-4 shadow-sm mb-6">
          <h3 className="font-bold text-gray-900 mb-4">Doctor Payment Summaries</h3>
          {doctorSummaries.length === 0 ? (
            <p className="text-gray-500">Loading summaries...</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b bg-gray-50">
                    <th className="px-4 py-3 font-medium text-gray-500">Doctor</th>
                    <th className="px-4 py-3 font-medium text-gray-500">Specialty</th>
                    <th className="px-4 py-3 font-medium text-gray-500">Total Earnings</th>
                    <th className="px-4 py-3 font-medium text-gray-500">Appointments</th>
                    <th className="px-4 py-3 font-medium text-gray-500">Avg Fee</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {doctorSummaries.map(doc => (
                    <tr key={doc.doctorId} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium text-gray-900">{doc.doctorName}</td>
                      <td className="px-4 py-3 text-gray-700">{doc.specialty}</td>
                      <td className="px-4 py-3 font-semibold text-green-600">{formatCurrency(doc.totalEarnings)}</td>
                      <td className="px-4 py-3 text-gray-700">{doc.totalAppointments}</td>
                      <td className="px-4 py-3 text-gray-700">{formatCurrency(doc.averageConsultationFee)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Filters */}
      <div className="rounded-xl bg-white p-4 shadow-sm mb-6 space-y-3">
        <div className="flex flex-col sm:flex-row gap-3">
          <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search by patient, doctor, or transaction ID..."
            className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm" />
        </div>
        <div className="flex gap-2 flex-wrap">
          {["ALL", "PENDING", "COMPLETED", "FAILED", "REFUNDED"].map(s => (
            <button key={s} onClick={() => setStatusFilter(s)}
              className={`rounded-full px-3 py-1.5 text-xs font-medium ${statusFilter === s ? "bg-primary-600 text-white" : "bg-gray-100 text-gray-600"}`}>
              {s === "ALL" ? "All" : s.charAt(0) + s.slice(1).toLowerCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="text-center py-12 text-gray-500">Loading payments...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-gray-500">No payments found.</div>
      ) : (
        <div className="rounded-2xl bg-white shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b bg-gray-50">
                  <th className="px-6 py-3 font-medium text-gray-500">Transaction ID</th>
                  <th className="px-6 py-3 font-medium text-gray-500">Patient</th>
                  <th className="px-6 py-3 font-medium text-gray-500">Doctor</th>
                  <th className="px-6 py-3 font-medium text-gray-500">Amount</th>
                  <th className="px-6 py-3 font-medium text-gray-500">Method</th>
                  <th className="px-6 py-3 font-medium text-gray-500">Status</th>
                  <th className="px-6 py-3 font-medium text-gray-500">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filtered.map(pay => (
                  <tr key={pay.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 font-mono text-xs text-gray-600">{pay.transactionId || "—"}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-green-100 flex items-center justify-center text-green-700 font-bold text-sm flex-shrink-0">
                          {(pay.patientName || "P")[0].toUpperCase()}
                        </div>
                        <span className="font-medium text-gray-900">{pay.patientName || "—"}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-primary-100 flex items-center justify-center text-primary-600 font-bold text-sm flex-shrink-0">
                          {(pay.doctorName || "D")[0].toUpperCase()}
                        </div>
                        <span className="font-medium text-gray-900">{pay.doctorName || "—"}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 font-semibold text-gray-900">{formatCurrency(pay.amount)}</td>
                    <td className="px-6 py-4 text-gray-600">{pay.paymentMethod || "—"}</td>
                    <td className="px-6 py-4">
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${statusColor(pay.status)}`}>{pay.status}</span>
                    </td>
                    <td className="px-6 py-4 text-gray-600">{formatDate(pay.paymentDate || pay.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}


