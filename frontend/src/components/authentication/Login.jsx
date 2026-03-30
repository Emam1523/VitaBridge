import { useState } from "react";
import { Link, useNavigate, Navigate } from "react-router-dom";
import { login } from "../../api/authenticationApi";
import { useAuth } from "../../context/AuthenticationContext";

function getDashboardPath(role) {
	switch (role?.toUpperCase()) {
		case "ADMIN": return "/admin/dashboard";
		case "DOCTOR": return "/doctor/dashboard";
		case "ASSISTANT": return "/assistant/dashboard";
		default: return "/patient/dashboard";
	}
}

export default function Login() {
	const [form, setForm] = useState({ identifier: "", password: "" });
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState("");
	const { setAuthFromResponse, isAuthenticated, user } = useAuth();
	const navigate = useNavigate();

	// Already logged in — redirect to dashboard
	if (isAuthenticated) {
		return <Navigate to={getDashboardPath(user?.role)} replace />;
	}

	const onSubmit = async (e) => {
		e.preventDefault();
		setLoading(true);
		setError("");
		try {
			const response = await login({
				identifier: form.identifier,
				password: form.password,
			});
			setAuthFromResponse(response);

			navigate(getDashboardPath(response.role), { replace: true });
		} catch (err) {
			setError(err.message || "Invalid credentials. Please try again.");
		} finally {
			setLoading(false);
		}
	};

	const inputClass =
		"mt-1 block w-full rounded-lg border border-gray-200 bg-white px-4 py-2.5 sm:py-3 text-sm sm:text-base text-gray-900 placeholder:text-gray-400 transition focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 outline-none touch-target";

	return (
		<main className="min-h-screen bg-gray-50">
			<div className="mx-auto flex min-h-screen max-w-6xl items-center px-4 py-8 sm:py-12 sm:px-6">
				<div className="grid w-full grid-cols-1 gap-8 sm:gap-12 lg:grid-cols-2 lg:items-center">
					{/* Left */}
					<section className="space-y-4 sm:space-y-6 hidden lg:block">
						<div>
						<span className="inline-block rounded-full bg-primary-50 px-3 py-1 text-xs font-semibold text-primary-700">
							Welcome Back
						</span>
						<h1 className="mt-4 text-3xl sm:text-4xl font-bold text-gray-900 lg:text-5xl">
							Sign in to<br />
							<span className="text-primary-600">
									VitaBridge
								</span>
							</h1>
							<p className="mt-3 sm:mt-4 text-base sm:text-lg text-gray-600 leading-relaxed">
								Access your appointments, medical records, and connect with your healthcare providers.
							</p>
						</div>

						{/* Tips card */}
						<div className="rounded-xl border border-gray-100 bg-white p-5 sm:p-6 shadow-sm">
							<div className="flex items-center gap-2 text-sm font-semibold text-gray-900">
								<svg className="h-5 w-5 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
									<path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
								</svg>
								Quick Tips
							</div>
							<ul className="mt-3 space-y-2 text-xs sm:text-sm text-gray-600">
								<li className="flex items-start gap-2">
									<span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary-500" />
									Log in using your registered email or phone number.
								</li>
								<li className="flex items-start gap-2">
									<span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary-500" />
									Keep your password secure and private.
								</li>
								<li className="flex items-start gap-2">
									<span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary-500" />
									New here? Create an account in under a minute.
								</li>
							</ul>
						</div>
					</section>

					{/* Right - Form */}
					<section className="lg:justify-self-end w-full max-w-md mx-auto lg:max-w-lg">
						<div className="rounded-xl border border-gray-100 bg-white p-6 sm:p-8 shadow-sm">
							{/* Mobile header */}
							<div className="mb-6 lg:hidden text-center">
								<h1 className="text-2xl font-bold text-gray-900">
									Welcome to <span className="text-primary-600">VitaBridge</span>
								</h1>
								<p className="mt-2 text-sm text-gray-600">
									Access your healthcare services
								</p>
							</div>

							<h2 className="text-xl sm:text-2xl font-bold text-gray-900">Sign In</h2>
							<p className="mt-1 text-xs sm:text-sm text-gray-500">
								Don&apos;t have an account?{" "}
								<Link to="/register" className="font-medium text-primary-600 hover:text-primary-700 transition">
									Create one
								</Link>
							</p>

							<form onSubmit={onSubmit} className="mt-6 sm:mt-8 space-y-4 sm:space-y-5">
								{error && (
									<div className="flex items-center gap-2 rounded-lg border border-red-100 bg-red-50 px-3 sm:px-4 py-2.5 sm:py-3 text-xs sm:text-sm text-red-700">
										<svg className="h-4 w-4 shrink-0" fill="currentColor" viewBox="0 0 20 20">
											<path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
										</svg>
										{error}
									</div>
								)}

								<label className="block">
									<span className="text-xs sm:text-sm font-medium text-gray-700">Email or Phone Number</span>
									<input
										type="text"
										required
										value={form.identifier}
										onChange={(e) => setForm({ ...form, identifier: e.target.value })}
										className={inputClass}
										placeholder="example@gmail.com"
										autoComplete="username"
									/>
								</label>

								<label className="block">
									<span className="text-xs sm:text-sm font-medium text-gray-700">Password</span>
									<input
										type="password"
										required
										value={form.password}
										onChange={(e) => setForm({ ...form, password: e.target.value })}
										className={inputClass}
										placeholder="••••••••"
										autoComplete="current-password"
									/>
								</label>

								<button
									type="submit"
									disabled={loading}
									className="touch-target w-full rounded-lg bg-primary-600 px-4 py-3 text-sm sm:text-base font-semibold text-white transition hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-60"
								>
									{loading ? (
										<span className="flex items-center justify-center gap-2">
											<svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
											Signing in...
										</span>
									) : "Sign In"}
								</button>

								<p className="text-center text-[10px] sm:text-xs text-gray-400">
									By continuing you agree to our Terms & Privacy Policy
								</p>
							</form>
						</div>
					</section>
				</div>
			</div>
		</main>
	);
}
