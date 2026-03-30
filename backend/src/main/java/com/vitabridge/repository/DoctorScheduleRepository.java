package com.vitabridge.repository;

import com.vitabridge.model.DoctorSchedule;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface DoctorScheduleRepository extends JpaRepository<DoctorSchedule, UUID> {
    List<DoctorSchedule> findByDoctorId(UUID doctorId);
    List<DoctorSchedule> findByDoctorIdAndIsActive(UUID doctorId, Boolean isActive);
    List<DoctorSchedule> findByDoctorIdAndScheduleDateAndIsActive(UUID doctorId, LocalDate scheduleDate, Boolean isActive);
    Optional<DoctorSchedule> findByDoctorIdAndScheduleDate(UUID doctorId, LocalDate scheduleDate);
}
