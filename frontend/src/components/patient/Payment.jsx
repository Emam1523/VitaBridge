import { useState, useEffect, useCallback } from "react";
import DashboardLayout from "../common/DashboardLayout";
import { useAuth } from "../../context/AuthenticationContext";
import { getAppointments } from "../../api/patientApi";
import { getPaymentByAppointment, processPayment } from "../../api/paymentApi";
import { PATIENT_LINKS } from "./patientLinks";

export default function Payment() {
  const { token } = useAuth();
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState(null);
  const [payModal, setPayModal] = useState(null); // { appointmentId, doctorName, amount }
  const [transactionId, setTransactionId] = useState("");
  const [payError, setPayError] = useState("");
  const [paySuccess, setPaySuccess] = useState("");

  const fetchPayments = useCallback(async () => {
    try {
      setLoading(true);
      const appointments = await getAppointments(token);
      const paymentPromises = appointments.map(async (apt) => {
        try {
          const payment = await getPaymentByAppointment(apt.id, token);
          return { ...payment, doctorName: apt.doctorName, specialty: apt.specialty, appointmentDate: apt.appointmentDate };
        } catch {
          return { id: `pending-${apt.id}`, appointmentId: apt.id, doctorName: apt.doctorName, specialty: apt.specialty, appointmentDate: apt.appointmentDate, amount: apt.consultationFee || 0, status: "PENDING", paymentMethod: null, transactionId: null };
        }
      });
      const results = await Promise.all(paymentPromises);
      setPayments(results);
    } catch (e) {
      console.error("Failed to load payments", e);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { if (token) fetchPayments(); }, [token, fetchPayments]);

  const handlePay = async (appointmentId) => {
    if (!transactionId.trim()) {
      setPayError("Please enter a transaction ID.");
      return;
    }
    try {
      setProcessingId(appointmentId);
      setPayError("");
      await processPayment(appointmentId, "MANUAL_TRANSFER", transactionId.trim(), token);
      setPayModal(null);
      setTransactionId("");
      setPaySuccess("Payment submitted successfully! Your appointment is now pending confirmation.");
      setTimeout(() => setPaySuccess(""), 6000);
      fetchPayments();
    } catch (err) {
      setPayError(err.message || "Payment failed. Please try again.");
    } finally {
      setProcessingId(null);
    }
  };

  const openPayModal = (p) => {
    setPayModal({ appointmentId: p.appointmentId, doctorName: p.doctorName, amount: p.amount });
    setTransactionId("");
    setPayError("");
  };

  const statusStyle = (s) => {
    if (s === "COMPLETED") return "bg-green-50 text-green-700";
    if (s === "FAILED") return "bg-red-50 text-red-700";
    if (s === "REFUNDED") return "bg-purple-50 text-purple-700";
    return "bg-yellow-50 text-yellow-700";
  };

  return (
    <DashboardLayout title="Payments" links={PATIENT_LINKS}>
      {paySuccess && (
        <div className="mb-4 flex items-center gap-2 rounded-xl border border-green-100 bg-green-50 px-4 py-3 text-sm text-green-700">
          <svg className="h-4 w-4 shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/></svg>
          {paySuccess}
        </div>
      )}
      {loading ? (
        <div className="text-center py-12 text-gray-500">Loading payments...</div>
      ) : payments.length === 0 ? (
        <div className="text-center py-12 text-gray-500">No payment records found.</div>
      ) : (
        <div className="rounded-2xl bg-white shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b bg-gray-50">
                  <th className="px-6 py-3 font-medium text-gray-500">Doctor</th>
                  <th className="px-6 py-3 font-medium text-gray-500">Date</th>
                  <th className="px-6 py-3 font-medium text-gray-500">Amount</th>
                  <th className="px-6 py-3 font-medium text-gray-500">Status</th>
                  <th className="px-6 py-3 font-medium text-gray-500">Transaction ID</th>
                  <th className="px-6 py-3 font-medium text-gray-500">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {payments.map(p => (
                  <tr key={p.id || p.appointmentId}>
                    <td className="px-6 py-4">
                      <div className="font-medium text-gray-900">{p.doctorName}</div>
                      <div className="text-gray-500 text-xs">{p.specialty}</div>
                    </td>
                    <td className="px-6 py-4 text-gray-700">{p.appointmentDate || (p.paymentDate ? new Date(p.paymentDate).toLocaleDateString() : "—")}</td>
                    <td className="px-6 py-4 font-medium text-gray-900">&#2547;{Number(p.amount || 0).toFixed(2)}</td>
                    <td className="px-6 py-4">
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${statusStyle(p.status)}`}>{p.status}</span>
                    </td>
                    <td className="px-6 py-4 text-gray-500 text-xs font-mono">{p.transactionId || "—"}</td>
                    <td className="px-6 py-4">
                      {p.status === "PENDING" && (
                        <button onClick={() => openPayModal(p)}
                          className="rounded-lg bg-primary-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-primary-700">
                          Pay to Confirm
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Payment Modal */}
      {payModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setPayModal(null)}>
          <div className="mx-4 w-full max-w-md rounded-2xl bg-white shadow-xl overflow-hidden" onClick={e => e.stopPropagation()}>
            {/* Modal Header */}
            <div className="bg-primary-600 p-6 text-white">
              <h3 className="text-lg font-bold">Complete Payment</h3>
              <p className="text-primary-100 text-sm mt-1"> {payModal.doctorName}</p>
            </div>

            <div className="p-6 space-y-5">
              {/* Amount */}
              <div className="flex items-center justify-between rounded-xl bg-gray-50 border border-gray-100 p-4">
                <span className="text-sm text-gray-600">Amount to Pay</span>
                <span className="text-xl font-bold text-gray-900">&#2547;{Number(payModal.amount || 0).toFixed(2)}</span>
              </div>

              {/* Instructions */}
              <div className="rounded-xl bg-primary-50 border border-primary-100 p-4 text-sm">
                <p className="font-semibold text-primary-800 mb-2">Payment Instructions</p>
                <ol className="list-decimal list-inside space-y-1 text-primary-700">
                  <li>Send the amount via bKash / Nagad / Bank Transfer</li>
                  <li>Copy the Transaction ID from your payment receipt</li>
                  <li>Paste the Transaction ID below and click Confirm</li>
                </ol>
              </div>

              {/* Transaction ID Input */}
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">Transaction ID</label>
                <input
                  type="text"
                  value={transactionId}
                  onChange={(e) => { setTransactionId(e.target.value); setPayError(""); }}
                  placeholder="e.g. TXN123456789"
                  autoFocus
                  className="w-full rounded-xl border border-gray-200 bg-gray-50/50 px-4 py-3 text-sm transition focus:border-primary-500 focus:bg-white focus:ring-4 focus:ring-primary-500/10 outline-none placeholder:text-gray-400"
                />
              </div>

              {/* Error */}
              {payError && (
                <div className="flex items-center gap-2 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
                  <svg className="h-4 w-4 shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd"/></svg>
                  {payError}
                </div>
              )}

              {/* Buttons */}
              <div className="flex gap-3">
                <button onClick={() => setPayModal(null)}
                  className="flex-1 rounded-xl border border-gray-200 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition">
                  Cancel
                </button>
                <button onClick={() => handlePay(payModal.appointmentId)}
                  disabled={processingId === payModal.appointmentId || !transactionId.trim()}
                  className="flex-1 rounded-xl bg-primary-600 py-3 text-sm font-semibold text-white shadow-lg shadow-primary-500/25 transition hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed">
                  {processingId === payModal.appointmentId ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
                      Processing...
                    </span>
                  ) : "Confirm Payment"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
