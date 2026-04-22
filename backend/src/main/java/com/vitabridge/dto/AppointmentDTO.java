package com.vitabridge.dto;

import com.fasterxml.jackson.annotation.JsonFormat;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class AppointmentDTO {
    private UUID id;
    private UUID patientId;
    private String patientName;
    private String patientProfileImageUrl;
    private UUID doctorId;
    private UUID doctorUserId;
    private String doctorName;
    private String doctorProfileImageUrl;
    private String specialty;

    @JsonFormat(shape = JsonFormat.Shape.STRING, pattern = "yyyy-MM-dd")
    private LocalDate appointmentDate;

    private String reason;
    private String symptoms;
    private String status;
    private String notes;
    private String consultationNotes;
    private Double consultationFee;
    private String consultationType;
    private Integer serialNumber;
    private String appointmentTime;
    private String paymentStatus;
    private String patientEmail;
    private String patientPhone;
    private Boolean consultationLocked;
    private String patientGender;
}
