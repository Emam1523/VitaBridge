import { useState, useEffect, useCallback, useRef } from "react";
import DashboardLayout from "../common/DashboardLayout";
import { useAuth } from "../../context/AuthenticationContext";
import { getMyDocuments, uploadDocument, deleteDocument, getMyPrescriptions, getAppointments, grantMedicalAccess, revokeMedicalAccess, getMedicalAccessList, getDocumentDownloadUrl } from "../../api/patientApi";
import { PATIENT_LINKS } from "./patientLinks";

const FILE_ICONS = {
  pdf: "📕", image: "🖼️", ppt: "📊", doc: "📝", default: "📄",
};

function getFileIcon(name) {
  if (!name) return FILE_ICONS.default;
  const ext = name.split(".").pop().toLowerCase();
  if (ext === "pdf") return FILE_ICONS.pdf;
  if (["jpg", "jpeg", "png", "gif", "webp", "svg"].includes(ext)) return FILE_ICONS.image;
  if (["ppt", "pptx"].includes(ext)) return FILE_ICONS.ppt;
  if (["doc", "docx"].includes(ext)) return FILE_ICONS.doc;
  return FILE_ICONS.default;
}

function formatSize(bytes) {
  if (!bytes) return "";
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1048576) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / 1048576).toFixed(1) + " MB";
}

export default function Document() {
  const { token } = useAuth();
  const [activeTab, setActiveTab] = useState("documents");
  /* Documents state */
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showUpload, setShowUpload] = useState(false);
  const [file, setFile] = useState(null);
  const [description, setDescription] = useState("");
  const [uploading, setUploading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const fileRef = useRef(null);
  /* Prescriptions state */
  const [prescriptions, setPrescriptions] = useState([]);
  const [rxLoading, setRxLoading] = useState(true);
  const [expandedRx, setExpandedRx] = useState(null);
  const [rxSearch, setRxSearch] = useState("");
  const [downloadingRxId, setDownloadingRxId] = useState(null);

  /* Doctor Access state */
  const [accessList, setAccessList] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [accessLoading, setAccessLoading] = useState(true);
  const [togglingId, setTogglingId] = useState(null);

  /* Fetch documents (patient-uploaded only) */
  const fetchDocuments = useCallback(async () => {
    try { setLoading(true); const data = await getMyDocuments(token); setDocuments(Array.isArray(data) ? data.filter(d => !d.source || d.source === "PATIENT") : []); }
    catch { console.error("Failed to load documents"); }
    finally { setLoading(false); }
  }, [token]);

  useEffect(() => { if (token) fetchDocuments(); }, [token, fetchDocuments]);

  /* Fetch prescriptions */
  useEffect(() => {
    if (!token) return;
    (async () => {
      try { setRxLoading(true); const list = await getMyPrescriptions(token); setPrescriptions(Array.isArray(list) ? list : []); }
      catch { setPrescriptions([]); }
      finally { setRxLoading(false); }
    })();
  }, [token]);

  /* Fetch doctor access data */
  const fetchAccessData = useCallback(async () => {
    if (!token) return;
    try {
      setAccessLoading(true);
      const [appointments, access] = await Promise.all([
        getAppointments(token),
        getMedicalAccessList(token),
      ]);
      // Build unique doctor list from appointments
      const doctorMap = new Map();
      (Array.isArray(appointments) ? appointments : []).forEach((apt) => {
        if (apt.doctorUserId && !doctorMap.has(apt.doctorUserId)) {
          doctorMap.set(apt.doctorUserId, {
            doctorUserId: apt.doctorUserId,
            doctorId: apt.doctorId,
            doctorName: apt.doctorName,
            specialty: apt.specialty,
            doctorProfileImageUrl: apt.doctorProfileImageUrl || apt.profileImageUrl || apt.imageUrl || "",
          });
        }
      });
      setDoctors(Array.from(doctorMap.values()));
      setAccessList(Array.isArray(access) ? access : []);
    } catch (e) {
      console.error("Failed to load access data", e);
    } finally {
      setAccessLoading(false);
    }
  }, [token]);

  useEffect(() => { fetchAccessData(); }, [fetchAccessData]);

  const handleToggleAccess = async (doctorUserId, currentlyGranted) => {
    try {
      setTogglingId(doctorUserId);
      if (currentlyGranted) {
        await revokeMedicalAccess(doctorUserId, token);
      } else {
        await grantMedicalAccess(doctorUserId, token);
      }
      await fetchAccessData();
    } catch (err) {
      alert("Failed to update access: " + (err.message || "Unknown error"));
    } finally {
      setTogglingId(null);
    }
  };

  const getAccessStatus = (doctorUserId) => {
    const entry = accessList.find((a) => a.doctor?.id === doctorUserId);
    return entry?.accessGranted === true;
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!file) return alert("Please select a file.");
    try {
      setUploading(true);
      await uploadDocument(file, description, token);
      setFile(null); setDescription(""); setShowUpload(false);
      fetchDocuments();
    } catch (err) {
      alert("Upload failed: " + (err.message || "Unknown error"));
    } finally { setUploading(false); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this document?")) return;
    try { await deleteDocument(id, token); fetchDocuments(); }
    catch (err) { alert(err?.message || "Failed to delete. You cannot delete doctor-given prescriptions."); }
  };

  const onDrop = (e) => {
    e.preventDefault(); setDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) { setFile(f); setShowUpload(true); }
  };

  const filteredRx = prescriptions.filter((p) => {
    if (!rxSearch) return true;
    const q = rxSearch.toLowerCase();
    return (
      (p.doctorName || "").toLowerCase().includes(q) ||
      (p.diagnosis || "").toLowerCase().includes(q) ||
      (p.doctorSpecialty || "").toLowerCase().includes(q)
    );
  });

  const handleDownloadPrescriptionPdf = async (rx) => {
    setDownloadingRxId(rx.id);
    try {
      if (rx.pdfUrl) {
        window.open(rx.pdfUrl, "_blank", "noopener,noreferrer");
      } else {
        alert("PDF not found for this prescription.");
      }
    } catch (err) {
      alert("Failed to open prescription PDF: " + err.message);
    } finally {
      setDownloadingRxId(null);
    }
  };

  const stats = [
    { label: "Documents", value: documents.length, tone: "bg-primary-50 text-primary-700" },
    { label: "Prescriptions", value: prescriptions.length, tone: "bg-accent-50 text-accent-700" },
    { label: "Doctors", value: doctors.length, tone: "bg-slate-100 text-slate-700" },
  ];

  return (
    <DashboardLayout title="Medical Records" links={PATIENT_LINKS}>
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-sm">
          <div className="px-6 py-8 sm:px-8">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
              <div className="max-w-2xl">
                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-primary-700">Medical Records</p>
                <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-900 sm:text-4xl">Your records, kept simple</h1>
                <p className="mt-3 max-w-xl text-sm leading-6 text-slate-600 sm:text-base">
                  Documents, prescriptions, and doctor access in one clear place.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {stats.map((stat) => (
                  <span key={stat.label} className={`rounded-full px-4 py-2 text-sm font-semibold ${stat.tone}`}>
                    {stat.label}: {stat.value}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div className="border-t border-slate-200 bg-slate-50/60 px-3 py-3 sm:px-4">
            <div className="flex gap-2 overflow-x-auto">
              {[
                { id: "documents", label: "Documents", icon: "📄", count: documents.length },
                { id: "prescriptions", label: "Prescriptions", icon: "💊", count: prescriptions.length },
                { id: "access", label: "Doctor Access", icon: "🔐", count: doctors.length },
              ].map((t) => (
                <button
                  key={t.id}
                  onClick={() => setActiveTab(t.id)}
                  className={`flex items-center gap-2 rounded-2xl px-5 py-3 text-sm font-semibold transition whitespace-nowrap ${
                    activeTab === t.id
                      ? "bg-primary-700 text-white shadow-sm"
                      : "bg-white text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                  }`}
                >
                  <span>{t.icon}</span>
                  {t.label}
                  <span className={`ml-1 rounded-full px-2.5 py-0.5 text-xs font-bold ${activeTab === t.id ? "bg-white/20 text-white" : "bg-slate-100 text-slate-500"}`}>
                    {t.count}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>

      {/* ===================== DOCUMENTS TAB ===================== */}
      {activeTab === "documents" && (
        <div className="space-y-6 pb-2">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-sm text-slate-500">{documents.length} document{documents.length !== 1 ? "s" : ""} uploaded</p>
              <h2 className="mt-1 text-xl font-bold text-slate-900">Upload and manage your medical files</h2>
            </div>
            <button
              onClick={() => setShowUpload(!showUpload)}
              className={`rounded-2xl px-5 py-3 text-sm font-semibold transition shadow-sm ${
                showUpload
                  ? "bg-slate-100 text-slate-700 hover:bg-slate-200"
                  : "bg-slate-900 text-white hover:bg-slate-800"
              }`}
            >
              {showUpload ? "Close upload" : "+ Upload Document"}
            </button>
          </div>

          {showUpload && (
            <form onSubmit={handleUpload} className="rounded-[1.75rem] border border-slate-200 bg-slate-50/50 p-6 shadow-sm">
              <div className="mb-5 flex items-center justify-between gap-4">
                <div>
                  <h3 className="text-lg font-bold text-slate-900">Upload New Document</h3>
                  <p className="text-sm text-slate-500">Add lab reports, scans, and other medical files.</p>
                </div>
                <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-600 shadow-sm">PDF, image, or office files</span>
              </div>
              <div
                onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
                onDragLeave={() => setDragging(false)}
                onDrop={onDrop}
                onClick={() => fileRef.current?.click()}
                className={`cursor-pointer rounded-[1.5rem] border-2 border-dashed p-8 text-center transition ${
                  dragging ? "border-primary-400 bg-primary-50" : "border-slate-200 bg-white hover:border-primary-300 hover:bg-slate-50"
                }`}
              >
                <input
                  ref={fileRef}
                  type="file"
                  className="hidden"
                  accept=".pdf,.jpg,.jpeg,.png,.gif,.ppt,.pptx,.doc,.docx,.xls,.xlsx,.txt,.csv"
                  onChange={(e) => { if (e.target.files[0]) setFile(e.target.files[0]); }}
                />
                {file ? (
                  <div className="flex flex-col items-center gap-2">
                    <span className="text-4xl">{getFileIcon(file.name)}</span>
                    <p className="text-sm font-semibold text-slate-900">{file.name}</p>
                    <p className="text-xs text-slate-500">{formatSize(file.size)}</p>
                    <button type="button" onClick={(e) => { e.stopPropagation(); setFile(null); }} className="mt-1 text-xs font-semibold text-rose-600 hover:text-rose-700">
                      Remove
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-white text-3xl shadow-sm">📁</div>
                    <p className="text-sm font-semibold text-slate-800">Drag and drop your file here</p>
                    <p className="mt-1 text-xs text-slate-500">or click to browse files from your device</p>
                  </>
                )}
              </div>
              <div className="mt-4">
                <label className="mb-1.5 block text-sm font-semibold text-slate-700">Description (optional)</label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-primary-400 focus:bg-white focus:ring-4 focus:ring-primary-500/10"
                  placeholder="e.g. Blood test results from June 2025"
                />
              </div>
              <button
                type="submit"
                disabled={uploading || !file}
                className="mt-4 inline-flex items-center rounded-2xl bg-primary-600 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-500 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {uploading ? (
                  <span className="flex items-center gap-2">
                    <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
                    Uploading...
                  </span>
                ) : "Upload document"}
              </button>
            </form>
          )}

          {loading ? (
            <div className="flex justify-center py-16">
              <svg className="h-8 w-8 animate-spin text-slate-400" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
            </div>
          ) : documents.length === 0 ? (
            <div className="rounded-[1.75rem] border border-dashed border-slate-200 bg-white px-6 py-16 text-center shadow-sm">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 text-3xl">📂</div>
              <p className="text-lg font-semibold text-slate-900">No documents yet</p>
              <p className="mt-2 text-sm text-slate-500">Upload prescriptions, test reports, and medical images to keep everything organized.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {documents.map((doc) => (
                  <div key={doc.id} className="group flex flex-col gap-4 rounded-[1.25rem] border border-slate-200 bg-white p-4 transition hover:border-slate-300 sm:flex-row sm:items-center">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-50 text-2xl">
                    {getFileIcon(doc.fileName)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h4 className="truncate text-base font-semibold text-slate-900">{doc.fileName}</h4>
                      {doc.source && (
                        <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-semibold text-slate-600">{doc.source}</span>
                      )}
                    </div>
                    <p className="mt-1 text-sm text-slate-500">
                      {doc.description || doc.fileType || "Uploaded document"}
                      {doc.uploadedAt && ` · ${new Date(doc.uploadedAt).toLocaleDateString()}`}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2 shrink-0">
                    {doc.fileUrl && (
                      <a
                        href={getDocumentDownloadUrl(doc.fileUrl)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="rounded-xl bg-slate-100 px-3.5 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-200"
                      >
                        View
                      </a>
                    )}
                    {doc.source !== "PRESCRIPTION" && (
                      <button
                        onClick={() => handleDelete(doc.id)}
                        className="rounded-xl bg-slate-100 px-3.5 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-200"
                      >
                        Delete
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ===================== PRESCRIPTIONS TAB ===================== */}
      {activeTab === "prescriptions" && (
        <div className="space-y-6">
          <div className="rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-xl font-bold text-slate-900">Prescriptions</h2>
                <p className="text-sm text-slate-500">Search and review prescriptions from your doctors.</p>
              </div>
              <div className="relative sm:w-80">
                <svg className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
                <input
                  type="text"
                  value={rxSearch}
                  onChange={(e) => setRxSearch(e.target.value)}
                  placeholder="Search by doctor, diagnosis, or specialty..."
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3 pl-10 pr-4 text-sm outline-none transition focus:border-primary-400 focus:bg-white focus:ring-4 focus:ring-primary-500/10"
                />
              </div>
            </div>
          </div>

          {rxLoading ? (
            <div className="flex justify-center py-16">
              <svg className="h-8 w-8 animate-spin text-slate-400" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
            </div>
          ) : filteredRx.length === 0 ? (
            <div className="rounded-[1.75rem] border border-dashed border-slate-200 bg-white px-6 py-16 text-center shadow-sm">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary-50 text-3xl">💊</div>
              <p className="font-semibold text-slate-900">{rxSearch ? "No prescriptions match your search" : "No prescriptions yet"}</p>
              <p className="mt-1 text-sm text-slate-500">Prescriptions from your doctors will appear here.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredRx.map((rx) => {
                const isExpanded = expandedRx === rx.id;
                return (
                  <div key={rx.id} className="overflow-hidden rounded-[1.25rem] border border-slate-200 bg-white transition hover:border-slate-300">
                    {/* Prescription header - clickable */}
                    <button type="button" onClick={() => setExpandedRx(isExpanded ? null : rx.id)}
                      className="flex w-full items-center gap-4 p-5 text-left transition hover:bg-slate-50">
                      {/* Doctor avatar */}
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary-50 text-sm font-bold text-primary-700">
                        {(rx.doctorName || "D")[0]}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="font-semibold text-gray-900">{rx.doctorName || "Doctor"}</h4>
                          {rx.doctorSpecialty && (
                          <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-600">{rx.doctorSpecialty}</span>
                          )}
                        </div>
                          <p className="mt-0.5 truncate text-sm text-slate-500">
                          {rx.diagnosis || "Prescription"}
                            {rx.appointmentDate && <span className="text-slate-400"> · {rx.appointmentDate}</span>}
                        </p>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        {rx.followUpDate && (
                          <span className="hidden sm:inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
                            🔄 Follow-up: {rx.followUpDate}
                          </span>
                        )}
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); handleDownloadPrescriptionPdf(rx); }}
                          disabled={downloadingRxId === rx.id}
                          className="rounded-xl bg-slate-100 px-3.5 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-200 disabled:opacity-50"
                        >
                          {downloadingRxId === rx.id ? "Generating..." : "📥 Download PDF"}
                        </button>
                        <svg className={`h-5 w-5 text-slate-400 transition-transform ${isExpanded ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7"/>
                        </svg>
                      </div>
                    </button>

                    {/* Expanded details */}
                    {isExpanded && (
                      <div className="space-y-4 border-t border-slate-100 bg-slate-50 px-5 pb-5 pt-4">
                        {/* Info row */}
                        <div className="flex flex-wrap gap-4 text-xs text-slate-500">
                          <span>Appointment #{rx.appointmentId}</span>
                          {rx.createdAt && <span>Prescribed: {new Date(rx.createdAt).toLocaleDateString()}</span>}
                          {rx.followUpDate && <span className="font-medium text-accent-600 sm:hidden">Follow-up: {rx.followUpDate}</span>}
                        </div>

                        {/* Diagnosis */}
                        {rx.diagnosis && (
                          <div className="rounded-2xl border border-slate-200 bg-white p-4">
                            <h5 className="mb-1 text-xs font-semibold uppercase tracking-wider text-slate-400">Diagnosis</h5>
                            <p className="text-sm text-slate-800">{rx.diagnosis}</p>
                          </div>
                        )}

                        {/* Medications */}
                        {Array.isArray(rx.medications) && rx.medications.length > 0 && (
                          <div className="rounded-2xl border border-slate-200 bg-white p-4">
                            <h5 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-400">Medications</h5>
                            <div className="space-y-3">
                              {rx.medications.map((med, idx) => (
                                <div key={idx} className="flex items-start gap-3">
                                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-xs font-bold text-emerald-600">{idx + 1}</span>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-semibold text-slate-900">{med.name || "Medicine"}</p>
                                    <div className="mt-1 flex flex-wrap gap-2">
                                      {med.dosage && <span className="rounded-md bg-sky-50 px-2 py-0.5 text-xs text-sky-700">{med.dosage}</span>}
                                      {med.frequency && <span className="rounded-md bg-amber-50 px-2 py-0.5 text-xs text-amber-700">{med.frequency}</span>}
                                      {med.duration && <span className="rounded-md bg-violet-50 px-2 py-0.5 text-xs text-violet-700">{med.duration}</span>}
                                    </div>
                                    {med.instructions && <p className="mt-1 text-xs italic text-slate-500">{med.instructions}</p>}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Lab Tests */}
                        {rx.labTests && (
                          <div className="rounded-2xl border border-slate-200 bg-white p-4">
                            <h5 className="mb-1 text-xs font-semibold uppercase tracking-wider text-slate-400">Lab Tests</h5>
                            <p className="text-sm text-slate-800">{rx.labTests}</p>
                          </div>
                        )}

                        {/* Advice */}
                        {rx.advice && (
                          <div className="rounded-2xl border border-slate-200 bg-white p-4">
                            <h5 className="mb-1 text-xs font-semibold uppercase tracking-wider text-slate-400">Advice</h5>
                            <p className="text-sm text-slate-800">{rx.advice}</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ===================== DOCTOR ACCESS TAB ===================== */}
      {activeTab === "access" && (
        <div className="space-y-6">
          <div className="rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-xl font-bold text-slate-900">Doctor Access</h2>
            <p className="mt-1 text-sm text-slate-500">
              Control which doctors can view your records. Only doctors you have met before appear here.
            </p>
          </div>

          {accessLoading ? (
            <div className="flex justify-center py-16">
              <svg className="h-8 w-8 animate-spin text-slate-400" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
            </div>
          ) : doctors.length === 0 ? (
            <div className="rounded-[1.75rem] border border-dashed border-slate-200 bg-white px-6 py-16 text-center shadow-sm">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary-50 text-3xl">👨‍⚕️</div>
              <p className="font-semibold text-slate-900">No doctors found</p>
              <p className="mt-1 text-sm text-slate-500">Once you have appointments with doctors, they will appear here.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {doctors.map((doc) => {
                const granted = getAccessStatus(doc.doctorUserId);
                const isToggling = togglingId === doc.doctorUserId;
                return (
                  <div key={doc.doctorUserId} className="flex flex-col gap-4 rounded-[1.25rem] border border-slate-200 bg-white p-4 transition hover:border-slate-300 sm:flex-row sm:items-center">
                    {/* Doctor avatar */}
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-slate-50 text-lg font-bold text-primary-700">
                      {doc.doctorProfileImageUrl ? (
                        <img src={doc.doctorProfileImageUrl} alt={doc.doctorName} className="h-full w-full object-cover" />
                      ) : (
                        (doc.doctorName || "D")[0]
                      )}
                    </div>
                    {/* Doctor info */}
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-slate-900">{doc.doctorName}</h4>
                      {doc.specialty && (
                        <p className="text-sm text-slate-500">{doc.specialty}</p>
                      )}
                    </div>
                    {/* Access status + toggle */}
                    <div className="flex flex-wrap items-center gap-3 shrink-0">
                      <span className={`rounded-full px-3 py-1 text-xs font-semibold ${
                        granted ? "bg-primary-50 text-primary-700" : "bg-slate-100 text-slate-600"
                      }`}>
                        {granted ? "Access Granted" : "No Access"}
                      </span>
                      <button
                        onClick={() => handleToggleAccess(doc.doctorUserId, granted)}
                        disabled={isToggling}
                        className={`rounded-xl px-4 py-2 text-sm font-semibold transition shadow-sm disabled:opacity-50 ${
                          granted
                            ? "bg-slate-100 text-slate-700 hover:bg-slate-200"
                            : "bg-primary-600 text-white hover:bg-primary-500"
                        }`}
                      >
                        {isToggling ? (
                          <span className="flex items-center gap-1.5">
                            <svg className="h-3.5 w-3.5 animate-spin" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
                            Updating...
                          </span>
                        ) : granted ? "Revoke Access" : "Grant Access"}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
      </div>
    </DashboardLayout>
  );
}


