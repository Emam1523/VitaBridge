package com.vitabridge.controller;

import com.vitabridge.model.Appointment;
import com.vitabridge.model.User;
import com.vitabridge.repository.AppointmentRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Controller;

import java.security.Principal;
import java.util.Map;
import java.util.UUID;

// WebSocket controller for real-time call signaling
@Controller
public class CallSignalingController {

    @Autowired
    private SimpMessagingTemplate messagingTemplate;

    @Autowired
    private AppointmentRepository appointmentRepository;

    // Caller initiates a call
    @MessageMapping("/call.initiate")
    public void initiateCall(@Payload Map<String, Object> payload, Principal principal) {
        UUID appointmentId = toUUID(payload.get("appointmentId"));
        String callType = (String) payload.getOrDefault("callType", "video");

        Appointment appointment = appointmentRepository.findById(appointmentId).orElse(null);
        if (appointment == null)
            return;

        User caller = (User) ((org.springframework.security.authentication.UsernamePasswordAuthenticationToken) principal)
                .getPrincipal();

        // Determine callee
        String calleeEmail;
        String callerName;
        String callerRole;
        if (appointment.getPatient().getId().equals(caller.getId())) {
            // Patient is calling doctor
            calleeEmail = appointment.getDoctor().getUser().getEmail();
            callerName = caller.getName();
            callerRole = "PATIENT";
        } else if (appointment.getDoctor().getUser().getId().equals(caller.getId())) {
            // Doctor is calling patient
            calleeEmail = appointment.getPatient().getEmail();
            callerName = caller.getName();
            callerRole = "DOCTOR";
        } else {
            return; // unauthorized
        }

        Map<String, Object> signal = Map.of(
                "appointmentId", appointmentId,
                "callType", callType,
                "callerName", callerName,
                "callerRole", callerRole,
                "callerEmail", caller.getEmail());

        messagingTemplate.convertAndSendToUser(
                calleeEmail, "/queue/incoming-call", signal);
    }

    // Callee accepts the call
    @MessageMapping("/call.accept")
    public void acceptCall(@Payload Map<String, Object> payload, Principal principal) {
        UUID appointmentId = toUUID(payload.get("appointmentId"));
        Appointment appointment = appointmentRepository.findById(appointmentId).orElse(null);
        if (appointment == null)
            return;

        User acceptor = (User) ((org.springframework.security.authentication.UsernamePasswordAuthenticationToken) principal)
                .getPrincipal();

        String callerEmail = getOtherUserEmail(appointment, acceptor);
        if (callerEmail == null)
            return;

        messagingTemplate.convertAndSendToUser(
                callerEmail, "/queue/call-accepted",
                Map.of("appointmentId", appointmentId, "acceptedBy", acceptor.getName()));
    }

    // Callee declines the call
    @MessageMapping("/call.decline")
    public void declineCall(@Payload Map<String, Object> payload, Principal principal) {
        UUID appointmentId = toUUID(payload.get("appointmentId"));
        Appointment appointment = appointmentRepository.findById(appointmentId).orElse(null);
        if (appointment == null)
            return;

        User decliner = (User) ((org.springframework.security.authentication.UsernamePasswordAuthenticationToken) principal)
                .getPrincipal();

        String callerEmail = getOtherUserEmail(appointment, decliner);
        if (callerEmail == null)
            return;

        messagingTemplate.convertAndSendToUser(
                callerEmail, "/queue/call-declined",
                Map.of("appointmentId", appointmentId, "declinedBy", decliner.getName()));
    }

    // Either party ends an ongoing call
    @MessageMapping("/call.end")
    public void endCall(@Payload Map<String, Object> payload, Principal principal) {
        UUID appointmentId = toUUID(payload.get("appointmentId"));
        Appointment appointment = appointmentRepository.findById(appointmentId).orElse(null);
        if (appointment == null)
            return;

        User ender = (User) ((org.springframework.security.authentication.UsernamePasswordAuthenticationToken) principal)
                .getPrincipal();

        String otherEmail = getOtherUserEmail(appointment, ender);
        if (otherEmail == null)
            return;

        messagingTemplate.convertAndSendToUser(
                otherEmail, "/queue/call-ended",
                Map.of("appointmentId", appointmentId, "endedBy", ender.getName()));
    }

    // Helpers

    private String getOtherUserEmail(Appointment appointment, User current) {
        if (appointment.getPatient().getId().equals(current.getId())) {
            return appointment.getDoctor().getUser().getEmail();
        } else if (appointment.getDoctor().getUser().getId().equals(current.getId())) {
            return appointment.getPatient().getEmail();
        }
        return null;
    }

    private UUID toUUID(Object value) {
        if (value instanceof String s && !s.isBlank())
            return UUID.fromString(s);
        return null;
    }
}
