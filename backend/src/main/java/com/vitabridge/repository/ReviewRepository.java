package com.vitabridge.repository;

import com.vitabridge.model.Review;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface ReviewRepository extends JpaRepository<Review, UUID> {
    List<Review> findByDoctorId(UUID doctorId);
    List<Review> findByPatientId(UUID patientId);
    Review findByAppointmentId(UUID appointmentId);
    void deleteByAppointmentId(UUID appointmentId);
    void deleteByDoctorId(UUID doctorId);
    void deleteByPatientId(UUID patientId);
}
