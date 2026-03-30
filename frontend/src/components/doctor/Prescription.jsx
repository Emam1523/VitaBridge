import { useState, useEffect, useCallback } from "react";
import { useParams } from "react-router-dom";
import DashboardLayout from "../common/DashboardLayout";
import { useAuth } from "../../context/AuthenticationContext";
import { getMyAppointments, createPrescription, getPrescription, getAllMyPrescriptions } from "../../api/doctorApi";
import { DOCTOR_LINKS } from "./DoctorDashboard";

const emptyMedication = { name: "", dosage: "", quantity: "", frequency: "", duration: "", instructions: "" };

export default function Prescription() {
  const { appointmentId } = useParams();
  const { token } = useAuth();

  /* Sidebar tab: "prescriptions" or "appointments" */
  const [sidebarTab, setSidebarTab] = useState("prescriptions");

  /* All prescriptions written by this doctor */
  const [prescriptions, setPrescriptions] = useState([]);
  const [prescriptionsLoading, setPrescriptionsLoading] = useState(true);

  /* Eligible appointments (for writing new prescriptions) */
  const [appointments, setAppointments] = useState([]);
  const [appointmentsLoading, setAppointmentsLoading] = useState(true);

  /* Currently selected appointment and prescription */
  const [selectedAppointmentId, setSelectedAppointmentId] = useState(appointmentId ? appointmentId : null);
  const [selectedPrescriptionId, setSelectedPrescriptionId] = useState(null);
  const [existingPrescription, setExistingPrescription] = useState(null);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [formError, setFormError] = useState("");
  const [formSuccess, setFormSuccess] = useState("");

  /* Search filter for sidebar */
  const [search, setSearch] = useState("");

  const formatVersionTime = useCallback((value) => {
    if (!value) return "";
    const dt = new Date(value);
    if (Number.isNaN(dt.getTime())) return "";
    return dt.toLocaleString([], {
      year: "numeric",
      month: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  }, []);

  const [form, setForm] = useState({
    diagnosis: "",
    chiefComplaints: "",
    pastHistory: "",
    drugHistory: "",
    onExamination: "",
    followUpNumber: "",
    followUpInstruction: "",
    emergencyInstruction: "",
    medications: [{ ...emptyMedication }],
    labTests: "",
    advice: "",
    followUpDate: "",
  });

  const resetForm = useCallback(() => {
    setForm({
      diagnosis: "",
      chiefComplaints: "",
      pastHistory: "",
      drugHistory: "",
      onExamination: "",
      followUpNumber: "",
      followUpInstruction: "",
      emergencyInstruction: "",
      medications: [{ ...emptyMedication }],
      labTests: "",
      advice: "",
      followUpDate: "",
    });
  }, []);

  const fillFormFromPrescription = useCallback((p) => {
    setForm({
      diagnosis: p.diagnosis || "",
      chiefComplaints: p.chiefComplaints || "",
      pastHistory: p.pastHistory || "",
      drugHistory: p.drugHistory || "",
      onExamination: p.onExamination || "",
      followUpNumber: p.followUpNumber ?? "",
      followUpInstruction: p.followUpInstruction || "",
      emergencyInstruction: p.emergencyInstruction || "",
      medications: p.medications?.length > 0 ? p.medications.map(m => ({ ...emptyMedication, ...m })) : [{ ...emptyMedication }],
      labTests: p.labTests || "",
      advice: p.advice || "",
      followUpDate: p.followUpDate ? String(p.followUpDate).split("T")[0] : "",
    });
  }, []);

  useEffect(() => {
    if (!appointmentId) return;
    setSelectedAppointmentId(appointmentId);
    setSelectedPrescriptionId(null);
  }, [appointmentId]);

  /* Fetch all prescriptions */
  const fetchPrescriptions = useCallback(async () => {
    try {
      setPrescriptionsLoading(true);
      const data = await getAllMyPrescriptions(token);
      setPrescriptions(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error(e);
    } finally {
      setPrescriptionsLoading(false);
    }
  }, [token]);

  /* Fetch eligible appointments */
  const fetchAppointments = useCallback(async () => {
    try {
      setAppointmentsLoading(true);
      const data = await getMyAppointments(token);
      const eligible = data.filter(a => a.status === "CONFIRMED" || a.status === "COMPLETED");
      setAppointments(eligible);
    } catch (e) {
      console.error(e);
    } finally {
      setAppointmentsLoading(false);
    }
  }, [token]);

  useEffect(() => { fetchPrescriptions(); fetchAppointments(); }, [fetchPrescriptions, fetchAppointments]);

  /* When selecting from prescription list: open this exact prescription */
  const handleSelectPrescription = (rx) => {
    setSelectedPrescriptionId(rx.id);
    setSelectedAppointmentId(rx.appointmentId);
    setExistingPrescription(rx);
    fillFormFromPrescription(rx);
    setEditing(false);
  };

  /* When selecting from appointments list (new prescription) */
  const handleSelectAppointment = (apt) => {
    setSelectedAppointmentId(apt.id);
    setSelectedPrescriptionId(null);
    setEditing(false);
  };

  /* Load latest prescription only when appointment is selected (not a specific prescription row) */
  const loadExistingPrescription = useCallback(async () => {
    if (editing) return;
    if (!selectedAppointmentId || selectedPrescriptionId) return;
    try {
      const p = await getPrescription(selectedAppointmentId, token);
      if (!p) {
        setExistingPrescription(null);
        resetForm();
        return;
      }
      setExistingPrescription(p);
      setSelectedPrescriptionId(p.id ?? null);
      fillFormFromPrescription(p);
    } catch {
      setExistingPrescription(null);
      resetForm();
    }
  }, [editing, selectedAppointmentId, selectedPrescriptionId, token, resetForm, fillFormFromPrescription]);

  useEffect(() => { loadExistingPrescription(); }, [loadExistingPrescription]);

  const updateMedication = (index, field, value) => {
    const meds = [...form.medications];
    meds[index] = { ...meds[index], [field]: value };
    setForm({ ...form, medications: meds });
  };

  const addMedication = () => setForm({ ...form, medications: [...form.medications, { ...emptyMedication }] });
  const removeMedication = (i) => setForm({ ...form, medications: form.medications.filter((_, idx) => idx !== i) });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError("");
    setFormSuccess("");
    if (!form.chiefComplaints.trim()) {
      setFormError("Chief Complaints (C/C) is required.");
      return;
    }
    try {
      setSaving(true);
      const meds = form.medications.filter(m => m.name?.trim());
      const payload = {
        ...form,
        medications: meds,
        followUpDate: form.followUpDate ? `${form.followUpDate}T00:00:00` : null,
        followUpNumber: form.followUpNumber ? Number(form.followUpNumber) : null,
      };
      const saved = await createPrescription(selectedAppointmentId, payload, token);
      setFormSuccess("Prescription saved successfully!");
      setTimeout(() => setFormSuccess(""), 5000);
      if (saved?.id) {
        setSelectedPrescriptionId(saved.id);
        setSelectedAppointmentId(saved.appointmentId || selectedAppointmentId);
        setExistingPrescription(saved);
        fillFormFromPrescription(saved);
      } else {
        await loadExistingPrescription();
      }
      await fetchPrescriptions();
      setEditing(false);
    } catch (err) {
      setFormError("Failed to save prescription: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleNewPrescription = () => {
    // Keep current appointment selected so form remains visible and submits to same appointment.
    setExistingPrescription(null);
    setSelectedPrescriptionId(null);
    resetForm();
    setEditing(true);
  };

  const selectedApt = appointments.find(a => a.id === selectedAppointmentId);
  const showForm = !existingPrescription || editing;

  /* Filter prescriptions for search */
  const filteredRx = prescriptions.filter((rx) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      (rx.patientName || "").toLowerCase().includes(q) ||
      (rx.diagnosis || "").toLowerCase().includes(q) ||
      (rx.appointmentDate || "").includes(q)
    );
  });

  /* Filter appointments for search */
  const filteredApts = appointments.filter((apt) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      (apt.patientName || "").toLowerCase().includes(q) ||
      (apt.appointmentDate || "").includes(q)
    );
  });

  return (
    <DashboardLayout title="Prescriptions" links={DOCTOR_LINKS}>
      <div className="grid gap-6 lg:grid-cols-4">
        {/* Sidebar */}
        <div className="lg:col-span-1 rounded-xl bg-white shadow-sm overflow-hidden flex flex-col">
          {/* Sidebar tabs */}
          <div className="flex border-b">
            <button
              onClick={() => setSidebarTab("prescriptions")}
              className={`flex-1 px-3 py-2.5 text-xs font-semibold transition ${
                sidebarTab === "prescriptions" ? "bg-primary-50 text-primary-700 border-b-2 border-primary-600" : "text-gray-500 hover:bg-gray-50"
              }`}
            >
              💊 Prescriptions ({prescriptions.length})
            </button>
            <button
              onClick={() => setSidebarTab("appointments")}
              className={`flex-1 px-3 py-2.5 text-xs font-semibold transition ${
                sidebarTab === "appointments" ? "bg-primary-50 text-primary-700 border-b-2 border-primary-600" : "text-gray-500 hover:bg-gray-50"
              }`}
            >
              📋 Appointments ({appointments.length})
            </button>
          </div>

          {/* Search */}
          <div className="p-2">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search patient..."
              className="w-full rounded-lg border border-gray-200 px-3 py-1.5 text-xs outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100"
            />
          </div>

          {/* Prescriptions list */}
          {sidebarTab === "prescriptions" && (
            prescriptionsLoading ? (
              <p className="p-4 text-sm text-gray-500">Loading...</p>
            ) : filteredRx.length === 0 ? (
              <p className="p-4 text-sm text-gray-500">{search ? "No matches." : "No prescriptions yet."}</p>
            ) : (
              <div className="divide-y max-h-[28rem] overflow-y-auto">
                {filteredRx.map((rx) => (
                  <button
                    key={rx.id}
                    onClick={() => handleSelectPrescription(rx)}
                    className={`w-full px-4 py-3 text-left text-sm hover:bg-gray-50 transition ${
                      selectedPrescriptionId === rx.id ? "bg-primary-50 border-l-2 border-primary-600" : ""
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="font-medium text-gray-900 truncate">{rx.patientName}</div>
                      {rx.createdAt && (
                        <span className="shrink-0 rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-semibold text-gray-600">
                          {formatVersionTime(rx.createdAt)}
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-gray-500 truncate mt-0.5">{rx.diagnosis || "No diagnosis"}</div>
                    <div className="text-xs text-gray-400 mt-0.5">{rx.appointmentDate}</div>
                  </button>
                ))}
              </div>
            )
          )}

          {/* Appointments list (for new prescriptions) */}
          {sidebarTab === "appointments" && (
            appointmentsLoading ? (
              <p className="p-4 text-sm text-gray-500">Loading...</p>
            ) : filteredApts.length === 0 ? (
              <p className="p-4 text-sm text-gray-500">{search ? "No matches." : "No eligible appointments."}</p>
            ) : (
              <div className="divide-y max-h-[28rem] overflow-y-auto">
                {filteredApts.map((apt) => {
                  const hasPrescription = prescriptions.some(rx => rx.appointmentId === apt.id);
                  return (
                    <button
                      key={apt.id}
                      onClick={() => handleSelectAppointment(apt)}
                      className={`w-full px-4 py-3 text-left text-sm hover:bg-gray-50 transition ${
                        selectedAppointmentId === apt.id && !selectedPrescriptionId ? "bg-primary-50 border-l-2 border-primary-600" : ""
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-900 truncate">{apt.patientName}</span>
                        {hasPrescription && (
                          <span className="rounded-full bg-green-50 px-1.5 py-0.5 text-[10px] font-semibold text-green-600">Rx</span>
                        )}
                      </div>
                      <div className="text-xs text-gray-500 mt-0.5">{apt.appointmentDate} • {apt.status}</div>
                    </button>
                  );
                })}
              </div>
            )
          )}
        </div>

        {/* Prescription Form / View */}
        <div className="lg:col-span-3 rounded-xl bg-white p-6 shadow-sm">
          {!selectedAppointmentId ? (
            <p className="text-gray-400 text-center py-12">Select a prescription to view or an appointment to write a new one.</p>
          ) : (
            <>
              <div className="mb-6 flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    {existingPrescription && !editing ? "Prescription" : "New Prescription"}
                  </h3>
                  <p className="text-sm text-gray-500">
                    Patient: {selectedApt?.patientName || existingPrescription?.patientName || "—"} • {selectedApt?.appointmentDate || existingPrescription?.appointmentDate || "—"}
                  </p>
                  {!!existingPrescription?.createdAt && (
                    <p className="mt-1 text-xs text-gray-500">
                      Version: {formatVersionTime(existingPrescription.createdAt)}
                    </p>
                  )}
                </div>
                {existingPrescription && !editing && (
                  <div className="flex gap-2 shrink-0">
                    <span className="text-xs text-gray-500 self-center">Digitally signed · No editing after submission</span>
                    <button
                      type="button"
                      onClick={handleNewPrescription}
                      className="inline-flex items-center gap-2 rounded-xl border-2 border-primary-600 bg-white px-4 py-2.5 text-sm font-semibold text-primary-600 shadow hover:bg-primary-50 transition"
                    >
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                      </svg>
                      New Prescription
                    </button>
                  </div>
                )}
              </div>

              {/* View-only mode for existing prescription (locked after submission) */}
              {existingPrescription && !editing && (
                <div className="space-y-4">
                  {existingPrescription.chiefComplaints && (
                    <div className="rounded-xl bg-gray-50 p-4">
                      <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">Chief Complaints (C/C)</h4>
                      <p className="text-sm text-gray-800">{existingPrescription.chiefComplaints}</p>
                    </div>
                  )}
                  {(existingPrescription.pastHistory || existingPrescription.drugHistory) && (
                    <div className="rounded-xl bg-gray-50 p-4">
                      <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">Medical History</h4>
                      {existingPrescription.pastHistory && <p className="text-sm text-gray-800">{existingPrescription.pastHistory}</p>}
                      {existingPrescription.drugHistory && <p className="text-sm text-gray-600 mt-1">Drug History: {existingPrescription.drugHistory}</p>}
                    </div>
                  )}
                  {existingPrescription.onExamination && (
                    <div className="rounded-xl bg-gray-50 p-4">
                      <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">Examination (O/E)</h4>
                      <p className="text-sm text-gray-800">{existingPrescription.onExamination}</p>
                    </div>
                  )}
                  {existingPrescription.diagnosis && (
                    <div className="rounded-xl bg-gray-50 p-4">
                      <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">Diagnosis</h4>
                      <p className="text-sm text-gray-800">{existingPrescription.diagnosis}</p>
                    </div>
                  )}
                  {existingPrescription.medications?.length > 0 && (
                    <div className="rounded-xl bg-gray-50 p-4">
                      <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">Prescription (Rx)</h4>
                      <div className="space-y-2">
                        {existingPrescription.medications.map((med, idx) => (
                          <div key={idx} className="flex flex-wrap items-center gap-3 text-sm">
                            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary-100 text-xs font-bold text-primary-600">{idx+1}</span>
                            <span className="font-medium text-gray-900">{med.name}</span>
                            {med.dosage && <span className="text-gray-500">{med.dosage}</span>}
                            {med.quantity && <span className="text-gray-500">{med.quantity}</span>}
                            {med.frequency && <span className="text-gray-500">• {med.frequency}</span>}
                            {med.duration && <span className="text-gray-500">• {med.duration}</span>}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {existingPrescription.advice && (
                    <div className="rounded-xl bg-gray-50 p-4">
                      <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">Advice</h4>
                      <p className="text-sm text-gray-800">{existingPrescription.advice}</p>
                    </div>
                  )}
                  {existingPrescription.labTests && (
                    <div className="rounded-xl bg-gray-50 p-4">
                      <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">Lab Tests</h4>
                      <p className="text-sm text-gray-800">{existingPrescription.labTests}</p>
                    </div>
                  )}
                  {(existingPrescription.followUpDate || existingPrescription.followUpInstruction) && (
                    <div className="rounded-xl bg-amber-50 p-4">
                      <h4 className="text-xs font-semibold uppercase tracking-wider text-amber-600 mb-1">Follow-up</h4>
                      {existingPrescription.followUpDate && <p className="text-sm text-gray-800">{String(existingPrescription.followUpDate).split("T")[0]}</p>}
                      {existingPrescription.followUpInstruction && <p className="text-sm text-gray-800 mt-1">{existingPrescription.followUpInstruction}</p>}
                    </div>
                  )}
                </div>
              )}

              {showForm && <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Chief Complaints (C/C) *</label>
                  <textarea value={form.chiefComplaints} onChange={e => setForm({ ...form, chiefComplaints: e.target.value })}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" rows={2} placeholder="e.g., Eye redness, watering" />
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Past History (P/H)</label>
                    <textarea value={form.pastHistory} onChange={e => setForm({ ...form, pastHistory: e.target.value })}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" rows={2} placeholder="Past medical history..." />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Drug History</label>
                    <textarea value={form.drugHistory} onChange={e => setForm({ ...form, drugHistory: e.target.value })}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" rows={2} placeholder="Current medications..." />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Examination (O/E)</label>
                  <textarea value={form.onExamination} onChange={e => setForm({ ...form, onExamination: e.target.value })}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" rows={2} placeholder="e.g., Vision: 6/6, BP: 120/80 or Not examined physically" />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Diagnosis</label>
                  <input type="text" value={form.diagnosis} onChange={e => setForm({ ...form, diagnosis: e.target.value })}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" placeholder="Primary diagnosis" />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-medium text-gray-700">Medications (Rx)</label>
                    <button type="button" onClick={addMedication} className="text-xs text-primary-600 hover:underline">+ Add Medication</button>
                  </div>
                  {form.medications.map((med, i) => (
                    <div key={i} className="mb-3 rounded-lg border border-gray-200 p-3">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-xs font-medium text-gray-500">Medication #{i + 1}</span>
                        {form.medications.length > 1 && (
                          <button type="button" onClick={() => removeMedication(i)} className="text-xs text-red-500 hover:underline">Remove</button>
                        )}
                      </div>
                      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                        <input type="text" value={med.name} onChange={e => updateMedication(i, "name", e.target.value)}
                          className="rounded border border-gray-300 px-2 py-1.5 text-sm" placeholder="Medicine name" />
                        <input type="text" value={med.dosage} onChange={e => updateMedication(i, "dosage", e.target.value)}
                          className="rounded border border-gray-300 px-2 py-1.5 text-sm" placeholder="Dosage (e.g., 500mg)" />
                        <input type="text" value={med.quantity} onChange={e => updateMedication(i, "quantity", e.target.value)}
                          className="rounded border border-gray-300 px-2 py-1.5 text-sm" placeholder="Qty (e.g., 1 tablet)" />
                        <input type="text" value={med.frequency} onChange={e => updateMedication(i, "frequency", e.target.value)}
                          className="rounded border border-gray-300 px-2 py-1.5 text-sm" placeholder="Frequency (e.g., 3x/day)" />
                        <input type="text" value={med.duration} onChange={e => updateMedication(i, "duration", e.target.value)}
                          className="rounded border border-gray-300 px-2 py-1.5 text-sm" placeholder="Duration (e.g., 7 days)" />
                        <input type="text" value={med.instructions} onChange={e => updateMedication(i, "instructions", e.target.value)}
                          className="rounded border border-gray-300 px-2 py-1.5 text-sm sm:col-span-2" placeholder="Instructions (e.g., after meals)" />
                      </div>
                    </div>
                  ))}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Advice / Instructions</label>
                  <textarea value={form.advice} onChange={e => setForm({ ...form, advice: e.target.value })}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" rows={2} placeholder="Lifestyle advice, diet, restrictions..." />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Lab Tests</label>
                  <textarea value={form.labTests} onChange={e => setForm({ ...form, labTests: e.target.value })}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" rows={2} placeholder="Recommended lab tests..." />
                </div>

                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Follow-up Date</label>
                    <input type="date" value={form.followUpDate} onChange={e => setForm({ ...form, followUpDate: e.target.value })}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Follow-up #</label>
                    <input type="number" min={1} value={form.followUpNumber} onChange={e => setForm({ ...form, followUpNumber: e.target.value ? parseInt(e.target.value, 10) : "" })}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" placeholder="1st, 2nd visit, etc." />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Follow-up Instruction</label>
                    <input type="text" value={form.followUpInstruction} onChange={e => setForm({ ...form, followUpInstruction: e.target.value })}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" placeholder="e.g., Come after 7 days" />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Emergency Instruction</label>
                  <input type="text" value={form.emergencyInstruction} onChange={e => setForm({ ...form, emergencyInstruction: e.target.value })}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" placeholder="If urgent, contact..." />
                </div>

                {formError && (
                  <div className="flex items-center gap-2 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
                    <svg className="h-4 w-4 shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd"/></svg>
                    {formError}
                  </div>
                )}
                {formSuccess && (
                  <div className="flex items-center gap-2 rounded-xl border border-green-100 bg-green-50 px-4 py-3 text-sm text-green-700">
                    <svg className="h-4 w-4 shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/></svg>
                    {formSuccess}
                  </div>
                )}
                <div className="flex items-center gap-3 flex-wrap">
                  <button type="submit" disabled={saving}
                    className="rounded-lg bg-primary-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-primary-700 disabled:opacity-50">
                    {saving ? "Saving..." : "Create Prescription"}
                  </button>
                  {editing && (
                    <button type="button" onClick={() => { setEditing(false); setFormError(""); setFormSuccess(""); }}
                      className="rounded-lg border border-gray-300 px-6 py-2.5 text-sm font-semibold text-gray-600 hover:bg-gray-50">
                      Cancel
                    </button>
                  )}
                </div>
              </form>}
            </>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
