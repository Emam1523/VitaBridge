package com.vitabridge.service;

import com.itextpdf.kernel.colors.ColorConstants;
import com.itextpdf.kernel.colors.DeviceRgb;
import com.itextpdf.kernel.geom.PageSize;
import com.itextpdf.kernel.pdf.PdfDocument;
import com.itextpdf.kernel.pdf.PdfWriter;
import com.itextpdf.kernel.pdf.canvas.draw.SolidLine;
import com.itextpdf.layout.Document;
import com.itextpdf.layout.borders.Border;
import com.itextpdf.layout.borders.SolidBorder;
import com.itextpdf.layout.element.*;
import com.itextpdf.layout.properties.TextAlignment;
import com.itextpdf.layout.properties.UnitValue;
import com.vitabridge.model.*;
import org.springframework.stereotype.Service;

import java.io.FileOutputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.Period;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;

@Service
public class PrescriptionPdfService {

    private static final String UPLOAD_DIR = "uploads/documents";
    private static final DeviceRgb HEADER_TEXT = new DeviceRgb(32, 39, 53);
    private static final DeviceRgb LABEL_TEXT = new DeviceRgb(80, 86, 99);
    private static final DeviceRgb LIGHT_LINE = new DeviceRgb(210, 214, 220);
    private static final DateTimeFormatter DATE_FMT = DateTimeFormatter.ofPattern("dd/MM/yyyy");
    private static final DateTimeFormatter DATETIME_FMT = DateTimeFormatter.ofPattern("dd MMM yyyy, hh:mm a");

    public String generatePrescriptionPdf(Prescription prescription, Appointment appointment) {
        try {
            Path uploadPath = Paths.get(UPLOAD_DIR);
            if (!Files.exists(uploadPath)) {
                Files.createDirectories(uploadPath);
            }

            String dateStr = LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyyMMdd_HHmmss"));
            String filename = String.format("Prescription_%s_%s.pdf", appointment.getId(), dateStr);
            String filepath = UPLOAD_DIR + "/" + filename;

            PdfWriter writer = new PdfWriter(new FileOutputStream(filepath));
            PdfDocument pdf = new PdfDocument(writer);
            Document document = new Document(pdf, PageSize.A4);
            document.setMargins(26, 24, 24, 24);

            addLetterhead(document, appointment);
            addPatientRow(document, appointment, prescription);
            addPrescriptionBody(document, appointment, prescription);
            addSignatureArea(document, appointment, prescription);
            addFooter(document, appointment);

            document.close();

            return "/" + filepath;
        } catch (Exception e) {
            throw new RuntimeException("Failed to generate prescription PDF: " + e.getMessage(), e);
        }
    }

    private void addLetterhead(Document document, Appointment appointment) {
        DoctorProfile doctor = appointment.getDoctor();
        String doctorName = formatDoctorName(doctor);
        String qualifications = doctor.getQualifications() != null && !doctor.getQualifications().isEmpty()
                ? String.join(", ", doctor.getQualifications()) : "";
        String specialty = safe(doctor.getSpecialty(), "General Medicine");
        String licenseNumber = safe(doctor.getLicenseNumber(), "N/A");
        String hospitalName = safe(doctor.getHospitalName(), "VitaBridge Healthcare");
        String contact = safe(doctor.getUser().getPhoneNumber(), "N/A");

        Table headerTable = new Table(UnitValue.createPercentArray(new float[]{42, 16, 42}))
                .useAllAvailableWidth()
                .setMarginBottom(8);

        Cell leftCell = new Cell().setBorder(Border.NO_BORDER).setPadding(0);
        leftCell.add(new Paragraph(doctorName).setBold().setFontSize(12).setFontColor(HEADER_TEXT));
        if (!qualifications.isBlank()) {
            leftCell.add(new Paragraph(qualifications).setFontSize(8).setMarginTop(1));
        }
        leftCell.add(new Paragraph(specialty).setFontSize(8).setMarginTop(1));
        leftCell.add(new Paragraph("Reg No: " + licenseNumber).setFontSize(8).setMarginTop(1));
        leftCell.add(new Paragraph(hospitalName).setFontSize(8).setMarginTop(1));
        leftCell.add(new Paragraph("Contact: " + contact).setFontSize(8).setMarginTop(1));

        Cell centerCell = new Cell().setBorder(Border.NO_BORDER).setTextAlignment(TextAlignment.CENTER).setPadding(0);
        centerCell.add(new Paragraph("VITABRIDGE").setBold().setFontSize(14).setFontColor(HEADER_TEXT));
        centerCell.add(new Paragraph("MEDICAL PRESCRIPTION").setFontSize(8).setMarginTop(1));

        Cell rightCell = new Cell().setBorder(Border.NO_BORDER).setTextAlignment(TextAlignment.RIGHT).setPadding(0);
        rightCell.add(new Paragraph(doctorName).setBold().setFontSize(11).setFontColor(HEADER_TEXT));
        rightCell.add(new Paragraph(specialty).setFontSize(8).setMarginTop(1));
        rightCell.add(new Paragraph(hospitalName).setFontSize(8).setMarginTop(1));
        rightCell.add(new Paragraph("Reg No: " + licenseNumber).setFontSize(8).setMarginTop(1));

        headerTable.addCell(leftCell);
        headerTable.addCell(centerCell);
        headerTable.addCell(rightCell);

        document.add(headerTable);

        LineSeparator line = new LineSeparator(new SolidLine(1f));
        line.setStrokeColor(LIGHT_LINE);
        line.setMarginBottom(6);
        document.add(line);
    }

    private void addPatientRow(Document document, Appointment appointment, Prescription prescription) {
        User patient = appointment.getPatient();
        PatientProfile profile = patient.getPatientProfile();

        String name = safe(patient.getName(), "-");
        int age = profile != null && profile.getDateOfBirth() != null
                ? Period.between(profile.getDateOfBirth(), LocalDate.now()).getYears() : 0;
        String gender = profile != null ? safe(profile.getGender(), "-") : "-";
        String address = profile != null ? safe(profile.getAddress(), "-") : "-";
        String guardian = profile != null ? safe(profile.getEmergencyContactName(), "-") : "-";
        String patientId = patient.getId() != null ? patient.getId().toString().substring(0, 8) : "-";
        String bloodGroup = profile != null ? safe(profile.getBloodGroup(), "-") : "-";
        String dateStr = appointment.getAppointmentDate().format(DATE_FMT);
        String followUpNum = prescription.getFollowUpNumber() != null ? String.valueOf(prescription.getFollowUpNumber()) : "-";

        Table infoTable = new Table(UnitValue.createPercentArray(new float[]{50, 50}))
                .useAllAvailableWidth()
                .setBorder(new SolidBorder(LIGHT_LINE, 1f))
                .setMarginBottom(6);

        Cell leftCell = new Cell().setBorder(Border.NO_BORDER).setPadding(6);
        leftCell.add(fieldLine("Name", name));
        leftCell.add(fieldLine("Age", (age > 0 ? age + " years" : "-") + "   Gender: " + gender));
        leftCell.add(fieldLine("Guardian", guardian));
        leftCell.add(fieldLine("Address", address));

        Cell rightCell = new Cell().setBorder(Border.NO_BORDER).setPadding(6).setTextAlignment(TextAlignment.RIGHT);
        rightCell.add(fieldLine("Date", dateStr));
        rightCell.add(fieldLine("Patient ID", patientId));
        rightCell.add(fieldLine("Follow up", followUpNum));
        rightCell.add(fieldLine("Blood Group", bloodGroup));

        infoTable.addCell(leftCell);
        infoTable.addCell(rightCell);

        document.add(infoTable);

        LineSeparator separator = new LineSeparator(new SolidLine(0.8f));
        separator.setStrokeColor(LIGHT_LINE);
        separator.setMarginBottom(8);
        document.add(separator);
    }

    private void addPrescriptionBody(Document document, Appointment appointment, Prescription prescription) {
        PatientProfile profile = appointment.getPatient().getPatientProfile();
        String chiefComplaints = safe(prescription.getChiefComplaints(), safe(prescription.getDiagnosis(), "-"));
        String pastHistory = safe(prescription.getPastHistory(), profile != null ? safe(profile.getMedicalHistory(), "-") : "-");
        String drugHistory = safe(prescription.getDrugHistory(), "-");
        String examination = safe(prescription.getOnExamination(), "-");
        String diagnosis = safe(prescription.getDiagnosis(), "-");
        String allergy = profile != null ? safe(profile.getAllergies(), "-") : "-";

        Table bodyTable = new Table(UnitValue.createPercentArray(new float[]{44, 56}))
            .useAllAvailableWidth()
            .setBorder(new SolidBorder(LIGHT_LINE, 1f))
            .setMinHeight(430);

        Cell leftCell = new Cell()
                .setBorder(Border.NO_BORDER)
                .setBorderRight(new SolidBorder(LIGHT_LINE, 1f))
                .setPadding(8);
        addClinicalSection(leftCell, "C/C", chiefComplaints);
        addClinicalSection(leftCell, "P/H", pastHistory);
        addClinicalSection(leftCell, "D/H", drugHistory);
        addClinicalSection(leftCell, "Allergy", allergy);
        addClinicalSection(leftCell, "O/E", examination);
        addClinicalSection(leftCell, "Dx", diagnosis);

        Cell rightCell = new Cell().setBorder(Border.NO_BORDER).setPadding(8);
        rightCell.add(new Paragraph("R").setFontSize(18).setBold().setFontColor(HEADER_TEXT).setMarginBottom(4));
        addMedicationList(rightCell, prescription.getMedications());
        addRightSection(rightCell, "Advice", prescription.getAdvice());
        addRightSection(rightCell, "Investigations", prescription.getLabTests());
        addFollowupSection(rightCell, prescription);

        bodyTable.addCell(leftCell);
        bodyTable.addCell(rightCell);
        document.add(bodyTable);
    }

    private void addMedicationList(Cell rightCell, List<Medication> medications) {
        if (medications == null || medications.isEmpty()) {
            rightCell.add(new Paragraph("1) ______________________________").setFontSize(9).setMarginTop(2));
            rightCell.add(new Paragraph("2) ______________________________").setFontSize(9).setMarginTop(2));
            rightCell.add(new Paragraph("3) ______________________________").setFontSize(9).setMarginTop(2));
            return;
        }

        int index = 1;
        for (Medication med : medications) {
            rightCell.add(new Paragraph(index + ") " + formatMedicationLine(med)).setFontSize(9).setMarginTop(2));
            index++;
        }
    }

    private void addFollowupSection(Cell rightCell, Prescription prescription) {
        String followUpDate = prescription.getFollowUpDate() != null
                ? prescription.getFollowUpDate().format(DATE_FMT)
                : null;
        String followInstruction = safe(prescription.getFollowUpInstruction(), null);
        String emergency = safe(prescription.getEmergencyInstruction(), null);

        if (followUpDate == null && followInstruction == null && emergency == null) {
            return;
        }

        rightCell.add(new Paragraph("Follow up").setBold().setFontSize(9).setFontColor(LABEL_TEXT).setMarginTop(10).setMarginBottom(2));
        if (followUpDate != null) {
            rightCell.add(new Paragraph("Date: " + followUpDate).setFontSize(9).setMarginTop(1));
        }
        if (followInstruction != null) {
            rightCell.add(new Paragraph(followInstruction).setFontSize(9).setMarginTop(1));
        }
        if (emergency != null) {
            rightCell.add(new Paragraph("Emergency: " + emergency).setFontSize(9).setMarginTop(1));
        }
    }

    private void addSignatureArea(Document document, Appointment appointment, Prescription prescription) {
        document.add(new Paragraph("\n"));

        Table signatureTable = new Table(UnitValue.createPercentArray(new float[]{60, 40}))
                .useAllAvailableWidth();

        Cell leftCell = new Cell().setBorder(Border.NO_BORDER).setPadding(0);
        LocalDateTime generatedAt = prescription.getCreatedAt() != null ? prescription.getCreatedAt() : LocalDateTime.now();
        leftCell.add(new Paragraph("Generated on: " + generatedAt.format(DATETIME_FMT))
                .setFontSize(8)
                .setFontColor(ColorConstants.GRAY));

        Cell rightCell = new Cell().setBorder(Border.NO_BORDER).setTextAlignment(TextAlignment.RIGHT).setPadding(0);
        rightCell.add(new Paragraph("________________________").setFontSize(10).setMarginBottom(2));
        rightCell.add(new Paragraph(formatDoctorName(appointment.getDoctor())).setBold().setFontSize(10));
        rightCell.add(new Paragraph(safe(appointment.getDoctor().getSpecialty(), "-")).setFontSize(8).setFontColor(ColorConstants.GRAY).setMarginTop(1));
        rightCell.add(new Paragraph("Reg No: " + safe(appointment.getDoctor().getLicenseNumber(), "N/A")).setFontSize(8).setFontColor(ColorConstants.GRAY).setMarginTop(1));

        signatureTable.addCell(leftCell);
        signatureTable.addCell(rightCell);
        document.add(signatureTable);
    }

    private void addFooter(Document document, Appointment appointment) {
        document.add(new Paragraph("\n"));

        Table footer = new Table(1)
                .useAllAvailableWidth()
                .setBorder(new SolidBorder(LIGHT_LINE, 1f));

        String hospitalName = safe(appointment.getDoctor().getHospitalName(), "VitaBridge Healthcare");
        String doctorPhone = safe(appointment.getDoctor().getUser().getPhoneNumber(), "N/A");

        footer.addCell(new Cell().setBorder(Border.NO_BORDER).setPadding(6)
                .add(new Paragraph("This is a digitally generated prescription. Verify patient and medicine details before dispensing.")
                        .setFontSize(8)
                        .setTextAlignment(TextAlignment.CENTER))
                .add(new Paragraph(hospitalName + " | Contact: " + doctorPhone)
                        .setFontSize(8)
                        .setFontColor(ColorConstants.GRAY)
                        .setTextAlignment(TextAlignment.CENTER)
                        .setMarginTop(2)));

        document.add(footer);
    }

    private void addClinicalSection(Cell target, String label, String value) {
        target.add(new Paragraph(label + ":")
                .setBold()
                .setFontSize(9)
                .setFontColor(LABEL_TEXT)
                .setMarginTop(6)
                .setMarginBottom(2));
        target.add(new Paragraph(safe(value, "-"))
                .setFontSize(9)
                .setMarginTop(0)
                .setMarginBottom(2));
    }

    private void addRightSection(Cell target, String label, String value) {
        if (value == null || value.isBlank()) {
            return;
        }
        target.add(new Paragraph(label)
                .setBold()
                .setFontSize(9)
                .setFontColor(LABEL_TEXT)
                .setMarginTop(10)
                .setMarginBottom(2));
        target.add(new Paragraph(value)
                .setFontSize(9)
                .setMarginTop(1));
    }

    private Paragraph fieldLine(String label, String value) {
        return new Paragraph(label + ": " + safe(value, "-"))
                .setFontSize(9)
                .setMarginTop(1)
                .setMarginBottom(1);
    }

    private String formatMedicationLine(Medication med) {
        List<String> details = new ArrayList<>();
        if (med.getDosage() != null && !med.getDosage().isBlank()) details.add(med.getDosage());
        if (med.getQuantity() != null && !med.getQuantity().isBlank()) details.add("Qty: " + med.getQuantity());
        if (med.getFrequency() != null && !med.getFrequency().isBlank()) details.add(med.getFrequency());
        if (med.getDuration() != null && !med.getDuration().isBlank()) details.add("for " + med.getDuration());
        if (med.getInstructions() != null && !med.getInstructions().isBlank()) details.add(med.getInstructions());

        String base = safe(med.getName(), "Medicine");
        if (details.isEmpty()) {
            return base;
        }
        return base + " - " + String.join(", ", details);
    }

    private String formatDoctorName(DoctorProfile doctor) {
        String doctorName = doctor != null && doctor.getUser() != null ? doctor.getUser().getName() : "Doctor";
        if (doctorName.toLowerCase().startsWith("dr.")) {
            return doctorName;
        }
        return "Dr. " + doctorName;
    }

    private String safe(String value, String fallback) {
        if (value == null || value.isBlank()) {
            return fallback;
        }
        return value;
    }
}
