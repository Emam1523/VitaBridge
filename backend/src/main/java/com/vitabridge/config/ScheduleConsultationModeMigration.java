package com.vitabridge.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

@Component
public class ScheduleConsultationModeMigration implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(ScheduleConsultationModeMigration.class);

    private final JdbcTemplate jdbcTemplate;

    @Value("${spring.datasource.url:}")
    private String datasourceUrl;

    public ScheduleConsultationModeMigration(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    @Override
    public void run(ApplicationArguments args) {
        if (datasourceUrl == null || !datasourceUrl.toLowerCase().contains("postgresql")) {
            return;
        }

        try {
            jdbcTemplate.execute("ALTER TABLE public.doctor_schedules ADD COLUMN IF NOT EXISTS consultation_mode VARCHAR(16)");
            jdbcTemplate.execute("UPDATE public.doctor_schedules SET consultation_mode = 'BOTH' WHERE consultation_mode IS NULL");
            jdbcTemplate.execute("ALTER TABLE public.doctor_schedules ALTER COLUMN consultation_mode SET DEFAULT 'BOTH'");
            jdbcTemplate.execute("ALTER TABLE public.doctor_schedules ALTER COLUMN consultation_mode SET NOT NULL");
            log.info("Checked migration for doctor_schedules.consultation_mode");
        } catch (Exception ex) {
            log.warn("Could not migrate doctor_schedules.consultation_mode", ex);
        }
    }
}
