package com.vitabridge.repository;

import com.vitabridge.model.Payment;
import com.vitabridge.model.PaymentStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface PaymentRepository extends JpaRepository<Payment, UUID> {
    Optional<Payment> findByAppointmentId(UUID appointmentId);
    List<Payment> findByStatus(PaymentStatus status);
    Optional<Payment> findByTransactionId(String transactionId);
    
    @Query("SELECT p FROM Payment p WHERE p.appointment.doctor.id = :doctorId ORDER BY p.createdAt DESC")
    List<Payment> findByDoctorId(@Param("doctorId") UUID doctorId);
    
    @Query("SELECT p FROM Payment p WHERE p.appointment.patient.id = :patientId ORDER BY p.createdAt DESC")
    List<Payment> findByPatientId(@Param("patientId") UUID patientId);
    
    @Query("SELECT p FROM Payment p WHERE p.status = 'COMPLETED' AND p.paymentDate >= :startDate AND p.paymentDate < :endDate ORDER BY p.paymentDate DESC")
    List<Payment> findCompletedPaymentsByDateRange(@Param("startDate") LocalDateTime startDate, @Param("endDate") LocalDateTime endDate);
    
    @Query("SELECT COALESCE(SUM(p.amount), 0) FROM Payment p WHERE p.status = 'COMPLETED' AND p.paymentDate >= :startDate AND p.paymentDate < :endDate")
    Double getTotalAmountByDateRange(@Param("startDate") LocalDateTime startDate, @Param("endDate") LocalDateTime endDate);
    
    @Query("SELECT COALESCE(SUM(p.amount), 0) FROM Payment p WHERE p.status = 'COMPLETED' AND p.appointment.doctor.id = :doctorId")
    Double getTotalEarningsByDoctorId(@Param("doctorId") UUID doctorId);
    
    @Query("SELECT COUNT(p) FROM Payment p WHERE p.status = 'COMPLETED' AND p.appointment.doctor.id = :doctorId")
    Integer countCompletedPaymentsByDoctorId(@Param("doctorId") UUID doctorId);

    void deleteByAppointmentId(UUID appointmentId);
}
