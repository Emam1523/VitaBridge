package com.vitabridge.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class PaymentStatsDTO {
    private LocalDate date;
    private Double totalAmount;
    private Integer totalPayments;
}
