package com.vitabridge.service;

import com.vitabridge.dto.AdminProfileDTO;
import com.vitabridge.dto.AssistantAssignmentDTO;
import com.vitabridge.dto.CreateDoctorRequest;
import com.vitabridge.dto.DoctorDTO;
import com.vitabridge.dto.UserDTO;
import com.vitabridge.model.AdminProfile;
import com.vitabridge.model.Assistant;
import com.vitabridge.model.DoctorProfile;
import com.vitabridge.model.Role;
import com.vitabridge.model.User;
import com.vitabridge.repository.AdminProfileRepository;
import com.vitabridge.repository.AppointmentRepository;
import com.vitabridge.repository.AssistantRepository;
import com.vitabridge.repository.ChatMessageRepository;
import com.vitabridge.repository.ComplaintRepository;
import com.vitabridge.repository.DoctorRepository;
import com.vitabridge.repository.MedicalAccessRepository;
import com.vitabridge.repository.MedicalReportRepository;
import com.vitabridge.repository.PaymentRepository;
import com.vitabridge.repository.PrescriptionRepository;
import com.vitabridge.repository.ReviewRepository;
import com.vitabridge.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
public class AdminService {
    
    @Autowired
    private UserRepository userRepository;
    
    @Autowired
    private DoctorRepository doctorRepository;
    
    @Autowired
    private AssistantRepository assistantRepository;
    
    @Autowired
    private DoctorService doctorService;

    @Autowired
    private AdminProfileRepository adminProfileRepository;

    @Autowired
    private AppointmentRepository appointmentRepository;

    @Autowired
    private ChatMessageRepository chatMessageRepository;

    @Autowired
    private PrescriptionRepository prescriptionRepository;

    @Autowired
    private PaymentRepository paymentRepository;

    @Autowired
    private ReviewRepository reviewRepository;

    @Autowired
    private MedicalAccessRepository medicalAccessRepository;

    @Autowired
    private MedicalReportRepository medicalReportRepository;

    @Autowired
    private ComplaintRepository complaintRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;
    
    //  DOCTOR CREATION BY ADMIN 
    
    @Transactional
    public DoctorDTO createDoctor(CreateDoctorRequest request) {
        if (userRepository.existsByEmail(request.getEmail())) {
            throw new RuntimeException("Email already exists");
        }
        
        // Create user account with DOCTOR role
        User user = new User();
        user.setName(request.getName());
        user.setEmail(request.getEmail());
        user.setPassword(passwordEncoder.encode(request.getPassword()));
        user.setPhoneNumber(request.getPhoneNumber());
        user.setRole(Role.DOCTOR);
        user.setIsActive(true);
        
        // Create associated doctor profile
        DoctorProfile doctorProfile = new DoctorProfile();
        doctorProfile.setUser(user);
        doctorProfile.setSpecialty(request.getSpecialty() != null ? request.getSpecialty() : "General");
        doctorProfile.setLicenseNumber(request.getLicenseNumber());
        doctorProfile.setExperience(request.getExperience() != null ? request.getExperience() : "0 years");
        doctorProfile.setBio("");
        doctorProfile.setQualifications(new java.util.ArrayList<>());
        if (request.getConsultationFee() != null) {
            doctorProfile.setConsultationFee(request.getConsultationFee());
        }
        doctorProfile.setAvailability("Verified");
        doctorProfile.setImageUrl(null);
        doctorProfile.setRating(0.0);
        doctorProfile.setTotalReviews(0);
        
        user.setDoctorProfile(doctorProfile);
        user = userRepository.save(user);
        
        return doctorService.convertToDTO(user.getDoctorProfile());
    }
    
    public List<UserDTO> getAllUsers() {
        return userRepository.findAll().stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }
    
    public List<UserDTO> getUsersByRole(String role) {
        return userRepository.findByRole(Role.valueOf(role.toUpperCase())).stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }
    
    @Transactional
    public UserDTO toggleUserStatus(UUID userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));
        
        user.setIsActive(!user.getIsActive());
        user = userRepository.save(user);
        return convertToDTO(user);
    }
    
    @Transactional
    public void deleteUser(UUID userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));

        UUID doctorProfileId = user.getDoctorProfile() != null ? user.getDoctorProfile().getId() : null;
        UUID patientProfileId = user.getPatientProfile() != null ? user.getPatientProfile().getId() : null;

        // Collect all appointment IDs related to this user
        List<UUID> appointmentIds = new ArrayList<>();
        if (doctorProfileId != null) {
            appointmentRepository.findByDoctorId(doctorProfileId)
                    .forEach(a -> appointmentIds.add(a.getId()));
        }
        appointmentRepository.findByPatientId(userId)
                .forEach(a -> {
                    if (!appointmentIds.contains(a.getId())) {
                        appointmentIds.add(a.getId());
                    }
                });

        // Delete all records that reference appointments
        for (java.util.UUID appointmentId : appointmentIds) {
            chatMessageRepository.deleteByAppointmentId(appointmentId);
            prescriptionRepository.deleteByAppointmentId(appointmentId);
            paymentRepository.deleteByAppointmentId(appointmentId);
            reviewRepository.deleteByAppointmentId(appointmentId);
        }

        // Delete remaining reviews referencing doctor or patient directly
        if (doctorProfileId != null) {
            reviewRepository.deleteByDoctorId(doctorProfileId);
        }
        reviewRepository.deleteByPatientId(userId);

        // Delete medical reports
        if (doctorProfileId != null) {
            medicalReportRepository.deleteByDoctorId(doctorProfileId);
        }
        if (patientProfileId != null) {
            medicalReportRepository.deleteByPatientId(patientProfileId);
        }

        // Delete appointments
        if (doctorProfileId != null) {
            appointmentRepository.deleteByDoctorId(doctorProfileId);
        }
        appointmentRepository.deleteByPatientId(userId);

        // Null out assistant assignments to this doctor (assigned_doctor_id FK → doctor_profiles)
        if (doctorProfileId != null) {
            List<Assistant> assignedAssistants = assistantRepository.findByAssignedDoctorId(doctorProfileId);
            for (Assistant assistant : assignedAssistants) {
                assistant.setAssignedDoctor(null);
                assistantRepository.save(assistant);
            }
        }

        // Delete medical access records (patient_id / doctor_id FK → users)
        medicalAccessRepository.deleteByPatientId(userId);
        medicalAccessRepository.deleteByDoctorId(userId);

        // Delete complaints submitted by this user (complaints.patient_id FK → users)
        complaintRepository.deleteByPatientId(userId);

        // Delete user (cascades to DoctorProfile→DoctorSchedules, PatientProfile→MedicalDocuments, Assistant, AdminProfile)
        userRepository.deleteById(userId);
    }
    
    @Transactional
    public void removeDoctor(UUID doctorId) {
        DoctorProfile doctor = doctorRepository.findById(doctorId)
                .orElseThrow(() -> new RuntimeException("Doctor not found"));
        
        // Deactivate user account instead of hard delete to preserve history
        User user = doctor.getUser();
        user.setIsActive(false);
        userRepository.save(user);
    }

    @Transactional
    public void restoreDoctor(UUID doctorId) {
        DoctorProfile doctor = doctorRepository.findById(doctorId)
                .orElseThrow(() -> new RuntimeException("Doctor not found"));
        User user = doctor.getUser();
        user.setIsActive(true);
        userRepository.save(user);
    }
    
    @Transactional
    public DoctorDTO verifyDoctor(UUID doctorId, boolean verified) {
        DoctorProfile doctor = doctorRepository.findById(doctorId)
                .orElseThrow(() -> new RuntimeException("Doctor not found"));
        
        // Set availability based on verification status
        doctor.setAvailability(verified ? "Verified" : "Pending Verification");
        doctor = doctorRepository.save(doctor);
        
        return doctorService.convertToDTO(doctor);
    }
    
    @Transactional
    public void removePatient(UUID userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));
        
        if (user.getRole() != Role.PATIENT) {
            throw new RuntimeException("User is not a patient");
        }
        
        // Deactivate user account instead of hard delete to preserve history
        user.setIsActive(false);
        userRepository.save(user);
    }
    
    // Admin Profile

    @Transactional(readOnly = true)
    public AdminProfileDTO getAdminProfile(UUID userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));
        AdminProfile profile = adminProfileRepository.findByUserId(userId).orElse(null);
        AdminProfileDTO dto = new AdminProfileDTO();
        dto.setId(profile != null ? profile.getId() : null);
        dto.setUserId(user.getId());
        dto.setName(user.getName());
        dto.setEmail(user.getEmail());
        dto.setPhoneNumber(user.getPhoneNumber());
        if (profile != null) {
            dto.setBio(profile.getBio());
            dto.setAddress(profile.getAddress());
            dto.setDateOfBirth(profile.getDateOfBirth() != null ? profile.getDateOfBirth().toString() : null);
            dto.setGender(profile.getGender());
            dto.setDepartment(profile.getDepartment());
            dto.setEducation(profile.getEducation() != null ? new ArrayList<>(profile.getEducation()) : new ArrayList<>());
        } else {
            dto.setEducation(new ArrayList<>());
        }
        return dto;
    }

    @Transactional
    public AdminProfileDTO updateAdminProfile(UUID userId, AdminProfileDTO dto) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));
        // Update User basic fields
        if (dto.getName() != null && !dto.getName().isBlank()) user.setName(dto.getName());
        if (dto.getPhoneNumber() != null) user.setPhoneNumber(dto.getPhoneNumber());
        user = userRepository.save(user);

        // Get or create AdminProfile
        AdminProfile profile = adminProfileRepository.findByUserId(userId).orElse(new AdminProfile());
        profile.setUser(user);
        if (dto.getBio() != null) profile.setBio(dto.getBio());
        if (dto.getAddress() != null) profile.setAddress(dto.getAddress());
        if (dto.getDateOfBirth() != null && !dto.getDateOfBirth().isBlank()) {
            profile.setDateOfBirth(LocalDate.parse(dto.getDateOfBirth()));
        }
        if (dto.getGender() != null) profile.setGender(dto.getGender());
        if (dto.getDepartment() != null) profile.setDepartment(dto.getDepartment());
        if (dto.getEducation() != null) {
            profile.getEducation().clear();
            profile.getEducation().addAll(dto.getEducation());
        }
        adminProfileRepository.save(profile);
        return getAdminProfile(userId);
    }

    private UserDTO convertToDTO(User user) {
        UserDTO dto = new UserDTO();
        dto.setId(user.getId());
        dto.setName(user.getName());
        dto.setEmail(user.getEmail());
        dto.setPhoneNumber(user.getPhoneNumber());
        dto.setRole(user.getRole().name());
        dto.setIsActive(user.getIsActive());
        return dto;
    }
    
    // Assistant-Doctor Assignments
    
    // Get all assistant-doctor assignments
    public List<AssistantAssignmentDTO> getAllAssistantAssignments() {
        List<Assistant> assistants = assistantRepository.findAll();
        List<AssistantAssignmentDTO> assignments = new ArrayList<>();
        
        for (Assistant assistant : assistants) {
            AssistantAssignmentDTO dto = convertToAssignmentDTO(assistant);
            assignments.add(dto);
        }
        
        return assignments;
    }
    
    // Get assistants assigned to a specific doctor
    public List<AssistantAssignmentDTO> getAssistantsByDoctor(UUID doctorId) {
        List<Assistant> assistants = assistantRepository.findByAssignedDoctorId(doctorId);
        return assistants.stream()
                .map(this::convertToAssignmentDTO)
                .collect(Collectors.toList());
    }
    
    // Get unassigned assistants
    public List<AssistantAssignmentDTO> getUnassignedAssistants() {
        List<Assistant> allAssistants = assistantRepository.findAll();
        return allAssistants.stream()
                .filter(assistant -> assistant.getAssignedDoctor() == null)
                .map(this::convertToAssignmentDTO)
                .collect(Collectors.toList());
    }
    
    private AssistantAssignmentDTO convertToAssignmentDTO(Assistant assistant) {
        AssistantAssignmentDTO dto = new AssistantAssignmentDTO();
        dto.setAssistantId(assistant.getId());
        dto.setUserId(assistant.getUser().getId());
        dto.setAssistantName(assistant.getUser().getName());
        dto.setAssistantEmail(assistant.getUser().getEmail());
        dto.setAssistantPhone(assistant.getUser().getPhoneNumber());
        dto.setEmployeeId(assistant.getEmployeeId());
        dto.setIsActive(assistant.getUser().getIsActive());
        
        if (assistant.getAssignedDoctor() != null) {
            dto.setDoctorId(assistant.getAssignedDoctor().getId());
            dto.setDoctorName(assistant.getAssignedDoctor().getUser().getName());
            dto.setDoctorSpecialty(assistant.getAssignedDoctor().getSpecialty());
        }
        
        return dto;
    }
}
