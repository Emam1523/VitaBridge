package com.vitabridge.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;
import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class AdminProfileDTO {
    private UUID id;
    private UUID userId;
    private String name;
    private String email;
    private String phoneNumber;
    private String bio;
    private String address;
    private String dateOfBirth;
    private String gender;
    private String department;
    private List<String> education;
}
