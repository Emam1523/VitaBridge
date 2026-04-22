import { useEffect, useState } from "react";
import DashboardLayout from "../common/DashboardLayout";
import { PATIENT_LINKS } from "./patientLinks";
import { useAuth } from "../../context/AuthenticationContext";
import { getMyDocuments, getDocumentDownloadUrl } from "../../api/patientApi";

const BACKEND2_BASE_URL = (
  import.meta.env.VITE_BACKEND2_API_URL || "/api2/v1"
).replace(/\/$/, "");

const EXCLUDED_METRICS = new Set([
  "heart_rate",
  "blood_pressure_systolic",
  "blood_pressure_diastolic",
]);

function toFriendlyAnalysisError(err) {
  const message = String(err?.message || "").toLowerCase();

  if (
    message.includes("failed to fetch") ||
    message.includes("networkerror") ||
    message.includes("network request failed")
  ) {
    return "⚠️ Analysis service is not reachable. Please start backend2 by running: cd backend2 && start.bat";
  }

  if (message.includes("tesseract") || message.includes("503")) {
    return "⚠️ OCR engine (Tesseract) is not installed. Please install Tesseract from https://github.com/UB-Mannheim/tesseract/wiki and set TESSERACT_CMD in backend2/.env";
  }

  if (message.includes("413")) {
    return "⚠️ File is too large. Maximum file size is 10MB.";
  }

  return err?.message || "Failed to analyze report. Please try again.";
}

const DEFAULT_NORMAL_RANGES = {
  total_cholesterol: { low: 120, high: 200, unit: "mg/dL" },
  ldl: { low: 0, high: 130, unit: "mg/dL" },
  hdl: { low: 40, high: 100, unit: "mg/dL" },
  triglycerides: { low: 0, high: 150, unit: "mg/dL" },
  heart_rate: { low: 60, high: 100, unit: "bpm" },
  oxygen_saturation: { low: 95, high: 100, unit: "%" },
  blood_pressure_systolic: { low: 90, high: 120, unit: "mmHg" },
  blood_pressure_diastolic: { low: 60, high: 80, unit: "mmHg" },
};

function formatMetricName(metricCode) {
  return String(metricCode || "").replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function getStatusInfo(item) {
  const metric = String(item.metric_code || "");
  const fallbackRange = DEFAULT_NORMAL_RANGES[metric];

  const hasProvidedRange =
    typeof item.normal_low === "number" &&
    typeof item.normal_high === "number" &&
    item.normal_high > item.normal_low;

  const low = hasProvidedRange ? Number(item.normal_low) : fallbackRange?.low;
  const high = hasProvidedRange ? Number(item.normal_high) : fallbackRange?.high;
  const value = Number(item.value);
  const hasRange = typeof low === "number" && typeof high === "number" && high > low;

  let status = String(item.status || "").toLowerCase();
  if (!["normal", "low", "high"].includes(status)) {
    if (hasRange) {
      if (value < low) status = "low";
      else if (value > high) status = "high";
      else status = "normal";
    } else {
      status = "unknown";
    }
  }

  const quality = status === "normal" ? "good" : status === "unknown" ? "unknown" : "not-good";

  return {
    status,
    quality,
    hasRange,
    low,
    high,
    unit: item.unit || fallbackRange?.unit || "",
  };
}

export default function ReportOcr() {
  const { token, user } = useAuth();
  const [documents, setDocuments] = useState([]);
  const [loadingDocuments, setLoadingDocuments] = useState(true);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);
  const [activeDocumentId, setActiveDocumentId] = useState(null);
  const [serviceStatus, setServiceStatus] = useState("idle"); // idle, online, offline

  const parsedItems = Array.isArray(result?.parsed_items)
    ? result.parsed_items.filter((item) => !EXCLUDED_METRICS.has(String(item.metric_code || "")))
    : [];
  const excludedCount = Array.isArray(result?.parsed_items)
    ? result.parsed_items.length - parsedItems.length
    : 0;

  useEffect(() => {
    if (!user?.id || !token) return;

    let cancelled = false;

    const loadDocuments = async () => {
      try {
        setLoadingDocuments(true);
        const data = await getMyDocuments(token);
        const patientDocs = Array.isArray(data)
          ? data.filter((doc) => !doc.source || doc.source === "PATIENT")
          : [];

        if (!cancelled) {
          setDocuments(patientDocs);
          setActiveDocumentId((current) => current || patientDocs[0]?.id || null);
        }
      } catch (loadError) {
        if (!cancelled) {
          setDocuments([]);
        }
      } finally {
        if (!cancelled) {
          setLoadingDocuments(false);
        }
      }
    };

    loadDocuments();

    return () => {
      cancelled = true;
    };
  }, [user?.id, token]);

  const handleAnalyze = async (doc) => {
    if (!doc?.fileUrl) return;
    if (!user?.id || !token) {
      setError("User not found. Please sign in again.");
      return;
    }

    try {
      setRunning(true);
      setError("");
      setResult(null);
      setActiveDocumentId(doc.id);

      const fileUrl = getDocumentDownloadUrl(doc.fileUrl);
      const fileRes = await fetch(fileUrl);
      if (!fileRes.ok) throw new Error("Failed to access the uploaded report.");
      const blob = await fileRes.blob();

      const form = new FormData();
      form.append("file", blob, doc.fileName || "report");

      const response = await fetch(`${BACKEND2_BASE_URL}/patients/${user.id}/reports/upload`, {
        method: "POST",
        body: form,
      });

      if (!response.ok) {
        setServiceStatus("offline");
        let errorMsg = "OCR analysis failed.";
        try {
          const errorData = await response.json();
          errorMsg = errorData.detail || errorMsg;
        } catch {
          const text = await response.text();
          errorMsg = text || errorMsg;
        }
        throw new Error(errorMsg);
      }

      const data = await response.json();
      if (!data || typeof data !== "object") {
        throw new Error("Invalid response from analysis service.");
      }
      setServiceStatus("online");
      setResult(data);
    } catch (err) {
      setServiceStatus("offline");
      setError(toFriendlyAnalysisError(err));
    } finally {
      setRunning(false);
    }
  };

  return (
    <DashboardLayout title="Health" links={PATIENT_LINKS}>
      <div className="mx-auto max-w-5xl space-y-6">
        <div className="rounded-3xl border border-primary-100 bg-gradient-to-br from-primary-50 via-white to-accent-50 p-8 shadow-sm">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <p className="text-xs font-semibold uppercase tracking-widest text-primary-700">Health Report AI</p>
              <h2 className="mt-2 text-2xl font-bold text-gray-900 md:text-3xl">OCR and analyze your medical reports</h2>
              <p className="mt-3 text-sm text-gray-600">
                Your reports are pulled directly from Medical Records, so you can analyze them here without uploading again.
              </p>
            </div>
            <div className="flex-shrink-0">
              {serviceStatus === "online" && (
                <div className="flex items-center gap-2 rounded-full bg-emerald-100 px-3 py-1.5 text-xs font-semibold text-emerald-700">
                  <div className="h-2 w-2 rounded-full bg-emerald-500"></div>
                  Service Online
                </div>
              )}
              {serviceStatus === "offline" && (
                <div className="flex items-center gap-2 rounded-full bg-red-100 px-3 py-1.5 text-xs font-semibold text-red-700">
                  <div className="h-2 w-2 rounded-full bg-red-500"></div>
                  Service Offline
                </div>
              )}
              {serviceStatus === "idle" && (
                <div className="flex items-center gap-2 rounded-full bg-gray-100 px-3 py-1.5 text-xs font-medium text-gray-600">
                  Analyze a report to check service
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-lg font-bold text-gray-900">Synced medical reports</h3>
              <p className="text-sm text-gray-500">Choose one of your uploaded reports from Medical Records.</p>
            </div>
            <span className="rounded-full bg-primary-50 px-3 py-1 text-xs font-semibold text-primary-700">
              {documents.length} report{documents.length !== 1 ? "s" : ""} available
            </span>
          </div>

          {loadingDocuments ? (
            <div className="flex justify-center py-10">
              <svg className="h-8 w-8 animate-spin text-primary-400" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
            </div>
          ) : documents.length === 0 ? (
            <div className="mt-4 rounded-2xl border border-dashed border-gray-200 bg-gray-50 px-4 py-8 text-center">
              <p className="font-semibold text-gray-900">No uploaded reports found</p>
              <p className="mt-1 text-sm text-gray-500">Upload a report once in Medical Records, then analyze it here.</p>
            </div>
          ) : (
            <div className="mt-4 space-y-3">
              {documents.map((doc) => {
                const isSelected = activeDocumentId === doc.id;
                return (
                  <div key={doc.id} className={`flex flex-col gap-3 rounded-2xl border p-4 sm:flex-row sm:items-center sm:justify-between ${isSelected ? "border-primary-200 bg-primary-50/40" : "border-gray-100 bg-white"}`}>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h4 className="truncate font-semibold text-gray-900">{doc.fileName}</h4>
                        {doc.uploadedAt && <span className="text-xs text-gray-400">{new Date(doc.uploadedAt).toLocaleDateString()}</span>}
                      </div>
                      <p className="mt-1 text-sm text-gray-500">{doc.description || doc.fileType || "Uploaded report"}</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {doc.fileUrl && (
                        <a
                          href={getDocumentDownloadUrl(doc.fileUrl)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="rounded-xl bg-gray-100 px-4 py-2 text-xs font-semibold text-gray-700 transition hover:bg-gray-200"
                        >
                          View
                        </a>
                      )}
                      <button
                        type="button"
                        onClick={() => handleAnalyze(doc)}
                        disabled={running && isSelected}
                        className="rounded-xl bg-primary-600 px-4 py-2 text-xs font-semibold text-white transition hover:bg-primary-500 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {running && isSelected ? "Analyzing..." : "Analyze report"}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {error && (
            <div className="mt-4 rounded-xl border border-accent-200 bg-accent-50 px-4 py-3 text-sm text-accent-800">
              {error}
            </div>
          )}
        </div>

        {result && (
          <div className="overflow-hidden rounded-3xl border border-primary-100 bg-white shadow-sm">
            <div className="border-b border-primary-100 bg-gradient-to-r from-primary-50 via-white to-accent-50 px-5 py-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-primary-700">Analysis Result</p>
                  <h3 className="text-xl font-bold text-gray-900">{documents.find((doc) => doc.id === activeDocumentId)?.fileName || "Health report"}</h3>
                </div>
                <div className="flex flex-wrap gap-2">
                  <span className="rounded-full bg-primary-100 px-3 py-1 text-xs font-semibold text-primary-700">
                    {parsedItems.length} tests shown
                  </span>
                  {excludedCount > 0 && (
                    <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-600">
                      {excludedCount} hidden (vitals)
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="p-5">
              {parsedItems.length > 0 ? (
                <>
                  <AnalysisSummary items={parsedItems} />
                  <OcrSummaryChart items={parsedItems} />
                  <div className="mt-4 grid gap-4 md:grid-cols-2">
                    {parsedItems.map((item, idx) => (
                      <OcrMetricCard key={`${item.metric_code}-${item.value}-${item.measured_at}-${idx}`} item={item} />
                    ))}
                  </div>
                  <ResultComparisonTable items={parsedItems} />
                </>
              ) : (
                <div className="mt-1 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
                  <p className="font-semibold text-amber-800">⚠️ No test values detected</p>
                  <p className="mt-1 text-sm text-amber-700">
                    The OCR scan completed, but no structured lab values were found in this report after filtering.
                    Try uploading a clearer image or a different report format.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

function OcrMetricCard({ item }) {
  const info = getStatusInfo(item);
  const value = Number(item.value) || 0;
  const low = info.low;
  const high = info.high;
  const hasRange = info.hasRange;
  const status = info.status;

  const pad = hasRange ? (high - low) * 0.3 : Math.max(Math.abs(value) * 0.2, 1);
  const min = hasRange ? low - pad : value - pad;
  const max = hasRange ? high + pad : value + pad;
  const range = max - min || 1;
  const valuePct = Math.min(100, Math.max(0, ((value - min) / range) * 100));
  const lowPct = hasRange ? Math.min(100, Math.max(0, ((low - min) / range) * 100)) : 0;
  const highPct = hasRange ? Math.min(100, Math.max(0, ((high - min) / range) * 100)) : 100;

  const statusStyle = {
    normal: "bg-emerald-100 text-emerald-700",
    high: "bg-accent-100 text-accent-700",
    low: "bg-sky-100 text-sky-700",
    unknown: "bg-gray-100 text-gray-600",
  };

  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">{formatMetricName(item.metric_code)}</p>
          <p className="mt-1 text-lg font-bold text-gray-900">{item.value} {info.unit}</p>
          <p className="text-xs text-gray-500">Normal: {hasRange ? `${low} - ${high} ${info.unit}` : "Not provided"}</p>
        </div>
        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${statusStyle[status] || statusStyle.unknown}`}>
          {status === "normal" ? "Good" : status === "high" ? "Not Good (High)" : status === "low" ? "Not Good (Low)" : "Unknown"}
        </span>
      </div>

      <div className="mt-4">
        <p className="mb-2 text-xs font-medium text-gray-600">Visual Comparison</p>
        <div className="relative h-3 rounded-full bg-gray-100">
          {hasRange && (
            <div
              className="absolute top-0 h-3 rounded-full bg-emerald-200"
              style={{ left: `${lowPct}%`, width: `${Math.max(2, highPct - lowPct)}%` }}
              title={`Normal range: ${low} - ${high} ${info.unit}`}
            />
          )}
          <div 
            className="absolute -top-1 h-5 w-1.5 rounded-full bg-gray-900 shadow-md" 
            style={{ left: `calc(${valuePct}% - 3px)` }}
            title={`Your value: ${value} ${info.unit}`}
          />
        </div>
        <div className="mt-2 flex justify-between text-[10px] text-gray-400">
          <span>{min.toFixed(1)}</span>
          {hasRange && <span className="text-emerald-600 font-semibold">Normal: {low}-{high}</span>}
          <span>{max.toFixed(1)}</span>
        </div>
      </div>
    </div>
  );
}

function OcrSummaryChart({ items }) {
  const data = Array.isArray(items) ? items : [];
  const max = Math.max(...data.map((i) => Math.abs(Number(i.value) || 0)), 1);

  const statusColor = (status) => {
    if (status === "high") return "bg-accent-500";
    if (status === "low") return "bg-sky-500";
    if (status === "normal") return "bg-emerald-500";
    return "bg-primary-400";
  };

  return (
    <div className="mt-4 rounded-2xl border border-gray-100 bg-white p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Extracted Value Graph</p>
        <span className="rounded-full bg-primary-50 px-2.5 py-1 text-[11px] font-semibold text-primary-700">
          {data.length} tests graphed
        </span>
      </div>
      <div className="mt-3 max-h-96 space-y-2 overflow-y-auto pr-1">
        {data.map((item) => {
          const info = getStatusInfo(item);
          const width = Math.max(6, Math.round((Math.abs(Number(item.value) || 0) / max) * 100));
          return (
            <div key={`chart-${item.metric_code}-${item.value}-${item.measured_at}`} className="grid grid-cols-[140px_1fr_auto] items-center gap-3">
              <span className="truncate text-xs font-medium text-gray-600">{formatMetricName(item.metric_code)}</span>
              <div className="h-2 rounded-full bg-gray-100">
                <div className={`h-2 rounded-full ${statusColor(info.status)}`} style={{ width: `${width}%` }} />
              </div>
              <span className="text-xs font-semibold text-gray-700">{item.value} {info.unit}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function AnalysisSummary({ items }) {
  const statuses = items.map((item) => getStatusInfo(item).quality);
  const good = statuses.filter((s) => s === "good").length;
  const notGood = statuses.filter((s) => s === "not-good").length;
  const unknown = statuses.filter((s) => s === "unknown").length;
  const total = Math.max(items.length, 1);

  const rows = [
    { key: "good", label: "Good tests", value: good, color: "bg-emerald-500" },
    { key: "not-good", label: "Not good tests", value: notGood, color: "bg-accent-500" },
    { key: "unknown", label: "Unknown range", value: unknown, color: "bg-slate-400" },
  ];

  return (
    <div className="mt-4 rounded-2xl border border-gray-100 bg-white p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Health Summary</p>
      <div className="mt-3 grid gap-3 sm:grid-cols-3">
        {rows.map((row) => (
          <div key={row.key} className="rounded-xl border border-gray-100 bg-gray-50 p-3">
            <p className="text-xs font-semibold text-gray-500">{row.label}</p>
            <p className="mt-1 text-2xl font-bold text-gray-900">{row.value}</p>
            <div className="mt-2 h-1.5 w-full rounded-full bg-gray-200">
              <div className={`${row.color} h-1.5 rounded-full`} style={{ width: `${Math.round((row.value / total) * 100)}%` }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ResultComparisonTable({ items }) {
  return (
    <div className="mt-4 overflow-hidden rounded-2xl border border-gray-100 bg-white">
      <div className="border-b border-gray-100 px-4 py-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Detailed Comparison</p>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
            <tr>
              <th className="px-4 py-3">Test</th>
              <th className="px-4 py-3">Your value</th>
              <th className="px-4 py-3">Normal range</th>
              <th className="px-4 py-3">Result</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => {
              const info = getStatusInfo(item);
              const badgeClass =
                info.status === "normal"
                  ? "bg-emerald-100 text-emerald-700"
                  : info.status === "low"
                  ? "bg-sky-100 text-sky-700"
                  : info.status === "high"
                  ? "bg-accent-100 text-accent-700"
                  : "bg-gray-100 text-gray-600";
              const label =
                info.status === "normal"
                  ? "Good"
                  : info.status === "high"
                  ? "Not Good (High)"
                  : info.status === "low"
                  ? "Not Good (Low)"
                  : "Unknown";

              return (
                <tr key={`row-${item.metric_code}-${item.value}-${item.measured_at}`} className="border-t border-gray-100">
                  <td className="px-4 py-3 font-semibold text-gray-900">{formatMetricName(item.metric_code)}</td>
                  <td className="px-4 py-3 text-gray-700">{item.value} {info.unit}</td>
                  <td className="px-4 py-3 text-gray-600">
                    {info.hasRange ? `${info.low} - ${info.high} ${info.unit}` : "Not available"}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${badgeClass}`}>{label}</span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
