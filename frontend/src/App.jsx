import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";

import { CallProvider } from "./context/CallContext";
import { NotificationProvider } from "./context/NotificationContext";
import IncomingCallOverlay from "./components/consultation/IncomingCallOverlay";
import OutgoingCallOverlay from "./components/consultation/OutgoingCallOverlay";
import Home from "./components/common/Home";
import Navbar from "./components/common/Navbar";
import Footer from "./components/common/Footer";
import About from "./components/common/About";
import Services from "./components/common/Services";
import Contact from "./components/common/Contact";
import DoctorList from "./components/common/DoctorList";
import DoctorPublicProfile from "./components/common/DoctorPublicProfile";
import Login from "./components/authentication/Login";
import Register from "./components/authentication/Register";
import RequireAuth from "./components/authentication/RequireAuth";
import RedirectAuthenticated from "./components/authentication/RedirectAuthenticated";

// Patient
import PatientDashboard from "./components/patient/PatientDashboard";
import Profile from "./components/patient/Profile";
import BookAppointment from "./components/patient/BookAppointment";
import MyAppointment from "./components/patient/MyAppointment";
import DoctorSearch from "./components/patient/DoctorSearch";
import PatientDocument from "./components/patient/Document";
import PatientPayment from "./components/patient/Payment";
import PatientConsultation from "./components/patient/Consultation";
import ConsultationHub from "./components/patient/ConsultationHub";
import PaymentCallback from "./components/patient/PaymentCallback";
import PatientComplaint from "./components/patient/Complaint";
import SymptomCheck from "./components/patient/SymptomCheck";
import ReportOcr from "./components/patient/ReportOcr";

// Doctor
import DoctorDashboard from "./components/doctor/DoctorDashboard";
import DoctorProfile from "./components/doctor/Profile";
import ViewSchedule from "./components/doctor/ViewSchedule";
import DoctorAppointment from "./components/doctor/Appointment";
import Consultation from "./components/doctor/Consultation";
import Prescription from "./components/doctor/Prescription";
import Review from "./components/doctor/Review";
import AssistantManagement from "./components/doctor/AssistantManagement";

// Admin
import AdminDashboard from "./components/admin/AdminDashboard";
import ManageDoctor from "./components/admin/ManageDoctor";
import ManageUser from "./components/admin/ManageUser";
import AdminAppointment from "./components/admin/Appointment";
import AdminPayment from "./components/admin/Payment";
import AssistantAssignment from "./components/admin/AssistantAssignment";
import AdminProfile from "./components/admin/AdminProfile";
import DailyReports from "./components/admin/DailyReports";
import AdminComplaints from "./components/admin/Complaints";

// Assistant
import AssistantDashboard from "./components/assistant/AssistantDashboard";
import AssistantProfile from "./components/assistant/Profile";
import ScheduleManager from "./components/assistant/ScheduleManager";
import AppointmentManager from "./components/assistant/AppointmentManager";

// Common (authenticated)
import ChangePassword from "./components/common/ChangePassword";

function AppShell() {
    const { pathname } = useLocation();

    const hideNavbar =
        pathname.startsWith("/patient/") ||
        pathname.startsWith("/doctor/") ||
        pathname.startsWith("/admin/") ||
        pathname.startsWith("/assistant/") ||
        pathname.startsWith("/book-appointment") ||
        pathname === "/change-password";

    const hideFooter = hideNavbar || pathname === "/login" || pathname === "/register";

    return (
        <>
            {!hideNavbar && <Navbar />}
            <Routes>
                {/* Public Routes — redirect authenticated users to their dashboard */}
                <Route path="/" element={<RedirectAuthenticated><Home /></RedirectAuthenticated>} />
                <Route path="/about" element={<RedirectAuthenticated><About /></RedirectAuthenticated>} />
                <Route path="/services" element={<RedirectAuthenticated><Services /></RedirectAuthenticated>} />
                <Route path="/contact" element={<RedirectAuthenticated><Contact /></RedirectAuthenticated>} />
                <Route path="/symptom-check" element={<SymptomCheck publicView />} />
                <Route path="/doctors" element={<RedirectAuthenticated><DoctorList /></RedirectAuthenticated>} />
                <Route path="/doctors/:id" element={<RedirectAuthenticated><DoctorPublicProfile /></RedirectAuthenticated>} />
                <Route path="/login" element={<RedirectAuthenticated><Login /></RedirectAuthenticated>} />
                <Route path="/register" element={<RedirectAuthenticated><Register /></RedirectAuthenticated>} />
                <Route path="/signup" element={<Navigate to="/register" replace />} />
                <Route path="/patient/payment/success" element={<PaymentCallback status="success" />} />
                <Route path="/patient/payment/fail" element={<PaymentCallback status="fail" />} />
                <Route path="/patient/payment/cancel" element={<PaymentCallback status="cancel" />} />

                {/* Patient Routes */}
                <Route element={<RequireAuth allowedRoles={['PATIENT']} />}>
                    <Route path="/patient/dashboard" element={<PatientDashboard />} />
                    <Route path="/patient/profile" element={<Profile />} />
                    <Route path="/patient/symptom-check" element={<SymptomCheck />} />
                    <Route path="/patient/appointments" element={<MyAppointment />} />
                    <Route path="/patient/consultations" element={<ConsultationHub />} />
                    <Route path="/patient/consultation/:appointmentId" element={<PatientConsultation />} />
                    <Route path="/patient/doctors" element={<DoctorSearch />} />
                    <Route path="/patient/doctors/:id" element={<DoctorPublicProfile />} />
                    <Route path="/patient/health" element={<ReportOcr />} />
                    <Route path="/patient/report-ocr" element={<ReportOcr />} />
                    <Route path="/patient/documents" element={<PatientDocument />} />
                    <Route path="/patient/payments" element={<PatientPayment />} />
                    <Route path="/patient/complaints" element={<PatientComplaint />} />
                </Route>

                {/* Book Appointment — any authenticated user (patients, doctors, etc.) */}
                <Route element={<RequireAuth />}>
                    <Route path="/book-appointment" element={<BookAppointment />} />
                    <Route path="/change-password" element={<ChangePassword />} />
                </Route>

                {/* Doctor Routes */}
                <Route element={<RequireAuth allowedRoles={['DOCTOR']} />}>
                    <Route path="/doctor/dashboard" element={<DoctorDashboard />} />
                    <Route path="/doctor/schedule" element={<ViewSchedule />} />
                    <Route path="/doctor/appointments" element={<DoctorAppointment />} />
                    <Route path="/doctor/consultations" element={<Consultation />} />
                    <Route path="/doctor/consultations/:appointmentId" element={<Consultation />} />
                    <Route path="/doctor/prescriptions" element={<Prescription />} />
                    <Route path="/doctor/prescriptions/:appointmentId" element={<Prescription />} />
                    <Route path="/doctor/reviews" element={<Review />} />
                    <Route path="/doctor/assistants" element={<AssistantManagement />} />
                    <Route path="/doctor/profile" element={<DoctorProfile />} />
                </Route>

                {/* Admin Routes */}
                <Route element={<RequireAuth allowedRoles={['ADMIN']} />}>
                    <Route path="/admin/dashboard" element={<AdminDashboard />} />
                    <Route path="/admin/doctors" element={<ManageDoctor />} />
                    <Route path="/admin/users" element={<ManageUser />} />
                    <Route path="/admin/appointments" element={<AdminAppointment />} />
                    <Route path="/admin/payments" element={<AdminPayment />} />
                    <Route path="/admin/assistants" element={<AssistantAssignment />} />
                    <Route path="/admin/reports" element={<DailyReports />} />
                    <Route path="/admin/complaints" element={<AdminComplaints />} />
                    <Route path="/admin/profile" element={<AdminProfile />} />
                </Route>

                {/* Assistant Routes */}
                <Route element={<RequireAuth allowedRoles={['ASSISTANT']} />}>
                    <Route path="/assistant/dashboard" element={<AssistantDashboard />} />
                    <Route path="/assistant/profile" element={<AssistantProfile />} />
                    <Route path="/assistant/appointments" element={<AppointmentManager />} />
                    <Route path="/assistant/schedules" element={<ScheduleManager />} />
                </Route>
            </Routes>
            {!hideFooter && <Footer />}
        </>
    );
}

function App() {
    return (
        <BrowserRouter>
            <NotificationProvider>
                <CallProvider>
                    <IncomingCallOverlay />
                    <OutgoingCallOverlay />
                    <AppShell />
                </CallProvider>
            </NotificationProvider>
        </BrowserRouter>
    );
}

export default App;
