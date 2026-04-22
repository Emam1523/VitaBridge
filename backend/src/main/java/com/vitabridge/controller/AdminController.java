package com.vitabridge.controller;

import com.vitabridge.dto.*;
import com.vitabridge.model.Payment;
import com.vitabridge.model.User;
import com.vitabridge.service.AdminService;
import com.vitabridge.service.AppointmentService;
import com.vitabridge.service.DailyReportPdfService;
import com.vitabridge.service.DoctorService;
import com.vitabridge.service.PaymentService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/admin")
@PreAuthorize("hasRole('ADMIN')")
public class AdminController {
    
    @Autowired
    private AdminService adminService;
    
    @Autowired
    private AppointmentService appointmentService;
    
    @Autowired
    private PaymentService paymentService;
    
    @Autowired
    private DoctorService doctorService;

    @Autowired
    private DailyReportPdfService dailyReportPdfService;
    
    //User Management
    
    @GetMapping("/users")
    public ResponseEntity<List<UserDTO>> getAllUsers() {
        return ResponseEntity.ok(adminService.getAllUsers());
    }
    
    @GetMapping("/users/role/{role}")
    public ResponseEntity<List<UserDTO>> getUsersByRole(@PathVariable String role) {
        return ResponseEntity.ok(adminService.getUsersByRole(role));
    }
    
    @PutMapping("/users/{userId}/toggle-status")
    public ResponseEntity<UserDTO> toggleUserStatus(@PathVariable UUID userId) {
        return ResponseEntity.ok(adminService.toggleUserStatus(userId));
    }
    
    // Doctor Management
    
    @PostMapping("/doctors")
    public ResponseEntity<DoctorDTO> createDoctor(@Valid @RequestBody CreateDoctorRequest request) {
        return ResponseEntity.ok(adminService.createDoctor(request));
    }
    
    @GetMapping("/doctors")
    public ResponseEntity<List<DoctorDTO>> getAllDoctors() {
        return ResponseEntity.ok(doctorService.getAllDoctorsForAdmin());
    }
    
    @GetMapping("/doctors/{doctorId}")
    public ResponseEntity<DoctorDTO> getDoctorById(@PathVariable UUID doctorId) {
        return ResponseEntity.ok(doctorService.getDoctorById(doctorId));
    }
    
    @DeleteMapping("/doctors/{doctorId}")
    public ResponseEntity<Void> removeDoctor(@PathVariable UUID doctorId) {
        adminService.removeDoctor(doctorId);
        return ResponseEntity.noContent().build();
    }

    @PutMapping("/doctors/{doctorId}/restore")
    public ResponseEntity<Void> restoreDoctor(@PathVariable UUID doctorId) {
        adminService.restoreDoctor(doctorId);
        return ResponseEntity.noContent().build();
    }

    // Admin Profile

    @GetMapping("/profile")
    public ResponseEntity<AdminProfileDTO> getAdminProfile(@AuthenticationPrincipal User user) {
        return ResponseEntity.ok(adminService.getAdminProfile(user.getId()));
    }

    @PutMapping("/profile")
    public ResponseEntity<AdminProfileDTO> updateAdminProfile(@AuthenticationPrincipal User user,
                                                               @RequestBody AdminProfileDTO dto) {
        return ResponseEntity.ok(adminService.updateAdminProfile(user.getId(), dto));
    }
    
    @PutMapping("/doctors/{doctorId}/verify")
    public ResponseEntity<DoctorDTO> verifyDoctor(@PathVariable UUID doctorId,
                                                  @RequestParam boolean verified) {
        return ResponseEntity.ok(adminService.verifyDoctor(doctorId, verified));
    }
    
    // Patient Management
    
    @GetMapping("/patients")
    public ResponseEntity<List<UserDTO>> getAllPatients() {
        return ResponseEntity.ok(adminService.getUsersByRole("PATIENT"));
    }
    
    @DeleteMapping("/patients/{userId}")
    public ResponseEntity<Void> removePatient(@PathVariable UUID userId) {
        adminService.removePatient(userId);
        return ResponseEntity.noContent().build();
    }
    
    // Appointment History
    
    @GetMapping("/appointments")
    public ResponseEntity<List<AppointmentDTO>> getAllAppointments() {
        return ResponseEntity.ok(appointmentService.getAllAppointments());
    }
    
    @GetMapping("/appointments/doctor/{doctorId}")
    public ResponseEntity<List<AppointmentDTO>> getAppointmentsByDoctor(@PathVariable UUID doctorId) {
        return ResponseEntity.ok(appointmentService.getDoctorAppointments(doctorId));
    }
    
    @GetMapping("/appointments/patient/{patientId}")
    public ResponseEntity<List<AppointmentDTO>> getAppointmentsByPatient(@PathVariable UUID patientId) {
        return ResponseEntity.ok(appointmentService.getPatientAppointments(patientId));
    }
    
    // Payment History
    
    @GetMapping("/payments")
    public ResponseEntity<List<PaymentDTO>> getAllPayments() {
        return ResponseEntity.ok(paymentService.getAllPaymentDTOs());
    }
    
    @GetMapping("/payments/doctor/{doctorId}")
    public ResponseEntity<List<Payment>> getPaymentsByDoctor(@PathVariable UUID doctorId) {
        return ResponseEntity.ok(paymentService.getPaymentsByDoctorId(doctorId));
    }
    
    @GetMapping("/payments/patient/{patientId}")
    public ResponseEntity<List<Payment>> getPaymentsByPatient(@PathVariable UUID patientId) {
        return ResponseEntity.ok(paymentService.getPaymentsByPatientId(patientId));
    }
    
    // Payment Statistics
    
    @GetMapping("/payments/stats/today")
    public ResponseEntity<PaymentStatsDTO> getTodayPaymentStats() {
        return ResponseEntity.ok(paymentService.getTodayPaymentStats());
    }
    
    @GetMapping("/payments/stats/date")
    public ResponseEntity<PaymentStatsDTO> getPaymentStatsByDate(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        return ResponseEntity.ok(paymentService.getPaymentStatsByDate(date));
    }
    
    @GetMapping("/payments/range")
    public ResponseEntity<List<Payment>> getPaymentsByDateRange(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate) {
        return ResponseEntity.ok(paymentService.getPaymentsByDateRange(startDate, endDate));
    }
    
    @GetMapping("/payments/summary/doctors")
    public ResponseEntity<List<DoctorPaymentSummaryDTO>> getAllDoctorPaymentSummaries() {
        return ResponseEntity.ok(paymentService.getAllDoctorPaymentSummaries());
    }
    
    @GetMapping("/payments/summary/doctor/{doctorId}")
    public ResponseEntity<DoctorPaymentSummaryDTO> getDoctorPaymentSummary(@PathVariable UUID doctorId) {
        return ResponseEntity.ok(paymentService.getDoctorPaymentSummary(doctorId));
    }
    
    // Assistant-Doctor Assignments
    
    @GetMapping("/assistants/assignments")
    public ResponseEntity<List<AssistantAssignmentDTO>> getAllAssistantAssignments() {
        return ResponseEntity.ok(adminService.getAllAssistantAssignments());
    }
    
    @GetMapping("/assistants/assignments/doctor/{doctorId}")
    public ResponseEntity<List<AssistantAssignmentDTO>> getAssistantsByDoctor(@PathVariable UUID doctorId) {
        return ResponseEntity.ok(adminService.getAssistantsByDoctor(doctorId));
    }
    
    @GetMapping("/assistants/unassigned")
    public ResponseEntity<List<AssistantAssignmentDTO>> getUnassignedAssistants() {
        return ResponseEntity.ok(adminService.getUnassignedAssistants());
    }

    // Daily Reports

    @GetMapping("/reports/appointments/date")
    public ResponseEntity<List<AppointmentDTO>> getAppointmentsByDate(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        return ResponseEntity.ok(appointmentService.getAppointmentsByDate(date));
    }

    @GetMapping("/reports/appointments/doctor-date")
    public ResponseEntity<List<AppointmentDTO>> getAppointmentsByDoctorAndDate(
            @RequestParam UUID doctorId,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        return ResponseEntity.ok(appointmentService.getAppointmentsByDoctorAndDate(doctorId, date));
    }

    @GetMapping("/reports/dates")
    public ResponseEntity<List<LocalDate>> getAvailableDates() {
        return ResponseEntity.ok(appointmentService.getDistinctAppointmentDates());
    }

    @GetMapping("/reports/daily/pdf")
    public ResponseEntity<byte[]> generateDailyReportPdf(
            @RequestParam UUID doctorId,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        DoctorDTO doctor = doctorService.getDoctorById(doctorId);
        List<AppointmentDTO> appointments = appointmentService.getAppointmentsByDoctorAndDate(doctorId, date);

        byte[] pdfBytes = dailyReportPdfService.generateDailyReport(
                doctor.getName(), doctor.getSpecialty(), date, appointments);

        String filename = String.format("Report_%s_%s.pdf",
                doctor.getName().replaceAll("\\s+", "_"), date.toString());

        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=" + filename)
                .contentType(MediaType.APPLICATION_PDF)
                .body(pdfBytes);
    }
}

