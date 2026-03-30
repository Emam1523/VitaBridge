package com.vitabridge.repository;

import com.vitabridge.model.Assistant;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface AssistantRepository extends JpaRepository<Assistant, UUID> {
    Optional<Assistant> findByUserId(UUID userId);
    List<Assistant> findByAssignedDoctorId(UUID doctorId);
}
