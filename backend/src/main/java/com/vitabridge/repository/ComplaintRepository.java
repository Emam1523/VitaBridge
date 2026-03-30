package com.vitabridge.repository;

import com.vitabridge.model.Complaint;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface ComplaintRepository extends JpaRepository<Complaint, UUID> {

    @Query("SELECT c FROM Complaint c JOIN FETCH c.patient WHERE c.patient.id = :patientId ORDER BY c.createdAt DESC")
    List<Complaint> findByPatientIdOrderByCreatedAtDesc(@Param("patientId") UUID patientId);

    @Query("SELECT c FROM Complaint c JOIN FETCH c.patient ORDER BY c.createdAt DESC")
    List<Complaint> findAllByOrderByCreatedAtDesc();

    void deleteByPatientId(UUID patientId);

    long countByStatus(String status);
}
