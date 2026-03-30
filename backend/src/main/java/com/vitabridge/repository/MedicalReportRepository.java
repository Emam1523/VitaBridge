package com.vitabridge.repository;

import com.vitabridge.model.MedicalReport;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface MedicalReportRepository extends JpaRepository<MedicalReport, UUID> {
    List<MedicalReport> findByPatientId(UUID patientId);
    List<MedicalReport> findByDoctorId(UUID doctorId);
    void deleteByPatientId(UUID patientId);
    void deleteByDoctorId(UUID doctorId);
}
