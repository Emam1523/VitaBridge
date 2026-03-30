package com.vitabridge.repository;

import com.vitabridge.model.PatientProfile;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface PatientRepository extends JpaRepository<PatientProfile, UUID> {
    Optional<PatientProfile> findByUserId(UUID userId);
}
