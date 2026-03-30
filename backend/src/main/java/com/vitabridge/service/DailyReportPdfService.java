package com.vitabridge.service;

import com.itextpdf.kernel.colors.ColorConstants;
import com.itextpdf.kernel.colors.DeviceRgb;
import com.itextpdf.kernel.geom.PageSize;
import com.itextpdf.kernel.pdf.PdfDocument;
import com.itextpdf.kernel.pdf.PdfWriter;
import com.itextpdf.layout.Document;
import com.itextpdf.layout.borders.Border;
import com.itextpdf.layout.borders.SolidBorder;
import com.itextpdf.layout.element.*;
import com.itextpdf.layout.properties.TextAlignment;
import com.itextpdf.layout.properties.UnitValue;
import com.itextpdf.layout.properties.VerticalAlignment;
import com.vitabridge.dto.AppointmentDTO;
import org.springframework.stereotype.Service;

import java.io.ByteArrayOutputStream;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class DailyReportPdfService {

    private static final DeviceRgb PRIMARY = new DeviceRgb(37, 99, 235);      
    private static final DeviceRgb PRIMARY_DARK = new DeviceRgb(29, 78, 216);  
    private static final DeviceRgb PRIMARY_LIGHT = new DeviceRgb(219, 234, 254); 
    private static final DeviceRgb ACCENT = new DeviceRgb(16, 185, 129);       
    private static final DeviceRgb ACCENT_LIGHT = new DeviceRgb(209, 250, 229); 
    private static final DeviceRgb WARNING = new DeviceRgb(245, 158, 11);      
    private static final DeviceRgb DANGER = new DeviceRgb(239, 68, 68);        
    private static final DeviceRgb DANGER_LIGHT = new DeviceRgb(254, 226, 226); 
    private static final DeviceRgb GRAY_50 = new DeviceRgb(249, 250, 251);
    private static final DeviceRgb GRAY_100 = new DeviceRgb(243, 244, 246);
    private static final DeviceRgb GRAY_200 = new DeviceRgb(229, 231, 235);
    private static final DeviceRgb GRAY_500 = new DeviceRgb(107, 114, 128);
    private static final DeviceRgb GRAY_700 = new DeviceRgb(55, 65, 81);
    private static final DeviceRgb GRAY_900 = new DeviceRgb(17, 24, 39);

    public byte[] generateDailyReport(String doctorName, String specialty, LocalDate date,
                                       List<AppointmentDTO> appointments) {
        try {
            ByteArrayOutputStream baos = new ByteArrayOutputStream();
            PdfWriter writer = new PdfWriter(baos);
            PdfDocument pdf = new PdfDocument(writer);
            Document doc = new Document(pdf, PageSize.A4);
            doc.setMargins(36, 36, 36, 36);

            addHeader(doc, doctorName, specialty, date);
            addSeparatorLine(doc);

            // Split into online and offline
            List<AppointmentDTO> onlineAppts = appointments.stream()
                    .filter(a -> "ONLINE".equals(a.getConsultationType()))
                    .collect(Collectors.toList());
            List<AppointmentDTO> offlineAppts = appointments.stream()
                    .filter(a -> !"ONLINE".equals(a.getConsultationType()))
                    .collect(Collectors.toList());

            // Online table
            if (!onlineAppts.isEmpty()) {
                addSectionTitle(doc, "ONLINE CONSULTATIONS", PRIMARY, onlineAppts.size());
                addPatientTable(doc, onlineAppts, true);
            } else {
                addSectionTitle(doc, "ONLINE CONSULTATIONS", PRIMARY, 0);
                addEmptyNote(doc, "No online consultations for this day.");
            }

            doc.add(new Paragraph("").setMarginBottom(12));

            // Offline table
            if (!offlineAppts.isEmpty()) {
                addSectionTitle(doc, "OFFLINE CONSULTATIONS", new DeviceRgb(124, 58, 237), offlineAppts.size());
                addPatientTable(doc, offlineAppts, false);
            } else {
                addSectionTitle(doc, "OFFLINE CONSULTATIONS", new DeviceRgb(124, 58, 237), 0);
                addEmptyNote(doc, "No offline consultations for this day.");
            }

            doc.add(new Paragraph("").setMarginBottom(16));
            addSeparatorLine(doc);

            // Summary Section
            addSummary(doc, appointments, date);

            // Footer
            addFooter(doc);

            doc.close();
            return baos.toByteArray();
        } catch (Exception e) {
            throw new RuntimeException("Failed to generate daily report PDF: " + e.getMessage(), e);
        }
    }

    private void addHeader(Document doc, String doctorName, String specialty, LocalDate date) {
        // Top accent bar
        Table topBar = new Table(UnitValue.createPercentArray(new float[]{1}))
                .useAllAvailableWidth()
                .setBorder(Border.NO_BORDER);
        Cell barCell = new Cell()
                .setBackgroundColor(PRIMARY)
                .setHeight(6)
                .setBorder(Border.NO_BORDER);
        topBar.addCell(barCell);
        doc.add(topBar);
        doc.add(new Paragraph("").setMarginBottom(8));

        // Brand + Date row
        Table header = new Table(UnitValue.createPercentArray(new float[]{3, 2}))
                .useAllAvailableWidth()
                .setBorder(Border.NO_BORDER);

        // Left: brand
        Cell leftCell = new Cell().setBorder(Border.NO_BORDER);
        leftCell.add(new Paragraph("VitaBridge Healthcare")
                .setFontSize(22).setBold().setFontColor(PRIMARY));
        leftCell.add(new Paragraph("Daily Appointment Report")
                .setFontSize(11).setFontColor(GRAY_500).setMarginTop(-2));
        header.addCell(leftCell);

        // Right: date badge
        Cell rightCell = new Cell().setBorder(Border.NO_BORDER)
                .setTextAlignment(TextAlignment.RIGHT)
                .setVerticalAlignment(VerticalAlignment.MIDDLE);
        String formattedDate = date.format(DateTimeFormatter.ofPattern("MMMM dd, yyyy"));
        rightCell.add(new Paragraph(formattedDate)
                .setFontSize(12).setBold().setFontColor(PRIMARY_DARK));
        rightCell.add(new Paragraph(date.getDayOfWeek().toString())
                .setFontSize(9).setFontColor(GRAY_500));
        header.addCell(rightCell);

        doc.add(header);
        doc.add(new Paragraph("").setMarginBottom(6));

        // Doctor info card
        Table doctorCard = new Table(UnitValue.createPercentArray(new float[]{1}))
                .useAllAvailableWidth()
                .setBorder(Border.NO_BORDER);
        Cell cardCell = new Cell()
                .setBackgroundColor(GRAY_50)
                .setBorder(new SolidBorder(GRAY_200, 1))
                .setBorderRadius(new com.itextpdf.layout.properties.BorderRadius(6))
                .setPadding(14);
        cardCell.add(new Paragraph("DOCTOR")
                .setFontSize(8).setBold().setFontColor(GRAY_500).setMarginBottom(2));
        cardCell.add(new Paragraph(doctorName)
                .setFontSize(16).setBold().setFontColor(GRAY_900).setMarginBottom(2));
        cardCell.add(new Paragraph(specialty != null ? specialty : "General")
                .setFontSize(10).setFontColor(PRIMARY));
        doctorCard.addCell(cardCell);
        doc.add(doctorCard);
        doc.add(new Paragraph("").setMarginBottom(10));
    }

    private void addSeparatorLine(Document doc) {
        Table sep = new Table(UnitValue.createPercentArray(new float[]{1}))
                .useAllAvailableWidth()
                .setBorder(Border.NO_BORDER);
        Cell sepCell = new Cell()
                .setBackgroundColor(GRAY_200)
                .setHeight(1)
                .setBorder(Border.NO_BORDER);
        sep.addCell(sepCell);
        doc.add(sep);
        doc.add(new Paragraph("").setMarginBottom(10));
    }

    private void addSectionTitle(Document doc, String title, DeviceRgb color, int count) {
        Table titleBar = new Table(UnitValue.createPercentArray(new float[]{4, 1}))
                .useAllAvailableWidth()
                .setBorder(Border.NO_BORDER);

        Cell titleCell = new Cell().setBorder(Border.NO_BORDER);
        titleCell.add(new Paragraph(title)
                .setFontSize(11).setBold().setFontColor(color));
        titleBar.addCell(titleCell);

        Cell countCell = new Cell().setBorder(Border.NO_BORDER)
                .setTextAlignment(TextAlignment.RIGHT);
        countCell.add(new Paragraph(count + " patient" + (count != 1 ? "s" : ""))
                .setFontSize(9).setFontColor(GRAY_500));
        titleBar.addCell(countCell);

        doc.add(titleBar);
        doc.add(new Paragraph("").setMarginBottom(6));
    }

    private void addPatientTable(Document doc, List<AppointmentDTO> appts, boolean isOnline) {
        float[] colWidths = {0.6f, 2.5f, 1.2f, 1.5f, 1.2f, 1.5f};
        Table table = new Table(UnitValue.createPercentArray(colWidths))
                .useAllAvailableWidth()
                .setBorder(Border.NO_BORDER);

        // Header row
        String[] headers = {"#", "Patient Name", "Gender", "Phone", "Status", "Payment"};
        for (String h : headers) {
            Cell hCell = new Cell()
                    .setBackgroundColor(PRIMARY)
                    .setPadding(8)
                    .setBorder(Border.NO_BORDER);
            hCell.add(new Paragraph(h)
                    .setFontSize(8).setBold().setFontColor(ColorConstants.WHITE)
                    .setTextAlignment(TextAlignment.CENTER));
            table.addHeaderCell(hCell);
        }

        // Data rows
        int idx = 1;
        for (AppointmentDTO apt : appts) {
            DeviceRgb rowBg = (idx % 2 == 0) ? GRAY_50 : ColorConstants.WHITE instanceof DeviceRgb ? (DeviceRgb) ColorConstants.WHITE : new DeviceRgb(255, 255, 255);

            table.addCell(createDataCell(String.valueOf(idx), rowBg, TextAlignment.CENTER));
            table.addCell(createDataCell(apt.getPatientName() != null ? apt.getPatientName() : "—", rowBg, TextAlignment.LEFT));
            table.addCell(createDataCell(apt.getPatientGender() != null ? apt.getPatientGender() : "—", rowBg, TextAlignment.CENTER));
            table.addCell(createDataCell(apt.getPatientPhone() != null ? apt.getPatientPhone() : "—", rowBg, TextAlignment.CENTER));

            // Status badge
            Cell statusCell = new Cell()
                    .setBackgroundColor(rowBg)
                    .setPadding(6)
                    .setBorder(Border.NO_BORDER)
                    .setBorderBottom(new SolidBorder(GRAY_100, 0.5f))
                    .setTextAlignment(TextAlignment.CENTER);
            String status = apt.getStatus() != null ? apt.getStatus() : "—";
            DeviceRgb statusColor = getStatusColor(status);
            statusCell.add(new Paragraph(status)
                    .setFontSize(8).setBold().setFontColor(statusColor));
            table.addCell(statusCell);

            // Payment badge
            Cell payCell = new Cell()
                    .setBackgroundColor(rowBg)
                    .setPadding(6)
                    .setBorder(Border.NO_BORDER)
                    .setBorderBottom(new SolidBorder(GRAY_100, 0.5f))
                    .setTextAlignment(TextAlignment.CENTER);
            String payStatus = apt.getPaymentStatus() != null ? apt.getPaymentStatus() : "PENDING";
            DeviceRgb payColor = "COMPLETED".equals(payStatus) ? ACCENT : WARNING;
            payCell.add(new Paragraph(payStatus)
                    .setFontSize(8).setBold().setFontColor(payColor));
            table.addCell(payCell);

            idx++;
        }

        // Add border around the whole table
        Table wrapper = new Table(UnitValue.createPercentArray(new float[]{1}))
                .useAllAvailableWidth()
                .setBorder(new SolidBorder(GRAY_200, 1));
        wrapper.addCell(new Cell().add(table).setBorder(Border.NO_BORDER).setPadding(0));
        doc.add(wrapper);
    }

    private Cell createDataCell(String text, DeviceRgb bg, TextAlignment align) {
        Cell cell = new Cell()
                .setBackgroundColor(bg)
                .setPadding(6)
                .setBorder(Border.NO_BORDER)
                .setBorderBottom(new SolidBorder(GRAY_100, 0.5f))
                .setTextAlignment(align);
        cell.add(new Paragraph(text).setFontSize(9).setFontColor(GRAY_700));
        return cell;
    }

    private void addEmptyNote(Document doc, String message) {
        Table noteBox = new Table(UnitValue.createPercentArray(new float[]{1}))
                .useAllAvailableWidth()
                .setBorder(Border.NO_BORDER);
        Cell noteCell = new Cell()
                .setBackgroundColor(GRAY_50)
                .setBorder(new SolidBorder(GRAY_200, 1))
                .setPadding(16)
                .setTextAlignment(TextAlignment.CENTER);
        noteCell.add(new Paragraph(message).setFontSize(10).setFontColor(GRAY_500).setItalic());
        noteBox.addCell(noteCell);
        doc.add(noteBox);
    }

    private void addSummary(Document doc, List<AppointmentDTO> appointments, LocalDate date) {
        doc.add(new Paragraph("DAILY SUMMARY")
                .setFontSize(12).setBold().setFontColor(GRAY_900).setMarginBottom(8));

        long totalPatients = appointments.size();
        long onlineCount = appointments.stream().filter(a -> "ONLINE".equals(a.getConsultationType())).count();
        long offlineCount = totalPatients - onlineCount;
        long completed = appointments.stream().filter(a -> "COMPLETED".equals(a.getStatus())).count();
        long cancelled = appointments.stream().filter(a -> "CANCELLED".equals(a.getStatus())).count();
        long confirmed = appointments.stream().filter(a -> "CONFIRMED".equals(a.getStatus())).count();
        long pending = appointments.stream().filter(a -> "PENDING".equals(a.getStatus())).count();
        double totalRevenue = appointments.stream()
                .filter(a -> "COMPLETED".equals(a.getPaymentStatus()))
                .mapToDouble(a -> a.getConsultationFee() != null ? a.getConsultationFee() : 0)
                .sum();

        // Summary cards - row 1
        Table row1 = new Table(UnitValue.createPercentArray(new float[]{1, 1, 1, 1}))
                .useAllAvailableWidth()
                .setBorder(Border.NO_BORDER);

        row1.addCell(createSummaryCard("Total Patients", String.valueOf(totalPatients), PRIMARY, PRIMARY_LIGHT));
        row1.addCell(createSummaryCard("Online", String.valueOf(onlineCount), PRIMARY, PRIMARY_LIGHT));
        row1.addCell(createSummaryCard("Offline", String.valueOf(offlineCount), new DeviceRgb(124, 58, 237), new DeviceRgb(237, 233, 254)));
        row1.addCell(createSummaryCard("Total Revenue", "BDT " + String.format("%.0f", totalRevenue), ACCENT, ACCENT_LIGHT));
        doc.add(row1);
        doc.add(new Paragraph("").setMarginBottom(6));

        // Summary cards - row 2
        Table row2 = new Table(UnitValue.createPercentArray(new float[]{1, 1, 1, 1}))
                .useAllAvailableWidth()
                .setBorder(Border.NO_BORDER);

        row2.addCell(createSummaryCard("Completed", String.valueOf(completed), ACCENT, ACCENT_LIGHT));
        row2.addCell(createSummaryCard("Confirmed", String.valueOf(confirmed), PRIMARY, PRIMARY_LIGHT));
        row2.addCell(createSummaryCard("Pending", String.valueOf(pending), WARNING, new DeviceRgb(254, 243, 199)));
        row2.addCell(createSummaryCard("Cancelled", String.valueOf(cancelled), DANGER, DANGER_LIGHT));
        doc.add(row2);
    }

    private Cell createSummaryCard(String label, String value, DeviceRgb textColor, DeviceRgb bgColor) {
        Cell card = new Cell()
                .setBackgroundColor(bgColor)
                .setBorder(Border.NO_BORDER)
                .setPadding(10)
                .setMargin(3)
                .setBorderRadius(new com.itextpdf.layout.properties.BorderRadius(6))
                .setTextAlignment(TextAlignment.CENTER);
        card.add(new Paragraph(label).setFontSize(7).setBold().setFontColor(GRAY_500).setMarginBottom(2));
        card.add(new Paragraph(value).setFontSize(14).setBold().setFontColor(textColor));
        return card;
    }

    private void addFooter(Document doc) {
        doc.add(new Paragraph("").setMarginTop(16));
        addSeparatorLine(doc);
        Table footer = new Table(UnitValue.createPercentArray(new float[]{1, 1}))
                .useAllAvailableWidth()
                .setBorder(Border.NO_BORDER);

        Cell leftFoot = new Cell().setBorder(Border.NO_BORDER);
        leftFoot.add(new Paragraph("VitaBridge Healthcare")
                .setFontSize(8).setBold().setFontColor(PRIMARY));
        leftFoot.add(new Paragraph("Auto-generated report • Confidential")
                .setFontSize(7).setFontColor(GRAY_500));
        footer.addCell(leftFoot);

        Cell rightFoot = new Cell().setBorder(Border.NO_BORDER)
                .setTextAlignment(TextAlignment.RIGHT);
        rightFoot.add(new Paragraph("Generated: " + LocalDate.now().format(DateTimeFormatter.ofPattern("MMM dd, yyyy")))
                .setFontSize(7).setFontColor(GRAY_500));
        footer.addCell(rightFoot);

        doc.add(footer);
    }

    private DeviceRgb getStatusColor(String status) {
        return switch (status) {
            case "COMPLETED" -> ACCENT;
            case "CONFIRMED" -> PRIMARY;
            case "CANCELLED" -> DANGER;
            case "PENDING" -> WARNING;
            default -> GRAY_700;
        };
    }
}
