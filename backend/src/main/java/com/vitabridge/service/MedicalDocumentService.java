package com.vitabridge.service;

import com.vitabridge.model.MedicalDocument;
import com.vitabridge.model.PatientProfile;
import com.vitabridge.repository.MedicalDocumentRepository;
import com.vitabridge.repository.PatientRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
public class MedicalDocumentService {
    
    @Autowired
    private MedicalDocumentRepository documentRepository;
    
    @Autowired
    private PatientRepository patientRepository;
    
    public List<MedicalDocument> getDocumentsByPatientId(UUID patientId) {
        return documentRepository.findByPatientIdOrderByUploadedAtDesc(patientId);
    }

    public List<MedicalDocument> getPatientUploadedDocuments(UUID patientId) {
        return documentRepository.findByPatientIdAndSourceOrderByUploadedAtDesc(patientId, "PATIENT");
    }

    public long countPatientDocuments(UUID patientId) {
        return documentRepository.countByPatientIdAndSource(patientId, "PATIENT");
    }
    
    public MedicalDocument getDocumentById(UUID documentId) {
        return documentRepository.findById(documentId)
                .orElseThrow(() -> new RuntimeException("Document not found"));
    }
    
    @Transactional
    public MedicalDocument uploadDocument(UUID patientUserId, MedicalDocument document) {
        PatientProfile patient = patientRepository.findByUserId(patientUserId)
                .orElseThrow(() -> new RuntimeException("Patient profile not found"));
        
        document.setPatient(patient);
        if (document.getSource() == null) {
            document.setSource("PATIENT");
        }
        return documentRepository.save(document);
    }
    
    @Transactional
    public void deleteDocument(UUID patientUserId, UUID documentId) {
        MedicalDocument document = documentRepository.findById(documentId)
                .orElseThrow(() -> new RuntimeException("Document not found"));
        
        if (!document.getPatient().getUser().getId().equals(patientUserId)) {
            throw new AccessDeniedException("You can only delete your own documents");
        }

        // Patients cannot delete prescription PDFs
        if ("PRESCRIPTION".equals(document.getSource())) {
            throw new AccessDeniedException("You cannot delete prescription documents");
        }
        
        documentRepository.delete(document);
    }
    
    // For doctor to access patient documents during consultation
    public List<MedicalDocument> getPatientDocumentsForDoctor(UUID patientUserId) {
        PatientProfile patient = patientRepository.findByUserId(patientUserId)
                .orElseThrow(() -> new RuntimeException("Patient profile not found"));
        return documentRepository.findByPatientIdOrderByUploadedAtDesc(patient.getId());
    }
}
