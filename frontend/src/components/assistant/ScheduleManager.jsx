import { useState, useEffect, useCallback, useMemo } from "react";
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

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const HOUR_SLOTS = Array.from({ length: 24 }, (_, i) => i);

function toDateKey(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function fromDateKey(dateKey) {
  return new Date(`${dateKey}T00:00:00`);
}

function monthTitle(date) {
  return date.toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

function weekTitle(dateKey) {
  const anchor = fromDateKey(dateKey);
  const start = new Date(anchor);
  start.setDate(start.getDate() - start.getDay());
  const end = new Date(start);
  end.setDate(start.getDate() + 6);

  if (start.getMonth() === end.getMonth()) {
    return `${start.toLocaleDateString("en-US", {
      month: "long",
    })} ${start.getDate()}-${end.getDate()}, ${end.getFullYear()}`;
  }

  return `${start.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  })} - ${end.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })}`;
}

function formatHumanDate(dateKey) {
  return fromDateKey(dateKey).toLocaleDateString("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatTime(time) {
  if (!time) return "";
  const [h, m] = String(time).split(":");
  const hour = parseInt(h, 10);
  const ampm = hour >= 12 ? "PM" : "AM";
  const h12 = hour % 12 || 12;
  return `${h12}:${m} ${ampm}`;
}

function hourLabel(hour) {
  const ampm = hour >= 12 ? "PM" : "AM";
  const h12 = hour % 12 || 12;
  return `${h12}:00 ${ampm}`;
}

function buildCalendarDays(viewMonth) {
  const firstDay = new Date(viewMonth.getFullYear(), viewMonth.getMonth(), 1);
  const lastDay = new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1, 0);

  const gridStart = new Date(firstDay);
  gridStart.setDate(firstDay.getDate() - firstDay.getDay());

  const gridEnd = new Date(lastDay);
  gridEnd.setDate(lastDay.getDate() + (6 - lastDay.getDay()));

  const days = [];
  const current = new Date(gridStart);
  while (current <= gridEnd) {
    days.push(new Date(current));
    current.setDate(current.getDate() + 1);
  }

  return days;
}

function buildWeekDays(anchorDateKey) {
  const anchor = fromDateKey(anchorDateKey);
  const start = new Date(anchor);
  start.setDate(start.getDate() - start.getDay());

  return Array.from({ length: 7 }, (_, i) => {
    const day = new Date(start);
    day.setDate(start.getDate() + i);
    return day;
  });
}

export default function ScheduleManager() {
  const { token } = useAuth();

  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);

  const today = useMemo(() => toDateKey(new Date()), []);
  const [viewMode, setViewMode] = useState("month");
  const [viewMonth, setViewMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [selectedDate, setSelectedDate] = useState(today);

  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("17:00");
  const [consultationMode, setConsultationMode] = useState("BOTH");
  const [maxPatients, setMaxPatients] = useState(50);
  const [formLoading, setFormLoading] = useState(false);
  const [error, setError] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(null);
  const [stopLoading, setStopLoading] = useState(null);
  const [dragRange, setDragRange] = useState(null);
  const [dragging, setDragging] = useState(false);

  const fetchSchedules = useCallback(async () => {
    try {
      setLoading(true);
      setLoadError(null);
      const data = await getMyDoctorSchedules(token);
      setSchedules(data || []);
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

  const scheduleByDate = useMemo(() => {
    const map = new Map();
    for (const s of schedules) {
      map.set(s.scheduleDate, s);
    }
    return map;
  }, [schedules]);

  const selectedSchedule = scheduleByDate.get(selectedDate) || null;
  const isPastSelectedDate = selectedDate < today;

  const calendarDays = useMemo(() => buildCalendarDays(viewMonth), [viewMonth]);
  const weekDays = useMemo(() => buildWeekDays(selectedDate), [selectedDate]);

  const syncCalendarToDate = useCallback((dateKey) => {
    const d = fromDateKey(dateKey);
    setViewMonth(new Date(d.getFullYear(), d.getMonth(), 1));
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!selectedDate || !startTime || !endTime) {
      setError("Please fill in all fields.");
      return;
    }
    if (selectedDate < today) {
      setError("Cannot create schedule in past dates.");
      return;
    }
    if (startTime >= endTime) {
      setError("End time must be after start time.");
      return;
    }

    try {
      setFormLoading(true);
      setError(null);
      await createSchedule(
        {
          scheduleDate: selectedDate,
          startTime,
          endTime,
          consultationMode,
          maxPatients: Number(maxPatients) || 50,
        },
        token
      );
      await fetchSchedules();
    } catch (err) {
      setError(err.message || "Failed to create schedule.");
    } finally {
      setFormLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this slot? This cannot be undone.")) return;
    try {
      setDeleteLoading(id);
      await deleteSchedule(id, token);
      await fetchSchedules();
    } catch (err) {
      alert(err.message || "Failed to delete schedule.");
    } finally {
      setDeleteLoading(null);
    }
  };

  const handleStop = async (id) => {
    if (!window.confirm("Stop this slot? Patients will not be able to book this date.")) return;
    try {
      setStopLoading(id);
      await stopSchedule(id, token);
      await fetchSchedules();
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
      await fetchSchedules();
    } catch (err) {
      alert(err.message || "Failed to resume schedule.");
    } finally {
      setStopLoading(null);
    }
  };

  const onHourPointerDown = (hour) => {
    setDragging(true);
    setDragRange({ start: hour, end: hour });
  };

  const onHourPointerEnter = (hour) => {
    if (!dragging) return;
    setDragRange((prev) => {
      if (!prev) return { start: hour, end: hour };
      return {
        start: Math.min(prev.start, hour),
        end: Math.max(prev.start, hour),
      };
    });
  };

  const onHourPointerUp = () => {
    if (dragging && dragRange) {
      const startHour = String(dragRange.start).padStart(2, "0");
      const endHour = String(dragRange.end + 1).padStart(2, "0");
      setStartTime(`${startHour}:00`);
      setEndTime(`${endHour}:00`);
    }
    setDragging(false);
  };

  const goPrevMonth = () => {
    if (viewMode === "month") {
      setViewMonth((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1));
      return;
    }

    const d = fromDateKey(selectedDate);
    d.setDate(d.getDate() - 7);
    const key = toDateKey(d);
    setSelectedDate(key);
    syncCalendarToDate(key);
  };

  const goNextMonth = () => {
    if (viewMode === "month") {
      setViewMonth((d) => new Date(d.getFullYear(), d.getMonth() + 1, 1));
      return;
    }

    const d = fromDateKey(selectedDate);
    d.setDate(d.getDate() + 7);
    const key = toDateKey(d);
    setSelectedDate(key);
    syncCalendarToDate(key);
  };

  const selectDate = (dateKey) => {
    setSelectedDate(dateKey);
    syncCalendarToDate(dateKey);
  };

  const dayCell = (day, compact = false) => {
    const dayKey = toDateKey(day);
    const inCurrentMonth = day.getMonth() === viewMonth.getMonth();
    const isSelected = dayKey === selectedDate;
    const isToday = dayKey === today;
    const isPast = dayKey < today;
    const schedule = scheduleByDate.get(dayKey);
    const isStopped = schedule?.isActive === false;

    return (
      <button
        key={dayKey}
        onClick={() => selectDate(dayKey)}
        className={[
          compact ? "min-h-[86px]" : "min-h-[110px]",
          "rounded-xl border p-2 text-left transition",
          inCurrentMonth ? "bg-white" : "bg-gray-50 text-gray-400",
          isSelected ? "border-primary-500 ring-2 ring-primary-200" : "border-gray-100 hover:border-primary-200",
          isPast && !isSelected ? "opacity-70" : "",
        ].join(" ")}
      >
        <div className="flex items-center justify-between">
          <span className={[
            "text-sm font-semibold",
            isToday ? "text-primary-700" : "text-gray-800",
          ].join(" ")}>
            {compact ? `${WEEKDAYS[day.getDay()]} ${day.getDate()}` : day.getDate()}
          </span>
          {isToday && <span className="h-2 w-2 rounded-full bg-primary-500" />}
        </div>

        {schedule ? (
          <div className="mt-2 space-y-1">
            <div className="rounded-md bg-primary-50 px-1.5 py-1 text-[11px] font-medium text-primary-700">
              {formatTime(schedule.startTime)} - {formatTime(schedule.endTime)}
            </div>
            <div className="text-[11px] text-gray-600">
              {schedule.bookedCount}/{schedule.maxPatients} booked
            </div>
                          <div className="text-[11px] font-medium text-gray-500">
                            {schedule.consultationMode || "BOTH"}
                          </div>
            {isStopped && (
              <div className="inline-block rounded bg-orange-100 px-1.5 py-0.5 text-[10px] font-semibold text-orange-700">
                Stopped
              </div>
            )}
          </div>
        ) : (
          <div className="mt-2 text-[11px] text-gray-400">No slot</div>
        )}
      </button>
    );
  };

  return (
    <DashboardLayout title="Doctor Schedule Management" links={ASSISTANT_LINKS}>
      <div className="space-y-6">
        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <h2 className="text-xl font-bold text-gray-900">Calendar Slot Planner</h2>
          <p className="mt-1 text-sm text-gray-500">
            Assistants manage doctor schedules. Select a day on the calendar, then enter the slot start and end times.
          </p>
        </div>

        {loadError && (
          <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
            {loadError}
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="h-10 w-10 animate-spin rounded-full border-b-2 border-primary-600" />
          </div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
            <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm sm:p-6">
              <div className="mb-4 flex items-center justify-between">
                <button
                  onClick={goPrevMonth}
                  className="rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Prev
                </button>
                <h3 className="text-lg font-bold text-gray-900">
                  {viewMode === "month" ? monthTitle(viewMonth) : weekTitle(selectedDate)}
                </h3>
                <button
                  onClick={goNextMonth}
                  className="rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Next
                </button>
              </div>

              <div className="mb-4 inline-flex rounded-lg bg-gray-100 p-1">
                <button
                  onClick={() => setViewMode("month")}
                  className={[
                    "rounded-md px-3 py-1.5 text-sm font-semibold transition",
                    viewMode === "month" ? "bg-white text-gray-900 shadow-sm" : "text-gray-600",
                  ].join(" ")}
                >
                  Month
                </button>
                <button
                  onClick={() => setViewMode("week")}
                  className={[
                    "rounded-md px-3 py-1.5 text-sm font-semibold transition",
                    viewMode === "week" ? "bg-white text-gray-900 shadow-sm" : "text-gray-600",
                  ].join(" ")}
                >
                  Week
                </button>
              </div>

              {viewMode === "month" ? (
                <>
                  <div className="grid grid-cols-7 gap-2 text-center text-xs font-semibold uppercase tracking-wide text-gray-400">
                    {WEEKDAYS.map((d) => (
                      <div key={d} className="py-2">{d}</div>
                    ))}
                  </div>

                  <div className="grid grid-cols-7 gap-2">
                    {calendarDays.map((day) => dayCell(day))}
                  </div>
                </>
              ) : (
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-7">
                  {weekDays.map((day) => dayCell(day, true))}
                </div>
              )}
            </div>

            <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
              <h3 className="text-base font-bold text-gray-900">{formatHumanDate(selectedDate)}</h3>

              {error && (
                <div className="mt-3 rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-700">
                  {error}
                </div>
              )}

              {selectedSchedule ? (
                <div className="mt-4 space-y-3">
                  <div className="rounded-xl bg-gray-50 p-3">
                    <p className="text-sm font-semibold text-gray-800">
                      {formatTime(selectedSchedule.startTime)} - {formatTime(selectedSchedule.endTime)}
                    </p>
                    <p className="mt-1 text-xs text-gray-600">
                      {selectedSchedule.bookedCount} / {selectedSchedule.maxPatients} patients booked
                    </p>
                    <p className="mt-1 text-xs font-medium text-gray-600">
                      Consultation: {selectedSchedule.consultationMode || "BOTH"}
                    </p>
                    <p className="mt-1 text-xs font-medium text-gray-600">
                      Status: {selectedSchedule.isActive ? "Active" : "Stopped"}
                    </p>
                  </div>

                  <div className="flex gap-2">
                    {selectedSchedule.isActive ? (
                      <button
                        onClick={() => handleStop(selectedSchedule.id)}
                        disabled={stopLoading === selectedSchedule.id}
                        className="flex-1 rounded-lg bg-orange-100 px-3 py-2 text-sm font-semibold text-orange-700 hover:bg-orange-200 disabled:opacity-50"
                      >
                        {stopLoading === selectedSchedule.id ? "..." : "Stop"}
                      </button>
                    ) : (
                      <button
                        onClick={() => handleResume(selectedSchedule.id)}
                        disabled={stopLoading === selectedSchedule.id}
                        className="flex-1 rounded-lg bg-green-100 px-3 py-2 text-sm font-semibold text-green-700 hover:bg-green-200 disabled:opacity-50"
                      >
                        {stopLoading === selectedSchedule.id ? "..." : "Resume"}
                      </button>
                    )}

                    <button
                      onClick={() => handleDelete(selectedSchedule.id)}
                      disabled={deleteLoading === selectedSchedule.id}
                      className="flex-1 rounded-lg bg-red-100 px-3 py-2 text-sm font-semibold text-red-700 hover:bg-red-200 disabled:opacity-50"
                    >
                      {deleteLoading === selectedSchedule.id ? "..." : "Delete"}
                    </button>
                  </div>
                </div>
              ) : isPastSelectedDate ? (
                <div className="mt-4 rounded-xl bg-gray-50 p-3 text-sm text-gray-600">
                  Cannot create schedule for a past date.
                </div>
              ) : (
                <form onSubmit={handleCreate} className="mt-4 space-y-3">
                  <div>
                    <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Drag To Pick Time Range
                    </label>
                    <div
                      onPointerLeave={onHourPointerUp}
                      onPointerUp={onHourPointerUp}
                      className="max-h-52 overflow-y-auto rounded-lg border border-gray-200 p-2"
                    >
                      <div className="space-y-1">
                        {HOUR_SLOTS.map((hour) => {
                          const inRange = dragRange && hour >= dragRange.start && hour <= dragRange.end;
                          return (
                            <button
                              type="button"
                              key={hour}
                              onPointerDown={() => onHourPointerDown(hour)}
                              onPointerEnter={() => onHourPointerEnter(hour)}
                              className={[
                                "w-full rounded px-2 py-1.5 text-left text-xs font-medium transition",
                                inRange ? "bg-primary-100 text-primary-800" : "bg-gray-50 text-gray-700 hover:bg-gray-100",
                              ].join(" ")}
                            >
                              {hourLabel(hour)}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                    <p className="mt-1 text-[11px] text-gray-500">
                      Click and drag over hours to set start/end quickly.
                    </p>
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Start Time
                    </label>
                    <input
                      type="time"
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                      required
                      className="w-full rounded-lg border border-gray-200 bg-gray-50/50 px-3 py-2 text-sm focus:border-primary-500 focus:bg-white focus:ring-4 focus:ring-primary-500/10 outline-none"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500">
                      End Time
                    </label>
                    <input
                      type="time"
                      value={endTime}
                      onChange={(e) => setEndTime(e.target.value)}
                      required
                      className="w-full rounded-lg border border-gray-200 bg-gray-50/50 px-3 py-2 text-sm focus:border-primary-500 focus:bg-white focus:ring-4 focus:ring-primary-500/10 outline-none"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Consultation Type
                    </label>
                    <select
                      value={consultationMode}
                      onChange={(e) => setConsultationMode(e.target.value)}
                      className="w-full rounded-lg border border-gray-200 bg-gray-50/50 px-3 py-2 text-sm focus:border-primary-500 focus:bg-white focus:ring-4 focus:ring-primary-500/10 outline-none"
                    >
                      <option value="BOTH">Both</option>
                      <option value="ONLINE">Online only</option>
                      <option value="OFFLINE">Offline only</option>
                    </select>
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Max Patients
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="200"
                      value={maxPatients}
                      onChange={(e) => setMaxPatients(e.target.value)}
                      required
                      className="w-full rounded-lg border border-gray-200 bg-gray-50/50 px-3 py-2 text-sm focus:border-primary-500 focus:bg-white focus:ring-4 focus:ring-primary-500/10 outline-none"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={formLoading}
                    className="w-full rounded-lg bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary-700 disabled:opacity-50"
                  >
                    {formLoading ? "Creating..." : "Create Slot"}
                  </button>
                </form>
              )}
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
