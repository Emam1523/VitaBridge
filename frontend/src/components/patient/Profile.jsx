import { useState, useEffect } from "react";
import DashboardLayout from "../common/DashboardLayout";
import { useAuth } from "../../context/AuthenticationContext";
import { getProfile, updateProfile } from "../../api/patientApi";
import { changePassword, sendChangePasswordOtp, verifyChangePasswordOtp } from "../../api/authenticationApi";
import { PATIENT_LINKS } from "./patientLinks";
import ProfileAvatar from "../common/ProfilePhotoUpload";

const INITIAL_FORM = {
  name: "", phoneNumber: "", dateOfBirth: "", gender: "", bloodGroup: "",
  address: "", emergencyContactName: "", emergencyContactRelation: "", emergencyContact: "",
  pressureLevel: "", height: "", weight: "", allergies: "", medicalHistory: "",
};

export default function Profile() {
  const { token } = useAuth();
  const [profile, setProfile] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [form, setForm] = useState(INITIAL_FORM);
  const [activeTab, setActiveTab] = useState("personal");
  // Security tab state — OTP flow: step 0=idle, 1=otp-sent, 2=otp-verified
  const [pwStep, setPwStep] = useState(0);
  const [pwOtp, setPwOtp] = useState("");
  const [pwForm, setPwForm] = useState({ newPassword: "", confirmNewPassword: "" });
  const [pwSaving, setPwSaving] = useState(false);
  const [pwError, setPwError] = useState("");
  const [pwSuccess, setPwSuccess] = useState("");
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [otpResendCooldown, setOtpResendCooldown] = useState(0);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const data = await getProfile(token);
        setProfile(data);
        populate(data);
      } catch (err) {
        setError(err.message || "Failed to load profile");
      } finally {
        setLoading(false);
      }
    })();
  }, [token]);

  function populate(d) {
    setForm({
      name: d.name || "", phoneNumber: d.phoneNumber || "", dateOfBirth: d.dateOfBirth || "",
      gender: d.gender || "", bloodGroup: d.bloodGroup || "", address: d.address || "",
      emergencyContactName: d.emergencyContactName || "", emergencyContactRelation: d.emergencyContactRelation || "",
      emergencyContact: d.emergencyContact || "", pressureLevel: d.pressureLevel || "",
      height: d.height ?? "", weight: d.weight ?? "", allergies: d.allergies || "", medicalHistory: d.medicalHistory || "",
    });
  }

  const change = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setError(""); setSuccess("");
    try {
      setSaving(true);
      const res = await updateProfile(form, token);
      setProfile(res);
      setSuccess("Profile saved successfully!");
      setIsEditing(false);
    } catch (err) {
      setError(err.message || "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const cancel = () => { populate(profile); setIsEditing(false); setError(""); };

  // Start OTP flow: send OTP to user's email
  const handleSendOtp = async () => {
    setPwError("");
    setPwSuccess("");
    try {
      setPwSaving(true);
      await sendChangePasswordOtp(token);
      setPwStep(1);
      setPwSuccess("A verification code has been sent to your email.");
      // Start cooldown timer
      setOtpResendCooldown(60);
      const interval = setInterval(() => {
        setOtpResendCooldown((prev) => {
          if (prev <= 1) { clearInterval(interval); return 0; }
          return prev - 1;
        });
      }, 1000);
    } catch (err) {
      setPwError(err.message || "Failed to send verification code");
    } finally {
      setPwSaving(false);
    }
  };

  // Verify OTP
  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setPwError("");
    if (pwOtp.length !== 6) {
      setPwError("Please enter the 6-digit verification code.");
      return;
    }
    try {
      setPwSaving(true);
      await verifyChangePasswordOtp(pwOtp, token);
      setPwStep(2);
      setPwSuccess("OTP verified! Now set your new password.");
    } catch (err) {
      setPwError(err.message || "Invalid verification code");
    } finally {
      setPwSaving(false);
    }
  };

  // Submit new password (after OTP verified)
  const submitPassword = async (e) => {
    e.preventDefault();
    setPwError(""); setPwSuccess("");
    if (pwForm.newPassword !== pwForm.confirmNewPassword) { setPwError("New passwords do not match."); return; }
    if (pwForm.newPassword.length < 6) { setPwError("New password must be at least 6 characters."); return; }
    try {
      setPwSaving(true);
      await changePassword({ newPassword: pwForm.newPassword, confirmNewPassword: pwForm.confirmNewPassword }, token);
      setPwSuccess("Password changed successfully!");
      setPwStep(0);
      setPwOtp("");
      setPwForm({ newPassword: "", confirmNewPassword: "" });
    } catch (err) {
      setPwError(err.message || "Failed to change password");
    } finally {
      setPwSaving(false);
    }
  };

  const inputCls = (disabled) =>
    `mt-1.5 block w-full rounded-lg border px-4 py-2.5 text-sm transition outline-none ${
      disabled
        ? "border-gray-100 bg-gray-50 text-gray-500 cursor-default"
        : "border-gray-200 bg-white text-gray-900 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
    }`;

  const tabs = [
    { id: "personal", label: "Personal Info", icon: "👤" },
    { id: "emergency", label: "Emergency Contact", icon: "🚑" },
    { id: "medical", label: "Medical Info", icon: "🩺" },
    { id: "security", label: "Security", icon: "🔒" },
  ];

  if (loading && !profile) {
    return (
      <DashboardLayout title="My Profile" links={PATIENT_LINKS}>
        <div className="flex h-64 items-center justify-center">
          <svg className="h-8 w-8 animate-spin text-primary-400" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="My Profile" links={PATIENT_LINKS}>
      <div className="mx-auto max-w-4xl">
        {/* Messages */}
        {error && (
          <div className="mb-4 flex items-center gap-2 rounded-lg border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
            <svg className="h-4 w-4 shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd"/></svg>
            {error}
          </div>
        )}
        {success && (
          <div className="mb-4 flex items-center gap-2 rounded-lg border border-green-100 bg-green-50 px-4 py-3 text-sm text-green-700">
            <svg className="h-4 w-4 shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/></svg>
            {success}
          </div>
        )}

        {/* Header */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <ProfileAvatar initial={(profile?.name || "P")[0]} />
            <div>
              <h2 className="text-xl font-bold text-gray-900">{profile?.name}</h2>
              <p className="text-sm text-gray-500">{profile?.email}</p>
            </div>
          </div>
          {!isEditing && activeTab !== "security" && (
            <button onClick={() => setIsEditing(true)} className="rounded-lg bg-primary-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-primary-700">
              Edit Profile
            </button>
          )}
        </div>

        {/* Tabs */}
        <div className="mb-6 flex gap-2 overflow-x-auto rounded-xl border border-gray-100 bg-white p-1.5 shadow-sm">
          {tabs.map((t) => (
            <button key={t.id} onClick={() => setActiveTab(t.id)}
              className={`flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition whitespace-nowrap ${
                activeTab === t.id ? "bg-primary-50 text-primary-700 shadow-sm" : "text-gray-500 hover:bg-gray-50 hover:text-gray-700"
              }`}>
              <span>{t.icon}</span>
              {t.label}
            </button>
          ))}
        </div>

        <form onSubmit={submit}>
          <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm md:p-8">
            {/* Personal Info */}
            {activeTab === "personal" && (
              <div className="grid gap-5 sm:grid-cols-2">
                <div>
                  <label className="text-sm font-medium text-gray-700">Full Name</label>
                  <input type="text" name="name" value={form.name} onChange={change} disabled={!isEditing} required className={inputCls(!isEditing)} />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Email</label>
                  <input type="email" value={profile?.email || ""} disabled className={inputCls(true)} />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Phone Number</label>
                  <input type="tel" name="phoneNumber" value={form.phoneNumber} onChange={change} disabled={!isEditing} className={inputCls(!isEditing)} />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Date of Birth</label>
                  <input type="date" name="dateOfBirth" value={form.dateOfBirth} onChange={change} disabled={!isEditing} className={inputCls(!isEditing)} />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Gender</label>
                  <select name="gender" value={form.gender} onChange={change} disabled={!isEditing} className={inputCls(!isEditing)}>
                    <option value="">Select Gender</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div className="sm:col-span-2">
                  <label className="text-sm font-medium text-gray-700">Address</label>
                  <textarea name="address" value={form.address} onChange={change} disabled={!isEditing} rows={2} className={inputCls(!isEditing)} placeholder="Your full address" />
                </div>
              </div>
            )}

            {/* Emergency Contact */}
            {activeTab === "emergency" && (
              <div className="grid gap-5 sm:grid-cols-2">
                <div>
                  <label className="text-sm font-medium text-gray-700">Contact Name</label>
                  <input type="text" name="emergencyContactName" value={form.emergencyContactName} onChange={change} disabled={!isEditing} className={inputCls(!isEditing)} placeholder="e.g. Emam Hassan" />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Relation</label>
                  <select name="emergencyContactRelation" value={form.emergencyContactRelation} onChange={change} disabled={!isEditing} className={inputCls(!isEditing)}>
                    <option value="">Select Relation</option>
                    <option value="Father">Father</option>
                    <option value="Mother">Mother</option>
                    <option value="Spouse">Spouse</option>
                    <option value="Sibling">Sibling</option>
                    <option value="Friend">Friend</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Contact Number</label>
                  <input type="tel" name="emergencyContact" value={form.emergencyContact} onChange={change} disabled={!isEditing} className={inputCls(!isEditing)} placeholder="+880 1XXX-XXXXXX" />
                </div>
              </div>
            )}

            {/* Medical Info */}
            {activeTab === "medical" && (
              <div className="grid gap-5 sm:grid-cols-2">
                <div>
                  <label className="text-sm font-medium text-gray-700">Blood Group</label>
                  <select name="bloodGroup" value={form.bloodGroup} onChange={change} disabled={!isEditing} className={inputCls(!isEditing)}>
                    <option value="">Select</option>
                    {["A+", "A-", "B+", "B-", "O+", "O-", "AB+", "AB-"].map((bg) => (
                      <option key={bg} value={bg}>{bg}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Pressure Level</label>
                  <select name="pressureLevel" value={form.pressureLevel} onChange={change} disabled={!isEditing} className={inputCls(!isEditing)}>
                    <option value="">Select</option>
                    <option value="Low">Low</option>
                    <option value="Normal">Normal</option>
                    <option value="High">High</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Height (cm)</label>
                  <input type="number" name="height" value={form.height} onChange={change} disabled={!isEditing} className={inputCls(!isEditing)} placeholder="e.g. 170" />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Weight (kg)</label>
                  <input type="number" name="weight" value={form.weight} onChange={change} disabled={!isEditing} className={inputCls(!isEditing)} placeholder="e.g. 65" />
                </div>
                <div className="sm:col-span-2">
                  <label className="text-sm font-medium text-gray-700">Allergies</label>
                  <input type="text" name="allergies" value={form.allergies} onChange={change} disabled={!isEditing} className={inputCls(!isEditing)} placeholder="e.g. Peanuts, Penicillin" />
                </div>
                <div className="sm:col-span-2">
                  <label className="text-sm font-medium text-gray-700">Medical History</label>
                  <textarea name="medicalHistory" value={form.medicalHistory} onChange={change} disabled={!isEditing} rows={3} className={inputCls(!isEditing)} placeholder="Diabetes, Hypertension, past surgeries..." />
                </div>
              </div>
            )}

            {/* Action buttons */}
            {isEditing && activeTab !== "security" && (
              <div className="mt-6 flex justify-end gap-3 border-t border-gray-100 pt-6">
                <button type="button" onClick={cancel} className="rounded-lg border border-gray-200 bg-white px-5 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50">
                  Cancel
                </button>
                <button type="submit" disabled={saving} className="rounded-lg bg-primary-600 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-primary-700 disabled:opacity-60">
                  {saving ? "Saving..." : "Save Changes"}
                </button>
              </div>
            )}
          </div>
        </form>

        {/* Security Tab */}
        {activeTab === "security" && (
          <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm md:p-8">
            <h3 className="mb-5 text-base font-semibold text-gray-900">Change Password</h3>
            {pwError && (
              <div className="mb-4 flex items-center gap-2 rounded-lg border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
                <svg className="h-4 w-4 shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd"/></svg>
                {pwError}
              </div>
            )}
            {pwSuccess && (
              <div className="mb-4 flex items-center gap-2 rounded-lg border border-green-100 bg-green-50 px-4 py-3 text-sm text-green-700">
                <svg className="h-4 w-4 shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/></svg>
                {pwSuccess}
              </div>
            )}
            {/* Step 0: Show "Update Password" button */}
            {pwStep === 0 && (
              <div className="max-w-md">
                <p className="mb-4 text-sm text-gray-600">
                  To change your password, we will send a verification code to your registered email address.
                </p>
                <button
                  type="button"
                  onClick={handleSendOtp}
                  disabled={pwSaving}
                  className="rounded-lg bg-primary-600 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-primary-700 disabled:opacity-60"
                >
                  {pwSaving ? "Sending..." : "Update Password"}
                </button>
              </div>
            )}

            {/* Step 1: OTP sent - show OTP input */}
            {pwStep === 1 && (
              <form onSubmit={handleVerifyOtp} className="max-w-md space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-700">Verification Code</label>
                  <div className="relative mt-1">
                    <input
                      type="text"
                      inputMode="numeric"
                      maxLength={6}
                      value={pwOtp}
                      onChange={(e) => setPwOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                      required placeholder="Enter 6-digit code"
                      className={inputCls(false) + " text-center text-xl font-bold tracking-[0.5em]"}
                      autoFocus
                    />
                  </div>
                  <p className="mt-1 text-xs text-gray-500">
                    {otpResendCooldown > 0 ? `Resend in ${otpResendCooldown}s` : "Didn't receive?"}{" "}
                    {otpResendCooldown === 0 && (
                      <button type="button" onClick={handleSendOtp} disabled={pwSaving} className="font-medium text-primary-600 hover:text-primary-700">
                        Resend OTP
                      </button>
                    )}
                  </p>
                </div>
                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={pwSaving || pwOtp.length !== 6}
                    className="rounded-lg bg-primary-600 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-primary-700 disabled:opacity-60"
                  >
                    {pwSaving ? "Verifying..." : "Verify Code"}
                  </button>
                </div>
              </form>
            )}

            {/* Step 2: OTP verified - show password form */}
            {pwStep === 2 && (
              <form onSubmit={submitPassword} className="max-w-md space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-700">New Password</label>
                  <div className="relative mt-1">
                    <input type={showNew ? "text" : "password"} value={pwForm.newPassword}
                      onChange={(e) => setPwForm((f) => ({ ...f, newPassword: e.target.value }))}
                      required placeholder="At least 6 characters" className={inputCls(false) + " pr-10"} />
                    <button type="button" onClick={() => setShowNew((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                      {showNew ? <EyeOffIcon /> : <EyeIcon />}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Confirm New Password</label>
                  <div className="relative mt-1">
                    <input type={showConfirm ? "text" : "password"} value={pwForm.confirmNewPassword}
                      onChange={(e) => setPwForm((f) => ({ ...f, confirmNewPassword: e.target.value }))}
                      required placeholder="Repeat new password" className={inputCls(false) + " pr-10"} />
                    <button type="button" onClick={() => setShowConfirm((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                      {showConfirm ? <EyeOffIcon /> : <EyeIcon />}
                    </button>
                  </div>
                </div>
                <div className="pt-2">
                  <button type="submit" disabled={pwSaving}
                    className="rounded-lg bg-primary-600 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-primary-700 disabled:opacity-60">
                    {pwSaving ? "Updating..." : "Update Password"}
                  </button>
                </div>
              </form>
            )}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

function EyeIcon() { return <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>; }
function EyeOffIcon() { return <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"/></svg>; }
