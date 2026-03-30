package com.vitabridge.repository;

import com.vitabridge.model.Appointment;
import com.vitabridge.model.AppointmentStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@Repository
public interface AppointmentRepository extends JpaRepository<Appointment, UUID> {
    List<Appointment> findByPatientId(UUID patientId);
    List<Appointment> findByDoctorId(UUID doctorId);
    List<Appointment> findByStatus(AppointmentStatus status);
    List<Appointment> findByPatientIdAndStatus(UUID patientId, AppointmentStatus status);
    List<Appointment> findByDoctorIdAndStatus(UUID doctorId, AppointmentStatus status);
    
    @Query("SELECT a FROM Appointment a WHERE a.doctor.id = :doctorId AND a.appointmentDate = :date")
    List<Appointment> findByDoctorIdAndDate(@Param("doctorId") UUID doctorId, @Param("date") LocalDate date);

    List<Appointment> findByAppointmentDate(LocalDate date);

    @Query("SELECT DISTINCT a.appointmentDate FROM Appointment a ORDER BY a.appointmentDate DESC")
    List<LocalDate> findDistinctAppointmentDates();
    
    @Query("SELECT a FROM Appointment a WHERE a.patient.id = :patientId AND a.appointmentDate >= :date ORDER BY a.appointmentDate, a.serialNumber")
    List<Appointment> findUpcomingAppointmentsByPatient(@Param("patientId") UUID patientId, @Param("date") LocalDate date);
    
    @Query("SELECT a FROM Appointment a WHERE a.doctor.id = :doctorId AND a.appointmentDate >= :date ORDER BY a.appointmentDate, a.serialNumber")
    List<Appointment> findUpcomingAppointmentsByDoctor(@Param("doctorId") UUID doctorId, @Param("date") LocalDate date);

    @Query("SELECT COUNT(a) FROM Appointment a WHERE a.doctor.id = :doctorId AND a.appointmentDate = :date AND a.consultationType = com.vitabridge.model.ConsultationType.OFFLINE AND a.status <> com.vitabridge.model.AppointmentStatus.CANCELLED")
    int countOfflineAppointments(@Param("doctorId") UUID doctorId, @Param("date") LocalDate date);

    @Query("SELECT COUNT(a) FROM Appointment a WHERE a.doctor.id = :doctorId AND a.appointmentDate = :date AND a.status <> com.vitabridge.model.AppointmentStatus.CANCELLED")
    int countAppointmentsByDoctorAndDate(@Param("doctorId") UUID doctorId, @Param("date") LocalDate date);

    @Query("SELECT COUNT(a) > 0 FROM Appointment a WHERE a.patient.id = :patientId AND a.doctor.id = :doctorId AND a.appointmentDate = :date AND a.status <> com.vitabridge.model.AppointmentStatus.CANCELLED")
    boolean existsActiveBookingByPatientAndDoctorAndDate(@Param("patientId") UUID patientId, @Param("doctorId") UUID doctorId, @Param("date") LocalDate date);

    @Query("SELECT COUNT(a) FROM Appointment a WHERE a.doctor.id = :doctorId AND a.appointmentDate = :date AND a.status = com.vitabridge.model.AppointmentStatus.CONFIRMED")
    int countConfirmedAppointmentsByDoctorAndDate(@Param("doctorId") UUID doctorId, @Param("date") LocalDate date);

    @Query("SELECT COALESCE(MAX(a.serialNumber), 0) FROM Appointment a WHERE a.doctor.id = :doctorId AND a.appointmentDate = :date")
    int findMaxSerialNumberByDoctorAndDate(@Param("doctorId") UUID doctorId, @Param("date") LocalDate date);

    void deleteByPatientId(UUID patientId);
    void deleteByDoctorId(UUID doctorId);
}
