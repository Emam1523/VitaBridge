package com.vitabridge.controller;

import com.vitabridge.dto.AuthResponse;
import com.vitabridge.dto.LoginRequest;
import com.vitabridge.dto.OtpResponse;
import com.vitabridge.dto.RegisterRequest;
import com.vitabridge.dto.SendOtpRequest;
import com.vitabridge.dto.VerifyOtpRequest;
import com.vitabridge.service.AuthenticationService;
import com.vitabridge.service.OtpService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
public class AuthenticationController {

    @Autowired
    private AuthenticationService authenticationService;

    @Autowired
    private OtpService otpService;

    /**
     * Step 1: Send OTP to the provided email address.
     * The frontend calls this before showing the OTP input field.
     */
    @PostMapping("/send-otp")
    public ResponseEntity<OtpResponse> sendOtp(@Valid @RequestBody SendOtpRequest request) {
        otpService.sendOtp(request.getEmail());
        return ResponseEntity.ok(new OtpResponse(true,
                "A 6-digit verification code has been sent to " + request.getEmail() + ". Please check your inbox."));
    }

    /**
     * Step 2: Verify the OTP entered by the user.
     * On success the frontend can proceed to submit the full registration form.
     */
    @PostMapping("/verify-otp")
    public ResponseEntity<OtpResponse> verifyOtp(@Valid @RequestBody VerifyOtpRequest request) {
        otpService.verifyOtp(request.getEmail(), request.getOtpCode());
        return ResponseEntity.ok(new OtpResponse(true,
                "Email verified successfully. You can now complete your registration."));
    }

    /**
     * Step 3: Complete registration.
     * Requires that the email was already verified via OTP (steps 1 & 2).
     */
    @PostMapping("/register")
    public ResponseEntity<AuthResponse> register(@Valid @RequestBody RegisterRequest request) {
        return ResponseEntity.ok(authenticationService.register(request));
    }

    @PostMapping("/login")
    public ResponseEntity<AuthResponse> login(@Valid @RequestBody LoginRequest request) {
        return ResponseEntity.ok(authenticationService.login(request));
    }
}
