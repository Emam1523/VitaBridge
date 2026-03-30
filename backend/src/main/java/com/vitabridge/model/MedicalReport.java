package com.vitabridge.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "medical_reports")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class MedicalReport {
    
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;
    
    @ManyToOne
    @JoinColumn(name = "patient_id", nullable = false)
    private PatientProfile patient;
    
    @ManyToOne
    @JoinColumn(name = "doctor_id", nullable = false)
    private DoctorProfile doctor;
    
    @Column(nullable = false)
    private String title;
    
    @Column(length = 5000)
    private String content;
    
    @Column(name = "report_type")
    private String reportType;
    
    @Column(name = "report_date")
    private LocalDateTime reportDate;
    
    @Column(name = "file_url")
    private String fileUrl;
    
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;
    
    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }
}

