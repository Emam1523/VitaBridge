import { useState, useEffect, useCallback, useRef } from "react";
import DashboardLayout from "../common/DashboardLayout";
import { useAuth } from "../../context/AuthenticationContext";
import { getMyDocuments, uploadDocument, deleteDocument, getMyPrescriptions, getAppointments, grantMedicalAccess, revokeMedicalAccess, getMedicalAccessList } from "../../api/patientApi";
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

  return (
    <DashboardLayout title="Medical Records" links={PATIENT_LINKS}>
      {/* Tab bar */}
      <div className="mb-6 flex gap-2 overflow-x-auto rounded-2xl border border-gray-100 bg-white p-1.5 shadow-sm">
        {[
          { id: "documents", label: "Documents", icon: "📄", count: documents.length },
          { id: "prescriptions", label: "Prescriptions", icon: "💊", count: prescriptions.length },
          { id: "access", label: "Doctor Access", icon: "🔐", count: doctors.length },
        ].map((t) => (
          <button key={t.id} onClick={() => setActiveTab(t.id)}
            className={`flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-medium transition whitespace-nowrap ${
              activeTab === t.id ? "bg-primary-50 text-primary-700 shadow-sm" : "text-gray-500 hover:bg-gray-50 hover:text-gray-700"
            }`}>
            <span>{t.icon}</span>
            {t.label}
            <span className={`ml-1 rounded-full px-2 py-0.5 text-xs font-semibold ${
              activeTab === t.id ? "bg-primary-100 text-primary-700" : "bg-gray-100 text-gray-500"
            }`}>{t.count}</span>
          </button>
        ))}
      </div>

      {/* ===================== DOCUMENTS TAB ===================== */}
      {activeTab === "documents" && (
        <>
          {/* Header */}
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-6">
            <div>
              <p className="text-sm text-gray-500">{documents.length} document{documents.length !== 1 ? "s" : ""} uploaded</p>
            </div>
            <button onClick={() => setShowUpload(!showUpload)}
              className={`rounded-xl px-5 py-2.5 text-sm font-semibold transition shadow-sm ${
                showUpload
                  ? "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  : "bg-primary-600 text-white shadow-primary-500/25 hover:shadow-primary-500/40 hover:brightness-110"
              }`}>
              {showUpload ? "Cancel" : "+ Upload Document"}
            </button>
          </div>

          {/* Upload Form */}
          {showUpload && (
            <form onSubmit={handleUpload} className="mb-6 rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Upload New Document</h3>
              <div
                onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
                onDragLeave={() => setDragging(false)}
                onDrop={onDrop}
                onClick={() => fileRef.current?.click()}
                className={`cursor-pointer rounded-2xl border-2 border-dashed p-8 text-center transition ${
                  dragging ? "border-primary-400 bg-primary-50" : "border-gray-200 bg-gray-50/50 hover:border-primary-300 hover:bg-primary-50/30"
                }`}>
                <input ref={fileRef} type="file" className="hidden"
                  accept=".pdf,.jpg,.jpeg,.png,.gif,.ppt,.pptx,.doc,.docx,.xls,.xlsx,.txt,.csv"
                  onChange={(e) => { if (e.target.files[0]) setFile(e.target.files[0]); }} />
                {file ? (
                  <div className="flex flex-col items-center gap-2">
                    <span className="text-4xl">{getFileIcon(file.name)}</span>
                    <p className="text-sm font-medium text-gray-900">{file.name}</p>
                    <p className="text-xs text-gray-500">{formatSize(file.size)}</p>
                    <button type="button" onClick={(e) => { e.stopPropagation(); setFile(null); }}
                      className="mt-1 text-xs text-red-500 hover:text-red-700">Remove</button>
                  </div>
                ) : (
                  <>
                    <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-primary-100 text-2xl">📁</div>
                    <p className="text-sm font-medium text-gray-700">Drag & drop your file here</p>
                    <p className="mt-1 text-xs text-gray-400">or click to browse (PDF, Image, PPT, DOC, up to 20MB)</p>
                  </>
                )}
              </div>
              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Description (optional)</label>
                <input type="text" value={description} onChange={(e) => setDescription(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 bg-gray-50/50 px-4 py-2.5 text-sm transition focus:border-primary-500 focus:bg-white focus:ring-4 focus:ring-primary-500/10 outline-none"
                  placeholder="e.g. Blood test results from June 2025" />
              </div>
              <button type="submit" disabled={uploading || !file}
                className="mt-4 rounded-xl bg-primary-600 px-6 py-2.5 text-sm font-semibold text-white shadow-lg shadow-primary-500/25 transition hover:shadow-primary-500/40 hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed">
                {uploading ? (
                  <span className="flex items-center gap-2">
                    <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
                    Uploading...
                  </span>
                ) : "Upload"}
              </button>
            </form>
          )}

          {/* Documents List */}
          {loading ? (
            <div className="flex justify-center py-16">
              <svg className="h-8 w-8 animate-spin text-primary-400" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
            </div>
          ) : documents.length === 0 ? (
            <div className="py-16 text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gray-100 text-3xl">📂</div>
              <p className="text-gray-500 font-medium">No documents yet</p>
              <p className="mt-1 text-sm text-gray-400">Upload prescriptions, test reports, and medical images.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {documents.map((doc) => (
                <div key={doc.id} className="group flex items-center gap-4 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm transition hover:shadow-md hover:border-primary-200">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gray-50 text-2xl">
                    {getFileIcon(doc.fileName)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-gray-900 truncate">{doc.fileName}</h4>
                    <p className="text-xs text-gray-500">
                      {doc.description || doc.fileType}
                      {doc.uploadedAt && ` · ${new Date(doc.uploadedAt).toLocaleDateString()}`}
                    </p>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    {doc.fileUrl && (
                      <a href={doc.fileUrl} target="_blank" rel="noopener noreferrer"
                        className="rounded-lg bg-primary-50 px-3 py-1.5 text-xs font-semibold text-primary-600 transition hover:bg-primary-100">
                        View
                      </a>
                    )}
                    {doc.source !== "PRESCRIPTION" && (
                      <button onClick={() => handleDelete(doc.id)}
                        className="rounded-lg bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-600 transition hover:bg-red-100">
                        Delete
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* ===================== PRESCRIPTIONS TAB ===================== */}
      {activeTab === "prescriptions" && (
        <>
          {/* Search */}
          <div className="mb-6">
            <div className="relative">
              <svg className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
              <input type="text" value={rxSearch} onChange={(e) => setRxSearch(e.target.value)}
                placeholder="Search by doctor, diagnosis, or specialty..."
                className="w-full rounded-xl border border-gray-200 bg-white py-2.5 pl-10 pr-4 text-sm transition focus:border-primary-500 focus:ring-4 focus:ring-primary-500/10 outline-none" />
            </div>
          </div>

          {rxLoading ? (
            <div className="flex justify-center py-16">
              <svg className="h-8 w-8 animate-spin text-primary-400" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
            </div>
          ) : filteredRx.length === 0 ? (
            <div className="py-16 text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-purple-50 text-3xl">💊</div>
              <p className="text-gray-500 font-medium">{rxSearch ? "No prescriptions match your search" : "No prescriptions yet"}</p>
              <p className="mt-1 text-sm text-gray-400">Prescriptions from your doctors will appear here.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredRx.map((rx) => {
                const isExpanded = expandedRx === rx.id;
                return (
                  <div key={rx.id} className="rounded-2xl border border-gray-100 bg-white shadow-sm transition hover:shadow-md overflow-hidden">
                    {/* Prescription header - clickable */}
                    <button type="button" onClick={() => setExpandedRx(isExpanded ? null : rx.id)}
                      className="w-full flex items-center gap-4 p-5 text-left transition hover:bg-gray-50/50">
                      {/* Doctor avatar */}
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-purple-500 to-indigo-500 text-sm font-bold text-white">
                        {(rx.doctorName || "D")[0]}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="font-semibold text-gray-900">{rx.doctorName || "Doctor"}</h4>
                          {rx.doctorSpecialty && (
                            <span className="rounded-full bg-purple-50 px-2.5 py-0.5 text-xs font-medium text-purple-600">{rx.doctorSpecialty}</span>
                          )}
                        </div>
                        <p className="text-sm text-gray-500 truncate mt-0.5">
                          {rx.diagnosis || "Prescription"}
                          {rx.appointmentDate && <span className="text-gray-400"> · {rx.appointmentDate}</span>}
                        </p>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        {rx.followUpDate && (
                          <span className="hidden sm:inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700">
                            🔄 Follow-up: {rx.followUpDate}
                          </span>
                        )}
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); handleDownloadPrescriptionPdf(rx); }}
                          disabled={downloadingRxId === rx.id}
                          className="rounded-lg bg-primary-50 px-3 py-1.5 text-xs font-semibold text-primary-600 hover:bg-primary-100 disabled:opacity-50 transition"
                        >
                          {downloadingRxId === rx.id ? "Generating..." : "📥 Download PDF"}
                        </button>
                        <svg className={`h-5 w-5 text-gray-400 transition-transform ${isExpanded ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7"/>
                        </svg>
                      </div>
                    </button>

                    {/* Expanded details */}
                    {isExpanded && (
                      <div className="border-t border-gray-100 bg-gray-50/30 px-5 pb-5 pt-4 space-y-4">
                        {/* Info row */}
                        <div className="flex flex-wrap gap-4 text-xs text-gray-500">
                          <span>Appointment #{rx.appointmentId}</span>
                          {rx.createdAt && <span>Prescribed: {new Date(rx.createdAt).toLocaleDateString()}</span>}
                          {rx.followUpDate && <span className="text-amber-600 font-medium sm:hidden">Follow-up: {rx.followUpDate}</span>}
                        </div>

                        {/* Diagnosis */}
                        {rx.diagnosis && (
                          <div className="rounded-xl bg-white border border-gray-100 p-4">
                            <h5 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">Diagnosis</h5>
                            <p className="text-sm text-gray-800">{rx.diagnosis}</p>
                          </div>
                        )}

                        {/* Medications */}
                        {Array.isArray(rx.medications) && rx.medications.length > 0 && (
                          <div className="rounded-xl bg-white border border-gray-100 p-4">
                            <h5 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-3">Medications</h5>
                            <div className="space-y-3">
                              {rx.medications.map((med, idx) => (
                                <div key={idx} className="flex items-start gap-3">
                                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-green-50 text-xs font-bold text-green-600">{idx + 1}</span>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-semibold text-gray-900">{med.name || "Medicine"}</p>
                                    <div className="mt-1 flex flex-wrap gap-2">
                                      {med.dosage && <span className="rounded-md bg-blue-50 px-2 py-0.5 text-xs text-blue-700">{med.dosage}</span>}
                                      {med.frequency && <span className="rounded-md bg-orange-50 px-2 py-0.5 text-xs text-orange-700">{med.frequency}</span>}
                                      {med.duration && <span className="rounded-md bg-purple-50 px-2 py-0.5 text-xs text-purple-700">{med.duration}</span>}
                                    </div>
                                    {med.instructions && <p className="mt-1 text-xs text-gray-500 italic">{med.instructions}</p>}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Lab Tests */}
                        {rx.labTests && (
                          <div className="rounded-xl bg-white border border-gray-100 p-4">
                            <h5 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">Lab Tests</h5>
                            <p className="text-sm text-gray-800">{rx.labTests}</p>
                          </div>
                        )}

                        {/* Advice */}
                        {rx.advice && (
                          <div className="rounded-xl bg-white border border-gray-100 p-4">
                            <h5 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">Advice</h5>
                            <p className="text-sm text-gray-800">{rx.advice}</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* ===================== DOCTOR ACCESS TAB ===================== */}
      {activeTab === "access" && (
        <>
          <div className="mb-6">
            <p className="text-sm text-gray-500">
              Manage which doctors can view your medical documents and records. Only doctors you've had appointments with are shown.
            </p>
          </div>

          {accessLoading ? (
            <div className="flex justify-center py-16">
              <svg className="h-8 w-8 animate-spin text-primary-400" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
            </div>
          ) : doctors.length === 0 ? (
            <div className="py-16 text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gray-100 text-3xl">👨‍⚕️</div>
              <p className="text-gray-500 font-medium">No doctors found</p>
              <p className="mt-1 text-sm text-gray-400">Once you have appointments with doctors, they will appear here.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {doctors.map((doc) => {
                const granted = getAccessStatus(doc.doctorUserId);
                const isToggling = togglingId === doc.doctorUserId;
                return (
                  <div key={doc.doctorUserId} className="flex flex-col sm:flex-row sm:items-center gap-4 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm transition hover:shadow-md">
                    {/* Doctor avatar */}
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-indigo-500 text-lg font-bold text-white">
                      {(doc.doctorName || "D")[0]}
                    </div>
                    {/* Doctor info */}
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-gray-900">{doc.doctorName}</h4>
                      {doc.specialty && (
                        <p className="text-sm text-gray-500">{doc.specialty}</p>
                      )}
                    </div>
                    {/* Access status + toggle */}
                    <div className="flex flex-wrap items-center gap-3 shrink-0">
                      <span className={`rounded-full px-3 py-1 text-xs font-semibold ${
                        granted ? "bg-green-50 text-green-700" : "bg-red-50 text-red-600"
                      }`}>
                        {granted ? "Access Granted" : "No Access"}
                      </span>
                      <button
                        onClick={() => handleToggleAccess(doc.doctorUserId, granted)}
                        disabled={isToggling}
                        className={`rounded-xl px-4 py-2 text-sm font-semibold transition shadow-sm disabled:opacity-50 ${
                          granted
                            ? "bg-red-50 text-red-600 hover:bg-red-100"
                            : "bg-primary-600 text-white hover:bg-primary-700"
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
        </>
      )}
    </DashboardLayout>
  );
}


