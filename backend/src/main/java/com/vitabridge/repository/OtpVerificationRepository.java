package com.vitabridge.repository;

import com.vitabridge.model.OtpVerification;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface OtpVerificationRepository extends JpaRepository<OtpVerification, UUID> {

    Optional<OtpVerification> findByEmail(String email);

    boolean existsByEmailAndVerifiedTrue(String email);

    @Modifying
    @Transactional
    @Query("DELETE FROM OtpVerification o WHERE o.email = :email")
    void deleteByEmail(@Param("email") String email);

    @Modifying
    @Transactional
    @Query("DELETE FROM OtpVerification o WHERE o.expiresAt < :now")
    void deleteExpiredOtps(@Param("now") LocalDateTime now);
}
