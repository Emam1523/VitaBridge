package com.vitabridge.service;

import com.vitabridge.dto.ScheduleDTO;
import com.vitabridge.model.DoctorSchedule;
import com.vitabridge.repository.AppointmentRepository;
import com.vitabridge.repository.DoctorScheduleRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
public class ScheduleService {
    
    @Autowired
    private DoctorScheduleRepository scheduleRepository;

    @Autowired
    private AppointmentRepository appointmentRepository;
    
    public List<DoctorSchedule> getDoctorSchedules(UUID doctorId) {
        return scheduleRepository.findByDoctorId(doctorId);
    }

    public DoctorSchedule getScheduleById(UUID scheduleId) {
        return scheduleRepository.findById(scheduleId)
                .orElseThrow(() -> new RuntimeException("Schedule not found"));
    }
    
    @Transactional
    public DoctorSchedule createSchedule(DoctorSchedule schedule) {
        if (schedule.getMaxPatients() == null) {
            schedule.setMaxPatients(50);
        }
        // Always active on creation regardless of what the request body contained
        schedule.setIsActive(true);
        // Prevent duplicate schedules for the same doctor+date
        boolean exists = scheduleRepository
                .findByDoctorIdAndScheduleDate(schedule.getDoctor().getId(), schedule.getScheduleDate())
                .isPresent();
        if (exists) {
            throw new RuntimeException("A schedule already exists for this date. Please choose a different date.");
        }
        return scheduleRepository.save(schedule);
    }
    
    @Transactional
    public void deleteSchedule(UUID scheduleId) {
        DoctorSchedule schedule = scheduleRepository.findById(scheduleId)
                .orElseThrow(() -> new RuntimeException("Schedule not found"));
        scheduleRepository.delete(schedule);
    }

    @Transactional
    public ScheduleDTO stopSchedule(UUID scheduleId) {
        DoctorSchedule schedule = scheduleRepository.findById(scheduleId)
                .orElseThrow(() -> new RuntimeException("Schedule not found"));
        schedule.setIsActive(false);
        return convertToDTO(scheduleRepository.save(schedule));
    }

    @Transactional
    public ScheduleDTO resumeSchedule(UUID scheduleId) {
        DoctorSchedule schedule = scheduleRepository.findById(scheduleId)
                .orElseThrow(() -> new RuntimeException("Schedule not found"));
        schedule.setIsActive(true);
        return convertToDTO(scheduleRepository.save(schedule));
    }
    
    public ScheduleDTO convertToDTO(DoctorSchedule schedule) {
        ScheduleDTO dto = new ScheduleDTO();
        dto.setId(schedule.getId());
        dto.setScheduleDate(schedule.getScheduleDate());
        dto.setStartTime(schedule.getStartTime());
        dto.setEndTime(schedule.getEndTime());
        dto.setMaxPatients(schedule.getMaxPatients());
        dto.setIsActive(schedule.getIsActive());
        
        if (schedule.getDoctor() != null) {
            dto.setDoctorId(schedule.getDoctor().getId());
            dto.setDoctorName(schedule.getDoctor().getUser().getName());
            // Get current booked count for this schedule date
            int booked = appointmentRepository.countAppointmentsByDoctorAndDate(
                    schedule.getDoctor().getId(), schedule.getScheduleDate());
            dto.setBookedCount(booked);
        } else {
            dto.setBookedCount(0);
        }
        
        return dto;
    }
    
    public List<ScheduleDTO> convertToDTO(List<DoctorSchedule> schedules) {
        return schedules.stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }
}
