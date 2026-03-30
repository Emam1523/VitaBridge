package com.vitabridge.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "admin_profiles")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class AdminProfile {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @OneToOne
    @JoinColumn(name = "user_id", unique = true)
    private User user;

    @Column(length = 2000)
    private String bio;

    @Column(length = 1000)
    private String address;

    private LocalDate dateOfBirth;

    private String gender;

    @Column(name = "department")
    private String department;

    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "admin_education", joinColumns = @JoinColumn(name = "admin_profile_id"))
    @Column(name = "education_entry")
    private List<String> education = new ArrayList<>();

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
