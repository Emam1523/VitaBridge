import { useState, useEffect } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { getDoctorById } from "../../api/doctorApi";

export default function DoctorPublicProfile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [doctor, setDoctor] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    getDoctorById(id)
      .then((data) => setDoctor(data))
      .catch((err) => setError(err.message || "Failed to load doctor profile"))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary-600 border-t-transparent" />
      </div>
    );
  }

  if (error || !doctor) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-gray-50 px-4 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-50">
          <svg className="h-8 w-8 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01M12 2a10 10 0 100 20A10 10 0 0012 2z" />
          </svg>
        </div>
        <h2 className="text-xl font-bold text-gray-800">Doctor Not Found</h2>
        <p className="text-gray-500">{error || "This profile doesn't exist."}</p>
        <button onClick={() => navigate("/doctors")} className="mt-2 rounded-xl bg-primary-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-primary-700">
          Back to Doctors
        </button>
      </div>
    );
  }

  const isAvailable = doctor.availability === "Available";

  return (
    <main className="min-h-screen bg-gray-50">
      {/* Back nav */}
      <div className="border-b border-gray-100 bg-white px-4 py-3 shadow-sm">
        <div className="mx-auto max-w-5xl">
          <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-sm font-medium text-gray-600 transition hover:text-primary-600">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back
          </button>
        </div>
      </div>

      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        {/* Profile hero card */}
        <div className="overflow-hidden rounded-xl bg-primary-600 text-white shadow-sm">
          <div className="p-6 sm:p-8">
            <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
              {/* Avatar */}
              <div className="flex h-20 w-20 flex-shrink-0 items-center justify-center overflow-hidden rounded-full bg-white/20 text-3xl font-bold">
                {doctor.profileImageUrl || doctor.imageUrl ? (
                  <img src={doctor.profileImageUrl || doctor.imageUrl} alt={doctor.name} className="h-full w-full object-cover" />
                ) : (
                  (doctor.name || "D")[0]
                )}
              </div>

              {/* Info */}
              <div className="flex-1">
                <div className="flex flex-wrap items-center gap-3">
                  <h1 className="text-2xl font-bold sm:text-3xl">{doctor.name}</h1>
                  <span className={`rounded-full px-3 py-1 text-xs font-semibold ${isAvailable ? "bg-green-500/20 text-green-100" : "bg-yellow-500/20 text-yellow-100"}`}>
                    {doctor.availability || "Available"}
                  </span>
                </div>
                <p className="mt-1 text-lg font-medium text-white/80">{doctor.specialty}</p>

                <div className="mt-4 flex flex-wrap gap-4 text-sm text-white/70">
                  {doctor.experience && (
                    <span className="flex items-center gap-1.5">
                      <svg className="h-4 w-4 text-white/50" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/></svg>
                      {doctor.experience} experience
                    </span>
                  )}
                  {doctor.rating != null && (
                    <span className="flex items-center gap-1.5">
                      <svg className="h-4 w-4 text-yellow-300" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/></svg>
                      {doctor.rating} rating
                      {doctor.totalReviews ? ` (${doctor.totalReviews} reviews)` : ""}
                    </span>
                  )}
                </div>
              </div>

              {/* Fee + Book */}
              <div className="flex flex-col items-start gap-3 sm:items-end">
                {doctor.consultationFee != null && (
                  <div className="rounded-lg bg-white/15 px-4 py-2 text-center">
                    <p className="text-xs text-white/60">Consultation Fee</p>
                    <p className="text-2xl font-bold">৳{doctor.consultationFee}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Content grid */}
        <div className="mt-6 grid gap-6 lg:grid-cols-3">
          {/* Left column: About + Education */}
          <div className="space-y-6 lg:col-span-2">
            {/* About */}
            {doctor.bio && (
              <section className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
                <SectionTitle icon="📝" label="About" />
                <p className="mt-2 text-sm leading-relaxed text-gray-700 whitespace-pre-wrap">{doctor.bio}</p>
              </section>
            )}

            {/* Education */}
            {Array.isArray(doctor.education) && doctor.education.length > 0 && (
              <section className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
                <SectionTitle icon="🎓" label="Education" />
                <div className="mt-3 space-y-3">
                  {doctor.education.map((edu, i) => (
                    <div key={i} className="flex items-start gap-3 rounded-xl bg-gray-50 p-4">
                      <div className="mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-primary-100 text-primary-600">
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l9-5-9-5-9 5 9 5zm0 0l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z"/></svg>
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900">{edu.degree}</p>
                        <p className="text-sm text-gray-600">{edu.institute}</p>
                        {edu.year && <p className="mt-0.5 text-xs text-gray-400">{edu.year}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>

          {/* Right column: Quick info + Certifications */}
          <div className="space-y-6">
            {/* Quick stats */}
            <section className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
              <SectionTitle icon="📊" label="Quick Info" />
              <dl className="mt-3 space-y-3 text-sm">
                <StatRow label="Specialty" value={doctor.specialty} />
                <StatRow label="Experience" value={doctor.experience} />
                <StatRow label="Fee" value={doctor.consultationFee != null ? `৳${doctor.consultationFee}` : null} />
                <StatRow label="Rating" value={doctor.rating != null ? `${doctor.rating} / 5` : null} />
                <StatRow label="Status" value={doctor.availability} highlight={isAvailable ? "green" : "yellow"} />
              </dl>
            </section>

            {/* Certifications */}
            {Array.isArray(doctor.qualifications) && doctor.qualifications.length > 0 && (
              <section className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
                <SectionTitle icon="🏅" label="Certifications" />
                <div className="mt-3 flex flex-wrap gap-2">
                  {doctor.qualifications.map((q, i) => (
                    <span key={i} className="rounded-full bg-primary-50 px-3 py-1.5 text-xs font-medium text-primary-700">
                      {q}
                    </span>
                  ))}
                </div>
              </section>
            )}

            {/* Book CTA */}
            <Link
              to={`/book-appointment?doctor=${doctor.id}`}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary-600 px-6 py-3.5 text-sm font-semibold text-white transition hover:bg-primary-700"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
              Book an Appointment
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}

function SectionTitle({ icon, label }) {
  return (
    <h3 className="flex items-center gap-2 text-base font-bold text-gray-900">
      <span>{icon}</span>
      {label}
    </h3>
  );
}

function StatRow({ label, value, highlight }) {
  if (!value) return null;
  const colorMap = { green: "text-green-600", yellow: "text-yellow-600" };
  return (
    <div className="flex items-center justify-between border-b border-gray-50 pb-2 last:border-0 last:pb-0">
      <dt className="text-gray-500">{label}</dt>
      <dd className={`font-semibold text-gray-800 ${highlight ? colorMap[highlight] : ""}`}>{value}</dd>
    </div>
  );
}
