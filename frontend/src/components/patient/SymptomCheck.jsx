import { useState } from "react";
import { Link } from "react-router-dom";
import DashboardLayout from "../common/DashboardLayout";
import { useAuth } from "../../context/AuthenticationContext";
import { getAllDoctors } from "../../api/doctorApi";
import { PATIENT_LINKS } from "./patientLinks";

const BACKEND2_BASE_URL =
  (import.meta.env.VITE_BACKEND2_API_URL || "/api2/v1").replace(/\/$/, "");

export default function SymptomCheck({ publicView = false }) {
  const { token, user, isAuthenticated } = useAuth();
  const [symptoms, setSymptoms] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);
  const [matchedDoctors, setMatchedDoctors] = useState([]);
  const [doctorError, setDoctorError] = useState("");

  function normalize(value) {
    return (value || "").toLowerCase().replace(/[^a-z\s]/g, " ").replace(/\s+/g, " ").trim();
  }

  function specialtyTokens(aiSpecialty) {
    const s = normalize(aiSpecialty);
    const tokenMap = {
      cardiologist: ["cardio", "heart", "cardiolog"],
      neurologist: ["neuro", "neurolog"],
      dermatologist: ["derma", "skin"],
      "ent specialist": ["ent", "ear", "nose", "throat"],
      pulmonologist: ["pulmo", "respir", "lung", "chest"],
      gastroenterologist: ["gastro", "digest", "stomach", "abdominal"],
      orthopedic: ["ortho", "bone", "joint", "spine"],
      gynecologist: ["gyn", "obgyn", "women"],
      "general physician": ["general", "medicine", "internal", "family"],
    };
    return tokenMap[s] || s.split(" ");
  }

  function isDoctorMatch(doctorSpecialty, aiSpecialties) {
    const d = normalize(doctorSpecialty);
    return aiSpecialties.some((ai) => specialtyTokens(ai).some((token) => token && d.includes(token)));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setResult(null);

    const trimmed = symptoms.trim();
    if (!trimmed) {
      setError("Please enter your symptoms.");
      return;
    }

    try {
      setLoading(true);
      setDoctorError("");
      const response = await fetch(`${BACKEND2_BASE_URL}/symptom-check`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          patient_id: user?.id,
          symptoms: trimmed,
        }),
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(text || "Failed to run AI symptom check.");
      }

      const data = await response.json();
      setResult(data);

      try {
        const doctors = await getAllDoctors();
        const filtered = (doctors || []).filter((doc) =>
          isDoctorMatch(doc?.specialty, data?.suggested_specialties || [])
        );
        setMatchedDoctors(filtered);
      } catch {
        setMatchedDoctors([]);
        setDoctorError("Could not load doctors list right now.");
      }
    } catch (err) {
      setError(err?.message || "Failed to run AI symptom check.");
    } finally {
      setLoading(false);
    }
  }

  const content = (
    <div className="mx-auto max-w-3xl space-y-6">
        <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-bold text-gray-900">Check Symptoms and Get Doctor Suggestions</h2>
          <p className="mt-2 text-sm text-gray-600">
            Describe your symptoms and the AI service will suggest suitable doctor specialties.
          </p>

          <form onSubmit={handleSubmit} className="mt-5 space-y-4">
            <textarea
              value={symptoms}
              onChange={(e) => setSymptoms(e.target.value)}
              rows={6}
              placeholder="Example: fever for 3 days, sore throat, dry cough"
              className="w-full rounded-xl border border-gray-200 p-3 text-sm outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
            />

            <button
              type="submit"
              disabled={loading}
              className="rounded-xl bg-primary-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "Checking..." : "Run AI Symptom Check"}
            </button>
          </form>

          {error && (
            <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}
        </div>

        {result && (
          <>
            <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
              <h3 className="text-lg font-semibold text-gray-900">AI Analysis Result</h3>

              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <div className="rounded-xl bg-gray-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Urgency</p>
                  <p className={`mt-1 text-sm font-semibold ${result.urgency === "high" ? "text-red-600" : "text-green-700"}`}>
                    {result.urgency === "high" ? "High" : "Normal"}
                  </p>
                </div>
                <div className="rounded-xl bg-gray-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Matched Symptoms</p>
                  <p className="mt-1 text-sm text-gray-700">
                    {result.matched_keywords?.length ? result.matched_keywords.join(", ") : "No strong keyword match"}
                  </p>
                </div>
              </div>

              <div className="mt-4 rounded-xl bg-gray-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Probable Diseases</p>
                <p className="mt-1 text-sm text-gray-700">
                  {result.probable_diseases?.length ? result.probable_diseases.join(", ") : "No clear probability"}
                </p>
              </div>

              <div className="mt-4 rounded-xl bg-gray-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Suggested Specialties</p>
                <p className="mt-1 text-sm text-gray-700">
                  {result.suggested_specialties?.length ? result.suggested_specialties.join(", ") : "General Physician"}
                </p>
              </div>

              <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                {result.advice}
              </div>
            </div>

            <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
              <h3 className="text-lg font-semibold text-gray-900">Recommended Doctors</h3>

              {doctorError && (
                <div className="mt-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {doctorError}
                </div>
              )}

              {!doctorError && matchedDoctors.length === 0 ? (
                <p className="mt-3 text-sm text-gray-600">
                  No direct specialty match found. Please check all doctors from the list.
                </p>
              ) : (
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  {matchedDoctors.slice(0, 8).map((doc) => (
                    <div key={doc.id} className="rounded-xl border border-gray-100 p-4">
                      <p className="font-semibold text-gray-900">{doc.name}</p>
                      <p className="text-sm text-primary-700">{doc.specialty}</p>
                      <div className="mt-3 flex gap-2">
                        <Link
                          to={publicView ? `/doctors/${doc.id}` : `/patient/doctors/${doc.id}`}
                          className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50"
                        >
                          View Profile
                        </Link>
                        <Link
                          to={isAuthenticated ? `/book-appointment?doctor=${doc.id}` : "/login"}
                          className="rounded-lg bg-primary-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-primary-700"
                        >
                          {isAuthenticated ? "Book" : "Login to Book"}
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
  );

  if (publicView) {
    return <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">{content}</div>;
  }

  return (
    <DashboardLayout title="AI Symptom Check" links={PATIENT_LINKS}>
      {content}
    </DashboardLayout>
  );
}
