package com.vitabridge.service;

import com.vitabridge.model.Complaint;
import com.vitabridge.model.Role;
import com.vitabridge.model.User;
import com.vitabridge.repository.ComplaintRepository;
import com.vitabridge.repository.UserRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;

@SpringBootTest(properties = {
    "spring.datasource.url=jdbc:h2:mem:vitabridge_test_admin;DB_CLOSE_DELAY=-1;MODE=PostgreSQL;NON_KEYWORDS=YEAR",
    "spring.jpa.hibernate.ddl-auto=create-drop"
})
@ActiveProfiles("test")
class AdminServiceIntegrationTest {

    @Autowired
    private AdminService adminService;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private ComplaintRepository complaintRepository;

    @Test
    void deleteUser_removesLinkedComplaints_beforeDeletingUser() {
        User patient = new User();
        patient.setName("Delete Me");
        patient.setEmail("delete.me.test@example.com");
        patient.setPassword("encoded-password");
        patient.setRole(Role.PATIENT);
        patient.setIsActive(true);
        patient = userRepository.save(patient);

        Complaint complaint = new Complaint();
        complaint.setPatient(patient);
        complaint.setTitle("Test complaint");
        complaint.setMessage("This complaint should be deleted with user cleanup");
        complaintRepository.save(complaint);

        assertEquals(1, complaintRepository.findByPatientIdOrderByCreatedAtDesc(patient.getId()).size());

        adminService.deleteUser(patient.getId());

        assertFalse(userRepository.findById(patient.getId()).isPresent());
        assertEquals(0, complaintRepository.findByPatientIdOrderByCreatedAtDesc(patient.getId()).size());
    }
}
