package com.vitabridge.service;

import com.vitabridge.dto.DoctorDTO;
import com.vitabridge.dto.EducationDTO;
import com.vitabridge.model.DoctorProfile;
import com.vitabridge.model.Education;
import com.vitabridge.model.Review;
import com.vitabridge.model.Role;
import com.vitabridge.model.User;
import com.vitabridge.repository.DoctorRepository;
import com.vitabridge.repository.DoctorScheduleRepository;
import com.vitabridge.repository.ReviewRepository;
import com.vitabridge.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
public class DoctorService {
    
    @Autowired
    private DoctorRepository doctorRepository;

    @Autowired
    private UserRepository userRepository;
    
    @Autowired
    private ReviewRepository reviewRepository;

    @Autowired
    private DoctorScheduleRepository scheduleRepository;
    
    public Map<String, Long> getPublicStats() {
        long doctorCount = doctorRepository.count();
        long patientCount = userRepository.countByRole(Role.PATIENT);
        return Map.of("doctorCount", doctorCount, "patientCount", patientCount);
    }

    @Transactional(readOnly = true)
    public List<DoctorDTO> getAllDoctors() {
        return doctorRepository.findAll().stream()
                .filter(d -> Boolean.TRUE.equals(d.getUser().getIsActive()))
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<DoctorDTO> getAllDoctorsForAdmin() {
        return doctorRepository.findAll().stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }
    
    @Transactional(readOnly = true)
    public DoctorDTO getDoctorById(UUID id) {
        DoctorProfile doctor = doctorRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Doctor not found"));
        if (!Boolean.TRUE.equals(doctor.getUser().getIsActive())) {
            throw new RuntimeException("Doctor not found");
        }
        return convertToDTO(doctor);
    }
    
    @Transactional(readOnly = true)
    public DoctorDTO getDoctorByUserId(UUID userId) {
        DoctorProfile doctor = doctorRepository.findByUserId(userId)
                .orElseThrow(() -> new RuntimeException("Doctor profile not found"));
        return convertToDTO(doctor);
    }
    
    public List<DoctorDTO> getDoctorsBySpecialty(String specialty) {
        return doctorRepository.findBySpecialty(specialty).stream()
                .filter(d -> Boolean.TRUE.equals(d.getUser().getIsActive()))
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }
    
    public List<DoctorDTO> searchDoctors(String query) {
        return doctorRepository.searchDoctors(query).stream()
                .filter(d -> Boolean.TRUE.equals(d.getUser().getIsActive()))
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }
    
    public List<String> getAllSpecialties() {
        return doctorRepository.findAllSpecialties();
    }
    
    @Transactional
    public DoctorDTO updateDoctorProfile(UUID userId, DoctorDTO doctorDTO) {
        DoctorProfile doctor = doctorRepository.findByUserId(userId)
                .orElseThrow(() -> new RuntimeException("Doctor profile not found"));

        // Update user-level fields
        User user = doctor.getUser();
        if (doctorDTO.getName() != null && !doctorDTO.getName().isBlank()) {
            user.setName(doctorDTO.getName());
        }
        if (doctorDTO.getPhoneNumber() != null) {
            user.setPhoneNumber(doctorDTO.getPhoneNumber());
        }
        userRepository.save(user);

        // Update doctor profile fields
        if (doctorDTO.getSpecialty() != null) doctor.setSpecialty(doctorDTO.getSpecialty());
        if (doctorDTO.getBio() != null) doctor.setBio(doctorDTO.getBio());
        if (doctorDTO.getExperience() != null) doctor.setExperience(doctorDTO.getExperience());
        if (doctorDTO.getConsultationFee() != null) doctor.setConsultationFee(doctorDTO.getConsultationFee());
        if (doctorDTO.getImageUrl() != null) doctor.setImageUrl(doctorDTO.getImageUrl());
        if (doctorDTO.getLicenseNumber() != null) doctor.setLicenseNumber(doctorDTO.getLicenseNumber());

        // Update qualifications — use clear()+addAll() so Hibernate tracks the change in the managed collection
        if (doctorDTO.getQualifications() != null) {
            doctor.getQualifications().clear();
            doctor.getQualifications().addAll(doctorDTO.getQualifications());
        }

        // Update structured education — same pattern: clear existing, re-add incoming
        if (doctorDTO.getEducation() != null) {
            List<Education> eduList = doctorDTO.getEducation().stream()
                    .map(e -> new Education(e.getDegree(), e.getInstitute(), e.getYear()))
                    .collect(Collectors.toList());
            doctor.getEducation().clear();
            doctor.getEducation().addAll(eduList);
        }
        
        doctor = doctorRepository.save(doctor);
        return convertToDTO(doctor);
    }
    
    @Transactional
    public void updateDoctorRating(UUID doctorId) {
        List<Review> reviews = reviewRepository.findByDoctorId(doctorId);
        
        if (!reviews.isEmpty()) {
            double averageRating = reviews.stream()
                    .mapToDouble(Review::getRating)
                    .average()
                    .orElse(0.0);
            
            DoctorProfile doctor = doctorRepository.findById(doctorId)
                    .orElseThrow(() -> new RuntimeException("Doctor not found"));
            
            doctor.setRating(averageRating);
            doctor.setTotalReviews(reviews.size());
            doctorRepository.save(doctor);
        }
    }
    
    public DoctorDTO convertToDTO(DoctorProfile doctor) {
        DoctorDTO dto = new DoctorDTO();
        dto.setId(doctor.getId());
        dto.setUserId(doctor.getUser().getId());
        dto.setName(doctor.getUser().getName());
        dto.setEmail(doctor.getUser().getEmail());
        dto.setPhoneNumber(doctor.getUser().getPhoneNumber());
        dto.setSpecialty(doctor.getSpecialty());
        dto.setExperience(doctor.getExperience());
        dto.setBio(doctor.getBio());
        dto.setQualifications(doctor.getQualifications() != null ? new ArrayList<>(doctor.getQualifications()) : new ArrayList<>());
        dto.setEducation(doctor.getEducation() != null
                ? doctor.getEducation().stream()
                        .map(e -> new EducationDTO(e.getDegree(), e.getInstitute(), e.getYear()))
                        .collect(Collectors.toList())
                : new ArrayList<>());
        dto.setConsultationFee(doctor.getConsultationFee());
        dto.setImageUrl(doctor.getImageUrl());
        dto.setProfileImageUrl(doctor.getUser().getProfileImageUrl());

        // Available when any active schedule exists for today (before end time) or any future date.
        // Becomes Unavailable once today's schedule end time passes, or when stopped/deleted.
        LocalDate today = LocalDate.now();
        LocalTime now = LocalTime.now();

        boolean isAvailable = scheduleRepository
                .findByDoctorIdAndIsActive(doctor.getId(), true)
                .stream()
                .anyMatch(schedule -> {
                    LocalDate scheduleDate = schedule.getScheduleDate();

                    // Future date → available as soon as the schedule is created
                    if (scheduleDate.isAfter(today)) {
                        return true;
                    }

                    // Today → available from schedule creation until end time passes
                    if (scheduleDate.isEqual(today)) {
                        return !now.isAfter(schedule.getEndTime());
                    }

                    // Past date → not available
                    return false;
                });

        dto.setAvailability(isAvailable ? "Available" : "Unavailable");

        dto.setRating(doctor.getRating());
        dto.setTotalReviews(doctor.getTotalReviews());
        dto.setLicenseNumber(doctor.getLicenseNumber());
        dto.setIsActive(doctor.getUser().getIsActive());
        return dto;
    }
}

