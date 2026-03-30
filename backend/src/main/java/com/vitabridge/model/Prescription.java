package com.vitabridge.model;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "prescriptions")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Prescription {
    
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;
    
    @JsonIgnore
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "appointment_id", nullable = false)
    private Appointment appointment;
    
    @Column(length = 2000)
    private String diagnosis;

    @Column(name = "chief_complaints", length = 2000)
    private String chiefComplaints;

    @Column(name = "past_history", length = 2000)
    private String pastHistory;

    @Column(name = "drug_history", length = 2000)
    private String drugHistory;

    @Column(name = "on_examination", length = 2000)
    private String onExamination;

    @Column(name = "follow_up_number")
    private Integer followUpNumber;

    @Column(name = "follow_up_instruction", length = 500)
    private String followUpInstruction;

    @Column(name = "emergency_instruction", length = 500)
    private String emergencyInstruction;
    
    @ElementCollection
    @CollectionTable(name = "prescription_medications", joinColumns = @JoinColumn(name = "prescription_id"))
    private List<Medication> medications = new ArrayList<>();
    
    @Column(name = "lab_tests", length = 2000)
    private String labTests;
    
    @Column(length = 2000)
    private String advice;
    
    @Column(name = "follow_up_date")
    private LocalDateTime followUpDate;
    
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;
    
    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }
}

