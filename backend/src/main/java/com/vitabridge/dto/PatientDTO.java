package com.vitabridge.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class PatientDTO {
    private UUID id;
    private UUID userId;
    private String name;
    private String email;
    private String phoneNumber;
    private LocalDate dateOfBirth;
    private String gender;
    private String bloodGroup;
    private String address;
    private String emergencyContact;
    private String emergencyContactName;
    private String emergencyContactRelation;
    private String pressureLevel;
    private Double height;
    private Double weight;
    private String allergies;
    private String medicalHistory;
}
