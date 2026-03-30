package com.vitabridge.repository;

import com.vitabridge.model.MedicalAccess;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface MedicalAccessRepository extends JpaRepository<MedicalAccess, UUID> {
    Optional<MedicalAccess> findByPatientIdAndDoctorId(UUID patientId, UUID doctorId);
    List<MedicalAccess> findByPatientId(UUID patientId);
    List<MedicalAccess> findByDoctorId(UUID doctorId);
    boolean existsByPatientIdAndDoctorIdAndAccessGrantedTrue(UUID patientId, UUID doctorId);

    @Transactional
    void deleteByPatientId(UUID patientId);

    @Transactional
    void deleteByDoctorId(UUID doctorId);
}
