package com.vitabridge.service;

import com.vitabridge.dto.AssistantDTO;
import com.vitabridge.dto.CreateAssistantRequest;
import com.vitabridge.model.Assistant;
import com.vitabridge.model.DoctorProfile;
import com.vitabridge.model.Role;
import com.vitabridge.model.User;
import com.vitabridge.repository.AssistantRepository;
import com.vitabridge.repository.DoctorRepository;
import com.vitabridge.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
public class AssistantService {
    
    @Autowired
    private AssistantRepository assistantRepository;
    
    @Autowired
    private DoctorRepository doctorRepository;
    
    @Autowired
    private UserRepository userRepository;
    
    @Autowired
    private PasswordEncoder passwordEncoder;
    
    // Create Assistant (by Doctor)
    
    @Transactional
    public AssistantDTO createAssistant(CreateAssistantRequest request, UUID doctorId) {
        if (userRepository.existsByEmail(request.getEmail())) {
            throw new RuntimeException("Email already exists");
        }
        
        DoctorProfile doctor = doctorRepository.findById(doctorId)
                .orElseThrow(() -> new RuntimeException("Doctor not found"));
        
        // Create user account with ASSISTANT role
        User user = new User();
        user.setName(request.getName());
        user.setEmail(request.getEmail());
        user.setPassword(passwordEncoder.encode(request.getPassword()));
        user.setPhoneNumber(request.getPhoneNumber());
        user.setRole(Role.ASSISTANT);
        user.setIsActive(true);
        
        // Create associated assistant profile, auto-assigned to this doctor
        Assistant assistant = new Assistant();
        assistant.setUser(user);
        assistant.setAssignedDoctor(doctor);
        assistant.setEmployeeId(request.getEmployeeId());
        
        user.setAssistant(assistant);
        user = userRepository.save(user);
        
        return convertToDTO(user.getAssistant());
    }
    
    public List<AssistantDTO> getAssistantsByDoctorId(UUID doctorId) {
        return assistantRepository.findByAssignedDoctorId(doctorId).stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }
    
    public AssistantDTO getAssistantByUserId(UUID userId) {
        return convertToDTO(getAssistantEntityByUserId(userId));
    }

    public Assistant getAssistantEntityByUserId(UUID userId) {
        return assistantRepository.findByUserId(userId)
                .orElseThrow(() -> new RuntimeException("Assistant profile not found for this account"));
    }
    
    @Transactional
    public AssistantDTO assignAssistantToDoctor(UUID assistantUserId, UUID doctorId) {
        User user = userRepository.findById(assistantUserId)
                .orElseThrow(() -> new RuntimeException("User not found"));
        
        if (user.getRole() != Role.ASSISTANT) {
            throw new RuntimeException("User is not an assistant");
        }
        
        DoctorProfile doctor = doctorRepository.findById(doctorId)
                .orElseThrow(() -> new RuntimeException("Doctor not found"));
        
        Assistant assistant = assistantRepository.findByUserId(assistantUserId)
                .orElseGet(() -> {
                    Assistant newAssistant = new Assistant();
                    newAssistant.setUser(user);
                    return newAssistant;
                });
        
        // Check if already assigned to another doctor
        if (assistant.getAssignedDoctor() != null && 
            !assistant.getAssignedDoctor().getId().equals(doctorId)) {
            throw new RuntimeException("Assistant is already assigned to another doctor");
        }
        
        assistant.setAssignedDoctor(doctor);
        assistant = assistantRepository.save(assistant);
        
        return convertToDTO(assistant);
    }
    
    @Transactional
    public void removeAssistantFromDoctor(UUID assistantUserId, UUID doctorId) {
        Assistant assistant = assistantRepository.findByUserId(assistantUserId)
                .orElseThrow(() -> new RuntimeException("Assistant not found"));
        
        if (assistant.getAssignedDoctor() == null || 
            !assistant.getAssignedDoctor().getId().equals(doctorId)) {
            throw new AccessDeniedException("This assistant is not assigned to you");
        }
        
        assistant.setAssignedDoctor(null);
        assistantRepository.save(assistant);
    }

    @Transactional
    public AssistantDTO setAssistantActiveForDoctor(UUID assistantUserId, UUID doctorId, boolean active) {
        Assistant assistant = assistantRepository.findByUserId(assistantUserId)
                .orElseThrow(() -> new RuntimeException("Assistant not found"));

        if (assistant.getAssignedDoctor() == null ||
                !assistant.getAssignedDoctor().getId().equals(doctorId)) {
            throw new AccessDeniedException("This assistant is not assigned to you");
        }

        User user = assistant.getUser();
        user.setIsActive(active);
        userRepository.save(user);

        return convertToDTO(assistant);
    }
    
    @Transactional
    public AssistantDTO updateAssistantProfile(UUID userId, AssistantDTO assistantDTO) {
        Assistant assistant = assistantRepository.findByUserId(userId)
                .orElseThrow(() -> new RuntimeException("Assistant not found"));

        if (assistantDTO.getEmployeeId() != null) assistant.setEmployeeId(assistantDTO.getEmployeeId());
        if (assistantDTO.getBio() != null) assistant.setBio(assistantDTO.getBio());
        if (assistantDTO.getAddress() != null) assistant.setAddress(assistantDTO.getAddress());
        if (assistantDTO.getGender() != null) assistant.setGender(assistantDTO.getGender());
        if (assistantDTO.getDateOfBirth() != null && !assistantDTO.getDateOfBirth().isBlank()) {
            try {
                assistant.setDateOfBirth(java.time.LocalDate.parse(assistantDTO.getDateOfBirth()));
            } catch (Exception ignored) {}
        }

        // Update user info
        User user = assistant.getUser();
        if (assistantDTO.getName() != null && !assistantDTO.getName().isBlank()) {
            user.setName(assistantDTO.getName());
        }
        if (assistantDTO.getPhoneNumber() != null) {
            user.setPhoneNumber(assistantDTO.getPhoneNumber());
        }
        userRepository.save(user);

        assistant = assistantRepository.save(assistant);
        return convertToDTO(assistant);
    }
    
    public AssistantDTO convertToDTO(Assistant assistant) {
        AssistantDTO dto = new AssistantDTO();
        dto.setId(assistant.getId());
        dto.setUserId(assistant.getUser().getId());
        dto.setName(assistant.getUser().getName());
        dto.setEmail(assistant.getUser().getEmail());
        dto.setPhoneNumber(assistant.getUser().getPhoneNumber());
        dto.setProfileImageUrl(assistant.getUser().getProfileImageUrl());
        dto.setEmployeeId(assistant.getEmployeeId());
        dto.setBio(assistant.getBio());
        dto.setAddress(assistant.getAddress());
        dto.setGender(assistant.getGender());
        dto.setDateOfBirth(assistant.getDateOfBirth() != null ? assistant.getDateOfBirth().toString() : null);
        dto.setIsActive(assistant.getUser().getIsActive());

        if (assistant.getAssignedDoctor() != null) {
            dto.setAssignedDoctorId(assistant.getAssignedDoctor().getId());
            dto.setAssignedDoctorName(assistant.getAssignedDoctor().getUser().getName());
        }

        return dto;
    }
}
