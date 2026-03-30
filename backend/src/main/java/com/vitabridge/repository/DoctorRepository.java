package com.vitabridge.repository;

import com.vitabridge.model.DoctorProfile;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface DoctorRepository extends JpaRepository<DoctorProfile, UUID> {
    Optional<DoctorProfile> findByUserId(UUID userId);
    List<DoctorProfile> findBySpecialty(String specialty);
    List<DoctorProfile> findByAvailability(String availability);
    
    @Query("SELECT DISTINCT d.specialty FROM DoctorProfile d")
    List<String> findAllSpecialties();
    
    @Query("SELECT d FROM DoctorProfile d WHERE " +
           "LOWER(d.user.name) LIKE LOWER(CONCAT('%', :query, '%')) OR " +
           "LOWER(d.specialty) LIKE LOWER(CONCAT('%', :query, '%'))")
    List<DoctorProfile> searchDoctors(@Param("query") String query);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT d FROM DoctorProfile d WHERE d.id = :id")
    Optional<DoctorProfile> findByIdForUpdate(@Param("id") UUID id);
}
