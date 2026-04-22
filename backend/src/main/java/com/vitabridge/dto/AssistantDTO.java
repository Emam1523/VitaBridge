package com.vitabridge.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class AssistantDTO {
    
    private UUID id;
    private UUID userId;
    private String name;
    private String email;
    private String phoneNumber;
    private String profileImageUrl;
    private String employeeId;
    private String bio;
    private String address;
    private String dateOfBirth;
    private String gender;
    private UUID assignedDoctorId;
    private String assignedDoctorName;
    private Boolean isActive;
}
