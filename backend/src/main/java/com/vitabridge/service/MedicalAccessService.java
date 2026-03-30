package com.vitabridge.service;

import com.vitabridge.model.MedicalAccess;
import com.vitabridge.model.User;
import com.vitabridge.repository.MedicalAccessRepository;
import com.vitabridge.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Service
public class MedicalAccessService {

    @Autowired
    private MedicalAccessRepository accessRepository;

    @Autowired
    private UserRepository userRepository;

    @Transactional
    public MedicalAccess grantAccess(UUID patientUserId, UUID doctorUserId) {
        User patient = userRepository.findById(patientUserId)
                .orElseThrow(() -> new RuntimeException("Patient not found"));
        User doctor = userRepository.findById(doctorUserId)
                .orElseThrow(() -> new RuntimeException("Doctor not found"));

        Optional<MedicalAccess> existing = accessRepository.findByPatientIdAndDoctorId(patientUserId, doctorUserId);
        if (existing.isPresent()) {
            MedicalAccess access = existing.get();
            access.setAccessGranted(true);
            access.setGrantedAt(LocalDateTime.now());
            access.setRevokedAt(null);
            return accessRepository.save(access);
        }

        MedicalAccess access = new MedicalAccess();
        access.setPatient(patient);
        access.setDoctor(doctor);
        access.setAccessGranted(true);
        access.setGrantedAt(LocalDateTime.now());
        return accessRepository.save(access);
    }

    @Transactional
    public MedicalAccess revokeAccess(UUID patientUserId, UUID doctorUserId) {
        MedicalAccess access = accessRepository.findByPatientIdAndDoctorId(patientUserId, doctorUserId)
                .orElseThrow(() -> new RuntimeException("Access record not found"));
        access.setAccessGranted(false);
        access.setRevokedAt(LocalDateTime.now());
        return accessRepository.save(access);
    }

    public boolean hasAccess(UUID patientUserId, UUID doctorUserId) {
        return accessRepository.existsByPatientIdAndDoctorIdAndAccessGrantedTrue(patientUserId, doctorUserId);
    }

    public List<MedicalAccess> getAccessListForPatient(UUID patientUserId) {
        return accessRepository.findByPatientId(patientUserId);
    }
}
