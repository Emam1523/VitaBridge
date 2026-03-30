package com.vitabridge.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "medical_documents")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class MedicalDocument {
    
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;
    
    @ManyToOne
    @JoinColumn(name = "patient_id", nullable = false)
    private PatientProfile patient;
    
    @Column(nullable = false)
    private String fileName;
    
    @Column(nullable = false)
    private String fileUrl;
    
    private String fileType;
    
    private Long fileSize;
    
    private String description;

    @Column(name = "source")
    private String source = "PATIENT";

    @Column(name = "appointment_id")
    private UUID appointmentId;

    @Column(name = "prescription_id")
    private UUID prescriptionId;
    
    @Column(name = "uploaded_at", updatable = false)
    private LocalDateTime uploadedAt;
    
    @PrePersist
    protected void onCreate() {
        uploadedAt = LocalDateTime.now();
    }
}
