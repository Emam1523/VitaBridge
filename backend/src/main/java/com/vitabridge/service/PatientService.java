package com.vitabridge.service;

import com.vitabridge.dto.PatientDTO;
import com.vitabridge.model.PatientProfile;
import com.vitabridge.repository.PatientRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Service
public class PatientService {
    
    @Autowired
    private PatientRepository patientRepository;
    
    public PatientDTO getPatientByUserId(UUID userId) {
        PatientProfile patient = patientRepository.findByUserId(userId)
                .orElseThrow(() -> new RuntimeException("Patient profile not found"));
        return convertToDTO(patient);
    }
    
    @Transactional
    public PatientDTO updatePatientProfile(UUID userId, PatientDTO patientDTO) {
        PatientProfile patient = patientRepository.findByUserId(userId)
                .orElseThrow(() -> new RuntimeException("Patient profile not found"));
        
        patient.setDateOfBirth(patientDTO.getDateOfBirth());
        patient.setGender(patientDTO.getGender());
        patient.setBloodGroup(patientDTO.getBloodGroup());
        patient.setAddress(patientDTO.getAddress());
        patient.setEmergencyContact(patientDTO.getEmergencyContact());
        patient.setEmergencyContactName(patientDTO.getEmergencyContactName());
        patient.setEmergencyContactRelation(patientDTO.getEmergencyContactRelation());
        patient.setPressureLevel(patientDTO.getPressureLevel());
        patient.setHeight(patientDTO.getHeight());
        patient.setWeight(patientDTO.getWeight());
        patient.setAllergies(patientDTO.getAllergies());
        patient.setMedicalHistory(patientDTO.getMedicalHistory());
        
        patient = patientRepository.save(patient);
        return convertToDTO(patient);
    }
    
    private PatientDTO convertToDTO(PatientProfile patient) {
        PatientDTO dto = new PatientDTO();
        dto.setId(patient.getId());
        dto.setUserId(patient.getUser().getId());
        dto.setName(patient.getUser().getName());
        dto.setEmail(patient.getUser().getEmail());
        dto.setPhoneNumber(patient.getUser().getPhoneNumber());
        dto.setDateOfBirth(patient.getDateOfBirth());
        dto.setGender(patient.getGender());
        dto.setBloodGroup(patient.getBloodGroup());
        dto.setAddress(patient.getAddress());
        dto.setEmergencyContact(patient.getEmergencyContact());
        dto.setEmergencyContactName(patient.getEmergencyContactName());
        dto.setEmergencyContactRelation(patient.getEmergencyContactRelation());
        dto.setPressureLevel(patient.getPressureLevel());
        dto.setHeight(patient.getHeight());
        dto.setWeight(patient.getWeight());
        dto.setAllergies(patient.getAllergies());
        dto.setMedicalHistory(patient.getMedicalHistory());
        return dto;
    }
}

