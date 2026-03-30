package com.vitabridge.model;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "appointments")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Appointment {
    
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;
    
    @JsonIgnore
    @ManyToOne
    @JoinColumn(name = "patient_id", nullable = false)
    private User patient;
    
    @JsonIgnore
    @ManyToOne
    @JoinColumn(name = "doctor_id", nullable = false)
    private DoctorProfile doctor;
    
    @Column(name = "appointment_date", nullable = false)
    private LocalDate appointmentDate;
    
    @Column(name = "appointment_time")
    private LocalTime appointmentTime;
    
    @Column(length = 2000)
    private String reason;
    
    @Column(length = 2000)
    private String symptoms;
    
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private AppointmentStatus status = AppointmentStatus.PENDING;

    @Enumerated(EnumType.STRING)
    @Column(name = "consultation_type")
    private ConsultationType consultationType = ConsultationType.OFFLINE;

    @Column(name = "serial_number")
    private Integer serialNumber;
    
    @Column(length = 2000)
    private String notes;
    
    @Column(name = "consultation_notes", length = 5000)
    private String consultationNotes;

    @Column(name = "consultation_locked")
    private Boolean consultationLocked = true;
    
    @JsonIgnore
    @OneToMany(mappedBy = "appointment", cascade = CascadeType.ALL)
    private List<Prescription> prescriptions = new ArrayList<>();
    
    @JsonIgnore
    @OneToOne(mappedBy = "appointment", cascade = CascadeType.ALL)
    private Payment payment;
    
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;
    
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
    
    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
    }
    
    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}

