package com.vitabridge.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class AssistantAssignmentDTO {
    private UUID assistantId;
    private UUID userId;
    private String assistantName;
    private String assistantEmail;
    private String assistantPhone;
    private String assistantProfileImageUrl;
    private String employeeId;
    private UUID doctorId;
    private String doctorName;
    private String doctorSpecialty;
    private Boolean isActive;
}
