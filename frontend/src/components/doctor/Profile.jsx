import { useState, useEffect } from "react";
import DashboardLayout from "../common/DashboardLayout";
import { useAuth } from "../../context/AuthenticationContext";
import { getDoctorProfile, updateDoctorProfile } from "../../api/doctorApi";
import { DOCTOR_LINKS } from "./DoctorDashboard";
import { changePassword, sendChangePasswordOtp, verifyChangePasswordOtp } from "../../api/authenticationApi";
import ProfileAvatar from "../common/ProfilePhotoUpload";

const inputCls = (disabled) =>
  `mt-1.5 block w-full rounded-lg border px-4 py-2.5 text-sm transition outline-none ${
    disabled
      ? "border-gray-100 bg-gray-50 text-gray-500 cursor-default"
      : "border-gray-200 bg-white text-gray-900 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
  }`;

export default function DoctorProfile() {
  const { token } = useAuth();
  const [profile, setProfile] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [form, setForm] = useState({ name:"", phoneNumber:"", specialty:"", experience:"", licenseNumber:"", consultationFee:"", availability:"Available", bio:"" });
  const [activeTab, setActiveTab] = useState("professional");
  const [education, setEducation] = useState([]);
  const [qualifications, setQualifications] = useState([]);
  const [newEdu, setNewEdu] = useState({ degree:"", institute:"", year:"" });
  const [newQual, setNewQual] = useState("");
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
        const data = await getDoctorProfile(token);
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
      name: d.name || "", phoneNumber: d.phoneNumber || "", specialty: d.specialty || "",
      experience: d.experience || "", licenseNumber: d.licenseNumber || "",
      consultationFee: d.consultationFee ?? "", availability: d.availability || "Available",
      bio: d.bio || "",
    });
    setEducation(Array.isArray(d.education) ? d.education : []);
    setQualifications(Array.isArray(d.qualifications) ? d.qualifications : []);
  }

  const change = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const cancel = () => { populate(profile); setIsEditing(false); setError(""); setSuccess(""); };

  const submit = async (e) => {
    e.preventDefault();
    setError(""); setSuccess("");
    try {
      setSaving(true);
      const payload = {
        ...profile,
        name: form.name, phoneNumber: form.phoneNumber, specialty: form.specialty,
        experience: form.experience, licenseNumber: form.licenseNumber,
        consultationFee: form.consultationFee !== "" ? parseFloat(form.consultationFee) : null,
        availability: form.availability, bio: form.bio,
        education, qualifications,
      };
      const updated = await updateDoctorProfile(payload, token);
      setProfile(updated);
      populate(updated);
      setSuccess("Profile saved successfully!");
      setIsEditing(false);
    } catch (err) {
      setError(err.message || "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const addEducation = () => {
    if (!newEdu.degree.trim() || !newEdu.institute.trim()) return;
    setEducation((prev) => [...prev, { ...newEdu }]);
    setNewEdu({ degree: "", institute: "", year: "" });
  };
  const removeEducation = (idx) => setEducation((prev) => prev.filter((_, i) => i !== idx));

  const addQualification = () => {
    if (!newQual.trim()) return;
    setQualifications((prev) => [...prev, newQual.trim()]);
    setNewQual("");
  };
  const removeQualification = (idx) => setQualifications((prev) => prev.filter((_, i) => i !== idx));

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

  const tabs = [
    { id: "professional", label: "Professional Info", icon: "🩺" },
    { id: "about", label: "About Me", icon: "📝" },
    { id: "education", label: "Education", icon: "🎓" },
    { id: "certifications", label: "Certifications", icon: "🏅" },
    { id: "security", label: "Security", icon: "🔒" },
  ];

  if (loading && !profile) {
    return (
      <DashboardLayout title="My Profile" links={DOCTOR_LINKS}>
        <div className="flex h-64 items-center justify-center">
          <svg className="h-8 w-8 animate-spin text-primary-400" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
          </svg>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="My Profile" links={DOCTOR_LINKS}>
      <div className="mx-auto max-w-4xl">
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
            <ProfileAvatar initial={(profile?.name || "D")[0]} />
            <div>
              <h2 className="text-xl font-bold text-gray-900">{profile?.name}</h2>
              <p className="text-sm text-gray-500">{profile?.specialty}</p>
              <span className={`mt-1 inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${profile?.availability === "Available" ? "bg-green-50 text-green-700" : "bg-yellow-50 text-yellow-700"}`}>
                {profile?.availability}
              </span>
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
              className={`flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition whitespace-nowrap ${activeTab === t.id ? "bg-primary-50 text-primary-700 shadow-sm" : "text-gray-500 hover:bg-gray-50 hover:text-gray-700"}`}>
              <span>{t.icon}</span>{t.label}
            </button>
          ))}
        </div>

        <form onSubmit={submit}>
          <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm md:p-8">

            {/* Professional Info */}
            {activeTab === "professional" && (
              <div className="grid gap-5 sm:grid-cols-2">
                <div>
                  <label className="text-sm font-medium text-gray-700">Full Name</label>
                  <input type="text" name="name" value={form.name} onChange={change} disabled={!isEditing} className={inputCls(!isEditing)} />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Email</label>
                  <input type="email" value={profile?.email || ""} disabled className={inputCls(true)} />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Phone Number</label>
                  <input type="tel" name="phoneNumber" value={form.phoneNumber} onChange={change} disabled={!isEditing} placeholder="+880..." className={inputCls(!isEditing)} />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Specialty</label>
                  <input type="text" name="specialty" value={form.specialty} onChange={change} disabled={!isEditing} placeholder="e.g., Cardiology" className={inputCls(!isEditing)} />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Experience</label>
                  <input type="text" name="experience" value={form.experience} onChange={change} disabled={!isEditing} placeholder="e.g., 10 years" className={inputCls(!isEditing)} />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">License Number</label>
                  <input type="text" name="licenseNumber" value={form.licenseNumber} onChange={change} disabled={!isEditing} className={inputCls(!isEditing)} />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Consultation Fee (৳)</label>
                  <input type="number" name="consultationFee" step="0.01" min="0" value={form.consultationFee} onChange={change} disabled={!isEditing} placeholder="e.g., 100" className={inputCls(!isEditing)} />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Availability Status</label>
                  <select name="availability" value={form.availability} onChange={change} disabled={!isEditing} className={inputCls(!isEditing)}>
                    <option value="Available">Available</option>
                    <option value="Busy">Busy</option>
                    <option value="On Leave">On Leave</option>
                  </select>
                </div>
              </div>
            )}

            {/* About Me */}
            {activeTab === "about" && (
              <div>
                <label className="text-sm font-medium text-gray-700">Bio / About Yourself</label>
                <textarea name="bio" rows={7} value={form.bio} onChange={change} disabled={!isEditing}
                  placeholder="Tell patients about yourself, your expertise, treatment approach..."
                  className={`${inputCls(!isEditing)} resize-none`} />
              </div>
            )}

            {/* Education */}
            {activeTab === "education" && (
              <div>
                <div className="space-y-3 mb-5">
                  {education.length === 0 ? (
                    <p className="rounded-lg bg-gray-50 p-4 text-center text-sm text-gray-400">No education records yet.</p>
                  ) : (
                    education.map((edu, i) => (
                      <div key={i} className="flex items-start justify-between rounded-lg border border-gray-100 bg-gray-50 p-4">
                        <div>
                          <p className="font-semibold text-gray-900">{edu.degree}</p>
                          <p className="text-sm text-gray-600">{edu.institute}</p>
                          {edu.year && <p className="mt-0.5 text-xs text-gray-400">{edu.year}</p>}
                        </div>
                        {isEditing && (
                          <button type="button" onClick={() => removeEducation(i)} className="ml-4 rounded-lg p-1 text-gray-400 hover:bg-red-50 hover:text-red-500">
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/></svg>
                          </button>
                        )}
                      </div>
                    ))
                  )}
                </div>
                {isEditing && (
                  <div className="rounded-lg border border-dashed border-gray-200 bg-gray-50/50 p-4">
                    <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-gray-400">Add Education</p>
                    <div className="grid gap-3 sm:grid-cols-3">
                      <input type="text" placeholder="Degree (e.g., MBBS)" value={newEdu.degree} onChange={(e) => setNewEdu({...newEdu, degree: e.target.value})} className={inputCls(false)} />
                      <input type="text" placeholder="Institution Name" value={newEdu.institute} onChange={(e) => setNewEdu({...newEdu, institute: e.target.value})} className={inputCls(false)} />
                      <input type="text" placeholder="Year (e.g., 2015)" value={newEdu.year} onChange={(e) => setNewEdu({...newEdu, year: e.target.value})} className={inputCls(false)} />
                    </div>
                    <button type="button" onClick={addEducation} className="mt-3 rounded-lg border border-primary-200 bg-white px-4 py-2 text-sm font-medium text-primary-600 hover:bg-primary-50">
                      + Add Entry
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Certifications */}
            {activeTab === "certifications" && (
              <div>
                <div className="mb-4 flex flex-wrap gap-2">
                  {qualifications.length === 0 ? (
                    <p className="w-full rounded-lg bg-gray-50 p-4 text-center text-sm text-gray-400">No certifications added yet.</p>
                  ) : (
                    qualifications.map((q, i) => (
                      <span key={i} className="flex items-center gap-1.5 rounded-full bg-primary-50 px-3 py-1.5 text-sm font-medium text-primary-700">
                        {q}
                        {isEditing && <button type="button" onClick={() => removeQualification(i)} className="text-primary-400 hover:text-red-500 leading-none">×</button>}
                      </span>
                    ))
                  )}
                </div>
                {isEditing && (
                  <div className="flex gap-2">
                    <input type="text" placeholder="e.g., Board Certified Cardiologist, FCPS" value={newQual}
                      onChange={(e) => setNewQual(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addQualification(); } }}
                      className={`flex-1 ${inputCls(false)}`} />
                    <button type="button" onClick={addQualification} className="rounded-lg border border-primary-200 bg-white px-4 text-sm font-medium text-primary-600 hover:bg-primary-50">Add</button>
                  </div>
                )}
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
