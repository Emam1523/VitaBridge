package com.vitabridge.controller;

import com.vitabridge.dto.DoctorDTO;
import com.vitabridge.dto.ReviewDTO;
import com.vitabridge.dto.ScheduleDTO;
import com.vitabridge.model.DoctorSchedule;
import com.vitabridge.service.DoctorService;
import com.vitabridge.service.ReviewService;
import com.vitabridge.service.ScheduleService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/doctors")
public class DoctorController {
    
    @Autowired
    private DoctorService doctorService;

    @Autowired
    private ScheduleService scheduleService;

    @Autowired
    private ReviewService reviewService;
    
    @GetMapping("/stats")
    public ResponseEntity<Map<String, Long>> getPublicStats() {
        return ResponseEntity.ok(doctorService.getPublicStats());
    }

    @GetMapping
    public ResponseEntity<List<DoctorDTO>> getAllDoctors() {
        return ResponseEntity.ok(doctorService.getAllDoctors());
    }
    
    @GetMapping("/{id}")
    public ResponseEntity<DoctorDTO> getDoctorById(@PathVariable UUID id) {
        return ResponseEntity.ok(doctorService.getDoctorById(id));
    }
    
    @GetMapping("/specialty/{specialty}")
    public ResponseEntity<List<DoctorDTO>> getDoctorsBySpecialty(@PathVariable String specialty) {
        return ResponseEntity.ok(doctorService.getDoctorsBySpecialty(specialty));
    }
    
    @GetMapping("/search")
    public ResponseEntity<List<DoctorDTO>> searchDoctors(@RequestParam String q) {
        return ResponseEntity.ok(doctorService.searchDoctors(q));
    }
    
    @GetMapping("/specialties")
    public ResponseEntity<List<String>> getAllSpecialties() {
        return ResponseEntity.ok(doctorService.getAllSpecialties());
    }

    @GetMapping("/{id}/schedules")
    public ResponseEntity<List<ScheduleDTO>> getDoctorSchedules(@PathVariable UUID id) {
        List<DoctorSchedule> schedules = scheduleService.getDoctorSchedules(id);
        return ResponseEntity.ok(scheduleService.convertToDTO(schedules));
    }

    @GetMapping("/{id}/reviews")
    public ResponseEntity<List<ReviewDTO>> getDoctorReviews(@PathVariable UUID id) {
        return ResponseEntity.ok(reviewService.getReviewDTOsByDoctorId(id));
    }
}
