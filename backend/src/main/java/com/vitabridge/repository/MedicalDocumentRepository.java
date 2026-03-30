package com.vitabridge.repository;

import com.vitabridge.model.MedicalDocument;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface MedicalDocumentRepository extends JpaRepository<MedicalDocument, UUID> {
    List<MedicalDocument> findByPatientId(UUID patientId);
    List<MedicalDocument> findByPatientIdOrderByUploadedAtDesc(UUID patientId);
    List<MedicalDocument> findByPatientIdAndSource(UUID patientId, String source);
    List<MedicalDocument> findByPatientIdAndSourceOrderByUploadedAtDesc(UUID patientId, String source);
    java.util.Optional<MedicalDocument> findTopByPrescriptionIdOrderByUploadedAtDesc(UUID prescriptionId);
    java.util.Optional<MedicalDocument> findTopByAppointmentIdAndSourceOrderByUploadedAtDesc(UUID appointmentId, String source);
    long countByPatientId(UUID patientId);
    long countByPatientIdAndSource(UUID patientId, String source);
}
