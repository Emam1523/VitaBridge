package com.vitabridge.controller;

import com.vitabridge.dto.ComplaintDTO;
import com.vitabridge.model.User;
import com.vitabridge.service.ComplaintService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/complaints")
public class ComplaintController {

    @Autowired
    private ComplaintService complaintService;

    // Patient endpoints

    @PostMapping
    @PreAuthorize("hasRole('PATIENT')")
    public ResponseEntity<ComplaintDTO> submit(
            @AuthenticationPrincipal User user,
            @RequestBody Map<String, String> body) {

        String title   = body.getOrDefault("title", "").trim();
        String message = body.getOrDefault("message", "").trim();
        if (title.isBlank() || message.isBlank()) {
            return ResponseEntity.badRequest().build();
        }
        return ResponseEntity.ok(complaintService.submitComplaint(user.getId(), title, message));
    }

    @GetMapping("/my")
    @PreAuthorize("hasRole('PATIENT')")
    public ResponseEntity<List<ComplaintDTO>> myComplaints(@AuthenticationPrincipal User user) {
        return ResponseEntity.ok(complaintService.getPatientComplaints(user.getId()));
    }

    // Admin endpoints

    @GetMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<List<ComplaintDTO>> all() {
        return ResponseEntity.ok(complaintService.getAllComplaints());
    }

    @GetMapping("/stats")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Map<String, Long>> stats() {
        return ResponseEntity.ok(complaintService.getStats());
    }

    @PatchMapping("/{id}/review")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ComplaintDTO> markReviewed(@PathVariable UUID id) {
        return ResponseEntity.ok(complaintService.markReviewed(id));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Void> delete(@PathVariable UUID id) {
        complaintService.deleteComplaint(id);
        return ResponseEntity.noContent().build();
    }
}
