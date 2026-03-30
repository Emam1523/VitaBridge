package com.vitabridge.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class DoctorPaymentSummaryDTO {
    private UUID doctorId;
    private String doctorName;
    private String specialty;
    private Double totalEarnings;
    private Integer totalAppointments;
    private Double averageConsultationFee;
}
