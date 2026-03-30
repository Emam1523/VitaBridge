package com.vitabridge.service;

import com.vitabridge.dto.ReviewDTO;
import com.vitabridge.model.Appointment;
import com.vitabridge.model.Review;
import com.vitabridge.repository.AppointmentRepository;
import com.vitabridge.repository.ReviewRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
public class ReviewService {
    
    @Autowired
    private ReviewRepository reviewRepository;
    
    @Autowired
    private AppointmentRepository appointmentRepository;
    
    @Autowired
    private DoctorService doctorService;
    
    public List<Review> getReviewsByDoctorId(UUID doctorId) {
        return reviewRepository.findByDoctorId(doctorId);
    }

    public List<ReviewDTO> getReviewDTOsByDoctorId(UUID doctorId) {
        return reviewRepository.findByDoctorId(doctorId).stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }

    private ReviewDTO convertToDTO(Review review) {
        ReviewDTO dto = new ReviewDTO();
        dto.setId(review.getId());
        dto.setRating(review.getRating());
        dto.setComment(review.getComment());
        dto.setPatientName(review.getPatient() != null ? review.getPatient().getName() : "Patient");
        dto.setPatientId(review.getPatient() != null ? review.getPatient().getId() : null);
        dto.setCreatedAt(review.getCreatedAt());
        return dto;
    }
    
    public Review getReviewByAppointmentId(UUID appointmentId) {
        return reviewRepository.findByAppointmentId(appointmentId);
    }
    
    @Transactional
    public Review createReview(Review review) {
        review = reviewRepository.save(review);
        
        // Update doctor's rating
        doctorService.updateDoctorRating(review.getDoctor().getId());
        
        return review;
    }
    
    @Transactional
    public Review createReviewForAppointment(UUID appointmentId, Review review) {
        Appointment appointment = appointmentRepository.findById(appointmentId)
            .orElseThrow(() -> new RuntimeException("Appointment not found"));
        
        // Check if review already exists for this appointment
        Review existing = reviewRepository.findByAppointmentId(appointmentId);
        if (existing != null) {
            throw new RuntimeException("Review already exists for this appointment");
        }
        
        review.setAppointment(appointment);
        review.setDoctor(appointment.getDoctor());
        
        review = reviewRepository.save(review);
        
        // Update doctor's rating
        doctorService.updateDoctorRating(review.getDoctor().getId());
        
        return review;
    }
}
