package com.vitabridge.service;

import com.vitabridge.dto.AuthResponse;
import com.vitabridge.dto.ChangePasswordRequest;
import com.vitabridge.dto.LoginRequest;
import com.vitabridge.dto.RegisterRequest;
import com.vitabridge.model.*;
import com.vitabridge.repository.UserRepository;
import com.vitabridge.util.JwtUtil;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Optional;
import java.util.UUID;

@Service
public class AuthenticationService {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private JwtUtil jwtUtil;

    @Autowired
    private AuthenticationManager authenticationManager;

    @Autowired
    private EmailService emailService;

    @Autowired
    private OtpService otpService;

    @Transactional
    public AuthResponse register(RegisterRequest request) {
        // Validate passwords match
        if (!request.getPassword().equals(request.getConfirmPassword())) {
            throw new RuntimeException("Passwords do not match");
        }

        if (userRepository.existsByEmail(request.getEmail())) {
            throw new RuntimeException("Email already exists");
        }

        if (request.getPhoneNumber() != null && !request.getPhoneNumber().isBlank()
                && userRepository.existsByPhoneNumber(request.getPhoneNumber())) {
            throw new RuntimeException("Phone number already exists");
        }

        // Ensure the email has been verified via OTP before creating the account
        if (!otpService.isEmailVerified(request.getEmail())) {
            throw new RuntimeException(
                    "Email address has not been verified. Please verify your email with the OTP sent to your inbox.");
        }

        String fullName = request.getFirstName().trim() + " " + request.getLastName().trim();

        User user = new User();
        user.setName(fullName);
        user.setEmail(request.getEmail().trim().toLowerCase());
        user.setPassword(passwordEncoder.encode(request.getPassword()));
        user.setPhoneNumber(request.getPhoneNumber());
        user.setRole(Role.PATIENT);
        user.setIsActive(true);

        // Create patient profile
        PatientProfile patientProfile = new PatientProfile();
        patientProfile.setUser(user);
        user.setPatientProfile(patientProfile);

        user = userRepository.save(user);

        // Clean up the OTP record now that registration is complete
        otpService.deleteOtp(request.getEmail());

        // Fire-and-forget welcome email (async, never blocks registration)
        emailService.sendWelcomeEmail(user);

        String token = jwtUtil.generateToken(user);

        return new AuthResponse(token, user.getId(), user.getName(), user.getEmail(), user.getRole().name());
    }

    public AuthResponse login(LoginRequest request) {
        String identifier = request.getIdentifier().trim();

        // Resolve identifier to email (Spring Security auth manager uses email
        // internally)
        String usernameForAuth = identifier;
        if (!identifier.contains("@")) {
            // Looks like a phone number — resolve to email
            Optional<User> byPhone = userRepository.findByPhoneNumber(identifier);
            if (byPhone.isPresent()) {
                usernameForAuth = byPhone.get().getEmail();
            }
            // If not found, let it fall through — auth manager will reject
        }

        Authentication authentication = authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(usernameForAuth, request.getPassword()));

        UserDetails userDetails = (UserDetails) authentication.getPrincipal();
        User user = userRepository.findByEmail(userDetails.getUsername())
                .orElseThrow(() -> new RuntimeException("User not found"));

        String token = jwtUtil.generateToken(userDetails);

        return new AuthResponse(token, user.getId(), user.getName(), user.getEmail(), user.getRole().name());
    }

    @Transactional
    public void changePassword(UUID userId, ChangePasswordRequest request) {
        if (!request.getNewPassword().equals(request.getConfirmNewPassword())) {
            throw new RuntimeException("New passwords do not match");
        }
        if (request.getNewPassword().length() < 6) {
            throw new RuntimeException("New password must be at least 6 characters");
        }

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));

        // Verify that the OTP for this user's email has been verified
        if (!otpService.isOtpVerifiedForPasswordChange(user.getEmail())) {
            throw new RuntimeException(
                    "OTP verification required. Please verify your email OTP before changing your password.");
        }

        user.setPassword(passwordEncoder.encode(request.getNewPassword()));
        userRepository.save(user);

        // Clean up the OTP record after successful password change
        otpService.deleteOtp(user.getEmail());
    }
}
