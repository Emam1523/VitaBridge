package com.vitabridge.controller;

import com.vitabridge.service.EmailService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/contact")
public class ContactController {

    @Autowired
    private EmailService emailService;

    @PostMapping
    public ResponseEntity<Map<String, String>> contact(@RequestBody Map<String, String> body) {
        String name    = body.getOrDefault("name", "").trim();
        String email   = body.getOrDefault("email", "").trim();
        String subject = body.getOrDefault("subject", "").trim();
        String message = body.getOrDefault("message", "").trim();

        if (name.isBlank() || email.isBlank() || subject.isBlank() || message.isBlank()) {
            return ResponseEntity.badRequest()
                    .body(Map.of("error", "All fields are required."));
        }

        emailService.sendContactEmail(name, email, subject, message);
        return ResponseEntity.ok(Map.of("message", "Your message has been sent. We'll get back to you shortly."));
    }
}
