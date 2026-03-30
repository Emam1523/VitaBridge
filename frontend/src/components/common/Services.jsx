import { Link } from "react-router-dom";

export default function Services() {
	const services = [
		{
			title: "Online Appointments",
			description: "Book appointments with doctors at your convenience. Get instant confirmations.",
			icon: (
				<svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
					<path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
				</svg>
			),
		},
		{
			title: "Virtual Consultations",
			description: "Connect with doctors through video, audio, or chat consultations from the comfort of your home.",
			icon: (
				<svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
					<path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25h-9A2.25 2.25 0 002.25 7.5v9a2.25 2.25 0 002.25 2.25z" />
				</svg>
			),
		},
		{
			title: "Digital Health Records",
			description: "Securely store and access your medical records, prescriptions, and test results anytime.",
			icon: (
				<svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
					<path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
				</svg>
			),
		},
		{
			title: "E-Prescriptions",
			description: "Receive digital prescriptions from your doctor and track your medication history effortlessly.",
			icon: (
				<svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
					<path strokeLinecap="round" strokeLinejoin="round" d="M11.35 3.836c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m8.9-4.414c.376.023.75.05 1.124.08 1.131.094 1.976 1.057 1.976 2.192V16.5A2.25 2.25 0 0118 18.75h-2.25m-7.5-10.5H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V18.75m-7.5-10.5h6.375c.621 0 1.125.504 1.125 1.125v9.375m-8.25-3l1.5 1.5 3-3.75" />
				</svg>
			),
		},
		{
			title: "Appointment Management",
			description: "View, reschedule, or cancel appointments easily. Get reminders and stay on schedule.",
			icon: (
				<svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
					<path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
				</svg>
			),
		},
		{
			title: "Secure Payments",
			description: "Make hassle-free payments for consultations and services with multiple payment options.",
			icon: (
				<svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
					<path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z" />
				</svg>
			),
		},
	];

	return (
		<main className="min-h-screen">
			{/* Header */}
			<section className="bg-primary-600 py-12 sm:py-16">
				<div className="mx-auto max-w-7xl px-4 text-center sm:px-6">
					<h1 className="text-3xl font-bold text-white sm:text-4xl">Our Services</h1>
					<p className="mx-auto mt-3 max-w-2xl text-white/70">
						Comprehensive healthcare solutions designed to make your medical journey seamless and efficient.
					</p>
				</div>
			</section>

			{/* Services Grid */}
			<section className="bg-gray-50 py-14 sm:py-18">
				<div className="mx-auto max-w-7xl px-4 sm:px-6">
					<div className="grid gap-5 sm:gap-6 md:grid-cols-2 lg:grid-cols-3">
						{services.map((s, i) => (
							<div
								key={s.title}
								className="group rounded-xl bg-white p-6 shadow-sm border border-gray-100 card-hover fade-in"
								style={{ animationDelay: `${i * 80}ms` }}
							>
								<div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-lg bg-primary-50 text-primary-600 group-hover:bg-primary-100 transition-colors duration-300">
									{s.icon}
								</div>
								<h3 className="text-base font-semibold text-gray-900">{s.title}</h3>
								<p className="mt-2 text-sm text-gray-500 leading-relaxed">{s.description}</p>
							</div>
						))}
					</div>
				</div>
			</section>

			{/* CTA */}
			<section className="bg-white py-14 sm:py-18">
				<div className="mx-auto max-w-4xl px-4 text-center sm:px-6">
					<h2 className="text-2xl sm:text-3xl font-bold text-gray-900">
						Ready to get started?
					</h2>
					<p className="mx-auto mt-3 max-w-2xl text-gray-500">
						Join thousands of patients who trust VitaBridge for their healthcare needs.
					</p>
					<div className="mt-6 flex items-center justify-center gap-3">
						<Link to="/register" className="rounded-lg bg-primary-600 px-7 py-3 text-sm font-bold text-white transition hover:bg-primary-700">
							Sign Up Now
						</Link>
						<Link to="/doctors" className="rounded-lg border border-gray-200 bg-white px-7 py-3 text-sm font-semibold text-gray-700 transition hover:bg-gray-50">
							Find a Doctor
						</Link>
					</div>
				</div>
			</section>
		</main>
	);
}
