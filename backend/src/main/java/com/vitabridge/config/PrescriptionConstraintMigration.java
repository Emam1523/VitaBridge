package com.vitabridge.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

@Component
public class PrescriptionConstraintMigration implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(PrescriptionConstraintMigration.class);

    private final JdbcTemplate jdbcTemplate;

    @Value("${spring.datasource.url:}")
    private String datasourceUrl;

    public PrescriptionConstraintMigration(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    @Override
    public void run(ApplicationArguments args) {
        // This legacy constraint blocks multiple prescriptions per appointment.
        // Run only for PostgreSQL datasources.
        if (datasourceUrl == null || !datasourceUrl.toLowerCase().contains("postgresql")) {
            return;
        }

        try {
            jdbcTemplate.execute("ALTER TABLE public.prescriptions DROP CONSTRAINT IF EXISTS prescriptions_appointment_id_key");
            log.info("Checked legacy constraint: prescriptions_appointment_id_key");
        } catch (Exception ex) {
            log.warn("Could not check/drop legacy prescriptions constraint", ex);
        }
    }
}
