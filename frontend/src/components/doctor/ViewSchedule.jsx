import { useState, useEffect, useCallback } from "react";
import DashboardLayout from "../common/DashboardLayout";
import { useAuth } from "../../context/AuthenticationContext";
import { DOCTOR_LINKS } from "./DoctorDashboard";
import { getMySchedules } from "../../api/doctorApi";

export default function ViewSchedule() {
  const { token } = useAuth();
  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchSchedules = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getMySchedules(token);
      setSchedules(data);
    } catch (e) {
      console.error("Failed to load schedules", e);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (token) fetchSchedules();
  }, [token, fetchSchedules]);

  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  const upcomingSchedules = [...schedules].filter((s) => s.scheduleDate >= today).sort((a, b) => (a.scheduleDate > b.scheduleDate ? 1 : -1));
  const pastSchedules = [...schedules].filter((s) => s.scheduleDate < today).sort((a, b) => (b.scheduleDate > a.scheduleDate ? 1 : -1));

  return (
    <DashboardLayout title="My Schedule" links={DOCTOR_LINKS}>
      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-bold text-gray-900">My Schedule</h2>
          <p className="text-sm text-gray-500 mt-1">View your upcoming and past schedules. Schedules are managed by your assistant.</p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-600"></div></div>
        ) : schedules.length === 0 ? (
          <div className="rounded-2xl bg-white p-10 shadow-sm flex flex-col items-center text-center gap-4">
            <span className="text-5xl"></span>
            <h3 className="text-xl font-bold text-gray-900">No Schedules</h3>
            <p className="text-gray-500 max-w-md">Your assistant has not created any schedules yet. Ask your assistant to set up your availability.</p>
          </div>
        ) : (
          <>
            {upcomingSchedules.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Upcoming ({upcomingSchedules.length})</h3>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {upcomingSchedules.map((s) => <ScheduleCard key={s.id} schedule={s} />)}
                </div>
              </div>
            )}
            {pastSchedules.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold text-gray-500 mb-3">Past ({pastSchedules.length})</h3>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {pastSchedules.map((s) => <ScheduleCard key={s.id} schedule={s} isPast />)}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </DashboardLayout>
  );
}

function ScheduleCard({ schedule, isPast }) {
  const bookedPercent = schedule.maxPatients > 0 ? Math.round((schedule.bookedCount / schedule.maxPatients) * 100) : 0;
  const isFull = schedule.bookedCount >= schedule.maxPatients;

  return (
    <div className={`rounded-2xl border bg-white p-5 shadow-sm ${isPast ? "opacity-60" : ""} ${isFull && !isPast ? "border-red-200" : "border-gray-100"}`}>
      <div className="mb-3">
        <p className="text-lg font-bold text-gray-900">
          {new Date(schedule.scheduleDate + "T00:00:00").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" })}
        </p>
        <p className="text-sm text-gray-500 mt-0.5">{formatTime(schedule.startTime)}  {formatTime(schedule.endTime)}</p>
      </div>
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600">Patients Booked</span>
          <span className={`font-semibold ${isFull && !isPast ? "text-red-600" : "text-gray-900"}`}>{schedule.bookedCount} / {schedule.maxPatients}</span>
        </div>
        <div className="w-full bg-gray-100 rounded-full h-2">
          <div className={`h-2 rounded-full transition-all ${isFull ? "bg-red-500" : bookedPercent > 80 ? "bg-yellow-500" : "bg-primary-500"}`} style={{ width: `${Math.min(bookedPercent, 100)}%` }} />
        </div>
        {isFull && !isPast && <p className="text-xs font-medium text-red-600">Fully booked</p>}
      </div>
    </div>
  );
}

function formatTime(time) {
  if (!time) return "";
  const [h, m] = String(time).split(":");
  const hour = parseInt(h, 10);
  const ampm = hour >= 12 ? "PM" : "AM";
  const h12 = hour % 12 || 12;
  return `${h12}:${m} ${ampm}`;
}
