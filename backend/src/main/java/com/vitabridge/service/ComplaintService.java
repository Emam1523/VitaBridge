package com.vitabridge.service;

import com.vitabridge.dto.ComplaintDTO;
import com.vitabridge.model.Complaint;
import com.vitabridge.model.User;
import com.vitabridge.repository.ComplaintRepository;
import com.vitabridge.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
public class ComplaintService {

    @Autowired
    private ComplaintRepository complaintRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private SimpMessagingTemplate messagingTemplate;

    @Transactional
    public ComplaintDTO submitComplaint(UUID patientId, String title, String message) {
        User patient = userRepository.findById(patientId)
                .orElseThrow(() -> new RuntimeException("Patient not found"));

        Complaint complaint = new Complaint();
        complaint.setPatient(patient);
        complaint.setTitle(title.trim());
        complaint.setMessage(message.trim());
        complaint.setStatus("PENDING");

        complaint = complaintRepository.save(complaint);
        ComplaintDTO dto = toDTO(complaint);

        try {
            String destination = "/topic/admin-notifications";
            Map<String, Object> payload = new HashMap<>();
            payload.put("type", "COMPLAINT_CREATED");
            payload.put("message", "New complaint submitted by " + dto.getPatientName() + ": " + dto.getTitle());
            payload.put("complaintId", dto.getId());
            payload.put("patientName", dto.getPatientName());
            payload.put("title", dto.getTitle());
            payload.put("createdAt", dto.getCreatedAt());
            messagingTemplate.convertAndSend(destination, payload, new HashMap<>());
        } catch (Exception ignored) {
            // Notification delivery should not block complaint submission.
        }

        return dto;
    }

    @Transactional(readOnly = true)
    public List<ComplaintDTO> getAllComplaints() {
        return complaintRepository.findAllByOrderByCreatedAtDesc()
                .stream().map(this::toDTO).collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<ComplaintDTO> getPatientComplaints(UUID patientId) {
        return complaintRepository.findByPatientIdOrderByCreatedAtDesc(patientId)
                .stream().map(this::toDTO).collect(Collectors.toList());
    }

    @Transactional
    public ComplaintDTO markReviewed(UUID complaintId) {
        Complaint complaint = complaintRepository.findById(complaintId)
                .orElseThrow(() -> new RuntimeException("Complaint not found"));
        complaint.setStatus("REVIEWED");
        return toDTO(complaintRepository.save(complaint));
    }

    @Transactional
    public void deleteComplaint(UUID complaintId) {
        complaintRepository.deleteById(complaintId);
    }

    public Map<String, Long> getStats() {
        return Map.of(
                "total",    complaintRepository.count(),
                "pending",  complaintRepository.countByStatus("PENDING"),
                "reviewed", complaintRepository.countByStatus("REVIEWED")
        );
    }

    private ComplaintDTO toDTO(Complaint c) {
        ComplaintDTO dto = new ComplaintDTO();
        dto.setId(c.getId());
        dto.setPatientId(c.getPatient().getId());
        dto.setPatientName(c.getPatient().getName());
        dto.setPatientEmail(c.getPatient().getEmail());
        dto.setTitle(c.getTitle());
        dto.setMessage(c.getMessage());
        dto.setStatus(c.getStatus());
        dto.setCreatedAt(c.getCreatedAt());
        return dto;
    }
}
