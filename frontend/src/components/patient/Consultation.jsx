import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import DashboardLayout from "../common/DashboardLayout";
import { useAuth } from "../../context/AuthenticationContext";
import { useCall } from "../../context/useCall";
import { getAppointmentById, createReviewForAppointment, getReviewForAppointment } from "../../api/patientApi";
import { getAgoraConfig } from "../../api/agoraApi";
import VideoCall from "../consultation/VideoCall";
import AudioCall from "../consultation/AudioCall";
import LiveChat from "../consultation/LiveChat";
import { checkMediaSupport } from "../../utils/mediaCheck";
import { PATIENT_LINKS } from "./patientLinks";

export default function Consultation() {
  const { appointmentId } = useParams();
  const { token, user } = useAuth();
  const { incomingCall, outgoingCall, callAccepted, callEndedByRemote, initiateCall, endCall: endSignaling, resetCallEnded } = useCall();
  const navigate = useNavigate();
  
  const [appointment, setAppointment] = useState(null);
  const [existingReview, setExistingReview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");
  
  // Consultation mode: null, "video", "audio", "chat"
  const [consultMode, setConsultMode] = useState(null);
  const [agoraConfig, setAgoraConfig] = useState(null);
  const [agoraLoading, setAgoraLoading] = useState(false);
  
  // Review form state
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const appt = await getAppointmentById(appointmentId, token);
      setAppointment(appt);
      
      // If completed, check for existing review
      if (appt.status === "COMPLETED") {
        try {
          const review = await getReviewForAppointment(appointmentId, token);
          setExistingReview(review);
          if (review) {
            setRating(review.rating);
            setComment(review.comment || "");
          }
        } catch {
          // No review yet
          setExistingReview(null);
        }
      }
    } catch (err) {
      console.error("Failed to load appointment", err);
      alert("Failed to load appointment details");
      navigate("/patient/appointments");
    } finally {
      setLoading(false);
    }
  }, [appointmentId, token, navigate]);

  useEffect(() => {
    if (token) fetchData();
  }, [token, fetchData]);

  // Poll for lock status changes when on consultation tab
  useEffect(() => {
    if (activeTab !== "consultation" || !token || !appointmentId) return;
    const interval = setInterval(async () => {
      try {
        const appt = await getAppointmentById(appointmentId, token);
        setAppointment(appt);
      } catch { /* ignore */ }
    }, 5000);
    return () => clearInterval(interval);
  }, [activeTab, token, appointmentId]);

  const [actionMsg, setActionMsg] = useState({ type: "", text: "" });
  const showMsg = (type, text) => {
    setActionMsg({ type, text });
    setTimeout(() => setActionMsg({ type: "", text: "" }), 5000);
  };

  const handleSubmitReview = async (e) => {
    e.preventDefault();
    if (rating < 1 || rating > 5) {
      showMsg("error", "Rating must be between 1 and 5");
      return;
    }
    try {
      setSubmitting(true);
      await createReviewForAppointment(appointmentId, { rating, comment }, token);
      showMsg("success", "Review submitted successfully!");
      fetchData();
      setActiveTab("overview");
    } catch (err) {
      showMsg("error", err.message || "Failed to submit review");
    } finally {
      setSubmitting(false);
    }
  };

  const startConsultation = (mode) => {
    if (mode === "chat") {
      setConsultMode("chat");
      return;
    }
    const { supported, reason } = checkMediaSupport();
    if (!supported) {
      showMsg("error", reason);
      return;
    }
    // Initiates call signal; Agora config is fetched when the doctor accepts (callAccepted effect)
    initiateCall(appointmentId, mode);
  };

  // When the other party accepts, fetch Agora config and enter call mode
  useEffect(() => {
    if (!callAccepted) return;

    const aptId = outgoingCall?.appointmentId || incomingCall?.appointmentId;
    const mode = outgoingCall?.callType || incomingCall?.callType;
    if (!aptId || !mode || mode === "chat") return;

    // Only act if this is the right appointment page
    if (String(aptId) !== String(appointmentId)) return;

    (async () => {
      try {
        setAgoraLoading(true);
        const config = await getAgoraConfig(aptId, token);
        if (config.error) { showMsg("error", config.error); return; }
        setAgoraConfig(config);
        setConsultMode(mode);
      } catch (err) {
        showMsg("error", "Failed to start " + mode + " call: " + (err.message || "Unknown error"));
      } finally {
        setAgoraLoading(false);
      }
    })();
  }, [callAccepted]); // eslint-disable-line react-hooks/exhaustive-deps

  // When the remote party ends the call, tear down our side
  useEffect(() => {
    if (callEndedByRemote && (consultMode || agoraConfig)) {
      setConsultMode(null);
      setAgoraConfig(null);
      resetCallEnded();
    }
  }, [callEndedByRemote]); // eslint-disable-line react-hooks/exhaustive-deps

  const endConsultation = () => {
    setConsultMode(null);
    setAgoraConfig(null);
    endSignaling();
  };

  if (loading) {
    return (
      <DashboardLayout title="Consultation" links={PATIENT_LINKS}>
        <div className="flex justify-center items-center py-20">
          <div className="text-center">
            <div className="inline-block h-10 w-10 animate-spin rounded-full border-4 border-solid border-primary-600 border-r-transparent"></div>
            <p className="mt-3 text-gray-500">Loading consultation...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (!appointment) {
    return (
      <DashboardLayout title="Consultation" links={PATIENT_LINKS}>
        <div className="text-center py-16">
          <p className="text-gray-500">Appointment not found</p>
          <Link to="/patient/appointments" className="mt-4 inline-block text-primary-600 hover:underline">
            Return to appointments
          </Link>
        </div>
      </DashboardLayout>
    );
  }

  const isCompleted = appointment.status === "COMPLETED";
  const isConfirmed = appointment.status === "CONFIRMED";
  const canConsult = isConfirmed || isCompleted;

  return (
    <DashboardLayout title="Consultation Session" links={PATIENT_LINKS}>
      <div className="space-y-6">
        {/* Inline action message */}
        {actionMsg.text && (
          <div className={`flex items-center gap-2 rounded-xl border px-4 py-3 text-sm ${
            actionMsg.type === "success"
              ? "border-green-100 bg-green-50 text-green-700"
              : "border-red-100 bg-red-50 text-red-700"
          }`}>
            {actionMsg.text}
            <button onClick={() => setActionMsg({ type: "", text: "" })} className="ml-auto opacity-60 hover:opacity-100">✕</button>
          </div>
        )}
        {/* Header Card */}
        <div className="rounded-2xl bg-primary-600 p-6 text-white shadow-lg">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="h-16 w-16 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center text-2xl font-bold">
                {(appointment.doctorName || "D")[0]}
              </div>
              <div>
                <h2 className="text-2xl font-bold"> {appointment.doctorName}</h2>
                <p className="text-primary-100 mt-1">{appointment.specialty}</p>
              </div>
            </div>
            <div className="text-left sm:text-right">
              <div className="text-xl font-bold">{appointment.appointmentDate}</div>
              {appointment.consultationType === "ONLINE" && appointment.serialNumber && (
                <div className="text-primary-100 mt-1">
                  Serial #{appointment.serialNumber}
                </div>
              )}
              <span className={`inline-block mt-2 px-3 py-1 rounded-full text-xs font-semibold ${
                isCompleted ? "bg-green-400/20 text-green-100" :
                isConfirmed ? "bg-yellow-400/20 text-yellow-100" :
                "bg-red-400/20 text-red-100"
              }`}>
                {appointment.status}
              </span>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-2 border-b border-gray-200">
          <button
            onClick={() => setActiveTab("overview")}
            className={`px-4 py-2 font-medium transition border-b-2 ${
              activeTab === "overview"
                ? "border-primary-600 text-primary-600"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            Overview
          </button>
          {canConsult && appointment.consultationType === "ONLINE" && (
            <button
              onClick={() => setActiveTab("consultation")}
              className={`px-4 py-2 font-medium transition border-b-2 ${
                activeTab === "consultation"
                  ? "border-primary-600 text-primary-600"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              Video/Audio/Chat
            </button>
          )}
          {isCompleted && (
            <button
              onClick={() => setActiveTab("review")}
              className={`px-4 py-2 font-medium transition border-b-2 ${
                activeTab === "review"
                  ? "border-primary-600 text-primary-600"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              {existingReview ? "My Review" : "Give Review"}
            </button>
          )}
        </div>

        {/* Tab Content */}
        {activeTab === "overview" && (
          <div className="rounded-2xl bg-white p-6 shadow-sm">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Appointment Details</h3>
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div>
                <dt className="text-gray-500 font-medium">Consultation Type</dt>
                <dd className="mt-1 font-semibold">
                  {appointment.consultationType === "ONLINE" ? "🖥️ Online" : "🏥 Offline"}
                </dd>
              </div>
              <div>
                <dt className="text-gray-500 font-medium">Date</dt>
                <dd className="mt-1 font-semibold">
                  {appointment.appointmentDate}
                </dd>
              </div>
              {appointment.consultationType === "ONLINE" && (
                <div>
                  <dt className="text-gray-500 font-medium">Duration</dt>
                  <dd className="mt-1 font-semibold">30 minutes</dd>
                </div>
              )}
              {appointment.serialNumber && (
                <div>
                  <dt className="text-gray-500 font-medium">Serial Number</dt>
                  <dd className="mt-1 text-xl font-bold text-amber-600">#{appointment.serialNumber}</dd>
                </div>
              )}
              <div>
                <dt className="text-gray-500 font-medium">Payment Status</dt>
                <dd className="mt-1">
                  <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                    appointment.paymentStatus === "COMPLETED" 
                      ? "bg-green-50 text-green-700" 
                      : "bg-yellow-50 text-yellow-700"
                  }`}>
                    {appointment.paymentStatus === "COMPLETED" ? "✓ Paid" : "Pending"}
                  </span>
                </dd>
              </div>
              <div>
                <dt className="text-gray-500 font-medium">Consultation Fee</dt>
                <dd className="mt-1 font-semibold">&#2547;{appointment.consultationFee}</dd>
              </div>
              {appointment.reason && (
                <div className="sm:col-span-2">
                  <dt className="text-gray-500 font-medium">Reason for Visit</dt>
                  <dd className="mt-1 text-gray-700">{appointment.reason}</dd>
                </div>
              )}
              {appointment.symptoms && (
                <div className="sm:col-span-2">
                  <dt className="text-gray-500 font-medium">Symptoms</dt>
                  <dd className="mt-1 text-gray-700">{appointment.symptoms}</dd>
                </div>
              )}
              {appointment.consultationNotes && (
                <div className="sm:col-span-2">
                  <dt className="text-gray-500 font-medium">Doctor's Notes</dt>
                  <dd className="mt-2 rounded-lg bg-primary-50 p-4 text-gray-700">{appointment.consultationNotes}</dd>
                </div>
              )}
            </dl>
          </div>
        )}

        {activeTab === "consultation" && canConsult && appointment.consultationType === "ONLINE" && (
          <div className="rounded-2xl bg-white p-6 shadow-sm">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Consultation Room</h3>
            
            {isCompleted ? (
              /* Completed State */
              <div className="text-center py-12">
                <div className="mx-auto w-20 h-20 rounded-full bg-blue-100 flex items-center justify-center mb-4">
                  <svg className="w-10 h-10 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h4 className="text-xl font-bold text-gray-900 mb-2">Consultation Completed</h4>
                <p className="text-gray-500 max-w-md mx-auto">
                  Your doctor has marked this consultation as completed.
                  Video, audio, and chat are no longer available.
                </p>
                <div className="mt-4 rounded-xl bg-green-50 border border-green-100 p-4 text-sm text-green-700 max-w-md mx-auto">
                  <p className="font-medium">Thank you for your consultation!</p>
                  <p className="mt-1">You can share your experience in the Review tab.</p>
                </div>
              </div>
            ) : appointment.consultationLocked ? (
              /* Locked State - Waiting for doctor */
              <div className="text-center py-12">
                <div className="mx-auto w-20 h-20 rounded-full bg-amber-100 flex items-center justify-center mb-4">
                  <svg className="w-10 h-10 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <h4 className="text-xl font-bold text-gray-900 mb-2">Waiting for Doctor</h4>
                <p className="text-gray-500 max-w-md mx-auto">
                  Your consultation session is locked. The doctor will unlock it when it is your turn. 
                  Please wait — this page will automatically update.
                </p>
                <div className="mt-6 flex items-center justify-center gap-2 text-sm text-amber-600">
                  <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                  </svg>
                  Checking status...
                </div>
                {appointment.serialNumber && (
                <div className="mt-4 rounded-xl bg-primary-50 border border-primary-100 p-4 text-sm text-primary-700 max-w-md mx-auto">
                  <p className="font-medium">Your Serial Number: #{appointment.serialNumber}</p>
                  <p className="mt-1 text-primary-600">The doctor will attend patients in serial number order.</p>
                </div>
                )}
              </div>
            ) : (
              /* Unlocked State - Can start consultation */
              <>
                {consultMode === "video" && agoraConfig ? (
                  <VideoCall
                    appId={agoraConfig.appId}
                    channel={agoraConfig.channel}
                    uid={agoraConfig.uid}
                    token={agoraConfig.token}
                    onEnd={endConsultation}
                  />
                ) : consultMode === "audio" && agoraConfig ? (
                  <AudioCall
                    appId={agoraConfig.appId}
                    channel={agoraConfig.channel}
                    uid={agoraConfig.uid}
                    token={agoraConfig.token}
                    remoteName={appointment.doctorName}
                    onEnd={endConsultation}
                  />
                ) : consultMode === "chat" ? (
                  <LiveChat
                    appointmentId={appointmentId}
                    token={token}
                    currentUserId={user?.id}
                    onBack={endConsultation}
                  />
                ) : (
                  <>
                    <div className="mb-6 rounded-xl bg-green-50 border border-green-200 p-4">
                      <div className="flex items-start gap-3">
                        <svg className="w-6 h-6 text-green-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" />
                        </svg>
                        <div>
                          <h4 className="font-semibold text-green-900">Session Unlocked!</h4>
                          <p className="text-sm text-green-700 mt-1">
                            Your doctor has unlocked the consultation. Choose how you would like to connect:
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Consultation Options */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <button
                        onClick={() => startConsultation("video")}
                        disabled={agoraLoading}
                        className="group rounded-xl border-2 border-gray-200 p-6 text-center hover:border-primary-500 hover:bg-primary-50 transition-all disabled:opacity-50"
                      >
                        <div className="mx-auto w-12 h-12 rounded-full bg-primary-100 group-hover:bg-primary-600 flex items-center justify-center transition-colors">
                          <svg className="w-6 h-6 text-primary-600 group-hover:text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                          </svg>
                        </div>
                        <h4 className="mt-3 font-semibold text-gray-900">Video Call</h4>
                        <p className="mt-1 text-sm text-gray-500">Face-to-face consultation</p>
                      </button>

                      <button
                        onClick={() => startConsultation("audio")}
                        disabled={agoraLoading}
                        className="group rounded-xl border-2 border-gray-200 p-6 text-center hover:border-green-500 hover:bg-green-50 transition-all disabled:opacity-50"
                      >
                        <div className="mx-auto w-12 h-12 rounded-full bg-green-100 group-hover:bg-green-600 flex items-center justify-center transition-colors">
                          <svg className="w-6 h-6 text-green-600 group-hover:text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                          </svg>
                        </div>
                        <h4 className="mt-3 font-semibold text-gray-900">Audio Call</h4>
                        <p className="mt-1 text-sm text-gray-500">Voice consultation</p>
                      </button>

                      <button
                        onClick={() => startConsultation("chat")}
                        disabled={agoraLoading}
                        className="group rounded-xl border-2 border-gray-200 p-6 text-center hover:border-purple-500 hover:bg-purple-50 transition-all disabled:opacity-50"
                      >
                        <div className="mx-auto w-12 h-12 rounded-full bg-purple-100 group-hover:bg-purple-600 flex items-center justify-center transition-colors">
                          <svg className="w-6 h-6 text-purple-600 group-hover:text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                          </svg>
                        </div>
                        <h4 className="mt-3 font-semibold text-gray-900">Live Chat</h4>
                        <p className="mt-1 text-sm text-gray-500">Text consultation</p>
                      </button>
                    </div>

                    {agoraLoading && (
                      <div className="mt-4 text-center text-sm text-gray-500">
                        <svg className="inline-block h-4 w-4 animate-spin mr-2" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                        Connecting...
                      </div>
                    )}
                  </>
                )}
              </>
            )}
          </div>
        )}

        {activeTab === "review" && isCompleted && (
          <div className="rounded-2xl bg-white p-6 shadow-sm">
            <h3 className="text-lg font-bold text-gray-900 mb-4">
              {existingReview ? "Your Review" : "Rate Your Experience"}
            </h3>
            
            {existingReview ? (
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-gray-500 font-medium mb-2">Rating</p>
                  <div className="flex items-center gap-2">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <svg
                        key={star}
                        className={`w-8 h-8 ${star <= existingReview.rating ? "text-yellow-400" : "text-gray-300"}`}
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                    ))}
                    <span className="ml-2 text-xl font-bold text-gray-900">{existingReview.rating.toFixed(1)}</span>
                  </div>
                </div>
                
                {existingReview.comment && (
                  <div>
                    <p className="text-sm text-gray-500 font-medium mb-2">Your Comments</p>
                    <div className="rounded-lg bg-gray-50 p-4 text-gray-700">
                      {existingReview.comment}
                    </div>
                  </div>
                )}

                <div className="rounded-lg bg-green-50 border border-green-200 p-4">
                  <p className="text-sm text-green-800">
                    ✓ Thank you for your feedback! Your review helps us improve our services.
                  </p>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmitReview} className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Rating <span className="text-red-500">*</span>
                  </label>
                  <div className="flex items-center gap-2">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setRating(star)}
                        className="focus:outline-none transition-transform hover:scale-110"
                      >
                        <svg
                          className={`w-10 h-10 ${star <= rating ? "text-yellow-400" : "text-gray-300"}`}
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                        </svg>
                      </button>
                    ))}
                    <span className="ml-2 text-xl font-bold text-gray-900">{rating.toFixed(1)}</span>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Comments (Optional)
                  </label>
                  <textarea
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    rows={4}
                    maxLength={2000}
                    className="w-full rounded-lg border border-gray-300 p-3 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 outline-none"
                    placeholder="Share your experience with the doctor..."
                  />
                  <p className="mt-1 text-xs text-gray-500">{comment.length}/2000 characters</p>
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full rounded-xl bg-primary-600 px-6 py-3 font-semibold text-white shadow-lg shadow-primary-500/25 transition hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                      </svg>
                      Submitting...
                    </span>
                  ) : "Submit Review"}
                </button>
              </form>
            )}
          </div>
        )}

        {/* Back Button */}
        <Link
          to="/patient/appointments"
          className="inline-flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-primary-600 transition"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back to Appointments
        </Link>
      </div>
    </DashboardLayout>
  );
}


