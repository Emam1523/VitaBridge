package com.vitabridge.controller;

import com.vitabridge.dto.AppointmentDTO;
import com.vitabridge.dto.AssistantDTO;
import com.vitabridge.dto.CreateAssistantRequest;
import com.vitabridge.dto.DoctorDTO;
import com.vitabridge.dto.PrescriptionDTO;
import com.vitabridge.dto.ScheduleDTO;
import com.vitabridge.model.*;
import com.vitabridge.repository.DoctorRepository;
import com.vitabridge.service.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import jakarta.validation.Valid;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/doctor")
@PreAuthorize("hasRole('DOCTOR')")
public class DoctorDashboardController {

    private static final Logger log = LoggerFactory.getLogger(DoctorDashboardController.class);

    @Autowired
    private DoctorService doctorService;

    @Autowired
    private AppointmentService appointmentService;

    @Autowired
    private ScheduleService scheduleService;

    @Autowired
    private PrescriptionService prescriptionService;

    @Autowired
    private AssistantService assistantService;

    @Autowired
    private MedicalDocumentService documentService;

    @Autowired
    private DoctorRepository doctorRepository;

    @Autowired
    private PrescriptionPdfService prescriptionPdfService;

    @Autowired
    private MedicalAccessService medicalAccessService;

    // Profile

    @GetMapping("/profile")
    public ResponseEntity<DoctorDTO> getProfile(@AuthenticationPrincipal User user) {
        return ResponseEntity.ok(doctorService.getDoctorByUserId(user.getId()));
    }

    @PutMapping("/profile")
    public ResponseEntity<DoctorDTO> updateProfile(@AuthenticationPrincipal User user,
            @RequestBody DoctorDTO doctorDTO) {
        return ResponseEntity.ok(doctorService.updateDoctorProfile(user.getId(), doctorDTO));
    }

    // Appointments

    @GetMapping("/appointments")
    public ResponseEntity<List<AppointmentDTO>> getAppointments(@AuthenticationPrincipal User user) {
        DoctorDTO doctor = doctorService.getDoctorByUserId(user.getId());
        return ResponseEntity.ok(appointmentService.getDoctorAppointments(doctor.getId()));
    }

    @GetMapping("/appointments/{id}")
    public ResponseEntity<AppointmentDTO> getAppointmentById(@PathVariable UUID id,
            @AuthenticationPrincipal User user) {
        DoctorDTO doctor = doctorService.getDoctorByUserId(user.getId());
        return ResponseEntity.ok(appointmentService.getAppointmentByIdForDoctor(doctor.getId(), id));
    }

    @PutMapping("/appointments/{id}/status")
    public ResponseEntity<AppointmentDTO> updateAppointmentStatus(@PathVariable UUID id,
            @RequestParam String status,
            @AuthenticationPrincipal User user) {
        DoctorDTO doctor = doctorService.getDoctorByUserId(user.getId());
        return ResponseEntity.ok(appointmentService.updateAppointmentStatusForDoctor(
                doctor.getId(),
                id,
                AppointmentStatus.valueOf(status)
        ));
    }

    @PutMapping("/appointments/{id}/cancel")
    public ResponseEntity<AppointmentDTO> cancelAppointment(@PathVariable UUID id,
            @AuthenticationPrincipal User user) {
        DoctorDTO doctor = doctorService.getDoctorByUserId(user.getId());
        return ResponseEntity.ok(appointmentService.updateAppointmentStatusForDoctor(
                doctor.getId(),
                id,
                AppointmentStatus.CANCELLED
        ));
    }

    @PutMapping("/appointments/{id}/consultation-notes")
    public ResponseEntity<AppointmentDTO> updateConsultationNotes(@PathVariable UUID id,
            @RequestBody String notes,
            @AuthenticationPrincipal User user) {
        DoctorDTO doctor = doctorService.getDoctorByUserId(user.getId());
        return ResponseEntity.ok(appointmentService.updateConsultationNotesForDoctor(doctor.getId(), id, notes));
    }

    // Consultation Lock

    @PutMapping("/appointments/{id}/lock")
    public ResponseEntity<AppointmentDTO> toggleConsultationLock(@PathVariable UUID id,
            @RequestParam boolean locked,
            @AuthenticationPrincipal User user) {
        DoctorDTO doctor = doctorService.getDoctorByUserId(user.getId());
        return ResponseEntity.ok(appointmentService.toggleConsultationLock(doctor.getId(), id, locked));
    }

    // Prescriptions

    @GetMapping("/prescriptions")
    public ResponseEntity<List<PrescriptionDTO>> getAllMyPrescriptions(@AuthenticationPrincipal User user) {
        DoctorDTO doctor = doctorService.getDoctorByUserId(user.getId());
        return ResponseEntity.ok(prescriptionService.getPrescriptionDTOsByDoctorProfileId(doctor.getId()));
    }

    @PostMapping("/appointments/{id}/prescription")
    public ResponseEntity<PrescriptionDTO> createPrescription(@PathVariable UUID id,
            @RequestBody Prescription prescription,
            @AuthenticationPrincipal User user) {
        DoctorDTO doctor = doctorService.getDoctorByUserId(user.getId());
        Appointment appointment = appointmentService.getAppointmentEntityForDoctor(doctor.getId(), id);
        
        // Save prescription
        Prescription savedPrescription = prescriptionService.createOrReplacePrescriptionForAppointment(appointment, prescription);
        
        String pdfUrl = null;
        try {
            // Generate PDF
            pdfUrl = prescriptionPdfService.generatePrescriptionPdf(savedPrescription, appointment);
            String timestamp = LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyyMMdd_HHmmss"));

            // Save PDF as medical document
            MedicalDocument document = new MedicalDocument();
            document.setFileName("Prescription_" + appointment.getId() + "_" + timestamp + ".pdf");
            document.setFileUrl(pdfUrl);
            document.setFileType("application/pdf");
            document.setDescription("Prescription for appointment on " + appointment.getAppointmentDate());
            document.setSource("PRESCRIPTION");
            document.setAppointmentId(appointment.getId());
            document.setPrescriptionId(savedPrescription.getId());
            documentService.uploadDocument(appointment.getPatient().getId(), document);
        } catch (Exception ex) {
            // Prescription must remain saved even if PDF/document persistence fails.
            log.warn("Prescription saved but PDF generation/linking failed for appointment {}", appointment.getId(), ex);
        }

        PrescriptionDTO responseDto = prescriptionService.getPrescriptionDTOById(savedPrescription.getId());
        if (pdfUrl != null && (responseDto.getPdfUrl() == null || responseDto.getPdfUrl().isBlank())) {
            responseDto.setPdfUrl(pdfUrl);
        }

        return ResponseEntity.ok(responseDto);
    }

    @PutMapping("/prescriptions/{prescriptionId}")
    public ResponseEntity<PrescriptionDTO> updatePrescription(@PathVariable UUID prescriptionId,
            @RequestBody Prescription prescription,
            @AuthenticationPrincipal User user) {
        DoctorDTO doctor = doctorService.getDoctorByUserId(user.getId());

        Prescription existing = prescriptionService.getPrescriptionById(prescriptionId);
        Appointment appointment = existing.getAppointment();
        if (appointment == null || appointment.getDoctor() == null
                || !appointment.getDoctor().getId().equals(doctor.getId())) {
            throw new org.springframework.security.access.AccessDeniedException("You can only edit your own prescriptions");
        }

        Prescription updatedPrescription = prescriptionService.updatePrescription(existing, prescription);

        String pdfUrl = null;
        try {
            pdfUrl = prescriptionPdfService.generatePrescriptionPdf(updatedPrescription, appointment);
            String timestamp = LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyyMMdd_HHmmss"));

            MedicalDocument document = new MedicalDocument();
            document.setFileName("Prescription_" + appointment.getId() + "_" + timestamp + ".pdf");
            document.setFileUrl(pdfUrl);
            document.setFileType("application/pdf");
            document.setDescription("Prescription for appointment on " + appointment.getAppointmentDate());
            document.setSource("PRESCRIPTION");
            document.setAppointmentId(appointment.getId());
            document.setPrescriptionId(updatedPrescription.getId());
            documentService.uploadDocument(appointment.getPatient().getId(), document);
        } catch (Exception ex) {
            log.warn("Prescription updated but PDF generation/linking failed for prescription {}", prescriptionId, ex);
        }

        PrescriptionDTO responseDto = prescriptionService.getPrescriptionDTOById(updatedPrescription.getId());
        if (pdfUrl != null && (responseDto.getPdfUrl() == null || responseDto.getPdfUrl().isBlank())) {
            responseDto.setPdfUrl(pdfUrl);
        }

        return ResponseEntity.ok(responseDto);
    }

    @GetMapping("/appointments/{id}/prescription")
    public ResponseEntity<PrescriptionDTO> getPrescription(@PathVariable UUID id,
            @AuthenticationPrincipal User user) {
        DoctorDTO doctor = doctorService.getDoctorByUserId(user.getId());
        // Verify doctor owns this appointment
        appointmentService.getAppointmentEntityForDoctor(doctor.getId(), id);
        Prescription latest = prescriptionService.getLatestPrescriptionByAppointmentIdOrNull(id);
        if (latest == null) {
            return ResponseEntity.noContent().build();
        }
        return ResponseEntity.ok(prescriptionService.convertToDTO(latest));
    }

    // Schedules (READ-ONLY for Doctor)

    @GetMapping("/schedules")
    public ResponseEntity<List<ScheduleDTO>> getSchedules(@AuthenticationPrincipal User user) {
        DoctorDTO doctor = doctorService.getDoctorByUserId(user.getId());
        List<DoctorSchedule> schedules = scheduleService.getDoctorSchedules(doctor.getId());
        return ResponseEntity.ok(scheduleService.convertToDTO(schedules));
    }

    // Assistant Management

    @GetMapping("/assistants")
    public ResponseEntity<List<AssistantDTO>> getMyAssistants(@AuthenticationPrincipal User user) {
        DoctorDTO doctor = doctorService.getDoctorByUserId(user.getId());
        return ResponseEntity.ok(assistantService.getAssistantsByDoctorId(doctor.getId()));
    }

    @PostMapping("/assistants")
    public ResponseEntity<AssistantDTO> createAssistant(@Valid @RequestBody CreateAssistantRequest request,
            @AuthenticationPrincipal User user) {
        DoctorProfile doctor = doctorRepository.findByUserId(user.getId())
                .orElseThrow(() -> new RuntimeException("Doctor profile not found"));
        return ResponseEntity.ok(assistantService.createAssistant(request, doctor.getId()));
    }

    @PostMapping("/assistants/{assistantUserId}/assign")
    public ResponseEntity<AssistantDTO> assignAssistant(@PathVariable UUID assistantUserId,
            @AuthenticationPrincipal User user) {
        DoctorProfile doctor = doctorRepository.findByUserId(user.getId())
                .orElseThrow(() -> new RuntimeException("Doctor profile not found"));
        return ResponseEntity.ok(assistantService.assignAssistantToDoctor(assistantUserId, doctor.getId()));
    }

    @DeleteMapping("/assistants/{assistantUserId}/remove")
    public ResponseEntity<Void> removeAssistant(@PathVariable UUID assistantUserId,
            @AuthenticationPrincipal User user) {
        DoctorProfile doctor = doctorRepository.findByUserId(user.getId())
                .orElseThrow(() -> new RuntimeException("Doctor profile not found"));
        assistantService.removeAssistantFromDoctor(assistantUserId, doctor.getId());
        return ResponseEntity.noContent().build();
    }

    // Consultation - Patient Data Access

    @GetMapping("/appointments/{appointmentId}/patient/documents")
    public ResponseEntity<?> getPatientDocuments(@PathVariable UUID appointmentId,
            @AuthenticationPrincipal User user) {
        DoctorDTO doctor = doctorService.getDoctorByUserId(user.getId());
        
        // Verify this appointment belongs to the doctor
        Appointment appointment = appointmentService.getAppointmentEntityForDoctor(doctor.getId(), appointmentId);

        // Check if patient has granted medical records access to this doctor
        if (!medicalAccessService.hasAccess(appointment.getPatient().getId(), user.getId())) {
            return ResponseEntity.status(403).body(java.util.Map.of(
                "error", "ACCESS_DENIED",
                "message", "Patient has not granted access to their medical records"
            ));
        }
        
        // Get patient's documents
        return ResponseEntity.ok(documentService.getPatientDocumentsForDoctor(appointment.getPatient().getId()));
    }

    @GetMapping("/appointments/{appointmentId}/patient/access-status")
    public ResponseEntity<?> checkPatientAccessStatus(@PathVariable UUID appointmentId,
            @AuthenticationPrincipal User user) {
        DoctorDTO doctor = doctorService.getDoctorByUserId(user.getId());
        Appointment appointment = appointmentService.getAppointmentEntityForDoctor(doctor.getId(), appointmentId);
        boolean hasAccess = medicalAccessService.hasAccess(appointment.getPatient().getId(), user.getId());
        return ResponseEntity.ok(java.util.Map.of("hasAccess", hasAccess));
    }

}
