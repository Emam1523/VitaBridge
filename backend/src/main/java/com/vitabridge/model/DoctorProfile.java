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
@Table(name = "doctor_profiles")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class DoctorProfile {
    
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;
    
    @JsonIgnore
    @OneToOne
    @JoinColumn(name = "user_id", nullable = false)
    private User user;
    
    @Column(nullable = false)
    private String specialty;
    
    @Column(length = 1000)
    private String bio;
    
    @Column(nullable = false)
    private String experience;
    
    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "doctor_qualifications", joinColumns = @JoinColumn(name = "doctor_id"))
    @Column(name = "qualification")
    private List<String> qualifications = new ArrayList<>();

    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "doctor_education", joinColumns = @JoinColumn(name = "doctor_id"))
    private List<Education> education = new ArrayList<>();
    
    @Column(name = "consultation_fee")
    private Double consultationFee;
    
    @Column(name = "image_url")
    private String imageUrl;
    
    @Column(nullable = false)
    private String availability = "Available";
    
    private Double rating = 0.0;
    
    @Column(name = "total_reviews")
    private Integer totalReviews = 0;
    
    @Column(name = "license_number")
    private String licenseNumber;

    @Column(name = "hospital_name")
    private String hospitalName;
    
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;
    
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
    
    @JsonIgnore
    @OneToMany(mappedBy = "doctor", cascade = CascadeType.ALL)
    private List<DoctorSchedule> schedules = new ArrayList<>();
    
    @JsonIgnore
    @OneToMany(mappedBy = "doctor")
    private List<Review> reviews = new ArrayList<>();
    
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

