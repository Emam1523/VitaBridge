import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { getAllDoctors, searchDoctors, getAllSpecialties, getDoctorsBySpecialty } from "../../api/doctorApi";

export default function DoctorList() {
	const [searchTerm, setSearchTerm] = useState("");
	const [selectedSpecialty, setSelectedSpecialty] = useState("all");
	const [doctors, setDoctors] = useState([]);
	const [specialties, setSpecialties] = useState([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState(null);

	// Fetch specialties on mount
	useEffect(() => {
		getAllSpecialties()
			.then(data => setSpecialties(data))
			.catch(err => console.error("Failed to load specialties", err));
	}, []);

	// Fetch doctors based on filters
	useEffect(() => {
		const fetchDoctors = async () => {
			try {
				setLoading(true);
				setError(null);
				let data;

				if (searchTerm.trim()) {
					data = await searchDoctors(searchTerm);
				} else if (selectedSpecialty !== "all") {
					data = await getDoctorsBySpecialty(selectedSpecialty);
				} else {
					data = await getAllDoctors();
				}
				setDoctors(data);
			} catch (err) {
				setError(err.message || "Failed to load doctors");
				setDoctors([]);
			} finally {
				setLoading(false);
			}
		};

		const timer = setTimeout(() => {
			fetchDoctors();
		}, 500);

		return () => clearTimeout(timer);
	}, [searchTerm, selectedSpecialty]);

	return (
		<main className="min-h-screen bg-gray-50">
			{/* Header */}
			<section className="bg-primary-600 py-12 sm:py-16">
				<div className="mx-auto max-w-7xl px-4 text-center sm:px-6">
					<h1 className="text-3xl font-bold text-white sm:text-4xl">
						Find Your Doctor
					</h1>
					<p className="mx-auto mt-3 max-w-2xl text-white/70">
						Experienced healthcare professionals ready to provide you with exceptional care.
					</p>
				</div>
			</section>

			<div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
				{/* Search & Filter */}
				<div className="-mt-14 relative z-10 flex flex-col gap-4 rounded-xl bg-white p-4 shadow-lg sm:flex-row sm:items-center sm:p-5">
					<div className="flex-1">
						<div className="relative">
							<input
								type="text"
								placeholder="Search doctors by name..."
								value={searchTerm}
								onChange={(e) => setSearchTerm(e.target.value)}
								className="w-full rounded-lg border border-gray-200 bg-gray-50 py-3 pl-11 pr-4 text-gray-900 outline-none placeholder:text-gray-400 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 focus:bg-white transition"
							/>
							<svg
								className="absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400"
								fill="none"
								viewBox="0 0 24 24"
								stroke="currentColor"
							>
								<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
							</svg>
						</div>
					</div>

					<select
						value={selectedSpecialty}
						onChange={(e) => {
							setSelectedSpecialty(e.target.value);
							setSearchTerm("");
						}}
						className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-gray-700 outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 transition"
					>
						<option value="all">All Specialties</option>
						{specialties.map((specialty) => (
							<option key={specialty} value={specialty}>
								{specialty}
							</option>
						))}
					</select>
				</div>

				{loading && (
					<div className="mt-16 text-center">
						<div className="inline-block h-10 w-10 animate-spin rounded-full border-4 border-primary-600 border-t-transparent"></div>
						<p className="mt-4 text-gray-500">Loading doctors...</p>
					</div>
				)}

				{!loading && error && (
					<div className="mt-12 rounded-xl border border-red-100 bg-red-50 p-6 text-center">
						<p className="text-red-600">{error}</p>
						<p className="mt-1 text-sm text-red-400">Please try again later.</p>
					</div>
				)}

				{!loading && !error && (
					<div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
						{doctors.map((doctor, index) => (
							<div
								key={doctor.id}
								className="card-hover rounded-xl border border-gray-100 bg-white p-5 shadow-sm fade-in"
								style={{ animationDelay: `${index * 60}ms` }}
							>
								{/* Doctor header */}
								<div className="flex items-start gap-4">
									<div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-full bg-primary-100 text-xl font-bold text-primary-700">
										{doctor.name.charAt(0)}
									</div>
									<div className="flex-1 min-w-0">
										<h3 className="text-base font-semibold text-gray-900 truncate">
											{doctor.name}
										</h3>
										<p className="text-sm text-primary-600">{doctor.specialty}</p>
									</div>
									<span className={`mt-1 flex h-3 w-3 shrink-0 rounded-full ${doctor.availability === "Available" ? "bg-green-500" : "bg-gray-300"}`} />
								</div>

								{/* Info */}
								<div className="mt-4 flex items-center gap-4 text-xs text-gray-500">
									<span className="flex items-center gap-1">
										<svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
											<path strokeLinecap="round" strokeLinejoin="round" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
										</svg>
										{doctor.experience || "5+"} yrs exp
									</span>
									{doctor.rating && (
										<span className="flex items-center gap-1">
											<svg className="h-3.5 w-3.5 text-amber-400" fill="currentColor" viewBox="0 0 20 20">
												<path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
											</svg>
											{doctor.rating}
										</span>
									)}
									<span className={`ml-auto text-xs font-medium ${doctor.availability === "Available" ? "text-green-600" : "text-red-500"}`}>
										{doctor.availability === "Available" ? "Available" : "Unavailable"}
									</span>
								</div>

								{/* Actions */}
								<div className="mt-5 flex gap-3">
									<Link
										to={`/doctors/${doctor.id}`}
										className="flex-1 rounded-lg border border-gray-200 py-2.5 text-center text-sm font-medium text-gray-600 transition hover:bg-gray-50"
									>
										View Profile
									</Link>
									<Link
										to={`/book-appointment?doctor=${doctor.id}`}
										className="flex-1 rounded-lg bg-primary-600 py-2.5 text-center text-sm font-semibold text-white transition hover:bg-primary-700"
									>
										Book Now
									</Link>
								</div>
							</div>
						))}
					</div>
				)}

				{!loading && !error && doctors.length === 0 && (
					<div className="mt-16 text-center">
						<div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-gray-100">
							<svg className="h-7 w-7 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
								<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
							</svg>
						</div>
						<p className="text-lg font-medium text-gray-700">No doctors found</p>
						<p className="mt-1 text-sm text-gray-500">Try adjusting your search or filter criteria.</p>
					</div>
				)}
			</div>
		</main>
	);
}

