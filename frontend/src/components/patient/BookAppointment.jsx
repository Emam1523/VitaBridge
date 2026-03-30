import { useState, useEffect } from "react";
import { useLocation, useNavigate, Link } from "react-router-dom";
import { getDoctorById, getDoctorSchedules } from "../../api/doctorApi";
import { bookAppointment } from "../../api/patientApi";
import { initAamarPayPayment } from "../../api/paymentApi";
import { useAuth } from "../../context/AuthenticationContext";
import DashboardLayout from "../common/DashboardLayout";
import { PATIENT_LINKS } from "./patientLinks";

const CONSULTATION_TYPES = [
  { value: "OFFLINE", label: "In-Person", icon: "🏥", desc: "Visit the clinic in person" },
  { value: "ONLINE", label: "Online", icon: "💻", desc: "Video, audio or chat consultation" },
];

export default function BookAppointment() {
  const { search } = useLocation();
  const navigate = useNavigate();
  const { token } = useAuth();
  const doctorId = new URLSearchParams(search).get("doctor");

  const [doctor, setDoctor] = useState(null);
  const [schedules, setSchedules] = useState([]);
  const [selectedDate, setSelectedDate] = useState("");
  const [consultationType, setConsultationType] = useState("OFFLINE");
  const [reason, setReason] = useState("");
  const [bookingLoading, setBookingLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  // Load doctor info and schedules
  useEffect(() => {
    if (!doctorId) return;
    getDoctorById(doctorId).then(setDoctor).catch(() => setError("Failed to load doctor"));
    getDoctorSchedules(doctorId).then(setSchedules).catch(() => {});
  }, [doctorId]);

  // Check selected date availability
  const selectedSchedule = schedules.find((s) => s.scheduleDate === selectedDate && s.isActive !== false);
  const isFull = selectedSchedule ? selectedSchedule.bookedCount >= selectedSchedule.maxPatients : false;
  const hasSchedule = selectedSchedule != null;
  const remainingSlots = selectedSchedule ? selectedSchedule.maxPatients - selectedSchedule.bookedCount : 0;

  // Time-window check: for today's date verify we are within the schedule's open hours
  const todayStr = new Date().toISOString().slice(0, 10);
  const isToday = selectedDate === todayStr;
  const scheduleTimeStatus = (() => {
    if (!hasSchedule || !isToday) return "ok";
    const now = new Date();
    const nowMins = now.getHours() * 60 + now.getMinutes();
    const parseTime = (t) => {
      if (!t) return null;
      const [h, m] = String(t).split(":").map(Number);
      return h * 60 + (m || 0);
    };
    const startMins = parseTime(selectedSchedule.startTime);
    const endMins = parseTime(selectedSchedule.endTime);
    if (startMins !== null && nowMins < startMins) return "before";
    if (endMins !== null && nowMins > endMins) return "after";
    return "ok";
  })();
  const isBookingTimeOpen = scheduleTimeStatus === "ok";

  const handleBook = async (e) => {
    e.preventDefault();
    if (!selectedDate || !reason.trim()) {
      setError("Please fill in all required fields.");
      return;
    }
    if (!hasSchedule) {
      setError("Doctor has no schedule for this date. Please select a different date.");
      return;
    }
    if (isFull) {
      setError("This date is fully booked. Maximum " + selectedSchedule.maxPatients + " patients allowed. Please choose another date.");
      return;
    }
    if (!isBookingTimeOpen) {
      setError(
        scheduleTimeStatus === "before"
          ? `Booking for today opens at ${String(selectedSchedule.startTime).slice(0, 5)}.`
          : `Booking for today closed at ${String(selectedSchedule.endTime).slice(0, 5)}. Please choose another date.`
      );
      return;
    }

    try {
      setBookingLoading(true);
      setError(null);
      const payload = {
        doctorId: doctorId,
        appointmentDate: selectedDate,
        reason,
        consultationType,
      };
      const booked = await bookAppointment(payload, token);

      try {
        const payData = await initAamarPayPayment(booked.id, token);
        if (payData && payData.paymentUrl) {
          window.location.href = payData.paymentUrl;
          return;
        }
      } catch {
        setError("Appointment booked, but payment could not be initialized. Please complete payment from your appointments page.");
        setTimeout(() => navigate("/patient/appointments"), 4000);
        return;
      }

      setSuccess(true);
      setTimeout(() => navigate("/patient/appointments"), 2000);
    } catch (err) {
      setError(err.message || "Booking failed. Please try again.");
    } finally {
      setBookingLoading(false);
    }
  };

  if (!doctorId) {
    return (
      <DashboardLayout title="Book Appointment" links={PATIENT_LINKS}>
        <div className="flex flex-col items-center py-16">
          <span className="text-5xl mb-4">🩺</span>
          <p className="text-gray-500 font-medium">No doctor selected.</p>
          <Link to="/patient/doctors" className="mt-3 text-sm font-semibold text-primary-600 hover:text-primary-700">Browse doctors &rarr;</Link>
        </div>
      </DashboardLayout>
    );
  }

  if (success) {
    return (
      <DashboardLayout title="Book Appointment" links={PATIENT_LINKS}>
        <div className="flex flex-col items-center py-16">
          <span className="text-5xl mb-4">✅</span>
          <h2 className="text-xl font-bold text-gray-900">Appointment Booked!</h2>
          <p className="text-gray-500 mt-2">Please complete payment from your appointments page to confirm. Redirecting...</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Book Appointment" links={PATIENT_LINKS}>
      <div className="mx-auto max-w-3xl">
        <div className="rounded-2xl border border-gray-100 bg-white shadow-sm overflow-hidden">
          {/* Doctor Header */}
          {doctor && (
            <div className="bg-primary-600 p-6 text-white">
              <div className="flex items-center gap-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/20 text-2xl font-bold backdrop-blur">
                  {doctor.name.charAt(0)}
                </div>
                <div>
                  <h2 className="text-xl font-bold"> {doctor.name}</h2>
                  <p className="text-primary-100">{doctor.specialty}</p>
                  {doctor.consultationFee != null && (
                    <p className="mt-1 text-sm text-primary-200">Consultation Fee: &#2547;{doctor.consultationFee}</p>
                  )}
                </div>
              </div>
            </div>
          )}

          <div className="p-6 md:p-8">
            {error && (
              <div className="mb-6 flex items-center gap-2 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
                <svg className="h-4 w-4 shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd"/></svg>
                {error}
              </div>
            )}

            <form onSubmit={handleBook} className="space-y-6">
              {/* Consultation Type */}
              <div>
                <label className="mb-2 block text-sm font-semibold text-gray-900">Consultation Type</label>
                <div className="grid grid-cols-2 gap-3">
                  {CONSULTATION_TYPES.map((ct) => (
                    <button key={ct.value} type="button" onClick={() => setConsultationType(ct.value)}
                      className={`rounded-xl border-2 p-4 text-center transition ${
                        consultationType === ct.value
                          ? "border-primary-500 bg-primary-50 ring-4 ring-primary-500/10"
                          : "border-gray-100 bg-white hover:border-primary-200 hover:bg-primary-50/50"
                      }`}>
                      <span className="text-3xl block">{ct.icon}</span>
                      <span className="mt-2 block text-sm font-bold text-gray-900">{ct.label}</span>
                      <span className="block text-xs text-gray-500 mt-0.5">{ct.desc}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Info Banner */}
              <div className="flex items-start gap-3 rounded-xl bg-primary-50 border border-primary-100 p-4">
                <span className="text-xl">📋</span>
                <div className="text-sm">
                  <p className="font-semibold text-primary-800">How Booking Works</p>
                  <p className="text-primary-700 mt-0.5">
                    Select your preferred date and click "Book Appointment". You will be redirected to complete payment — your appointment is confirmed only after successful payment.
                    {consultationType === "ONLINE"
                      ? " For online consultations, the doctor will unlock the session when it is your turn — then you can start video, audio call, or live chat."
                      : " For in-person visits, arrive at the clinic on your scheduled date. Patients are seen in serial number order."}
                  </p>
                </div>
              </div>

              {/* Date */}
              <div>
                <label className="mb-2 block text-sm font-semibold text-gray-900">Select Date</label>
                <input type="date" min={(() => { const n = new Date(); return `${n.getFullYear()}-${String(n.getMonth()+1).padStart(2,"0")}-${String(n.getDate()).padStart(2,"0")}`; })()} value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)} required
                  className="w-full rounded-xl border border-gray-200 bg-gray-50/50 px-4 py-2.5 text-sm transition focus:border-primary-500 focus:bg-white focus:ring-4 focus:ring-primary-500/10 outline-none" />

                {/* Schedule availability indicator */}
                {selectedDate && !hasSchedule && (
                  <div className="mt-2 flex items-center gap-2 rounded-lg bg-amber-50 border border-amber-200 px-3 py-2">
                    <span className="text-amber-500 text-lg">⚠️</span>
                    <p className="text-sm text-amber-700">Doctor has no schedule on this date. Please choose another date.</p>
                  </div>
                )}

                {selectedDate && hasSchedule && isFull && (
                  <div className="mt-2 flex items-center gap-2 rounded-lg bg-red-50 border border-red-200 px-3 py-2">
                    <span className="text-red-500 text-lg">🚫</span>
                    <p className="text-sm text-red-700 font-semibold">Fully booked! Maximum {selectedSchedule.maxPatients} patients reached for this date.</p>
                  </div>
                )}

                {selectedDate && hasSchedule && !isFull && (
                  <div className={`mt-2 rounded-lg border px-3 py-2.5 ${isBookingTimeOpen ? "bg-green-50 border-green-200" : scheduleTimeStatus === "before" ? "bg-amber-50 border-amber-200" : "bg-red-50 border-red-200"}`}>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className={`text-sm font-medium ${isBookingTimeOpen ? "text-green-800" : scheduleTimeStatus === "before" ? "text-amber-800" : "text-red-800"}`}>
                        {isBookingTimeOpen ? "✅ Schedule available" : scheduleTimeStatus === "before" ? "⏳ Not yet open" : "🚫 Booking closed"}
                      </span>
                      <span className="text-xs text-gray-600">
                        {String(selectedSchedule.startTime).slice(0, 5)} – {String(selectedSchedule.endTime).slice(0, 5)}
                      </span>
                    </div>
                    {isToday && !isBookingTimeOpen && (
                      <p className={`text-xs mb-1.5 ${scheduleTimeStatus === "before" ? "text-amber-700" : "text-red-700"}`}>
                        {scheduleTimeStatus === "before"
                          ? `Booking opens at ${String(selectedSchedule.startTime).slice(0, 5)}. Please come back then.`
                          : `Booking for today ended at ${String(selectedSchedule.endTime).slice(0, 5)}. Please select a future date.`}
                      </p>
                    )}
                    {isBookingTimeOpen && (
                      <>
                        <div className="w-full bg-green-200 rounded-full h-2">
                          <div className="bg-green-500 h-2 rounded-full transition-all" style={{ width: `${(selectedSchedule.bookedCount / selectedSchedule.maxPatients) * 100}%` }}></div>
                        </div>
                        <p className="text-xs text-green-700 mt-1">{remainingSlots} of {selectedSchedule.maxPatients} slots remaining</p>
                      </>
                    )}
                  </div>
                )}
              </div>

              {/* Reason */}
              <div>
                <label className="mb-2 block text-sm font-semibold text-gray-900">Reason for Visit</label>
                <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={3} required
                  placeholder="Briefly describe your symptoms or reason..."
                  className="w-full rounded-xl border border-gray-200 bg-gray-50/50 px-4 py-2.5 text-sm transition focus:border-primary-500 focus:bg-white focus:ring-4 focus:ring-primary-500/10 outline-none placeholder:text-gray-400" />
              </div>

              {/* Fee reminder */}
              {doctor?.consultationFee != null && (
                <div className="flex items-center justify-between rounded-xl bg-gray-50 border border-gray-100 p-4">
                  <span className="text-sm text-gray-600">Consultation Fee</span>
                  <span className="text-lg font-bold text-gray-900">&#2547;{doctor.consultationFee}</span>
                </div>
              )}

              <button type="submit" disabled={bookingLoading || !selectedDate || !reason.trim() || !hasSchedule || isFull || !isBookingTimeOpen}
                className="w-full rounded-xl bg-primary-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-primary-500/25 transition hover:shadow-primary-500/40 hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50">
                {bookingLoading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
                    Booking & Redirecting to Payment...
                  </span>
                ) : "💳 Book & Pay to Confirm"}
              </button>
              <p className="text-center text-xs text-gray-400">You will be redirected to a secure payment page to confirm your appointment.</p>
            </form>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
