package com.vitabridge.controller;

import com.vitabridge.dto.AppointmentDTO;
import com.vitabridge.dto.AppointmentRequest;
import com.vitabridge.dto.PatientDTO;
import com.vitabridge.model.MedicalAccess;
import com.vitabridge.model.MedicalDocument;
import com.vitabridge.dto.PrescriptionDTO;
import com.vitabridge.model.Review;
import com.vitabridge.model.User;
import com.vitabridge.service.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;


@RestController
@RequestMapping("/api/patient")
@PreAuthorize("hasRole('PATIENT')")
public class PatientController {
    
    @Autowired
    private PatientService patientService;
    
    @Autowired
    private AppointmentService appointmentService;
    
    @Autowired
    private ReviewService reviewService;
    
    @Autowired
    private MedicalDocumentService documentService;
    
    @Autowired
    private PrescriptionService prescriptionService;

    @Autowired
    private MedicalAccessService medicalAccessService;

    // Profile

    @GetMapping("/profile")
    public ResponseEntity<PatientDTO> getProfile(@AuthenticationPrincipal User user) {
        return ResponseEntity.ok(patientService.getPatientByUserId(user.getId()));
    }
    
    @PutMapping("/profile")
    public ResponseEntity<PatientDTO> updateProfile(@AuthenticationPrincipal User user,
                                                   @RequestBody PatientDTO patientDTO) {
        return ResponseEntity.ok(patientService.updatePatientProfile(user.getId(), patientDTO));
    }

    // Appointments
    
    @PostMapping("/appointments")
    public ResponseEntity<AppointmentDTO> bookAppointment(@AuthenticationPrincipal User user,
                                                         @RequestBody AppointmentRequest request) {
        return ResponseEntity.ok(appointmentService.bookAppointment(user.getId(), request));
    }
    
    @GetMapping("/appointments")
    public ResponseEntity<List<AppointmentDTO>> getAppointments(@AuthenticationPrincipal User user) {
        return ResponseEntity.ok(appointmentService.getPatientAppointments(user.getId()));
    }
    
    @GetMapping("/appointments/upcoming")
    public ResponseEntity<List<AppointmentDTO>> getUpcomingAppointments(@AuthenticationPrincipal User user) {
        return ResponseEntity.ok(appointmentService.getUpcomingAppointmentsByPatient(user.getId()));
    }
    
    @GetMapping("/appointments/{id}")
    public ResponseEntity<AppointmentDTO> getAppointmentById(@PathVariable UUID id,
                                                             @AuthenticationPrincipal User user) {
        return ResponseEntity.ok(appointmentService.getAppointmentByIdForPatient(user.getId(), id));
    }

    // Prescriptions

    @GetMapping("/prescriptions")
    public ResponseEntity<List<com.vitabridge.dto.PrescriptionDTO>> getMyPrescriptions(@AuthenticationPrincipal User user) {
        return ResponseEntity.ok(prescriptionService.getPrescriptionDTOsByPatientId(user.getId()));
    }

    @GetMapping("/appointments/{appointmentId}/prescription")
    public ResponseEntity<PrescriptionDTO> getPrescription(@PathVariable UUID appointmentId,
                                                        @AuthenticationPrincipal User user) {
        // Verify patient owns this appointment
        appointmentService.getAppointmentByIdForPatient(user.getId(), appointmentId);
        com.vitabridge.model.Prescription latest = prescriptionService.getLatestPrescriptionByAppointmentIdOrNull(appointmentId);
        if (latest == null) {
            return ResponseEntity.noContent().build();
        }
        return ResponseEntity.ok(prescriptionService.convertToDTO(latest));
    }

    // Medical Documents

    @GetMapping("/documents")
    public ResponseEntity<List<MedicalDocument>> getMyDocuments(@AuthenticationPrincipal User user) {
        PatientDTO patient = patientService.getPatientByUserId(user.getId());
        return ResponseEntity.ok(documentService.getDocumentsByPatientId(patient.getId()));
    }

    @PostMapping("/documents")
    public ResponseEntity<MedicalDocument> uploadDocument(
            @AuthenticationPrincipal User user,
            @RequestParam("file") MultipartFile file,
            @RequestParam(value = "description", required = false) String description) throws IOException {

        // Save file to uploads directory
        String uploadDir = "uploads/documents";
        Path uploadPath = Paths.get(uploadDir);
        if (!Files.exists(uploadPath)) {
            Files.createDirectories(uploadPath);
        }

        String originalFilename = file.getOriginalFilename();
        String storedFilename = UUID.randomUUID() + "_" + originalFilename;
        Path filePath = uploadPath.resolve(storedFilename);
        Files.copy(file.getInputStream(), filePath);

        MedicalDocument document = new MedicalDocument();
        document.setFileName(originalFilename);
        document.setFileUrl("/uploads/documents/" + storedFilename);
        document.setFileType(file.getContentType());
        document.setFileSize(file.getSize());
        document.setDescription(description);
        document.setSource("PATIENT");

        return ResponseEntity.ok(documentService.uploadDocument(user.getId(), document));
    }

    @DeleteMapping("/documents/{documentId}")
    public ResponseEntity<Void> deleteDocument(@PathVariable UUID documentId,
                                               @AuthenticationPrincipal User user) {
        documentService.deleteDocument(user.getId(), documentId);
        return ResponseEntity.noContent().build();
    }

    // Reviews
    
    @PostMapping("/appointments/{appointmentId}/review")
    public ResponseEntity<Review> createReview(@PathVariable UUID appointmentId,
                                               @RequestBody Review review,
                                               @AuthenticationPrincipal User user) {
        // Verify patient owns this appointment and it's completed
        AppointmentDTO appointment = appointmentService.getAppointmentByIdForPatient(user.getId(), appointmentId);
        if (!"COMPLETED".equals(appointment.getStatus())) {
            return ResponseEntity.badRequest().build();
        }
        review.setPatient(user);
        return ResponseEntity.ok(reviewService.createReviewForAppointment(appointmentId, review));
    }
    
    @GetMapping("/appointments/{appointmentId}/review")
    public ResponseEntity<Review> getReviewForAppointment(@PathVariable UUID appointmentId,
                                                          @AuthenticationPrincipal User user) {
        // Verify patient owns this appointment
        appointmentService.getAppointmentByIdForPatient(user.getId(), appointmentId);
        Review review = reviewService.getReviewByAppointmentId(appointmentId);
        if (review == null) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok(review);
    }

    // Medical Access Control

    @PostMapping("/medical-access/grant/{doctorUserId}")
    public ResponseEntity<MedicalAccess> grantAccess(@PathVariable UUID doctorUserId,
                                                     @AuthenticationPrincipal User user) {
        return ResponseEntity.ok(medicalAccessService.grantAccess(user.getId(), doctorUserId));
    }

    @PostMapping("/medical-access/revoke/{doctorUserId}")
    public ResponseEntity<MedicalAccess> revokeAccess(@PathVariable UUID doctorUserId,
                                                      @AuthenticationPrincipal User user) {
        return ResponseEntity.ok(medicalAccessService.revokeAccess(user.getId(), doctorUserId));
    }

    @GetMapping("/medical-access")
    public ResponseEntity<List<MedicalAccess>> getAccessList(@AuthenticationPrincipal User user) {
        return ResponseEntity.ok(medicalAccessService.getAccessListForPatient(user.getId()));
    }

    // Stats

    @GetMapping("/stats")
    public ResponseEntity<Map<String, Object>> getStats(@AuthenticationPrincipal User user) {
        PatientDTO patient = patientService.getPatientByUserId(user.getId());
        long prescriptionCount = prescriptionService.getPrescriptionsByPatientId(user.getId()).size();
        long documentCount = documentService.countPatientDocuments(patient.getId());

        Map<String, Object> stats = new HashMap<>();
        stats.put("prescriptionCount", prescriptionCount);
        stats.put("documentCount", documentCount);
        return ResponseEntity.ok(stats);
    }
}

