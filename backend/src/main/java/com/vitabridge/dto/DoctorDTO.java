package com.vitabridge.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;
import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class DoctorDTO {
    private UUID id;
    private UUID userId;
    private String name;
    private String email;
    private String specialty;
    private String experience;
    private String bio;
    private List<String> qualifications;
    private List<EducationDTO> education;
    private Double consultationFee;
    private String imageUrl;
    private String profileImageUrl;
    private String availability;
    private Double rating;
    private Integer totalReviews;
    private String licenseNumber;
    private String phoneNumber;
    private Boolean isActive;
}
