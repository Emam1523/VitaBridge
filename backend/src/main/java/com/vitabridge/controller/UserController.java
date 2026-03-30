package com.vitabridge.controller;

import com.vitabridge.dto.ChangePasswordRequest;
import com.vitabridge.dto.OtpResponse;
import com.vitabridge.dto.VerifyOtpCodeRequest;
import com.vitabridge.model.User;
import com.vitabridge.repository.UserRepository;
import com.vitabridge.service.AuthenticationService;
import com.vitabridge.service.OtpService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/user")
public class UserController {

    private static final Path PHOTO_DIR = Paths.get("uploads/profile-photos");

    @Autowired
    private AuthenticationService authenticationService;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private OtpService otpService;

    /**
     * Step 1: Send OTP to the authenticated user's email for password change
     * verification.
     */
    @PostMapping("/send-change-password-otp")
    public ResponseEntity<OtpResponse> sendChangePasswordOtp(@AuthenticationPrincipal User user) {
        otpService.sendPasswordChangeOtp(user.getEmail());
        return ResponseEntity.ok(new OtpResponse(true,
                "A 6-digit verification code has been sent to " + user.getEmail() + ". Please check your inbox."));
    }

    /**
     * Step 2: Verify the OTP entered by the user for password change.
     */
    @PostMapping("/verify-change-password-otp")
    public ResponseEntity<OtpResponse> verifyChangePasswordOtp(
            @AuthenticationPrincipal User user,
            @RequestBody VerifyOtpCodeRequest request) {
        otpService.verifyOtpForPasswordChange(user.getEmail(), request.getOtpCode());
        return ResponseEntity.ok(new OtpResponse(true,
                "OTP verified successfully. You can now set your new password."));
    }

    /**
     * Step 3: Change password after OTP has been verified.
     */
    @PostMapping("/change-password")
    public ResponseEntity<Map<String, String>> changePassword(
            @AuthenticationPrincipal User user,
            @RequestBody ChangePasswordRequest request) {
        authenticationService.changePassword(user.getId(), request);
        return ResponseEntity.ok(Map.of("message", "Password changed successfully"));
    }

    /** Returns the current user's profile photo URL (or null). */
    @GetMapping("/photo")
    public ResponseEntity<Map<String, String>> getPhoto(@AuthenticationPrincipal User user) {
        User fresh = userRepository.findById(user.getId()).orElse(user);
        return ResponseEntity
                .ok(Map.of("profileImageUrl", fresh.getProfileImageUrl() != null ? fresh.getProfileImageUrl() : ""));
    }

    /** Upload / replace the current user's profile photo. */
    @PostMapping("/photo")
    public ResponseEntity<Map<String, String>> uploadPhoto(
            @AuthenticationPrincipal User user,
            @RequestParam("photo") MultipartFile file) throws IOException {

        if (file.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "No file provided"));
        }

        String contentType = file.getContentType();
        if (contentType == null || !contentType.startsWith("image/")) {
            return ResponseEntity.badRequest().body(Map.of("error", "Only image files are allowed"));
        }

        Files.createDirectories(PHOTO_DIR);

        // Delete old photo file if any
        User fresh = userRepository.findById(user.getId()).orElse(user);
        deleteOldPhoto(fresh.getProfileImageUrl());

        String ext = getExtension(file.getOriginalFilename());
        String filename = UUID.randomUUID() + "_" + user.getId() + ext;
        Path dest = PHOTO_DIR.resolve(filename);
        Files.copy(file.getInputStream(), dest);

        String url = "/uploads/profile-photos/" + filename;
        fresh.setProfileImageUrl(url);
        userRepository.save(fresh);

        return ResponseEntity.ok(Map.of("profileImageUrl", url));
    }

    /** Remove the current user's profile photo. */
    @DeleteMapping("/photo")
    public ResponseEntity<Void> removePhoto(@AuthenticationPrincipal User user) {
        User fresh = userRepository.findById(user.getId()).orElse(user);
        deleteOldPhoto(fresh.getProfileImageUrl());
        fresh.setProfileImageUrl(null);
        userRepository.save(fresh);
        return ResponseEntity.noContent().build();
    }

    private void deleteOldPhoto(String url) {
        if (url == null || url.isBlank())
            return;
        try {
            String filename = url.substring(url.lastIndexOf('/') + 1);
            Path old = PHOTO_DIR.resolve(filename);
            Files.deleteIfExists(old);
        } catch (IOException ignored) {
        }
    }

    private String getExtension(String filename) {
        if (filename == null)
            return ".jpg";
        int dot = filename.lastIndexOf('.');
        return dot >= 0 ? filename.substring(dot).toLowerCase() : ".jpg";
    }
}
