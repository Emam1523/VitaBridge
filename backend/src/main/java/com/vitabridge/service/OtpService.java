package com.vitabridge.service;

import com.vitabridge.model.OtpVerification;
import com.vitabridge.repository.OtpVerificationRepository;
import com.vitabridge.repository.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.Optional;

@Service
public class OtpService {

    private static final Logger log = LoggerFactory.getLogger(OtpService.class);

    @Autowired
    private OtpVerificationRepository otpVerificationRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private EmailService emailService;

    @Value("${app.otp.expiry-minutes:10}")
    private int otpExpiryMinutes;

    @Value("${app.otp.max-attempts:5}")
    private int maxAttempts;

    private final SecureRandom secureRandom = new SecureRandom();

    /**
     * Generates a 6-digit OTP, stores it, and sends it to the given email.
     * If an OTP already exists for this email, it is replaced.
     */
    @Transactional
    public void sendOtp(String email) {
        String normalizedEmail = email.trim().toLowerCase();

        // Check if email is already registered
        if (userRepository.existsByEmail(normalizedEmail)) {
            throw new RuntimeException("Email already registered. Please use a different email or log in.");
        }

        // Delete any existing OTP for this email
        otpVerificationRepository.deleteByEmail(normalizedEmail);

        // Generate a 6-digit OTP
        String otpCode = generateOtp();

        OtpVerification otp = new OtpVerification();
        otp.setEmail(normalizedEmail);
        otp.setOtpCode(otpCode);
        otp.setExpiresAt(LocalDateTime.now().plusMinutes(otpExpiryMinutes));
        otp.setVerified(false);
        otp.setAttemptCount(0);

        otpVerificationRepository.save(otp);

        // Send OTP email synchronously so caller knows if it failed
        emailService.sendOtpEmail(normalizedEmail, otpCode, otpExpiryMinutes);

        log.info("OTP sent to email: {}", normalizedEmail);
    }

    /**
     * Sends an OTP to a registered user's email for password change verification.
     * Unlike sendOtp(), this does NOT check if the email is already registered —
     * the user must already be registered to change their password.
     */
    @Transactional
    public void sendPasswordChangeOtp(String email) {
        String normalizedEmail = email.trim().toLowerCase();

        // Ensure the email belongs to a registered user
        if (!userRepository.existsByEmail(normalizedEmail)) {
            throw new RuntimeException("No account found with this email address.");
        }

        // Delete any existing OTP for this email
        otpVerificationRepository.deleteByEmail(normalizedEmail);

        // Generate a 6-digit OTP
        String otpCode = generateOtp();

        OtpVerification otp = new OtpVerification();
        otp.setEmail(normalizedEmail);
        otp.setOtpCode(otpCode);
        otp.setExpiresAt(LocalDateTime.now().plusMinutes(otpExpiryMinutes));
        otp.setVerified(false);
        otp.setAttemptCount(0);

        otpVerificationRepository.save(otp);

        // Send password-change OTP email
        emailService.sendPasswordChangeOtpEmail(normalizedEmail, otpCode, otpExpiryMinutes);

        log.info("Password change OTP sent to email: {}", normalizedEmail);
    }

    /**
     * Verifies the OTP for password change and marks it as verified.
     * Returns true if the OTP is valid and verified.
     */
    @Transactional
    public void verifyOtpForPasswordChange(String email, String otpCode) {
        // Reuse the same verifyOtp logic
        verifyOtp(email, otpCode);
    }

    /**
     * Checks whether the email has a valid verified OTP for password change.
     */
    public boolean isOtpVerifiedForPasswordChange(String email) {
        return isEmailVerified(email);
    }

    /**
     * Verifies the OTP for the given email.
     * Marks the OTP as verified on success.
     * Throws RuntimeException on failure (expired, wrong code, too many attempts).
     */
    @Transactional
    public void verifyOtp(String email, String otpCode) {
        String normalizedEmail = email.trim().toLowerCase();

        OtpVerification otp = otpVerificationRepository.findByEmail(normalizedEmail)
                .orElseThrow(() -> new RuntimeException("No OTP found for this email. Please request a new OTP."));

        if (otp.isVerified()) {
            // Already verified — allow re-use within the same session window
            return;
        }

        if (LocalDateTime.now().isAfter(otp.getExpiresAt())) {
            otpVerificationRepository.deleteByEmail(normalizedEmail);
            throw new RuntimeException("OTP has expired. Please request a new OTP.");
        }

        if (otp.getAttemptCount() >= maxAttempts) {
            otpVerificationRepository.deleteByEmail(normalizedEmail);
            throw new RuntimeException("Too many failed attempts. Please request a new OTP.");
        }

        if (!otp.getOtpCode().equals(otpCode.trim())) {
            otp.setAttemptCount(otp.getAttemptCount() + 1);
            otpVerificationRepository.save(otp);
            int remaining = maxAttempts - otp.getAttemptCount();
            throw new RuntimeException("Invalid OTP. " + remaining + " attempt(s) remaining.");
        }

        // Mark as verified
        otp.setVerified(true);
        otpVerificationRepository.save(otp);
        log.info("OTP verified successfully for email: {}", normalizedEmail);
    }

    /**
     * Checks whether the email has a valid verified OTP.
     * Used by AuthenticationService before completing registration.
     */
    public boolean isEmailVerified(String email) {
        String normalizedEmail = email.trim().toLowerCase();
        Optional<OtpVerification> otp = otpVerificationRepository.findByEmail(normalizedEmail);
        return otp.isPresent()
                && otp.get().isVerified()
                && LocalDateTime.now().isBefore(otp.get().getExpiresAt());
    }

    /**
     * Cleans up the OTP record after successful registration.
     */
    @Transactional
    public void deleteOtp(String email) {
        otpVerificationRepository.deleteByEmail(email.trim().toLowerCase());
    }

    private String generateOtp() {
        int otp = 100000 + secureRandom.nextInt(900000);
        return String.valueOf(otp);
    }
}
