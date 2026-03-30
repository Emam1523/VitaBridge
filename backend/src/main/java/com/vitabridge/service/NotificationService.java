package com.vitabridge.service;

import com.vitabridge.model.Appointment;
import com.vitabridge.model.AppointmentStatus;
import com.vitabridge.repository.AppointmentRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

//Sends real-time queue-position updates to patients via WebSocket
@Service
public class NotificationService {

    private static final Logger log = LoggerFactory.getLogger(NotificationService.class);

    @Autowired
    private SimpMessagingTemplate messagingTemplate;

    @Autowired
    private AppointmentRepository appointmentRepository;

    //Called after an appointment is marked COMPLETED
    @Async
    @Transactional(readOnly = true)
    public void sendQueueUpdatesAfterCompletion(UUID doctorId, LocalDate date, int completedSerial) {

        List<Appointment> waiting = appointmentRepository
                .findByDoctorIdAndDate(doctorId, date)
                .stream()
                .filter(a -> a.getStatus() == AppointmentStatus.CONFIRMED
                        && a.getSerialNumber() != null
                        && a.getSerialNumber() > completedSerial)
                .toList();

        for (Appointment a : waiting) {
            long remaining = waiting.stream()
                    .filter(o -> o.getSerialNumber() < a.getSerialNumber())
                    .count();

            String type;
            String message;
            if (remaining == 0) {
                type = "YOUR_TURN";
                message = "It's your turn! Please join the consultation now.";
            } else {
                type = "QUEUE_UPDATE";
                message = remaining + " patient" + (remaining > 1 ? "s" : "") + " ahead of you in the queue.";
            }

            UUID patientUserId = a.getPatient().getId();
            try {
                Map<String, Object> payload = new HashMap<>();
                payload.put("type", type);
                payload.put("message", message);
                payload.put("remaining", remaining);
                payload.put("serial", a.getSerialNumber());

                messagingTemplate.convertAndSend(
                        "/topic/patient-notifications/" + patientUserId,
                        (Object) payload
                );
                log.debug("Queue notification → patient {} serial #{} remaining={}",
                        patientUserId, a.getSerialNumber(), remaining);
            } catch (Exception e) {
                log.warn("Queue notification failed for patient {}: {}", patientUserId, e.getMessage());
            }
        }
    }
}
