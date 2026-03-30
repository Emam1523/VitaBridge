import { Link } from "react-router-dom";

const links = {
	Company: [
		{ label: "About Us", to: "/about" },
		{ label: "Services", to: "/services" },
		{ label: "Contact", to: "/contact" },
	],
	"For Patients": [
		{ label: "Find a Doctor", to: "/doctors" },
		{ label: "Book Appointment", to: "/doctors" },
		{ label: "Login", to: "/login" },
	],
	Support: [
		{ label: "Help Center", to: "/contact" },
		{ label: "Privacy Policy", to: "/about" },
		{ label: "Terms of Service", to: "/about" },
	],
};

export default function Footer() {
	return (
		<footer className="bg-gray-900 text-gray-400">
			<div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
				<div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
					{/* Brand */}
					<div>
						<span className="text-xl font-bold text-white">VitaBridge</span>
						<p className="mt-3 text-sm leading-relaxed">
							Your trusted digital healthcare platform. Book appointments, consult doctors, and manage your health — all in one place.
						</p>
					</div>

					{/* Link columns */}
					{Object.entries(links).map(([heading, items]) => (
						<div key={heading}>
							<h4 className="text-sm font-semibold text-white">{heading}</h4>
							<ul className="mt-3 space-y-2">
								{items.map((l) => (
									<li key={l.label}>
										<Link to={l.to} className="text-sm transition hover:text-white">
											{l.label}
										</Link>
									</li>
								))}
							</ul>
						</div>
					))}
				</div>

				{/* Bottom bar */}
				<div className="mt-10 border-t border-gray-800 pt-6 text-center text-xs text-gray-500">
					&copy; {new Date().getFullYear()} VitaBridge. All rights reserved.
				</div>
			</div>
		</footer>
	);
}
