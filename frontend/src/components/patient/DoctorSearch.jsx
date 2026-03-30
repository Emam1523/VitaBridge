import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import DashboardLayout from "../common/DashboardLayout";
import { getAllDoctors, searchDoctors, getDoctorsBySpecialty, getAllSpecialties } from "../../api/doctorApi";
import { PATIENT_LINKS } from "./patientLinks";

export default function DoctorSearch() {
  const [doctors, setDoctors] = useState([]);
  const [specialties, setSpecialties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [specialty, setSpecialty] = useState("");
  const [availabilityFilter, setAvailabilityFilter] = useState("ALL");
  const [ratingSort, setRatingSort] = useState("NONE");

  useEffect(() => {
    getAllSpecialties().then(setSpecialties).catch(() => {});
  }, []);

  const fetchDoctors = useCallback(async () => {
    try {
      setLoading(true);
      let data;
      if (query.trim()) data = await searchDoctors(query);
      else if (specialty) data = await getDoctorsBySpecialty(specialty);
      else data = await getAllDoctors();
      setDoctors(data);
    } catch {
      console.error("Failed to load doctors");
    } finally {
      setLoading(false);
    }
  }, [query, specialty]);

  useEffect(() => {
    const t = setTimeout(fetchDoctors, 400);
    return () => clearTimeout(t);
  }, [fetchDoctors]);

  let filtered = [...doctors];
  if (availabilityFilter === "AVAILABLE") filtered = filtered.filter(d => d.availability === "Available");
  if (ratingSort === "HIGH") filtered.sort((a, b) => (b.rating || 0) - (a.rating || 0));
  else if (ratingSort === "LOW") filtered.sort((a, b) => (a.rating || 0) - (b.rating || 0));

  return (
    <DashboardLayout title="Find a Doctor" links={PATIENT_LINKS}>
      {/* Search & Filters */}
      <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm mb-6">
        <div className="grid gap-4 md:grid-cols-4">
          <div className="md:col-span-2">
            <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1.5">Search</label>
            <div className="relative">
              <svg className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
              <input type="text" placeholder="Search by name or specialty..." value={query}
                onChange={e => { setQuery(e.target.value); setSpecialty(""); }}
                className="w-full rounded-xl border border-gray-200 bg-gray-50/50 py-2.5 pl-10 pr-4 text-sm text-gray-900 placeholder:text-gray-400 transition focus:border-primary-500 focus:bg-white focus:ring-4 focus:ring-primary-500/10 outline-none" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1.5">Specialty</label>
            <select value={specialty} onChange={e => { setSpecialty(e.target.value); setQuery(""); }}
              className="w-full rounded-xl border border-gray-200 bg-gray-50/50 px-4 py-2.5 text-sm transition focus:border-primary-500 focus:bg-white focus:ring-4 focus:ring-primary-500/10 outline-none">
              <option value="">All Specialties</option>
              {specialties.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1.5">Sort Rating</label>
            <select value={ratingSort} onChange={e => setRatingSort(e.target.value)}
              className="w-full rounded-xl border border-gray-200 bg-gray-50/50 px-4 py-2.5 text-sm transition focus:border-primary-500 focus:bg-white focus:ring-4 focus:ring-primary-500/10 outline-none">
              <option value="NONE">Default</option>
              <option value="HIGH">Highest First</option>
              <option value="LOW">Lowest First</option>
            </select>
          </div>
        </div>
        <div className="mt-4 flex gap-2">
          {[{ id: "ALL", label: "All Doctors" }, { id: "AVAILABLE", label: "Available Now" }].map(f => (
            <button key={f.id} onClick={() => setAvailabilityFilter(f.id)}
              className={`rounded-full px-4 py-1.5 text-xs font-semibold transition ${
                availabilityFilter === f.id
                  ? "bg-primary-600 text-white shadow-sm"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}>
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Results */}
      {loading ? (
        <div className="flex justify-center py-16">
          <svg className="h-8 w-8 animate-spin text-primary-400" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
        </div>
      ) : filtered.length === 0 ? (
        <div className="py-16 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gray-100 text-3xl">🔍</div>
          <p className="text-gray-500 font-medium">No doctors found</p>
          <p className="mt-1 text-sm text-gray-400">Try adjusting your search or filters.</p>
        </div>
      ) : (
        <>
          <p className="mb-4 text-sm text-gray-500">{filtered.length} doctor{filtered.length > 1 ? "s" : ""} found</p>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filtered.map(doc => (
              <div key={doc.id} className="group rounded-2xl border border-gray-100 bg-white p-6 shadow-sm transition hover:shadow-md hover:border-primary-200">
                <div className="flex items-center gap-4">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-600 text-xl font-bold text-white shadow-lg shadow-primary-500/20">
                    {(doc.name || "D")[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-bold text-gray-900 truncate group-hover:text-primary-700 transition">{doc.name}</h4>
                    <p className="text-sm font-medium text-primary-600">{doc.specialty}</p>
                  </div>
                </div>

                <div className="mt-4 flex items-center gap-4 text-sm text-gray-500">
                  <span className="flex items-center gap-1">
                    <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                    {doc.experience || 0} yrs
                  </span>
                  <span className="flex items-center gap-1">
                    <svg className="h-4 w-4 text-yellow-400" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/></svg>
                    {doc.rating ? doc.rating.toFixed(1) : "N/A"}
                  </span>
                  {doc.consultationFee != null && <span className="font-semibold text-gray-700">৳{doc.consultationFee}</span>}
                </div>

                <div className="mt-3">
                  <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                    doc.availability === "Available" ? "bg-green-50 text-green-700" : "bg-red-50 text-red-600"
                  }`}>
                    {doc.availability || "Unavailable"}
                  </span>
                </div>

                <Link to={`/patient/doctors/${doc.id}`}
                  className="mt-5 block w-full rounded-xl border border-gray-200 py-2.5 text-center text-sm font-semibold text-gray-700 transition hover:bg-gray-50">
                  View Profile
                </Link>
                <Link to={`/book-appointment?doctor=${doc.id}`}
                  className="mt-2 block w-full rounded-xl bg-primary-600 py-2.5 text-center text-sm font-semibold text-white shadow-sm transition hover:bg-primary-700">
                  Book Appointment
                </Link>
              </div>
            ))}
          </div>
        </>
      )}
    </DashboardLayout>
  );
}


