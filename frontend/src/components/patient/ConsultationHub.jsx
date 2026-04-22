import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import DashboardLayout from "../common/DashboardLayout";
import { useAuth } from "../../context/AuthenticationContext";
import { getAppointments } from "../../api/patientApi";
import { PATIENT_LINKS } from "./patientLinks";

export default function ConsultationHub() {
  const { token } = useAuth();
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dateFilter, setDateFilter] = useState("TODAY");

  const todayKey = useMemo(() => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, "0");
    const d = String(now.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        setLoading(true);
        const data = await getAppointments(token);
        if (!cancelled) setAppointments(data || []);
      } catch {
        if (!cancelled) setAppointments([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    if (token) load();
    return () => {
      cancelled = true;
    };
  }, [token]);

  const confirmedConsultations = useMemo(
    () =>
      appointments
        .filter((a) => a.status === "CONFIRMED" && a.consultationType === "ONLINE")
        .sort((a, b) => String(a.appointmentDate).localeCompare(String(b.appointmentDate))),
    [appointments],
  );

  const todayConsultations = useMemo(
    () => confirmedConsultations.filter((a) => a.appointmentDate === todayKey),
    [confirmedConsultations, todayKey],
  );

  const upcomingConsultations = useMemo(
    () => confirmedConsultations.filter((a) => String(a.appointmentDate) > todayKey),
    [confirmedConsultations, todayKey],
  );

  const consultationAppointments =
    dateFilter === "TODAY" ? todayConsultations : upcomingConsultations;

  return (
    <DashboardLayout title="Consultations" links={PATIENT_LINKS}>
      <div className="space-y-6">
        <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary-700 via-primary-600 to-teal-500 p-6 text-white shadow-lg md:p-8">
          <div className="pointer-events-none absolute -right-12 -top-12 h-40 w-40 rounded-full bg-white/10 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-16 -left-12 h-48 w-48 rounded-full bg-white/10 blur-3xl" />
          <div className="relative flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl">
              <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold text-white/90 backdrop-blur">
                Video consultations
              </div>
              <h3 className="text-2xl font-bold md:text-3xl">My Consultations</h3>
              <p className="mt-2 max-w-xl text-sm leading-6 text-white/85 md:text-base">
                View your upcoming online sessions in one calm place and join when it’s time.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <Link
                to="/patient/appointments"
                className="rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-primary-700 shadow-md shadow-black/10 transition hover:brightness-95"
              >
                View Appointments
              </Link>
            </div>
          </div>

          <div className="relative mt-6 grid gap-3 sm:grid-cols-3">
            {[
              { label: "Today", value: todayConsultations.length },
              { label: "Upcoming", value: upcomingConsultations.length },
              { label: "Total online", value: confirmedConsultations.length },
            ].map((item) => (
              <div key={item.label} className="rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur-sm">
                <p className="text-xs uppercase tracking-[0.18em] text-white/70">{item.label}</p>
                <p className="mt-2 text-2xl font-bold">{item.value}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-3xl border border-gray-100 bg-white p-5 shadow-sm md:p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-wrap gap-2">
              {[
                { key: "TODAY", label: "Today" },
                { key: "UPCOMING", label: "Upcoming" },
              ].map((item) => (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => setDateFilter(item.key)}
                  className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                    dateFilter === item.key
                      ? "bg-primary-600 text-white shadow-md shadow-primary-500/20"
                      : "bg-gray-50 text-gray-700 border border-gray-200 hover:bg-gray-100"
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>

            <Link
              to="/patient/doctors"
              className="inline-flex items-center justify-center rounded-full border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 transition hover:border-primary-200 hover:text-primary-700"
            >
              Find Doctor
            </Link>
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-2 text-xs text-gray-500">
            <span className="rounded-full bg-gray-100 px-3 py-1">Today means appointments on the current date</span>
            <span className="rounded-full bg-gray-100 px-3 py-1">Upcoming means future confirmed online sessions</span>
          </div>
        </section>

        {loading ? (
          <div className="rounded-3xl border border-gray-100 bg-white py-16 text-center shadow-sm">
            <svg className="mx-auto h-8 w-8 animate-spin text-primary-400" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
            <p className="mt-4 text-sm text-gray-500">Loading consultations...</p>
          </div>
        ) : consultationAppointments.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-gray-200 bg-white py-16 text-center shadow-sm">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary-50 text-2xl">🎥</div>
            <p className="mt-4 text-lg font-semibold text-gray-900">
              {dateFilter === "TODAY" ? "No consultations for today" : "No upcoming consultations"}
            </p>
            <p className="mt-2 text-sm text-gray-500">
              Your confirmed online sessions will appear here.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {consultationAppointments.map((apt) => (
              <div
                key={apt.id}
                className="group flex flex-col gap-4 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md sm:flex-row sm:items-center"
              >
                <div className="flex items-center gap-3 sm:flex-1">
                  <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br from-primary-100 to-teal-100 text-sm font-bold text-primary-700">
                    {apt.doctorProfileImageUrl ? (
                      <img
                        src={apt.doctorProfileImageUrl}
                        alt={apt.doctorName}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      (apt.doctorName || "D")[0]
                    )}
                  </div>

                  <div className="min-w-0">
                    <p className="truncate font-semibold text-gray-900">{apt.doctorName}</p>
                    <p className="text-xs text-gray-500">{apt.specialty}</p>
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-gray-500">
                      <span>{apt.appointmentDate}</span>
                      {apt.serialNumber && <span>Serial #{apt.serialNumber}</span>}
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                  <span className="inline-flex items-center rounded-full bg-primary-50 px-3 py-1 text-xs font-semibold text-primary-700">
                    Online consultation
                  </span>
                  <Link
                    to={`/patient/consultation/${apt.id}`}
                    className="inline-flex items-center justify-center rounded-full bg-primary-600 px-4 py-2 text-xs font-semibold text-white transition hover:bg-primary-700"
                  >
                    Join
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
