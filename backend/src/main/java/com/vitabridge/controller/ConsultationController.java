package com.vitabridge.controller;

import com.vitabridge.dto.ChatMessageDTO;
import com.vitabridge.model.Appointment;
import com.vitabridge.model.ChatMessage;
import com.vitabridge.model.User;
import com.vitabridge.repository.AppointmentRepository;
import com.vitabridge.service.AgoraTokenService;
import com.vitabridge.service.ChatService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/consultation")
@PreAuthorize("hasAnyRole('DOCTOR', 'PATIENT')")
public class ConsultationController {

    @Autowired
    private ChatService chatService;

    @Autowired
    private AppointmentRepository appointmentRepository;

    @Autowired
    private AgoraTokenService agoraTokenService;

    @GetMapping("/{appointmentId}/messages")
    public ResponseEntity<List<ChatMessageDTO>> getMessages(@PathVariable UUID appointmentId,
            @AuthenticationPrincipal User user) {
        return ResponseEntity.ok(chatService.getMessagesByAppointment(appointmentId, user.getId()));
    }

    @PostMapping("/{appointmentId}/messages")
    public ResponseEntity<ChatMessageDTO> sendMessage(@PathVariable UUID appointmentId,
            @RequestBody ChatMessage message,
            @AuthenticationPrincipal User user) {
        return ResponseEntity.ok(chatService.sendMessage(appointmentId, user.getId(), message));
    }

    @PutMapping("/{appointmentId}/messages/read")
    public ResponseEntity<Void> markAsRead(@PathVariable UUID appointmentId,
            @AuthenticationPrincipal User user) {
        chatService.markMessagesAsRead(appointmentId, user.getId());
        return ResponseEntity.ok().build();
    }

    @GetMapping("/{appointmentId}/messages/unread-count")
    public ResponseEntity<Map<String, Long>> getUnreadCount(@PathVariable UUID appointmentId,
            @AuthenticationPrincipal User user) {
        Long count = chatService.getUnreadCount(appointmentId, user.getId());
        return ResponseEntity.ok(Map.of("unreadCount", count));
    }

    @GetMapping("/{appointmentId}/agora")
    public ResponseEntity<?> getAgoraConfig(@PathVariable UUID appointmentId,
            @AuthenticationPrincipal User user) {
        Appointment appointment = appointmentRepository.findById(appointmentId)
                .orElseThrow(() -> new RuntimeException("Appointment not found"));

        if (!appointment.getPatient().getId().equals(user.getId()) &&
                !appointment.getDoctor().getUser().getId().equals(user.getId())) {
            throw new AccessDeniedException("Not authorized for this consultation");
        }

        if (appointment.getPatient().getId().equals(user.getId()) &&
                Boolean.TRUE.equals(appointment.getConsultationLocked())) {
            return ResponseEntity.badRequest().body(Map.of(
                    "error", "Consultation is still locked. Please wait for the doctor to unlock it."));
        }

        String channel = "consultation-" + appointmentId;
        int uid = Math.abs(user.getId().hashCode());

        // Get App ID
        String appId = agoraTokenService.getAppId();
        if (appId == null || appId.trim().isEmpty()) {
            throw new RuntimeException(
                    "Agora App ID is not configured. Please set agora.appId in application.properties");
        }

        // Generate token (returns null if no certificate configured)
        String token = agoraTokenService.generateRtcToken(channel, uid);

        Map<String, Object> response = new HashMap<>();
        response.put("appId", appId);
        response.put("channel", channel);
        response.put("uid", uid);
        if (token != null) {
            response.put("token", token);
        }

        return ResponseEntity.ok(response);
    }
}
