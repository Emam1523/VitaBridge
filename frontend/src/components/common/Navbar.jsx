import { useState, useEffect } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthenticationContext";
import Logo from "../../assets/icon/Logo.jpeg";

const navLinkClass = ({ isActive }) =>
	[
		"relative px-4 py-2 text-sm font-medium transition-colors duration-200",
		isActive
			? "text-primary-600 font-semibold"
			: "text-gray-600 hover:text-primary-600",
	].join(" ");

const mobileNavLinkClass = ({ isActive }) =>
	[
		"flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors duration-200 border-l-2",
		isActive
			? "text-primary-600 bg-primary-50 border-primary-600 font-semibold"
			: "text-gray-600 hover:text-primary-600 hover:bg-gray-50 border-transparent",
	].join(" ");

export default function Navbar() {
	const [open, setOpen] = useState(false);
	const [scrolled, setScrolled] = useState(false);
	const { isAuthenticated, user, logout } = useAuth();
	const navigate = useNavigate();

	function getDashboardPath() {
		switch (user?.role?.toUpperCase()) {
			case "ADMIN": return "/admin/dashboard";
			case "DOCTOR": return "/doctor/dashboard";
			case "ASSISTANT": return "/assistant/dashboard";
			default: return "/patient/dashboard";
		}
	}

	function handleLogout() {
		logout();
		navigate("/", { replace: true });
	}

	useEffect(() => {
		const onScroll = () => setScrolled(window.scrollY > 10);
		window.addEventListener("scroll", onScroll, { passive: true });
		return () => window.removeEventListener("scroll", onScroll);
	}, []);

	return (
		<>
			{/* Teal top accent bar */}
			<div className="h-1 bg-primary-600" />

			<header
				className={`sticky top-0 z-50 bg-white transition-shadow duration-300 ${
					scrolled ? "shadow-md" : "border-b border-gray-100"
				}`}
			>
				<div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
					<div className="flex h-16 items-center justify-between">

						{/* Logo */}
						<Link
							to="/"
							className="flex items-center gap-2.5 group"
							onClick={() => setOpen(false)}
						>
							<img
								src={Logo}
								alt="VitaBridge Logo"
								className="h-9 w-9 rounded-lg object-cover"
							/>
							<span className="text-xl font-bold text-primary-600">VitaBridge</span>
						</Link>

						{/* Desktop Nav */}
						<nav className="hidden items-center gap-1 md:flex">
							<NavLink to="/" className={navLinkClass} end>Home</NavLink>
							<NavLink to="/about" className={navLinkClass}>About</NavLink>
							<NavLink to="/services" className={navLinkClass}>Services</NavLink>
							<NavLink to="/symptom-check" className={navLinkClass}>AI Symptom Check</NavLink>
							<NavLink to="/doctors" className={navLinkClass}>Doctors</NavLink>
							<NavLink to="/contact" className={navLinkClass}>Contact</NavLink>
						</nav>

						{/* Auth Buttons */}
						<div className="hidden items-center gap-3 md:flex">
							{isAuthenticated ? (
								<>
									<NavLink
										to={getDashboardPath()}
										className="rounded-lg px-4 py-2 text-sm font-medium text-gray-600 transition hover:text-primary-600 hover:bg-primary-50"
									>
										Dashboard
									</NavLink>
									<button
										onClick={handleLogout}
										className="rounded-lg bg-red-500 px-5 py-2 text-sm font-semibold text-white transition hover:bg-red-600"
									>
										Logout
									</button>
								</>
							) : (
								<>
									<NavLink
										to="/login"
										className="rounded-lg px-4 py-2 text-sm font-medium text-gray-600 transition hover:text-primary-600 hover:bg-primary-50"
									>
										Login
									</NavLink>
									<NavLink
										to="/register"
										className="rounded-lg bg-primary-600 px-5 py-2 text-sm font-semibold text-white transition hover:bg-primary-700"
									>
										Sign Up
									</NavLink>
								</>
							)}
						</div>

						{/* Mobile Menu Button */}
						<button
							type="button"
							onClick={() => setOpen((v) => !v)}
							className="relative md:hidden rounded-lg p-2 text-gray-600 hover:bg-gray-100 transition-colors"
							aria-expanded={open}
							aria-controls="mobile-nav"
						>
							<svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
								{open ? (
									<path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
								) : (
									<path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
								)}
							</svg>
						</button>
					</div>
				</div>

				{/* Mobile Nav */}
				<div
					id="mobile-nav"
					className={`md:hidden overflow-hidden transition-all duration-300 ease-in-out ${
						open ? "max-h-[520px] opacity-100" : "max-h-0 opacity-0"
					}`}
				>
					<div className="border-t border-gray-100 bg-white px-4 pb-4 pt-2">
						<nav className="space-y-1">
							<NavLink to="/" className={mobileNavLinkClass} end onClick={() => setOpen(false)}>Home</NavLink>
							<NavLink to="/about" className={mobileNavLinkClass} onClick={() => setOpen(false)}>About</NavLink>
							<NavLink to="/services" className={mobileNavLinkClass} onClick={() => setOpen(false)}>Services</NavLink>
							<NavLink to="/symptom-check" className={mobileNavLinkClass} onClick={() => setOpen(false)}>AI Symptom Check</NavLink>
							<NavLink to="/doctors" className={mobileNavLinkClass} onClick={() => setOpen(false)}>Doctors</NavLink>
							<NavLink to="/contact" className={mobileNavLinkClass} onClick={() => setOpen(false)}>Contact</NavLink>
						</nav>

						<div className="mt-3 border-t border-gray-100 pt-3 space-y-2">
							{isAuthenticated ? (
								<>
									<NavLink to={getDashboardPath()} className={mobileNavLinkClass} onClick={() => setOpen(false)}>Dashboard</NavLink>
									<button
										onClick={() => { setOpen(false); handleLogout(); }}
										className="w-full rounded-lg bg-red-500 py-2.5 text-sm font-semibold text-white transition hover:bg-red-600"
									>
										Logout
									</button>
								</>
							) : (
								<>
									<NavLink to="/login" className={mobileNavLinkClass} onClick={() => setOpen(false)}>Login</NavLink>
									<NavLink
										to="/register"
										onClick={() => setOpen(false)}
										className="block w-full rounded-lg bg-primary-600 py-2.5 text-center text-sm font-semibold text-white transition hover:bg-primary-700"
									>
										Sign Up
									</NavLink>
								</>
							)}
						</div>
					</div>
				</div>
			</header>
		</>
	);
}
