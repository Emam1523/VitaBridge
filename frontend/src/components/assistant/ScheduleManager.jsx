import { useState, useEffect, useCallback } from "react";
import DashboardLayout from "../common/DashboardLayout";
import { useAuth } from "../../context/AuthenticationContext";
import { ASSISTANT_LINKS } from "./AssistantDashboard";
import {
  getMyDoctorSchedules,
  createSchedule,
  deleteSchedule,
  stopSchedule,
  resumeSchedule,
} from "../../api/assistantApi";

export default function ScheduleManager() {
  const { token } = useAuth();
  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(null);
  const [stopLoading, setStopLoading] = useState(null);
  const [error, setError] = useState(null);
  const [loadError, setLoadError] = useState(null);

  const [scheduleDate, setScheduleDate] = useState("");
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("17:00");
  const [maxPatients, setMaxPatients] = useState(50);

  const fetchSchedules = useCallback(async () => {
    try {
      setLoading(true);
      setLoadError(null);
      const data = await getMyDoctorSchedules(token);
      setSchedules(data);
    } catch (e) {
      console.error("Failed to load schedules", e);
      setLoadError(e.message || "Failed to load schedules.");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (token) fetchSchedules();
  }, [token, fetchSchedules]);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!scheduleDate || !startTime || !endTime) {
      setError("Please fill in all fields.");
      return;
    }
    if (startTime >= endTime) {
      setError("End time must be after start time.");
      return;
    }
    try {
      setFormLoading(true);
      setError(null);
      await createSchedule({ scheduleDate, startTime, endTime, maxPatients: Number(maxPatients) || 50 }, token);
      setShowForm(false);
      setScheduleDate("");
      setStartTime("09:00");
      setEndTime("17:00");
      setMaxPatients(50);
      fetchSchedules();
    } catch (err) {
      setError(err.message || "Failed to create schedule.");
    } finally {
      setFormLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this schedule?")) return;
    try {
      setDeleteLoading(id);
      await deleteSchedule(id, token);
      fetchSchedules();
    } catch (err) {
      alert(err.message || "Failed to delete schedule.");
    } finally {
      setDeleteLoading(null);
    }
  };

  const handleStop = async (id) => {
    if (!window.confirm("Stop this slot? Patients will not be able to book appointments for this day.")) return;
    try {
      setStopLoading(id);
      await stopSchedule(id, token);
      fetchSchedules();
    } catch (err) {
      alert(err.message || "Failed to stop schedule.");
    } finally {
      setStopLoading(null);
    }
  };

  const handleResume = async (id) => {
    try {
      setStopLoading(id);
      await resumeSchedule(id, token);
      fetchSchedules();
    } catch (err) {
      alert(err.message || "Failed to resume schedule.");
    } finally {
      setStopLoading(null);
    }
  };

  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  const upcomingSchedules = [...schedules].filter((s) => s.scheduleDate >= today).sort((a, b) => (a.scheduleDate > b.scheduleDate ? 1 : -1));
  const pastSchedules = [...schedules].filter((s) => s.scheduleDate < today).sort((a, b) => (b.scheduleDate > a.scheduleDate ? 1 : -1));

  return (
    <DashboardLayout title="Doctor Schedule Management" links={ASSISTANT_LINKS}>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Schedules</h2>
            <p className="text-sm text-gray-500 mt-1">Create and manage doctor&apos;s daily schedules. Patients can only book on dates that have a schedule.</p>
          </div>
          <button onClick={() => { setShowForm(v => !v); setError(null); }} className="inline-flex items-center gap-2 px-4 py-2.5 bg-primary-600 text-white text-sm font-semibold rounded-xl shadow-lg shadow-primary-500/25 hover:shadow-primary-500/40 hover:brightness-110 transition">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
            {showForm ? "Cancel" : "Add Schedule"}
          </button>
        </div>

        {showForm && (
          <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Create New Schedule</h3>
            {error && (
              <div className="mb-4 flex items-center gap-2 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
                <svg className="h-4 w-4 shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" /></svg>
                {error}
              </div>
            )}
            <form onSubmit={handleCreate} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                <input type="date" value={scheduleDate} onChange={(e) => setScheduleDate(e.target.value)} min={today} required className="w-full rounded-xl border border-gray-200 bg-gray-50/50 px-3 py-2.5 text-sm focus:border-primary-500 focus:bg-white focus:ring-4 focus:ring-primary-500/10 outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Start Time</label>
                <input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} required className="w-full rounded-xl border border-gray-200 bg-gray-50/50 px-3 py-2.5 text-sm focus:border-primary-500 focus:bg-white focus:ring-4 focus:ring-primary-500/10 outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">End Time</label>
                <input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} required className="w-full rounded-xl border border-gray-200 bg-gray-50/50 px-3 py-2.5 text-sm focus:border-primary-500 focus:bg-white focus:ring-4 focus:ring-primary-500/10 outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Max Patients</label>
                <input type="number" min="1" max="200" value={maxPatients} onChange={(e) => setMaxPatients(e.target.value)} required className="w-full rounded-xl border border-gray-200 bg-gray-50/50 px-3 py-2.5 text-sm focus:border-primary-500 focus:bg-white focus:ring-4 focus:ring-primary-500/10 outline-none" />
              </div>
              <div className="sm:col-span-2 lg:col-span-4">
                <button type="submit" disabled={formLoading} className="px-6 py-2.5 bg-primary-600 text-white text-sm font-semibold rounded-xl hover:bg-primary-700 transition disabled:opacity-50">
                  {formLoading ? "Creating..." : "Create Schedule"}
                </button>
              </div>
            </form>
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-20"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-600"></div></div>
        ) : loadError ? (
          <div className="rounded-2xl bg-white p-10 shadow-sm flex flex-col items-center text-center gap-4">
            <span className="text-5xl">⚠️</span>
            <h3 className="text-xl font-bold text-red-700">Failed to Load Schedules</h3>
            <p className="text-gray-500 max-w-md">{loadError}</p>
            <button onClick={fetchSchedules} className="px-4 py-2 bg-primary-600 text-white text-sm font-semibold rounded-xl hover:bg-primary-700 transition">Retry</button>
          </div>
        ) : schedules.length === 0 ? (
          <div className="rounded-2xl bg-white p-10 shadow-sm flex flex-col items-center text-center gap-4">
            <span className="text-5xl"></span>
            <h3 className="text-xl font-bold text-gray-900">No Schedules Yet</h3>
            <p className="text-gray-500 max-w-md">Create a schedule to define when the doctor is available. Patients can only book on dates that have a schedule.</p>
          </div>
        ) : (
          <>
            {upcomingSchedules.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Upcoming Schedules ({upcomingSchedules.length})</h3>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {upcomingSchedules.map((s) => <ScheduleCard key={s.id} schedule={s} onDelete={handleDelete} deleteLoading={deleteLoading} onStop={handleStop} onResume={handleResume} stopLoading={stopLoading} />)}
                </div>
              </div>
            )}
            {pastSchedules.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold text-gray-500 mb-3">Past Schedules ({pastSchedules.length})</h3>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {pastSchedules.map((s) => <ScheduleCard key={s.id} schedule={s} onDelete={handleDelete} deleteLoading={deleteLoading} onStop={handleStop} onResume={handleResume} stopLoading={stopLoading} isPast />)}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </DashboardLayout>
  );
}

function ScheduleCard({ schedule, onDelete, deleteLoading, onStop, onResume, stopLoading, isPast }) {
  const bookedPercent = schedule.maxPatients > 0 ? Math.round((schedule.bookedCount / schedule.maxPatients) * 100) : 0;
  const isFull = schedule.bookedCount >= schedule.maxPatients;
  const isStopped = schedule.isActive === false;

  return (
    <div className={`rounded-2xl border bg-white p-5 shadow-sm transition hover:shadow-md ${
      isPast ? "opacity-60" : ""
    } ${
      isStopped && !isPast ? "border-orange-300 bg-orange-50/30" : isFull && !isPast ? "border-red-200" : "border-gray-100"
    }`}>
      <div className="flex items-start justify-between mb-3">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-lg font-bold text-gray-900">
              {new Date(schedule.scheduleDate + "T00:00:00").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" })}
            </p>
            {isStopped && (
              <span className="px-2 py-0.5 rounded-full bg-orange-100 text-orange-700 text-xs font-bold">STOPPED</span>
            )}
          </div>
          <p className="text-sm text-gray-500 mt-0.5">{formatTime(schedule.startTime)} &rarr; {formatTime(schedule.endTime)}</p>
        </div>
        <div className="flex items-center gap-1">
          {!isPast && (
            isStopped ? (
              <button
                onClick={() => onResume(schedule.id)}
                disabled={stopLoading === schedule.id}
                className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-green-100 text-green-700 hover:bg-green-200 transition disabled:opacity-50"
                title="Resume this slot"
              >
                {stopLoading === schedule.id ? "..." : "Resume"}
              </button>
            ) : (
              <button
                onClick={() => onStop(schedule.id)}
                disabled={stopLoading === schedule.id}
                className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-orange-100 text-orange-700 hover:bg-orange-200 transition disabled:opacity-50"
                title="Stop bookings for this slot"
              >
                {stopLoading === schedule.id ? "..." : "Stop"}
              </button>
            )
          )}
          <button onClick={() => onDelete(schedule.id)} disabled={deleteLoading === schedule.id} className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition" title="Delete schedule">
            {deleteLoading === schedule.id ? (
              <div className="w-4 h-4 border-2 border-red-300 border-t-transparent rounded-full animate-spin" />
            ) : (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
            )}
          </button>
        </div>
      </div>
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600">Patients Booked</span>
          <span className={`font-semibold ${isFull && !isPast ? "text-red-600" : "text-gray-900"}`}>{schedule.bookedCount} / {schedule.maxPatients}</span>
        </div>
        <div className="w-full bg-gray-100 rounded-full h-2">
          <div className={`h-2 rounded-full transition-all ${isStopped ? "bg-orange-400" : isFull ? "bg-red-500" : bookedPercent > 80 ? "bg-yellow-500" : "bg-primary-500"}`} style={{ width: `${Math.min(bookedPercent, 100)}%` }} />
        </div>
        {isStopped && !isPast && <p className="text-xs font-medium text-orange-600">Slot stopped — new bookings are blocked</p>}
        {isFull && !isStopped && !isPast && <p className="text-xs font-medium text-red-600">Fully booked for this date</p>}
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
