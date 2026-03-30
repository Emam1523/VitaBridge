package com.vitabridge.service;

import com.vitabridge.dto.AppointmentDTO;
import com.vitabridge.dto.AppointmentRequest;
import com.vitabridge.model.*;
import com.vitabridge.repository.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.security.access.AccessDeniedException;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
public class AppointmentService {
    
    @Autowired
    private AppointmentRepository appointmentRepository;
    
    @Autowired
    private DoctorRepository doctorRepository;
    
    @Autowired
    private UserRepository userRepository;
    
    @Autowired
    private PaymentRepository paymentRepository;

    @Autowired
    private DoctorScheduleRepository doctorScheduleRepository;

    @Autowired
    private EmailService emailService;

    @Autowired
    private NotificationService notificationService;
    
    @Transactional
    public AppointmentDTO bookAppointment(UUID patientId, AppointmentRequest request) {
        User patient = userRepository.findById(patientId)
                .orElseThrow(() -> new RuntimeException("Patient not found"));
        
        DoctorProfile doctor = doctorRepository.findById(request.getDoctorId())
                .orElseThrow(() -> new RuntimeException("Doctor not found"));

        // Prevent the same patient from booking the same doctor twice on the same day
        if (appointmentRepository.existsActiveBookingByPatientAndDoctorAndDate(
                patientId, request.getDoctorId(), request.getAppointmentDate())) {
            throw new RuntimeException(
                    "You already have an appointment with this doctor on " + request.getAppointmentDate()
                    + ". A patient can only book the same doctor once per day.");
        }

        // Check if a schedule exists for the requested date
        Optional<DoctorSchedule> scheduleOpt = doctorScheduleRepository
                .findByDoctorIdAndScheduleDate(request.getDoctorId(), request.getAppointmentDate());
        
        if (scheduleOpt.isEmpty()) {
            throw new RuntimeException("Doctor has no schedule for this date. Please select a different date.");
        }

        DoctorSchedule schedule = scheduleOpt.get();
        if (schedule.getIsActive() != null && !schedule.getIsActive()) {
            throw new RuntimeException("Doctor's schedule for this date is inactive.");
        }

        // Time-window validation: for today's date, only allow booking within start–end time
        if (request.getAppointmentDate().equals(LocalDate.now())) {
            java.time.LocalTime now = java.time.LocalTime.now();
            if (schedule.getStartTime() != null && now.isBefore(schedule.getStartTime())) {
                throw new RuntimeException(
                    "Booking for today is not yet open. It opens at "
                    + schedule.getStartTime().toString().substring(0, 5) + ".");
            }
            if (schedule.getEndTime() != null && now.isAfter(schedule.getEndTime())) {
                throw new RuntimeException(
                    "Booking for today has closed. Last booking was accepted at "
                    + schedule.getEndTime().toString().substring(0, 5)
                    + ". Please choose a future date.");
            }
        }

        // Check max patient limit
        int existingCount = appointmentRepository.countAppointmentsByDoctorAndDate(
                request.getDoctorId(), request.getAppointmentDate());
        int maxPatients = schedule.getMaxPatients() != null ? schedule.getMaxPatients() : 50;
        
        if (existingCount >= maxPatients) {
            throw new RuntimeException("This date is fully booked. Maximum " + maxPatients 
                    + " patients allowed per day. Please choose another date.");
        }
        
        Appointment appointment = new Appointment();
        appointment.setPatient(patient);
        appointment.setDoctor(doctor);
        appointment.setAppointmentDate(request.getAppointmentDate());
        appointment.setAppointmentTime(schedule.getStartTime());
        appointment.setReason(request.getReason());
        appointment.setSymptoms(request.getSymptoms());
        appointment.setStatus(AppointmentStatus.PENDING);

        // Set consultation type
        ConsultationType cType = ConsultationType.OFFLINE;
        if (request.getConsultationType() != null && !request.getConsultationType().isBlank()) {
            cType = ConsultationType.valueOf(request.getConsultationType());
        }
        appointment.setConsultationType(cType);

        // Serial number will be assigned after payment confirmation
        appointment.setSerialNumber(null);
        
        appointment = appointmentRepository.save(appointment);
        
        // Create payment record
        Payment payment = new Payment();
        payment.setAppointment(appointment);
        payment.setAmount(doctor.getConsultationFee());
        payment.setStatus(PaymentStatus.PENDING);
        paymentRepository.save(payment);

        return convertToDTO(appointment);
    }
    
    public List<AppointmentDTO> getPatientAppointments(UUID patientId) {
        return appointmentRepository.findByPatientId(patientId).stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }
    
    public List<AppointmentDTO> getDoctorAppointments(UUID doctorId) {
        return appointmentRepository.findByDoctorId(doctorId).stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }
    
    public List<AppointmentDTO> getUpcomingAppointmentsByPatient(UUID patientId) {
        return appointmentRepository.findUpcomingAppointmentsByPatient(patientId, LocalDate.now()).stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }
    
    public List<AppointmentDTO> getAllAppointments() {
        return appointmentRepository.findAll().stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }

    public List<AppointmentDTO> getAppointmentsByDate(LocalDate date) {
        return appointmentRepository.findByAppointmentDate(date).stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }

    public List<AppointmentDTO> getAppointmentsByDoctorAndDate(UUID doctorId, LocalDate date) {
        return appointmentRepository.findByDoctorIdAndDate(doctorId, date).stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }

    public List<LocalDate> getDistinctAppointmentDates() {
        return appointmentRepository.findDistinctAppointmentDates();
    }
    
    public AppointmentDTO getAppointmentById(UUID id) {
        Appointment appointment = appointmentRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Appointment not found"));
        return convertToDTO(appointment);
    }

    public AppointmentDTO getAppointmentByIdForPatient(UUID patientUserId, UUID appointmentId) {
        Appointment appointment = appointmentRepository.findById(appointmentId)
                .orElseThrow(() -> new RuntimeException("Appointment not found"));

        if (!appointment.getPatient().getId().equals(patientUserId)) {
            throw new AccessDeniedException("You can only access your own appointments");
        }
        return convertToDTO(appointment);
    }

    public AppointmentDTO getAppointmentByIdForDoctor(UUID doctorId, UUID appointmentId) {
        Appointment appointment = appointmentRepository.findById(appointmentId)
                .orElseThrow(() -> new RuntimeException("Appointment not found"));

        if (!appointment.getDoctor().getId().equals(doctorId)) {
            throw new AccessDeniedException("You can only access your own appointments");
        }
        return convertToDTO(appointment);
    }

    public Appointment getAppointmentEntityForDoctor(UUID doctorId, UUID appointmentId) {
        Appointment appointment = appointmentRepository.findById(appointmentId)
                .orElseThrow(() -> new RuntimeException("Appointment not found"));

        if (!appointment.getDoctor().getId().equals(doctorId)) {
            throw new AccessDeniedException("You can only access your own appointments");
        }

        return appointment;
    }

    @Transactional
    public AppointmentDTO updateAppointmentStatusForDoctor(UUID doctorId, UUID appointmentId, AppointmentStatus status) {
        if (status == AppointmentStatus.CONFIRMED) {
            return confirmAppointmentManually(doctorId, appointmentId, false);
        }

        Appointment appointment = getAppointmentEntityForDoctor(doctorId, appointmentId);
        appointment.setStatus(status);
        appointment = appointmentRepository.save(appointment);

        // Notify patients waiting in the queue when a consultation is marked COMPLETED
        if (status == AppointmentStatus.COMPLETED && appointment.getSerialNumber() != null) {
            notificationService.sendQueueUpdatesAfterCompletion(
                    appointment.getDoctor().getId(),
                    appointment.getAppointmentDate(),
                    appointment.getSerialNumber());
        }

        if (status == AppointmentStatus.CANCELLED) {
            emailService.sendAppointmentCancellationEmail(
                    appointment.getPatient().getEmail(),
                    appointment.getPatient().getName(),
                    "Dr. " + appointment.getDoctor().getUser().getName(),
                    appointment.getDoctor().getSpecialty() != null ? appointment.getDoctor().getSpecialty() : "",
                    appointment.getAppointmentDate()
                            .format(java.time.format.DateTimeFormatter.ofPattern("dd MMM yyyy")),
                    appointment.getConsultationType() != null
                            ? appointment.getConsultationType().name() : "OFFLINE"
            );
        }

        return convertToDTO(appointment);
    }

    @Transactional
    public AppointmentDTO confirmAppointmentManually(UUID doctorId, UUID appointmentId, boolean isAssistant) {
        Appointment appointment = getAppointmentEntityForDoctor(doctorId, appointmentId);

        // Assistants cannot manually confirm ONLINE appointments — those are auto-confirmed after AamarPay payment
        if (isAssistant && appointment.getConsultationType() == ConsultationType.ONLINE) {
            throw new RuntimeException("Online appointments are confirmed automatically after payment. Assistants cannot manually confirm them.");
        }

        // Online appointments require payment before confirmation
        if (appointment.getConsultationType() == ConsultationType.ONLINE
                && appointment.getPayment() != null
                && appointment.getPayment().getStatus() != PaymentStatus.COMPLETED) {
            throw new RuntimeException("Online appointments require completed payment before confirmation.");
        }

        if (appointment.getStatus() != AppointmentStatus.CONFIRMED) {
            appointment.setStatus(AppointmentStatus.CONFIRMED);

            assignSerialNumberIfMissing(appointment);
            appointment = appointmentRepository.save(appointment);

            //Offline appointments confirmation email
            if (appointment.getConsultationType() == ConsultationType.OFFLINE) {
                emailService.sendAppointmentConfirmationEmail(
                        appointment.getPatient().getEmail(),
                        appointment.getPatient().getName(),
                        "Dr. " + appointment.getDoctor().getUser().getName(),
                        appointment.getDoctor().getSpecialty() != null ? appointment.getDoctor().getSpecialty() : "",
                        appointment.getAppointmentDate()
                                .format(java.time.format.DateTimeFormatter.ofPattern("dd MMM yyyy")),
                        appointment.getConsultationType().name(),
                        appointment.getDoctor().getConsultationFee(),
                        appointment.getSerialNumber()
                );
            }
        }

        return convertToDTO(appointment);
    }

    @Transactional
    public void assignSerialNumberIfMissing(Appointment appointment) {
        if (appointment.getSerialNumber() != null) {
            return;
        }

        UUID doctorId = appointment.getDoctor().getId();
        LocalDate appointmentDate = appointment.getAppointmentDate();

        // Serialize serial generation per doctor so concurrent confirmations can't assign duplicates.
        doctorRepository.findByIdForUpdate(doctorId)
                .orElseThrow(() -> new RuntimeException("Doctor not found"));

        int maxSerial = appointmentRepository.findMaxSerialNumberByDoctorAndDate(doctorId, appointmentDate);
        appointment.setSerialNumber(maxSerial + 1);
    }

    @Transactional
    public AppointmentDTO updateConsultationNotesForDoctor(UUID doctorId, UUID appointmentId, String notes) {
        Appointment appointment = getAppointmentEntityForDoctor(doctorId, appointmentId);
        appointment.setConsultationNotes(notes);
        appointment = appointmentRepository.save(appointment);
        return convertToDTO(appointment);
    }

    @Transactional
    public AppointmentDTO toggleConsultationLock(UUID doctorId, UUID appointmentId, boolean locked) {
        Appointment appointment = getAppointmentEntityForDoctor(doctorId, appointmentId);
        appointment.setConsultationLocked(locked);
        appointment = appointmentRepository.save(appointment);
        return convertToDTO(appointment);
    }
    
    private AppointmentDTO convertToDTO(Appointment appointment) {
        AppointmentDTO dto = new AppointmentDTO();
        dto.setId(appointment.getId());
        dto.setPatientId(appointment.getPatient().getId());
        dto.setPatientName(appointment.getPatient().getName());
        dto.setDoctorId(appointment.getDoctor().getId());
        dto.setDoctorUserId(appointment.getDoctor().getUser().getId());
        dto.setDoctorName(appointment.getDoctor().getUser().getName());
        dto.setSpecialty(appointment.getDoctor().getSpecialty());
        dto.setAppointmentDate(appointment.getAppointmentDate());
        dto.setReason(appointment.getReason());
        dto.setSymptoms(appointment.getSymptoms());
        dto.setStatus(appointment.getStatus().name());
        dto.setNotes(appointment.getNotes());
        dto.setConsultationNotes(appointment.getConsultationNotes());
        dto.setConsultationFee(appointment.getDoctor().getConsultationFee());
        dto.setConsultationType(appointment.getConsultationType() != null ? appointment.getConsultationType().name() : null);
        dto.setSerialNumber(appointment.getSerialNumber());
        if (appointment.getAppointmentTime() != null) {
            dto.setAppointmentTime(appointment.getAppointmentTime().toString().substring(0, 5));
        }
        dto.setConsultationLocked(appointment.getConsultationLocked() != null ? appointment.getConsultationLocked() : true);
        // Include payment status
        if (appointment.getPayment() != null) {
            dto.setPaymentStatus(appointment.getPayment().getStatus().name());
        } else {
            dto.setPaymentStatus("PENDING");
        }
        // Include patient contact info
        dto.setPatientEmail(appointment.getPatient().getEmail());
        dto.setPatientPhone(appointment.getPatient().getPhoneNumber());
        // Include patient gender
        if (appointment.getPatient().getPatientProfile() != null) {
            dto.setPatientGender(appointment.getPatient().getPatientProfile().getGender());
        }
        return dto;
    }
}

