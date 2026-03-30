package com.vitabridge.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class ReviewDTO {
    private UUID id;
    private Double rating;
    private String comment;
    private String patientName;
    private UUID patientId;
    private LocalDateTime createdAt;
}
