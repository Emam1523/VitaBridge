import { useState } from "react";
import { apiRequest } from "../../api/httpClient";

const contactInfo = [
	{
		title: "Email",
		value: "hassanchowdhury204573@gmail.com",
		icon: (
			<svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
				<path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
			</svg>
		),
	},
	{
		title: "Phone",
		value: "+880 1307947274",
		icon: (
			<svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
				<path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" />
			</svg>
		),
	},
	{
		title: "Address",
		value: "Adampur, Faridpur, Bangladesh",
		icon: (
			<svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
				<path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
				<path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
			</svg>
		),
	},
];

const EMPTY_FORM = { name: "", email: "", subject: "", message: "" };

export default function Contact() {
	const [form, setForm] = useState(EMPTY_FORM);
	const [sending, setSending] = useState(false);
	const [success, setSuccess] = useState("");
	const [error, setError] = useState("");

	const inputClass =
		"mt-1 w-full rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-gray-900 outline-none placeholder:text-gray-400 transition focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20";

	const handleSubmit = async (e) => {
		e.preventDefault();
		setError("");
		setSuccess("");
		setSending(true);
		try {
			const res = await apiRequest("/contact", { method: "POST", body: form });
			setSuccess(res?.message || "Your message has been sent! We'll get back to you shortly.");
			setForm(EMPTY_FORM);
		} catch (err) {
			setError(err.message || "Failed to send message. Please try again.");
		} finally {
			setSending(false);
		}
	};

	return (
		<main className="min-h-screen">
			{/* Header */}
			<section className="bg-primary-600 py-12 sm:py-16">
				<div className="mx-auto max-w-7xl px-4 text-center sm:px-6">
					<h1 className="text-3xl font-bold text-white sm:text-4xl">Contact Us</h1>
					<p className="mx-auto mt-3 max-w-2xl text-white/70">
						Have questions or need support? We&apos;re here to help. Reach out and we&apos;ll respond as soon as possible.
					</p>
				</div>
			</section>

			{/* Content */}
			<section className="bg-gray-50 py-14 sm:py-18">
				<div className="mx-auto max-w-7xl px-4 sm:px-6">
					<div className="grid gap-6 lg:grid-cols-3">
						{/* Info Cards */}
						<div className="space-y-4">
							{contactInfo.map((c) => (
								<div key={c.title} className="rounded-xl bg-white p-5 shadow-sm border border-gray-100">
									<div className="flex items-start gap-4">
										<div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary-50 text-primary-600">
											{c.icon}
										</div>
										<div>
											<h3 className="text-sm font-semibold text-gray-900">{c.title}</h3>
											<p className="mt-1 text-sm text-gray-500 whitespace-pre-line">{c.value}</p>
										</div>
									</div>
								</div>
							))}

							{/* Response time note */}
							<div className="rounded-xl bg-primary-50 border border-primary-100 p-5">
								<div className="flex items-start gap-3">
									<svg className="h-5 w-5 text-primary-600 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
										<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
									</svg>
									<div>
										<p className="text-sm font-semibold text-primary-800">Response Time</p>
										<p className="mt-1 text-xs text-primary-600">We typically respond within 24 hours on business days.</p>
									</div>
								</div>
							</div>
						</div>

						{/* Form */}
						<div className="lg:col-span-2">
							<form onSubmit={handleSubmit} className="rounded-xl bg-white p-6 sm:p-8 shadow-sm border border-gray-100">
								<h2 className="text-xl font-bold text-gray-900">Send us a message</h2>
								<p className="mt-1 text-sm text-gray-500">Fill in the form and we&apos;ll get back to you soon.</p>

								{/* Feedback messages */}
								{success && (
									<div className="mt-4 flex items-start gap-3 rounded-xl border border-green-100 bg-green-50 px-4 py-3">
										<svg className="h-5 w-5 shrink-0 text-green-500 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
											<path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
										</svg>
										<p className="text-sm text-green-800">{success}</p>
									</div>
								)}
								{error && (
									<div className="mt-4 flex items-start gap-3 rounded-xl border border-red-100 bg-red-50 px-4 py-3">
										<svg className="h-5 w-5 shrink-0 text-red-500 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
											<path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd"/>
										</svg>
										<p className="text-sm text-red-800">{error}</p>
									</div>
								)}

								<div className="mt-5 grid gap-4">
									<div className="grid gap-4 sm:grid-cols-2">
										<label className="block">
											<span className="text-sm font-medium text-gray-700">Name</span>
											<input
												type="text" required
												value={form.name}
												onChange={(e) => setForm({ ...form, name: e.target.value })}
												className={inputClass}
												placeholder="Your name"
											/>
										</label>
										<label className="block">
											<span className="text-sm font-medium text-gray-700">Email</span>
											<input
												type="email" required
												value={form.email}
												onChange={(e) => setForm({ ...form, email: e.target.value })}
												className={inputClass}
												placeholder="you@example.com"
											/>
										</label>
									</div>
									<label className="block">
										<span className="text-sm font-medium text-gray-700">Subject</span>
										<input
											type="text" required
											value={form.subject}
											onChange={(e) => setForm({ ...form, subject: e.target.value })}
											className={inputClass}
											placeholder="How can we help you?"
										/>
									</label>
									<label className="block">
										<span className="text-sm font-medium text-gray-700">Message</span>
										<textarea
											required rows={5}
											value={form.message}
											onChange={(e) => setForm({ ...form, message: e.target.value })}
											className={`${inputClass} resize-none`}
											placeholder="Tell us more about your query..."
										/>
									</label>
									<button
										type="submit"
										disabled={sending}
										className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-600/25 disabled:opacity-60 disabled:cursor-not-allowed"
									>
										{sending ? (
											<>
												<svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
													<circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
													<path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
												</svg>
												Sending…
											</>
										) : (
											<>
												<svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
													<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
												</svg>
												Send Message
											</>
										)}
									</button>
								</div>
							</form>
						</div>
					</div>
				</div>
			</section>
		</main>
	);
}
