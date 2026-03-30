package com.vitabridge.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class SendOtpRequest {

    @Email(message = "Email should be valid")
    @NotBlank(message = "Email is required")
    private String email;
}
