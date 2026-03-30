package com.vitabridge.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class PrescriptionDTO {
    private UUID id;
    private UUID appointmentId;
    private String patientName;
    private String doctorName;
    private String doctorSpecialty;
    private LocalDate appointmentDate;
    private String diagnosis;
    private String chiefComplaints;
    private String pastHistory;
    private String drugHistory;
    private String onExamination;
    private Integer followUpNumber;
    private String followUpInstruction;
    private String emergencyInstruction;
    private List<MedicationDTO> medications;
    private String labTests;
    private String advice;
    private LocalDate followUpDate;
    private LocalDateTime createdAt;
    private String pdfUrl;

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class MedicationDTO {
        private String name;
        private String dosage;
        private String quantity;
        private String frequency;
        private String duration;
        private String instructions;
    }
}
