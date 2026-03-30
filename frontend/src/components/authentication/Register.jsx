import { useMemo, useState, useRef, useEffect } from "react";
import { Link, useNavigate, Navigate } from "react-router-dom";
import { register, sendOtp, verifyOtp } from "../../api/authenticationApi";
import { useAuth } from "../../context/AuthenticationContext";

// Registration is a 3-step flow:
//   STEP 1 – Fill in all details (name, email, phone, password)
//   STEP 2 – Enter the 6-digit OTP sent to the email
//   STEP 3 – Account created (redirect to dashboard)

const STEPS = { FORM: "FORM", OTP: "OTP" };

export default function Register() {
	const navigate = useNavigate();
	const { setAuthFromResponse, isAuthenticated, user } = useAuth();

	const [step, setStep] = useState(STEPS.FORM);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState("");
	const [successMsg, setSuccessMsg] = useState("");

	// ── Form fields ──────────────────────────────────────────────────────────
	const [form, setForm] = useState({
		firstName: "",
		lastName: "",
		email: "",
		phoneNumber: "",
		password: "",
		confirmPassword: "",
	});

	// ── OTP state ─────────────────────────────────────────────────────────────
	const [otpDigits, setOtpDigits] = useState(["", "", "", "", "", ""]);
	const otpRef0 = useRef(null);
	const otpRef1 = useRef(null);
	const otpRef2 = useRef(null);
	const otpRef3 = useRef(null);
	const otpRef4 = useRef(null);
	const otpRef5 = useRef(null);
	const otpRefs = [otpRef0, otpRef1, otpRef2, otpRef3, otpRef4, otpRef5];
	const [resendCooldown, setResendCooldown] = useState(0);
	const cooldownRef = useRef(null);

	const passwordMismatch = useMemo(() => {
		if (!form.password || !form.confirmPassword) return false;
		return form.password !== form.confirmPassword;
	}, [form.password, form.confirmPassword]);

	// Cleanup cooldown timer on unmount
	useEffect(() => () => clearInterval(cooldownRef.current), []);

	// Already logged in — redirect to dashboard
	if (isAuthenticated) {
		const dest =
			user?.role?.toUpperCase() === "ADMIN"
				? "/admin/dashboard"
				: user?.role?.toUpperCase() === "DOCTOR"
				? "/doctor/dashboard"
				: user?.role?.toUpperCase() === "ASSISTANT"
				? "/assistant/dashboard"
				: "/patient/dashboard";
		return <Navigate to={dest} replace />;
	}

	const change = (field) => (e) =>
		setForm((f) => ({ ...f, [field]: e.target.value }));

	// ── Step 1: Submit form → send OTP ────────────────────────────────────────
	const onFormSubmit = async (e) => {
		e.preventDefault();
		if (passwordMismatch) return;
		setError("");
		setLoading(true);
		try {
			await sendOtp(form.email);
			setSuccessMsg(`A 6-digit code was sent to ${form.email}`);
			setStep(STEPS.OTP);
			startCooldown(60);
		} catch (err) {
			setError(err?.message || "Failed to send verification code");
		} finally {
			setLoading(false);
		}
	};

	// ── Step 2: Verify OTP → complete registration ────────────────────────────
	const onOtpSubmit = async (e) => {
		e.preventDefault();
		const code = otpDigits.join("");
		if (code.length < 6) {
			setError("Please enter all 6 digits of the verification code.");
			return;
		}
		setError("");
		setLoading(true);
		try {
			// Verify OTP
			await verifyOtp(form.email, code);

			// Complete registration
			const authResponse = await register({
				firstName: form.firstName,
				lastName: form.lastName,
				email: form.email,
				phoneNumber: form.phoneNumber,
				password: form.password,
				confirmPassword: form.confirmPassword,
			});
			setAuthFromResponse(authResponse);
			navigate("/patient/dashboard", { replace: true });
		} catch (err) {
			setError(err?.message || "Verification failed");
		} finally {
			setLoading(false);
		}
	};

	// ── Resend OTP ────────────────────────────────────────────────────────────
	const onResend = async () => {
		if (resendCooldown > 0) return;
		setError("");
		setLoading(true);
		try {
			await sendOtp(form.email);
			setSuccessMsg("A new verification code has been sent to your email.");
			setOtpDigits(["", "", "", "", "", ""]);
			otpRefs[0].current?.focus();
			startCooldown(60);
		} catch (err) {
			setError(err?.message || "Failed to resend code");
		} finally {
			setLoading(false);
		}
	};

	// ── OTP digit input handling ──────────────────────────────────────────────
	const onOtpChange = (index, value) => {
		const digit = value.replace(/\D/g, "").slice(-1);
		const next = [...otpDigits];
		next[index] = digit;
		setOtpDigits(next);
		if (digit && index < 5) {
			otpRefs[index + 1].current?.focus();
		}
	};

	const onOtpKeyDown = (index, e) => {
		if (e.key === "Backspace" && !otpDigits[index] && index > 0) {
			otpRefs[index - 1].current?.focus();
		}
	};

	const onOtpPaste = (e) => {
		e.preventDefault();
		const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
		if (!pasted) return;
		const next = [...otpDigits];
		for (let i = 0; i < 6; i++) next[i] = pasted[i] || "";
		setOtpDigits(next);
		const focusIdx = Math.min(pasted.length, 5);
		otpRefs[focusIdx].current?.focus();
	};

	// ── Cooldown timer ────────────────────────────────────────────────────────
	const startCooldown = (seconds) => {
		setResendCooldown(seconds);
		if (cooldownRef.current) clearInterval(cooldownRef.current);
		cooldownRef.current = setInterval(() => {
			setResendCooldown((prev) => {
				if (prev <= 1) {
					clearInterval(cooldownRef.current);
					return 0;
				}
				return prev - 1;
			});
		}, 1000);
	};

	// ── Shared styles ─────────────────────────────────────────────────────────
	const inputClass =
		"mt-1 block w-full rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-gray-900 placeholder:text-gray-400 transition focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 outline-none";

	// ── Left-panel feature cards (shared across steps) ────────────────────────
	const featureCards = [
		{ icon: "🔒", title: "Secure & Private", text: "Military-grade encryption for all your data" },
		{ icon: "⚡", title: "Instant Booking", text: "Book appointments in just a few clicks" },
		{ icon: "📋", title: "Digital Records", text: "All medical history in one place" },
		{ icon: "💬", title: "Live Consultation", text: "Video, audio & chat with doctors" },
	];

	return (
		<main className="min-h-screen bg-gray-50">
			<div className="mx-auto flex min-h-screen max-w-6xl items-center px-4 py-12 sm:px-6">
				<div className="grid w-full grid-cols-1 gap-12 lg:grid-cols-2 lg:items-center">
					{/* Left - Info */}
					<section className="space-y-6">
						<div>
							<span className="inline-block rounded-full bg-primary-50 px-3 py-1 text-xs font-semibold text-primary-700">
								Patient Registration
							</span>
							<h1 className="mt-4 text-4xl font-bold text-gray-900 sm:text-5xl">
								Your health journey
								<br />
								<span className="text-primary-600">starts here</span>
							</h1>
							<p className="mt-4 text-lg text-gray-600 leading-relaxed">
								Create your VitaBridge account to book appointments, manage records, and connect with top healthcare providers.
							</p>
						</div>

						<div className="grid gap-3 sm:grid-cols-2">
							{featureCards.map((c) => (
								<div key={c.title} className="flex gap-3 rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
									<span className="text-2xl">{c.icon}</span>
									<div>
										<div className="text-sm font-semibold text-gray-900">{c.title}</div>
										<div className="text-xs text-gray-500">{c.text}</div>
									</div>
								</div>
							))}
						</div>
					</section>

					{/* Right - Form / OTP */}
					<section className="lg:justify-self-end w-full max-w-md lg:max-w-lg">
						<div className="rounded-xl border border-gray-100 bg-white p-8 shadow-sm">

							{/* ── STEP 1: Registration Form ── */}
							{step === STEPS.FORM && (
								<>
									<h2 className="text-2xl font-bold text-gray-900">Create Account</h2>
									<p className="mt-1 text-sm text-gray-500">
										Already have an account?{" "}
										<Link to="/login" className="font-medium text-primary-600 hover:text-primary-700 transition">
											Sign in
										</Link>
									</p>

									<form onSubmit={onFormSubmit} className="mt-6 space-y-4">
										{error && <ErrorBanner message={error} />}

										{/* Name Row */}
										<div className="grid grid-cols-2 gap-3">
											<label className="block">
												<span className="text-sm font-medium text-gray-700">First Name</span>
												<input type="text" required value={form.firstName} onChange={change("firstName")} className={inputClass} placeholder="Emam" autoComplete="given-name" />
											</label>
											<label className="block">
												<span className="text-sm font-medium text-gray-700">Last Name</span>
												<input type="text" required value={form.lastName} onChange={change("lastName")} className={inputClass} placeholder="Hassan" autoComplete="family-name" />
											</label>
										</div>

										{/* Email */}
										<label className="block">
											<span className="text-sm font-medium text-gray-700">Email Address</span>
											<input type="email" required value={form.email} onChange={change("email")} className={inputClass} placeholder="example@gmail.com" autoComplete="email" />
										</label>

										{/* Phone */}
										<label className="block">
											<span className="text-sm font-medium text-gray-700">
												Phone Number{" "}
												<span className="text-gray-400 text-xs">(optional)</span>
											</span>
											<input type="tel" value={form.phoneNumber} onChange={change("phoneNumber")} className={inputClass} placeholder="+880 1XXX-XXXXXX" autoComplete="tel" />
										</label>

										{/* Password Row */}
										<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
											<label className="block">
												<span className="text-sm font-medium text-gray-700">Password</span>
												<input type="password" required value={form.password} onChange={change("password")} className={inputClass} placeholder="••••••••" autoComplete="new-password" />
											</label>
											<label className="block">
												<span className="text-sm font-medium text-gray-700">Confirm Password</span>
												<input
													type="password"
													required
													value={form.confirmPassword}
													onChange={change("confirmPassword")}
													className={`${inputClass} ${passwordMismatch ? "!border-red-400 !ring-red-400/20" : ""}`}
													placeholder="••••••••"
													autoComplete="new-password"
												/>
											</label>
										</div>
										{passwordMismatch && (
											<p className="text-xs text-red-600">Passwords do not match.</p>
										)}

										{/* Submit */}
										<button
											type="submit"
											disabled={passwordMismatch || loading}
											className="mt-2 w-full rounded-lg bg-primary-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-60"
										>
											{loading ? <Spinner label="Sending verification code…" /> : "Continue — Verify Email"}
										</button>

										<p className="text-center text-xs text-gray-400">
											By registering you agree to our Terms &amp; Privacy Policy
										</p>
									</form>
								</>
							)}

							{/* ── STEP 2: OTP Verification ── */}
							{step === STEPS.OTP && (
								<>
									<div className="flex items-center gap-3 mb-1">
										<button
											type="button"
											onClick={() => { setStep(STEPS.FORM); setError(""); setSuccessMsg(""); }}
											className="text-gray-400 hover:text-gray-600 transition"
											aria-label="Go back"
										>
											<svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
												<path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
											</svg>
										</button>
										<h2 className="text-2xl font-bold text-gray-900">Verify Your Email</h2>
									</div>

									<p className="mt-1 text-sm text-gray-500">
										We sent a 6-digit code to{" "}
										<span className="font-medium text-gray-700">{form.email}</span>.
										Enter it below to continue.
									</p>

									<form onSubmit={onOtpSubmit} className="mt-6 space-y-5">
										{error && <ErrorBanner message={error} />}
										{successMsg && !error && (
											<div className="flex items-center gap-2 rounded-lg border border-green-100 bg-green-50 px-4 py-3 text-sm text-green-700">
												<svg className="h-4 w-4 shrink-0" fill="currentColor" viewBox="0 0 20 20">
													<path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
												</svg>
												{successMsg}
											</div>
										)}

										{/* 6-digit OTP input */}
										<div className="flex justify-center gap-2 sm:gap-3" onPaste={onOtpPaste}>
											{otpDigits.map((digit, i) => (
												<input
													key={i}
													ref={otpRefs[i]}
													type="text"
													inputMode="numeric"
													maxLength={1}
													value={digit}
													onChange={(e) => onOtpChange(i, e.target.value)}
													onKeyDown={(e) => onOtpKeyDown(i, e)}
													className="h-14 w-12 rounded-xl border-2 border-gray-200 bg-white text-center text-2xl font-bold text-gray-900 transition focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 outline-none"
													autoFocus={i === 0}
												/>
											))}
										</div>

										{/* Submit */}
										<button
											type="submit"
											disabled={loading || otpDigits.join("").length < 6}
											className="w-full rounded-lg bg-primary-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-60"
										>
											{loading ? <Spinner label="Verifying…" /> : "Verify & Create Account"}
										</button>

										{/* Resend */}
										<p className="text-center text-sm text-gray-500">
											Didn&apos;t receive the code?{" "}
											{resendCooldown > 0 ? (
												<span className="text-gray-400">Resend in {resendCooldown}s</span>
											) : (
												<button
													type="button"
													onClick={onResend}
													disabled={loading}
													className="font-medium text-primary-600 hover:text-primary-700 transition disabled:opacity-50"
												>
													Resend code
												</button>
											)}
										</p>
									</form>
								</>
							)}
						</div>
					</section>
				</div>
			</div>
		</main>
	);
}

// ── Small reusable sub-components ─────────────────────────────────────────────

function ErrorBanner({ message }) {
	return (
		<div className="flex items-center gap-2 rounded-lg border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
			<svg className="h-4 w-4 shrink-0" fill="currentColor" viewBox="0 0 20 20">
				<path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
			</svg>
			{message}
		</div>
	);
}

function Spinner({ label }) {
	return (
		<span className="flex items-center justify-center gap-2">
			<svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24">
				<circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
				<path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
			</svg>
			{label}
		</span>
	);
}
