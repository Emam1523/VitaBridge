package com.vitabridge.repository;

import com.vitabridge.model.ChatMessage;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface ChatMessageRepository extends JpaRepository<ChatMessage, UUID> {
    
    List<ChatMessage> findByAppointmentIdOrderBySentAtAsc(UUID appointmentId);

    void deleteByAppointmentId(UUID appointmentId);
    
    @Query("SELECT m FROM ChatMessage m WHERE m.appointment.id = :appointmentId AND m.isRead = false AND m.sender.id != :userId")
    List<ChatMessage> findUnreadMessages(@Param("appointmentId") UUID appointmentId, @Param("userId") UUID userId);
    
    @Query("SELECT COUNT(m) FROM ChatMessage m WHERE m.appointment.id = :appointmentId AND m.isRead = false AND m.sender.id != :userId")
    Long countUnreadMessages(@Param("appointmentId") UUID appointmentId, @Param("userId") UUID userId);
}
