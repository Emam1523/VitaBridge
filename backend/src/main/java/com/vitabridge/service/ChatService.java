package com.vitabridge.service;

import com.vitabridge.dto.ChatMessageDTO;
import com.vitabridge.model.Appointment;
import com.vitabridge.model.ChatMessage;
import com.vitabridge.model.User;
import com.vitabridge.repository.AppointmentRepository;
import com.vitabridge.repository.ChatMessageRepository;
import com.vitabridge.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
public class ChatService {
    
    @Autowired
    private ChatMessageRepository chatMessageRepository;
    
    @Autowired
    private AppointmentRepository appointmentRepository;
    
    @Autowired
    private UserRepository userRepository;
    
    public List<ChatMessageDTO> getMessagesByAppointment(UUID appointmentId, UUID userId) {
        Appointment appointment = appointmentRepository.findById(appointmentId)
                .orElseThrow(() -> new RuntimeException("Appointment not found"));
        
        // Verify user is part of this appointment (patient or doctor)
        if (!appointment.getPatient().getId().equals(userId) && 
            !appointment.getDoctor().getUser().getId().equals(userId)) {
            throw new AccessDeniedException("You are not authorized to view these messages");
        }
        
        return chatMessageRepository.findByAppointmentIdOrderBySentAtAsc(appointmentId)
                .stream().map(this::convertToDTO).toList();
    }
    
    @Transactional
    public ChatMessageDTO sendMessage(UUID appointmentId, UUID senderId, ChatMessage message) {
        Appointment appointment = appointmentRepository.findById(appointmentId)
                .orElseThrow(() -> new RuntimeException("Appointment not found"));
        
        User sender = userRepository.findById(senderId)
                .orElseThrow(() -> new RuntimeException("User not found"));
        
        // Verify user is part of this appointment
        if (!appointment.getPatient().getId().equals(senderId) && 
            !appointment.getDoctor().getUser().getId().equals(senderId)) {
            throw new AccessDeniedException("You are not authorized to send messages in this consultation");
        }
        
        message.setAppointment(appointment);
        message.setSender(sender);
        
        ChatMessage saved = chatMessageRepository.save(message);
        return convertToDTO(saved);
    }
    
    @Transactional
    public void markMessagesAsRead(UUID appointmentId, UUID userId) {
        List<ChatMessage> unreadMessages = chatMessageRepository.findUnreadMessages(appointmentId, userId);
        
        for (ChatMessage message : unreadMessages) {
            message.setIsRead(true);
        }
        
        chatMessageRepository.saveAll(unreadMessages);
    }
    
    public Long getUnreadCount(UUID appointmentId, UUID userId) {
        return chatMessageRepository.countUnreadMessages(appointmentId, userId);
    }

    private ChatMessageDTO convertToDTO(ChatMessage msg) {
        ChatMessageDTO dto = new ChatMessageDTO();
        dto.setId(msg.getId());
        dto.setContent(msg.getContent());
        dto.setMessageType(msg.getMessageType() != null ? msg.getMessageType().name() : "TEXT");
        dto.setFileUrl(msg.getFileUrl());
        dto.setFileName(msg.getFileName());
        dto.setSentAt(msg.getSentAt());
        dto.setIsRead(msg.getIsRead());
        if (msg.getSender() != null) {
            dto.setSender(new ChatMessageDTO.SenderDTO(msg.getSender().getId(), msg.getSender().getName()));
        }
        return dto;
    }
}
