package com.vitabridge.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Used when the email is already known from the authenticated user context
 * (e.g., password change OTP verification).
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class VerifyOtpCodeRequest {

    @NotBlank(message = "OTP code is required")
    @Size(min = 6, max = 6, message = "OTP must be 6 digits")
    private String otpCode;
}
