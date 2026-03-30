package com.vitabridge.controller;

import com.vitabridge.dto.AppointmentDTO;
import com.vitabridge.dto.AssistantDTO;
import com.vitabridge.dto.DoctorDTO;
import com.vitabridge.dto.ScheduleDTO;
import com.vitabridge.model.Appointment;
import com.vitabridge.model.AppointmentStatus;
import com.vitabridge.model.Assistant;
import com.vitabridge.model.ConsultationType;
import com.vitabridge.model.DoctorSchedule;
import com.vitabridge.model.User;
import com.vitabridge.service.AppointmentService;
import com.vitabridge.service.AssistantService;
import com.vitabridge.service.DoctorService;
import com.vitabridge.service.PaymentService;
import com.vitabridge.service.ScheduleService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/assistant")
@PreAuthorize("hasRole('ASSISTANT')")
public class AssistantController {

    @Autowired
    private ScheduleService scheduleService;

    @Autowired
    private AssistantService assistantService;

    @Autowired
    private AppointmentService appointmentService;

    @Autowired
    private DoctorService doctorService;

    @Autowired
    private PaymentService paymentService;

    // Profile

    @GetMapping("/profile")
    public ResponseEntity<AssistantDTO> getProfile(@AuthenticationPrincipal User user) {
        return ResponseEntity.ok(assistantService.getAssistantByUserId(user.getId()));
    }

    @PutMapping("/profile")
    public ResponseEntity<AssistantDTO> updateProfile(@AuthenticationPrincipal User user,
            @RequestBody AssistantDTO assistantDTO) {
        return ResponseEntity.ok(assistantService.updateAssistantProfile(user.getId(), assistantDTO));
    }

    // Schedule Management

    @PostMapping("/schedules")
    public ResponseEntity<DoctorSchedule> createSchedule(@AuthenticationPrincipal User user,
            @RequestBody DoctorSchedule schedule) {
        Assistant assistant = assistantService.getAssistantEntityByUserId(user.getId());
        requireAssignedDoctor(assistant);
        schedule.setDoctor(assistant.getAssignedDoctor());
        return ResponseEntity.ok(scheduleService.createSchedule(schedule));
    }

    @GetMapping("/schedules")
    public ResponseEntity<List<ScheduleDTO>> getMyDoctorSchedules(@AuthenticationPrincipal User user) {
        Assistant assistant = assistantService.getAssistantEntityByUserId(user.getId());
        requireAssignedDoctor(assistant);
        List<DoctorSchedule> schedules = scheduleService.getDoctorSchedules(assistant.getAssignedDoctor().getId());
        return ResponseEntity.ok(scheduleService.convertToDTO(schedules));
    }

    @DeleteMapping("/schedules/{scheduleId}")
    public ResponseEntity<Void> deleteSchedule(@PathVariable UUID scheduleId,
            @AuthenticationPrincipal User user) {
        Assistant assistant = assistantService.getAssistantEntityByUserId(user.getId());
        requireAssignedDoctor(assistant);
        DoctorSchedule schedule = scheduleService.getScheduleById(scheduleId);
        requireScheduleOwnership(assistant, schedule);
        scheduleService.deleteSchedule(scheduleId);
        return ResponseEntity.noContent().build();
    }

    @PatchMapping("/schedules/{scheduleId}/stop")
    public ResponseEntity<ScheduleDTO> stopSchedule(@PathVariable UUID scheduleId,
            @AuthenticationPrincipal User user) {
        Assistant assistant = assistantService.getAssistantEntityByUserId(user.getId());
        requireAssignedDoctor(assistant);
        DoctorSchedule schedule = scheduleService.getScheduleById(scheduleId);
        requireScheduleOwnership(assistant, schedule);
        return ResponseEntity.ok(scheduleService.stopSchedule(scheduleId));
    }

    @PatchMapping("/schedules/{scheduleId}/resume")
    public ResponseEntity<ScheduleDTO> resumeSchedule(@PathVariable UUID scheduleId,
            @AuthenticationPrincipal User user) {
        Assistant assistant = assistantService.getAssistantEntityByUserId(user.getId());
        requireAssignedDoctor(assistant);
        DoctorSchedule schedule = scheduleService.getScheduleById(scheduleId);
        requireScheduleOwnership(assistant, schedule);
        return ResponseEntity.ok(scheduleService.resumeSchedule(scheduleId));
    }

    // Appointment Management

    @GetMapping("/appointments")
    public ResponseEntity<List<AppointmentDTO>> getDoctorAppointments(@AuthenticationPrincipal User user) {
        Assistant assistant = assistantService.getAssistantEntityByUserId(user.getId());
        requireAssignedDoctor(assistant);
        return ResponseEntity.ok(appointmentService.getDoctorAppointments(assistant.getAssignedDoctor().getId()));
    }

    @GetMapping("/appointments/{id}")
    public ResponseEntity<AppointmentDTO> getAppointmentById(@PathVariable UUID id,
            @AuthenticationPrincipal User user) {
        Assistant assistant = assistantService.getAssistantEntityByUserId(user.getId());
        requireAssignedDoctor(assistant);
        return ResponseEntity.ok(appointmentService.getAppointmentByIdForDoctor(
                assistant.getAssignedDoctor().getId(), id));
    }

    @PutMapping("/appointments/{id}/status")
    public ResponseEntity<AppointmentDTO> updateAppointmentStatus(@PathVariable UUID id,
            @RequestParam String status,
            @AuthenticationPrincipal User user) {
        Assistant assistant = assistantService.getAssistantEntityByUserId(user.getId());
        requireAssignedDoctor(assistant);
        AppointmentStatus appointmentStatus = AppointmentStatus.valueOf(status);
        if (appointmentStatus == AppointmentStatus.CONFIRMED) {
            return ResponseEntity.ok(appointmentService.confirmAppointmentManually(
                    assistant.getAssignedDoctor().getId(), id, true));
        }
        return ResponseEntity.ok(appointmentService.updateAppointmentStatusForDoctor(
                assistant.getAssignedDoctor().getId(), id, appointmentStatus));
    }

    @PutMapping("/appointments/{id}/confirm")
    public ResponseEntity<AppointmentDTO> confirmAppointment(@PathVariable UUID id,
            @AuthenticationPrincipal User user) {
        Assistant assistant = assistantService.getAssistantEntityByUserId(user.getId());
        requireAssignedDoctor(assistant);
        return ResponseEntity.ok(appointmentService.confirmAppointmentManually(
                assistant.getAssignedDoctor().getId(), id, true));
    }

    @PutMapping("/appointments/{id}/payment")
    public ResponseEntity<java.util.Map<String, Object>> confirmPayment(@PathVariable UUID id,
            @RequestParam(defaultValue = "CASH") String paymentMethod,
            @RequestParam(required = false) String transactionId,
            @AuthenticationPrincipal User user) {
        Assistant assistant = assistantService.getAssistantEntityByUserId(user.getId());
        requireAssignedDoctor(assistant);
        Appointment appointment = appointmentService.getAppointmentEntityForDoctor(
                assistant.getAssignedDoctor().getId(), id);
        if (appointment.getConsultationType() == ConsultationType.ONLINE) {
            throw new IllegalArgumentException(
                    "Online appointments are paid via the patient portal. Manual cash confirmation is not allowed.");
        }
        String txnId = (transactionId != null && !transactionId.isBlank())
                ? transactionId
                : "TXN-" + System.currentTimeMillis();
        paymentService.processPayment(id, paymentMethod, txnId);
        return ResponseEntity.ok(paymentService.getPaymentSummary(id));
    }

    @PutMapping("/appointments/{id}/cancel")
    public ResponseEntity<AppointmentDTO> cancelAppointment(@PathVariable UUID id,
            @AuthenticationPrincipal User user) {
        Assistant assistant = assistantService.getAssistantEntityByUserId(user.getId());
        requireAssignedDoctor(assistant);
        return ResponseEntity.ok(appointmentService.updateAppointmentStatusForDoctor(
                assistant.getAssignedDoctor().getId(), id, AppointmentStatus.CANCELLED));
    }

    @GetMapping("/doctor/info")
    public ResponseEntity<DoctorDTO> getAssignedDoctorInfo(@AuthenticationPrincipal User user) {
        Assistant assistant = assistantService.getAssistantEntityByUserId(user.getId());
        requireAssignedDoctor(assistant);
        return ResponseEntity.ok(doctorService.getDoctorById(assistant.getAssignedDoctor().getId()));
    }

    // Helpers

    private void requireAssignedDoctor(Assistant assistant) {
        if (assistant.getAssignedDoctor() == null) {
            throw new AccessDeniedException("Assistant is not assigned to any doctor");
        }
    }

    private void requireScheduleOwnership(Assistant assistant, DoctorSchedule schedule) {
        if (!schedule.getDoctor().getId().equals(assistant.getAssignedDoctor().getId())) {
            throw new AccessDeniedException("You can only manage schedules for your assigned doctor");
        }
    }
}
