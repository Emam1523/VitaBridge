package com.vitabridge.service;

import com.vitabridge.dto.PrescriptionDTO;
import com.vitabridge.model.MedicalDocument;
import com.vitabridge.model.Appointment;
import com.vitabridge.model.Medication;
import com.vitabridge.model.Prescription;
import com.vitabridge.repository.MedicalDocumentRepository;
import com.vitabridge.repository.PrescriptionRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
public class PrescriptionService {
    
    @Autowired
    private PrescriptionRepository prescriptionRepository;

    @Autowired
    private MedicalDocumentRepository medicalDocumentRepository;

    @Transactional(readOnly = true)
    public Prescription getPrescriptionByAppointmentId(UUID appointmentId) {
        Prescription prescription = prescriptionRepository.findFirstByAppointmentIdOrderByCreatedAtDesc(appointmentId)
                .orElseThrow(() -> new RuntimeException("Prescription not found"));
        prescription.getMedications().size();
        return prescription;
    }

    @Transactional(readOnly = true)
    public Prescription getLatestPrescriptionByAppointmentIdOrNull(UUID appointmentId) {
        Prescription prescription = prescriptionRepository.findFirstByAppointmentIdOrderByCreatedAtDesc(appointmentId)
                .orElse(null);
        if (prescription != null) {
            prescription.getMedications().size();
        }
        return prescription;
    }

    @Transactional(readOnly = true)
    public List<Prescription> getPrescriptionsByPatientId(UUID patientUserId) {
        return prescriptionRepository.findByAppointmentPatientIdOrderByCreatedAtDesc(patientUserId);
    }

    @Transactional(readOnly = true)
    public List<PrescriptionDTO> getPrescriptionDTOsByPatientId(UUID patientUserId) {
        return getPrescriptionsByPatientId(patientUserId).stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<Prescription> getPrescriptionsByDoctorProfileId(UUID doctorProfileId) {
        return prescriptionRepository.findByAppointmentDoctorIdOrderByCreatedAtDesc(doctorProfileId);
    }

    @Transactional(readOnly = true)
    public List<PrescriptionDTO> getPrescriptionDTOsByDoctorProfileId(UUID doctorProfileId) {
        return getPrescriptionsByDoctorProfileId(doctorProfileId).stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }

    public PrescriptionDTO convertToDTO(Prescription p) {
        PrescriptionDTO dto = new PrescriptionDTO();
        dto.setId(p.getId());
        dto.setCreatedAt(p.getCreatedAt());
        dto.setDiagnosis(p.getDiagnosis());
        dto.setChiefComplaints(p.getChiefComplaints());
        dto.setPastHistory(p.getPastHistory());
        dto.setDrugHistory(p.getDrugHistory());
        dto.setOnExamination(p.getOnExamination());
        dto.setFollowUpNumber(p.getFollowUpNumber());
        dto.setFollowUpInstruction(p.getFollowUpInstruction());
        dto.setEmergencyInstruction(p.getEmergencyInstruction());
        dto.setLabTests(p.getLabTests());
        dto.setAdvice(p.getAdvice());
        dto.setFollowUpDate(p.getFollowUpDate() != null ? p.getFollowUpDate().toLocalDate() : null);

        Appointment apt = p.getAppointment();
        if (apt != null) {
            dto.setAppointmentId(apt.getId());
            if (apt.getPatient() != null) dto.setPatientName(apt.getPatient().getName());
            if (apt.getDoctor() != null && apt.getDoctor().getUser() != null) {
                dto.setDoctorName(apt.getDoctor().getUser().getName());
                dto.setDoctorSpecialty(apt.getDoctor().getSpecialty());
            }
            dto.setAppointmentDate(apt.getAppointmentDate());
        }

        if (p.getMedications() != null) {
            dto.setMedications(p.getMedications().stream().map(m -> {
                PrescriptionDTO.MedicationDTO md = new PrescriptionDTO.MedicationDTO();
                md.setName(m.getName());
                md.setDosage(m.getDosage());
                md.setQuantity(m.getQuantity());
                md.setFrequency(m.getFrequency());
                md.setDuration(m.getDuration());
                md.setInstructions(m.getInstructions());
                return md;
            }).collect(Collectors.toList()));
        }

        MedicalDocument linkedDocument = medicalDocumentRepository
            .findTopByPrescriptionIdOrderByUploadedAtDesc(p.getId())
            .orElseGet(() -> {
                if (p.getAppointment() == null) {
                return null;
                }
                return medicalDocumentRepository
                    .findTopByAppointmentIdAndSourceOrderByUploadedAtDesc(
                        p.getAppointment().getId(),
                        "PRESCRIPTION"
                    ).orElse(null);
            });
        if (linkedDocument != null) {
            dto.setPdfUrl(linkedDocument.getFileUrl());
        }

        return dto;
    }
    
    @Transactional
    public Prescription createPrescription(Prescription prescription) {
        return prescriptionRepository.save(prescription);
    }
    
    @Transactional
    public Prescription createOrReplacePrescriptionForAppointment(Appointment appointment, Prescription prescription) {
        List<Medication> validMeds = prescription.getMedications() == null ? new ArrayList<>()
                : prescription.getMedications().stream()
                        .filter(m -> m != null && m.getName() != null && !m.getName().trim().isEmpty())
                        .collect(Collectors.toList());

        // Each submission creates a new prescription version for history tracking.
        prescription.setId(null);
        prescription.setAppointment(appointment);
        prescription.setMedications(validMeds);
        return prescriptionRepository.saveAndFlush(prescription);
    }

    @Transactional
    public Prescription updatePrescription(Prescription existing, Prescription updates) {
        List<Medication> validMeds = updates.getMedications() == null ? new ArrayList<>()
                : updates.getMedications().stream()
                        .filter(m -> m != null && m.getName() != null && !m.getName().trim().isEmpty())
                        .collect(Collectors.toList());

        existing.setDiagnosis(updates.getDiagnosis());
        existing.setChiefComplaints(updates.getChiefComplaints());
        existing.setPastHistory(updates.getPastHistory());
        existing.setDrugHistory(updates.getDrugHistory());
        existing.setOnExamination(updates.getOnExamination());
        existing.setFollowUpNumber(updates.getFollowUpNumber());
        existing.setFollowUpInstruction(updates.getFollowUpInstruction());
        existing.setEmergencyInstruction(updates.getEmergencyInstruction());
        existing.setLabTests(updates.getLabTests());
        existing.setAdvice(updates.getAdvice());
        existing.setFollowUpDate(updates.getFollowUpDate());
        existing.setMedications(validMeds);

        return prescriptionRepository.saveAndFlush(existing);
    }
    
    @Transactional(readOnly = true)
    public Prescription getPrescriptionById(UUID id) {
        Prescription prescription = prescriptionRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Prescription not found"));
        prescription.getMedications().size();
        return prescription;
    }

    @Transactional(readOnly = true)
    public PrescriptionDTO getPrescriptionDTOById(UUID id) {
        Prescription prescription = prescriptionRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Prescription not found"));
        return convertToDTO(prescription);
    }
}
