import { useState, useEffect, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import DashboardLayout from "../common/DashboardLayout";
import { useAuth } from "../../context/AuthenticationContext";
import { useCall } from "../../context/useCall";
import { getMyAppointments, getPatientDocuments, updateConsultationNotes, toggleConsultationLock, updateAppointmentStatus, checkPatientAccessStatus } from "../../api/doctorApi";
import { getAgoraConfig } from "../../api/agoraApi";
import VideoCall from "../consultation/VideoCall";
import AudioCall from "../consultation/AudioCall";
import LiveChat from "../consultation/LiveChat";
import { checkMediaSupport } from "../../utils/mediaCheck";
import { DOCTOR_LINKS } from "./DoctorDashboard";

export default function Consultation() {
  const { appointmentId } = useParams();
  const { token, user } = useAuth();
  const { incomingCall, outgoingCall, callAccepted, callEndedByRemote, initiateCall, endCall: endSignaling, resetCallEnded } = useCall();

  const [appointments, setAppointments] = useState([]);
  const [selectedId, setSelectedId] = useState(appointmentId ? appointmentId : null);

  const [documents, setDocuments] = useState([]);
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(true);

  const [showDocs, setShowDocs] = useState(false);
  const [accessDenied, setAccessDenied] = useState(false);
  const [lockLoading, setLockLoading] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [callMode, setCallMode] = useState(null); // null, "video", "audio", "chat"
  const [agoraConfig, setAgoraConfig] = useState(null);
  const [sidebarTab, setSidebarTab] = useState("today");
  const [actionMsg, setActionMsg] = useState({ type: "", text: "" });
  const [confirmComplete, setConfirmComplete] = useState(false);

  const fetchAppointments = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getMyAppointments(token);
      const active = data.filter(a => a.status === "CONFIRMED" || a.status === "COMPLETED");
      setAppointments(active);
    } catch {
      setActionMsg({ type: "error", text: "Failed to load consultations. Please refresh." });
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { fetchAppointments(); }, [fetchAppointments]);

  // Poll for new appointments (e.g. after patient pays) so doctor sees them without manual refresh
  useEffect(() => {
    const interval = setInterval(fetchAppointments, 15000);
    return () => clearInterval(interval);
  }, [fetchAppointments]);



  const fetchDocs = async () => {
    if (!selectedId) return;
    try {
      // Check access first
      const accessStatus = await checkPatientAccessStatus(selectedId, token);
      if (!accessStatus?.hasAccess) {
        setAccessDenied(true);
        setDocuments([]);
        setShowDocs(true);
        return;
      }
      setAccessDenied(false);
      const docs = await getPatientDocuments(selectedId, token);
      setDocuments(docs);
      setShowDocs(true);
    } catch (err) {
      if (err?.message?.includes("403") || err?.message?.includes("ACCESS_DENIED")) {
        setAccessDenied(true);
        setDocuments([]);
        setShowDocs(true);
      } else {
        alert("Unable to load patient documents.");
      }
    }
  };



  const showMsg = (type, text) => {
    setActionMsg({ type, text });
    setTimeout(() => setActionMsg({ type: "", text: "" }), 4000);
  };

  const handleSaveNotes = async () => {
    try {
      await updateConsultationNotes(selectedId, notes, token);
      showMsg("success", "Notes saved successfully.");
    } catch { showMsg("error", "Failed to save notes."); }
  };

  const handleToggleLock = async () => {
    if (!selectedApt) return;
    const newLocked = !selectedApt.consultationLocked;
    try {
      setLockLoading(true);
      await toggleConsultationLock(selectedId, newLocked, token);
      setAppointments(prev => prev.map(a => a.id === selectedId ? { ...a, consultationLocked: newLocked } : a));
    } catch { showMsg("error", "Failed to toggle lock."); }
    finally { setLockLoading(false); }
  };

  const handleMarkComplete = async () => {
    if (!selectedApt || selectedApt.status === "COMPLETED") return;
    setConfirmComplete(true);
  };

  const doMarkComplete = async () => {
    setConfirmComplete(false);
    try {
      setCompleting(true);
      await updateAppointmentStatus(selectedId, "COMPLETED", token);
      setAppointments(prev => prev.map(a => a.id === selectedId ? { ...a, status: "COMPLETED" } : a));
    } catch { showMsg("error", "Failed to mark as complete."); }
    finally { setCompleting(false); }
  };

  const startCall = (mode) => {
    if (!selectedId) return;
    const { supported, reason } = checkMediaSupport();
    if (!supported) {
      showMsg("error", reason);
      return;
    }
    initiateCall(selectedId, mode);
  };

  // When the other party accepts, fetch Agora config and enter call mode
  useEffect(() => {
    if (!callAccepted) return;

    const aptId = outgoingCall?.appointmentId || incomingCall?.appointmentId;
    const mode = outgoingCall?.callType || incomingCall?.callType;
    if (!aptId || !mode) return;

    if (aptId !== selectedId) setSelectedId(aptId);

    (async () => {
      try {
        const config = await getAgoraConfig(aptId, token);
        if (config.error) { showMsg("error", config.error); return; }
        setAgoraConfig(config);
        setCallMode(mode);
      } catch (err) {
        showMsg("error", "Failed to start call: " + (err.message || "Unknown error"));
      }
    })();
  }, [callAccepted]); // eslint-disable-line react-hooks/exhaustive-deps

  // When the remote party ends the call, tear down our side
  useEffect(() => {
    if (callEndedByRemote && (callMode || agoraConfig)) {
      setCallMode(null);
      setAgoraConfig(null);
      resetCallEnded();
    }
  }, [callEndedByRemote]); // eslint-disable-line react-hooks/exhaustive-deps

  const endCall = () => {
    setCallMode(null);
    setAgoraConfig(null);
    endSignaling();
  };

  const selectedApt = appointments.find(a => a.id === selectedId);

  const now = new Date();
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

  // "Today" tab: only today's confirmed appointments
  const confirmedConsultations = appointments
    .filter(a => a.status === "CONFIRMED" && a.appointmentDate === todayStr)
    .sort((a, b) => (a.serialNumber ?? 999) - (b.serialNumber ?? 999));
  const completedConsultations = appointments
    .filter(a => a.status === "COMPLETED" && a.appointmentDate === todayStr)
    .sort((a, b) => (a.serialNumber ?? 999) - (b.serialNumber ?? 999));

  const sidebarList = sidebarTab === "today" ? confirmedConsultations : completedConsultations;

  const sidebarTabs = [
    { key: "today", label: "Confirmed", count: confirmedConsultations.length },
    { key: "completed", label: "Completed", count: completedConsultations.length },
  ];

  return (
    <DashboardLayout title="Consultations" links={DOCTOR_LINKS}>
      {/* Inline action message */}
      {actionMsg.text && (
        <div className={`mb-4 flex items-center gap-2 rounded-xl border px-4 py-3 text-sm ${
          actionMsg.type === "success"
            ? "border-green-100 bg-green-50 text-green-700"
            : "border-red-100 bg-red-50 text-red-700"
        }`}>
          {actionMsg.type === "success"
            ? <svg className="h-4 w-4 shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/></svg>
            : <svg className="h-4 w-4 shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd"/></svg>
          }
          {actionMsg.text}
          <button onClick={() => setActionMsg({ type: "", text: "" })} className="ml-auto opacity-60 hover:opacity-100">✕</button>
        </div>
      )}
      {/* Complete confirmation modal */}
      {confirmComplete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="mx-4 w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-100 mx-auto">
              <svg className="h-6 w-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
            </div>
            <h3 className="text-center text-lg font-bold text-gray-900 mb-2">Mark as Completed?</h3>
            <p className="text-center text-sm text-gray-500 mb-6">The patient will no longer be able to use video, audio, or chat for this consultation.</p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmComplete(false)} className="flex-1 rounded-xl border border-gray-200 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50">Cancel</button>
              <button onClick={doMarkComplete} disabled={completing} className="flex-1 rounded-xl bg-green-600 py-2.5 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-50">
                {completing ? "Completing..." : "Confirm"}
              </button>
            </div>
          </div>
        </div>
      )}
      <div className="grid gap-6 lg:grid-cols-4" style={{ minHeight: "70vh" }}>
        {/* Sidebar: appointment list */}
        <div className="lg:col-span-1 rounded-xl bg-white shadow-sm overflow-hidden flex flex-col">
          <h3 className="px-4 py-3 font-semibold text-gray-900 border-b text-sm">Today's Consultations</h3>
          {/* Tabs */}
          <div className="flex border-b border-gray-100">
            {sidebarTabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setSidebarTab(tab.key)}
                className={`flex-1 py-2 text-xs font-medium transition-all ${
                  sidebarTab === tab.key
                    ? "text-primary-700 border-b-2 border-primary-600 bg-primary-50/50"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                {tab.label}
                <span className={`ml-1 px-1.5 py-0.5 rounded-full text-[10px] font-semibold ${
                  sidebarTab === tab.key
                    ? "bg-primary-100 text-primary-700"
                    : "bg-gray-100 text-gray-500"
                }`}>
                  {tab.count}
                </span>
              </button>
            ))}
          </div>
          {loading ? (
            <p className="p-4 text-sm text-gray-500">Loading...</p>
          ) : sidebarList.length === 0 ? (
            <p className="p-4 text-sm text-gray-500">No consultations.</p>
          ) : (
            <div className="divide-y max-h-60 lg:max-h-96 overflow-y-auto flex-1">
              {sidebarList.map(apt => (
                <button key={apt.id} onClick={() => { setSelectedId(apt.id); setShowDocs(false); }}
                  className={`w-full px-4 py-3 text-left text-sm hover:bg-gray-50 transition ${selectedId === apt.id ? "bg-primary-50 border-l-2 border-primary-600" : ""}`}>
                  <div className="font-medium text-gray-900">{apt.patientName}</div>
                  <div className="text-xs text-gray-500">
                    {apt.appointmentDate}
                    {apt.serialNumber ? ` • #${apt.serialNumber}` : ""}
                    {` • ${apt.status}`}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Main Panel */}
        <div className="lg:col-span-3 flex flex-col rounded-xl bg-white shadow-sm overflow-hidden">
          {!selectedId ? (
            <div className="flex-1 flex items-center justify-center text-gray-400 py-20">
              <div className="text-center">
                <div className="mx-auto w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-3">
                  <svg className="w-8 h-8 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                </div>
                <p className="font-medium text-gray-500">Select a consultation</p>
                <p className="text-sm text-gray-400 mt-1">Choose a patient from the sidebar to begin</p>
              </div>
            </div>
          ) : (
            <>
              {/* Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between px-4 sm:px-6 py-4 border-b bg-gradient-to-r from-primary-50 to-primary-100/50 gap-3">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-primary-600 flex items-center justify-center text-sm font-bold text-white shrink-0">
                    {(selectedApt?.patientName || "P")[0]}
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900">{selectedApt?.patientName || "Patient"}</h4>
                    <p className="text-xs text-gray-500">
                      {selectedApt?.appointmentDate}
                      {selectedApt?.serialNumber ? ` • Serial #${selectedApt.serialNumber}` : ""}
                      {selectedApt?.reason ? ` — ${selectedApt.reason}` : ""}
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {selectedApt?.status === "CONFIRMED" && (
                    <button onClick={handleMarkComplete} disabled={completing}
                      className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-700 disabled:opacity-50 transition">
                      {completing ? "..." : "✅ Mark Complete"}
                    </button>
                  )}
                  <button onClick={fetchDocs} className="rounded-lg bg-white border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 transition">
                    📎 Documents
                  </button>
                  <Link to={`/doctor/prescriptions/${selectedId}`}
                    className="rounded-lg bg-white border border-gray-200 px-3 py-1.5 text-xs font-medium text-primary-600 hover:bg-primary-50 transition">
                    💊 Prescribe
                  </Link>
                </div>
              </div>

              {/* Consultation Content */}
              <div className="flex-1 overflow-y-auto">
                {selectedApt?.status === "COMPLETED" ? (
                  /* Completed State */
                  <div className="text-center py-16 px-4">
                    <div className="mx-auto w-20 h-20 rounded-full bg-blue-100 flex items-center justify-center mb-4">
                      <svg className="w-10 h-10 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <h4 className="text-xl font-bold text-gray-900 mb-2">Consultation Completed</h4>
                    <p className="text-gray-500 max-w-md mx-auto">
                      This consultation has been marked as completed.
                      Video, audio, and chat are no longer available.
                    </p>
                    <div className="mt-6 rounded-xl bg-green-50 border border-green-100 p-4 text-sm text-green-700 max-w-md mx-auto">
                      <p className="font-medium">Session ended successfully</p>
                      <p className="mt-1">You can still view this consultation in the &quot;Completed&quot; tab.</p>
                    </div>
                  </div>

                ) : selectedApt?.consultationType !== "ONLINE" ? (
                  /* Offline consultation */
                  <div className="text-center py-16 px-4">
                    <div className="mx-auto w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center mb-4">
                      <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                      </svg>
                    </div>
                    <h4 className="text-xl font-bold text-gray-900 mb-2">Offline Consultation</h4>
                    <p className="text-gray-500 max-w-md mx-auto">
                      This is an offline appointment. Video, audio, and chat features are not available.
                    </p>
                  </div>

                ) : callMode === "video" && agoraConfig ? (
                  /* Active Video Call */
                  <div className="p-4 sm:p-6">
                    <VideoCall appId={agoraConfig.appId} channel={agoraConfig.channel} uid={agoraConfig.uid} token={agoraConfig.token} onEnd={endCall} />
                  </div>

                ) : callMode === "audio" && agoraConfig ? (
                  /* Active Audio Call */
                  <div className="p-4 sm:p-6">
                    <AudioCall appId={agoraConfig.appId} channel={agoraConfig.channel} uid={agoraConfig.uid} token={agoraConfig.token} remoteName={selectedApt?.patientName} onEnd={endCall} />
                  </div>

                ) : callMode === "chat" ? (
                  /* Active Live Chat */
                  <LiveChat
                    appointmentId={selectedId}
                    token={token}
                    currentUserId={user?.id}
                    onBack={() => setCallMode(null)}
                  />

                ) : (
                  /* Consultation Room — Choose Mode */
                  <div className="p-4 sm:p-6">
                    {/* Lock Toggle */}
                    <div className={`mb-6 rounded-xl border p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 ${
                      selectedApt?.consultationLocked
                        ? "bg-red-50 border-red-200"
                        : "bg-green-50 border-green-200"
                    }`}>
                      <div className="flex items-start gap-3">
                        <svg className={`w-6 h-6 flex-shrink-0 mt-0.5 ${selectedApt?.consultationLocked ? "text-red-600" : "text-green-600"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                        </svg>
                        <div>
                          <h4 className={`font-semibold ${selectedApt?.consultationLocked ? "text-red-900" : "text-green-900"}`}>
                            {selectedApt?.consultationLocked ? "Consultation Locked" : "Consultation Unlocked"}
                          </h4>
                          <p className={`text-sm mt-0.5 ${selectedApt?.consultationLocked ? "text-red-700" : "text-green-700"}`}>
                            {selectedApt?.consultationLocked
                              ? "Patient cannot start video/audio/chat yet. Unlock when ready."
                              : "Patient can now initiate video, audio call, or live chat."}
                          </p>
                        </div>
                      </div>
                      <button onClick={handleToggleLock} disabled={lockLoading}
                        className={`shrink-0 rounded-xl px-4 py-2 text-sm font-semibold transition shadow-sm disabled:opacity-50 ${
                          selectedApt?.consultationLocked
                            ? "bg-green-600 text-white hover:bg-green-700"
                            : "bg-red-600 text-white hover:bg-red-700"
                        }`}>
                        {lockLoading ? "..." : selectedApt?.consultationLocked ? "🔓 Unlock Session" : "🔒 Lock Session"}
                      </button>
                    </div>

                    {/* Consultation Options */}
                    <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">Start Consultation</h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <button
                        onClick={() => startCall("video")}
                        disabled={selectedApt?.consultationLocked}
                        className="group rounded-xl border-2 border-gray-200 p-6 text-center hover:border-primary-500 hover:bg-primary-50 transition-all disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:border-gray-200 disabled:hover:bg-transparent"
                      >
                        <div className="mx-auto w-12 h-12 rounded-full bg-primary-100 group-hover:bg-primary-600 group-disabled:group-hover:bg-primary-100 flex items-center justify-center transition-colors">
                          <svg className="w-6 h-6 text-primary-600 group-hover:text-white group-disabled:group-hover:text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                          </svg>
                        </div>
                        <h4 className="mt-3 font-semibold text-gray-900">Video Call</h4>
                        <p className="mt-1 text-sm text-gray-500">Face-to-face consultation</p>
                      </button>

                      <button
                        onClick={() => startCall("audio")}
                        disabled={selectedApt?.consultationLocked}
                        className="group rounded-xl border-2 border-gray-200 p-6 text-center hover:border-green-500 hover:bg-green-50 transition-all disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:border-gray-200 disabled:hover:bg-transparent"
                      >
                        <div className="mx-auto w-12 h-12 rounded-full bg-green-100 group-hover:bg-green-600 group-disabled:group-hover:bg-green-100 flex items-center justify-center transition-colors">
                          <svg className="w-6 h-6 text-green-600 group-hover:text-white group-disabled:group-hover:text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                          </svg>
                        </div>
                        <h4 className="mt-3 font-semibold text-gray-900">Audio Call</h4>
                        <p className="mt-1 text-sm text-gray-500">Voice consultation</p>
                      </button>

                      <button
                        onClick={() => setCallMode("chat")}
                        disabled={selectedApt?.consultationLocked}
                        className="group rounded-xl border-2 border-gray-200 p-6 text-center hover:border-purple-500 hover:bg-purple-50 transition-all disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:border-gray-200 disabled:hover:bg-transparent"
                      >
                        <div className="mx-auto w-12 h-12 rounded-full bg-purple-100 group-hover:bg-purple-600 group-disabled:group-hover:bg-purple-100 flex items-center justify-center transition-colors">
                          <svg className="w-6 h-6 text-purple-600 group-hover:text-white group-disabled:group-hover:text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                          </svg>
                        </div>
                        <h4 className="mt-3 font-semibold text-gray-900">Live Chat</h4>
                        <p className="mt-1 text-sm text-gray-500">Text consultation</p>
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Consultation Notes — always visible at bottom */}
              {selectedApt?.status !== "COMPLETED" && (
                <div className="border-t px-4 sm:px-6 py-3">
                  <label className="block text-xs font-medium text-gray-500 mb-1">Consultation Notes</label>
                  <div className="flex gap-2">
                    <input type="text" value={notes} onChange={e => setNotes(e.target.value)}
                      placeholder="Add consultation notes..." className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500" />
                    <button onClick={handleSaveNotes} className="rounded-lg bg-gray-100 px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-200 transition">Save</button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Documents Modal */}
      {showDocs && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setShowDocs(false)}>
          <div className="mx-4 w-full max-w-md rounded-2xl bg-white p-6 shadow-xl" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-gray-900 mb-4">Patient Documents</h3>
            {accessDenied ? (
              <div className="text-center py-6">
                <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-red-50 text-2xl">🔒</div>
                <p className="text-sm font-medium text-gray-700">Access Not Granted</p>
                <p className="mt-1 text-xs text-gray-500">The patient has not granted you access to their medical records.</p>
              </div>
            ) : documents.length === 0 ? (
              <p className="text-gray-500 text-sm">No documents shared.</p>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {documents.map(doc => (
                  <div key={doc.id} className="flex items-center justify-between rounded-lg bg-gray-50 p-3">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{doc.fileName}</p>
                      <p className="text-xs text-gray-500">{doc.fileType}</p>
                    </div>
                    {doc.fileUrl && <a href={doc.fileUrl} target="_blank" rel="noreferrer" className="text-xs text-primary-600 hover:underline">View</a>}
                  </div>
                ))}
              </div>
            )}
            <button onClick={() => setShowDocs(false)} className="mt-4 w-full rounded-lg bg-gray-100 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200">Close</button>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}

