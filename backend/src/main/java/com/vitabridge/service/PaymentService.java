package com.vitabridge.service;

import com.vitabridge.dto.DoctorPaymentSummaryDTO;
import com.vitabridge.dto.PaymentDTO;
import com.vitabridge.dto.PaymentStatsDTO;
import com.vitabridge.model.AppointmentStatus;
import com.vitabridge.model.DoctorProfile;
import com.vitabridge.model.Payment;
import com.vitabridge.model.PaymentStatus;
import com.vitabridge.repository.AppointmentRepository;
import com.vitabridge.repository.DoctorRepository;
import com.vitabridge.repository.PaymentRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
public class PaymentService {

    private static final Logger log = LoggerFactory.getLogger(PaymentService.class);

    @Autowired
    private PaymentRepository paymentRepository;

    @Autowired
    private DoctorRepository doctorRepository;

    @Autowired
    private AppointmentRepository appointmentRepository;

    @Autowired
    private AamarPayService aamarPayService;

    @Autowired
    private EmailService emailService;

    @Autowired
    private AppointmentService appointmentService;

    public Payment getPaymentByAppointmentId(UUID appointmentId) {
        return paymentRepository.findByAppointmentId(appointmentId)
                .orElseThrow(() -> new RuntimeException("Payment not found"));
    }

    public Map<String, Object> getPaymentSummary(UUID appointmentId) {
        Payment payment = getPaymentByAppointmentId(appointmentId);
        Map<String, Object> summary = new java.util.HashMap<>();
        summary.put("id", payment.getId());
        summary.put("appointmentId", payment.getAppointment().getId());
        summary.put("amount", payment.getAmount());
        summary.put("status", payment.getStatus().name());
        summary.put("paymentMethod", payment.getPaymentMethod());
        summary.put("transactionId", payment.getTransactionId());
        summary.put("paymentDate", payment.getPaymentDate());
        summary.put("createdAt", payment.getCreatedAt());
        return summary;
    }

    public List<Payment> getPaymentsByDoctorId(UUID doctorId) {
        return paymentRepository.findByDoctorId(doctorId);
    }

    public List<Payment> getPaymentsByPatientId(UUID patientId) {
        return paymentRepository.findByPatientId(patientId);
    }

    public List<Payment> getAllPayments() {
        return paymentRepository.findAll();
    }

    public List<PaymentDTO> getAllPaymentDTOs() {
        return paymentRepository.findAll().stream()
                .map(this::convertToPaymentDTO)
                .collect(java.util.stream.Collectors.toList());
    }

    private PaymentDTO convertToPaymentDTO(Payment payment) {
        PaymentDTO dto = new PaymentDTO();
        dto.setId(payment.getId());
        dto.setAppointmentId(payment.getAppointment().getId());
        dto.setPatientName(payment.getAppointment().getPatient().getName());
        dto.setDoctorName(payment.getAppointment().getDoctor().getUser().getName());
        dto.setAmount(payment.getAmount());
        dto.setStatus(payment.getStatus().name());
        dto.setPaymentMethod(payment.getPaymentMethod());
        dto.setTransactionId(payment.getTransactionId());
        dto.setPaymentDate(payment.getPaymentDate());
        dto.setCreatedAt(payment.getCreatedAt());
        return dto;
    }

    @Transactional
    public Payment processPayment(UUID appointmentId, String paymentMethod, String transactionId) {
        Payment payment = paymentRepository.findByAppointmentId(appointmentId)
                .orElseThrow(() -> new RuntimeException("Payment not found"));

        // Idempotency check: prevent duplicate payment processing
        if (payment.getStatus() == PaymentStatus.COMPLETED) {
            log.info("Payment already completed for appointment {}. Returning existing payment.", appointmentId);
            return payment;
        }

        if (transactionId == null || transactionId.isBlank()) {
            throw new RuntimeException("Transaction ID is required");
        }

        payment.setPaymentMethod(paymentMethod);
        payment.setTransactionId(transactionId.trim());
        payment.setPaymentDate(LocalDateTime.now());
        payment.setStatus(PaymentStatus.COMPLETED);

        payment = paymentRepository.save(payment);

        // Confirm appointment and assign serial number after successful payment
        var appointment = payment.getAppointment();
        if (appointment.getStatus() == AppointmentStatus.PENDING) {
            appointment.setStatus(AppointmentStatus.CONFIRMED);
            appointmentService.assignSerialNumberIfMissing(appointment);
            appointmentRepository.save(appointment);

            // Send confirmation email with serial number now that payment is complete
            emailService.sendAppointmentConfirmationEmail(
                    appointment.getPatient().getEmail(),
                    appointment.getPatient().getName(),
                    "Dr. " + appointment.getDoctor().getUser().getName(),
                    appointment.getDoctor().getSpecialty() != null ? appointment.getDoctor().getSpecialty() : "",
                    appointment.getAppointmentDate()
                            .format(java.time.format.DateTimeFormatter.ofPattern("dd MMM yyyy")),
                    appointment.getConsultationType() != null
                            ? appointment.getConsultationType().name() : "OFFLINE",
                    appointment.getDoctor().getConsultationFee(),
                    appointment.getSerialNumber()
            );
        }

        return payment;
    }

    @Transactional
    public String initAamarPayPayment(UUID appointmentId, String clientOrigin) {
        Payment payment = paymentRepository.findByAppointmentId(appointmentId)
                .orElseThrow(() -> new RuntimeException("Payment not found for appointment #" + appointmentId));

        if (payment.getStatus() == PaymentStatus.COMPLETED) {
            throw new RuntimeException("Payment already completed for this appointment.");
        }

        // Allow retry if previous attempt FAILED
        if (payment.getStatus() == PaymentStatus.FAILED) {
            payment.setStatus(PaymentStatus.PENDING);
        }

        // Ensure amount is set
        if (payment.getAmount() == null || payment.getAmount() <= 0) {
            Double fee = payment.getAppointment().getDoctor().getConsultationFee();
            payment.setAmount(fee != null && fee > 0 ? fee : 1.0);
        }

        // Generate a fresh unique Txn ID each time
        String transactionId = "TXN-" + System.currentTimeMillis() + "-"
                + java.util.UUID.randomUUID().toString().substring(0, 8);
        payment.setTransactionId(transactionId);
        payment.setPaymentMethod("AamarPay");
        paymentRepository.save(payment);

        return aamarPayService.initPayment(payment.getAppointment(), transactionId, clientOrigin);
    }

    @Transactional
    public void processAamarPaySuccess(Map<String, String> requestData) {
        String transactionId = requestData.get("mer_txnid");
        String optA = requestData.get("opt_a");
        String paymentStatus = requestData.get("pay_status");
        String amount = requestData.get("amount");

        log.info("Processing AamarPay success: transactionId={}, appointmentId={}, status={}",
                transactionId, optA, paymentStatus);

        if (transactionId == null || optA == null) {
            log.error("Invalid callback data: transactionId={}, opt_a={}", transactionId, optA);
            throw new RuntimeException("Invalid callback data from AamarPay");
        }

        if (paymentStatus == null || !"Successful".equalsIgnoreCase(paymentStatus)) {
            log.warn("Payment not successful according to callback: status={}", paymentStatus);
            throw new RuntimeException("Payment was not successful: " + paymentStatus);
        }

        UUID appointmentId = UUID.fromString(optA);
        Payment payment = paymentRepository.findByAppointmentId(appointmentId)
                .orElseThrow(() -> new RuntimeException("Payment record not found for appointment: " + appointmentId));

        if (payment.getStatus() == PaymentStatus.COMPLETED) {
            log.info("Payment already completed for appointment {}. Skipping duplicate callback.", appointmentId);
            return;
        }

        Double expectedAmount = payment.getAmount();
        if (expectedAmount != null && amount != null) {
            try {
                Double callbackAmount = Double.parseDouble(amount);
                if (Math.abs(callbackAmount - expectedAmount) > 0.01) {
                    log.error("Payment amount mismatch: expected={}, received={}", expectedAmount, callbackAmount);
                    throw new RuntimeException("Payment amount mismatch");
                }
            } catch (NumberFormatException e) {
                log.warn("Could not parse amount from callback: {}", amount);
            }
        }

        try {
            boolean verified = aamarPayService.verifyPayment(transactionId);
            if (!verified) {
                log.error("Payment verification failed for transactionId: {}", transactionId);
                throw new RuntimeException("Payment verification failed. Please contact support.");
            }
        } catch (RuntimeException e) {
            if (e.getMessage() != null && e.getMessage().contains("verification failed")) {
                throw e;
            }
            log.warn("Could not verify payment with AamarPay API: {}. Proceeding with callback data.",
                    e.getMessage());
        }

        processPayment(appointmentId, "AamarPay", transactionId);
        log.info("AamarPay payment processed successfully for appointment {}", appointmentId);
    }

    @Transactional
    public void processAamarPayFail(Map<String, String> requestData) {
        String optA = requestData.get("opt_a"); // Appointment ID

        if (optA != null) {
            UUID appointmentId = UUID.fromString(optA);
            Payment payment = paymentRepository.findByAppointmentId(appointmentId)
                    .orElseThrow(() -> new RuntimeException("Payment not found"));

            payment.setStatus(PaymentStatus.FAILED);
            paymentRepository.save(payment);
        }
    }

    // Admin Payment Statistics

    // Get payment statistics for a specific date
    public PaymentStatsDTO getPaymentStatsByDate(LocalDate date) {
        LocalDateTime startDate = date.atStartOfDay();
        LocalDateTime endDate = date.atTime(LocalTime.MAX);

        List<Payment> payments = paymentRepository.findCompletedPaymentsByDateRange(startDate, endDate);
        Double totalAmount = paymentRepository.getTotalAmountByDateRange(startDate, endDate);

        PaymentStatsDTO stats = new PaymentStatsDTO();
        stats.setDate(date);
        stats.setTotalAmount(totalAmount != null ? totalAmount : 0.0);
        stats.setTotalPayments(payments.size());

        return stats;
    }

    // Get payment statistics for today
    public PaymentStatsDTO getTodayPaymentStats() {
        return getPaymentStatsByDate(LocalDate.now());
    }

    // Get payment history for a date range
    public List<Payment> getPaymentsByDateRange(LocalDate startDate, LocalDate endDate) {
        LocalDateTime start = startDate.atStartOfDay();
        LocalDateTime end = endDate.atTime(LocalTime.MAX);
        return paymentRepository.findCompletedPaymentsByDateRange(start, end);
    }

    // Get payment summary for all doctors
    public List<DoctorPaymentSummaryDTO> getAllDoctorPaymentSummaries() {
        List<DoctorProfile> doctors = doctorRepository.findAll();
        List<DoctorPaymentSummaryDTO> summaries = new ArrayList<>();

        for (DoctorProfile doctor : doctors) {
            DoctorPaymentSummaryDTO summary = getDoctorPaymentSummary(doctor.getId());
            summaries.add(summary);
        }

        return summaries;
    }

    // Get payment summary for a specific doctor
    public DoctorPaymentSummaryDTO getDoctorPaymentSummary(UUID doctorId) {
        DoctorProfile doctor = doctorRepository.findById(doctorId)
                .orElseThrow(() -> new RuntimeException("Doctor not found"));

        Double totalEarnings = paymentRepository.getTotalEarningsByDoctorId(doctorId);
        Integer totalAppointments = paymentRepository.countCompletedPaymentsByDoctorId(doctorId);

        DoctorPaymentSummaryDTO summary = new DoctorPaymentSummaryDTO();
        summary.setDoctorId(doctorId);
        summary.setDoctorName(doctor.getUser().getName());
        summary.setSpecialty(doctor.getSpecialty());
        summary.setTotalEarnings(totalEarnings != null ? totalEarnings : 0.0);
        summary.setTotalAppointments(totalAppointments != null ? totalAppointments : 0);
        summary.setAverageConsultationFee(doctor.getConsultationFee());

        return summary;
    }
}
