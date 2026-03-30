package com.vitabridge.repository;

import com.vitabridge.model.Prescription;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.List;
import java.util.UUID;

@Repository
public interface PrescriptionRepository extends JpaRepository<Prescription, UUID> {
    @EntityGraph(attributePaths = {
        "medications",
        "appointment",
        "appointment.patient",
        "appointment.doctor",
        "appointment.doctor.user"
    })
    Optional<Prescription> findFirstByAppointmentIdOrderByCreatedAtDesc(UUID appointmentId);

    @EntityGraph(attributePaths = {
        "medications",
        "appointment",
        "appointment.patient",
        "appointment.doctor",
        "appointment.doctor.user"
    })
    List<Prescription> findByAppointmentIdOrderByCreatedAtDesc(UUID appointmentId);

    @EntityGraph(attributePaths = {
        "medications",
        "appointment",
        "appointment.patient",
        "appointment.doctor",
        "appointment.doctor.user"
    })
    List<Prescription> findByAppointmentPatientIdOrderByCreatedAtDesc(UUID patientUserId);

    @EntityGraph(attributePaths = {
        "medications",
        "appointment",
        "appointment.patient",
        "appointment.doctor",
        "appointment.doctor.user"
    })
    List<Prescription> findByAppointmentDoctorIdOrderByCreatedAtDesc(UUID doctorProfileId);

    @Override
    @EntityGraph(attributePaths = {
        "medications",
        "appointment",
        "appointment.patient",
        "appointment.doctor",
        "appointment.doctor.user"
    })
    Optional<Prescription> findById(UUID id);

    void deleteByAppointmentId(UUID appointmentId);
}
