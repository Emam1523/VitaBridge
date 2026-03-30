package com.vitabridge.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class PaymentDTO {
    private UUID id;
    private UUID appointmentId;
    private String patientName;
    private String doctorName;
    private Double amount;
    private String status;
    private String paymentMethod;
    private String transactionId;
    private LocalDateTime paymentDate;
    private LocalDateTime createdAt;
}
