import jsPDF from "jspdf";
import logoUrl from "../assets/icon/Logo.jpeg";

// Helper: load an image URL as a base64 data URL (returns a Promise)
function loadImageAsBase64(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      canvas.getContext("2d").drawImage(img, 0, 0);
      resolve(canvas.toDataURL("image/jpeg"));
    };
    img.onerror = reject;
    img.src = url;
  });
}

/**
 * Generates and downloads a beautiful VitaBridge medical prescription PDF.
 */
export async function downloadPrescriptionPdf({ doctor, appointment, prescription }) {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const W = 210;
  const margin = 15;
  const contentW = W - margin * 2;
  let y = 0;

  const hex = (color) => {
    const r = parseInt(color.slice(1, 3), 16);
    const g = parseInt(color.slice(3, 5), 16);
    const b = parseInt(color.slice(5, 7), 16);
    return [r, g, b];
  };
  const setFill = (c) => doc.setFillColor(...hex(c));
  const setDraw = (c) => doc.setDrawColor(...hex(c));
  const setTextColor = (c) => doc.setTextColor(...hex(c));

  const PRIMARY   = "#1e40af";
  const PRIMARY_M = "#2563eb";
  const PRIMARY_L = "#dbeafe";
  const EMERALD   = "#059669";
  const EMERALD_L = "#d1fae5";
  const GRAY_D    = "#111827";
  const GRAY_M    = "#6b7280";
  const GRAY_L    = "#f9fafb";
  const WHITE     = "#ffffff";
  const AMBER     = "#d97706";
  const AMBER_L   = "#fef3c7";
  const RED       = "#dc2626";
  const RED_L     = "#fee2e2";

  // ── HEADER BAR ──────────────────────────────────────────────────────────────
  setFill(PRIMARY);
  doc.rect(0, 0, W, 28, "F");

  // Accent line
  setFill(EMERALD);
  doc.rect(0, 28, W, 1.5, "F");

  // Logo image
  try {
    const logoBase64 = await loadImageAsBase64(logoUrl);
    doc.addImage(logoBase64, "JPEG", margin + 1, 3, 22, 22);
  } catch {
    // Fallback: draw text if image fails to load
    setFill(WHITE);
    doc.circle(margin + 8, 14, 8, "F");
    setTextColor(PRIMARY);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text("VB", margin + 4.5, 15.5);
  }

  // Brand name
  setTextColor(WHITE);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text("VitaBridge", margin + 26, 13);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(190, 210, 255);
  doc.text("Digital Healthcare Platform", margin + 26, 19);

  // Right side - Prescription label
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  setTextColor(WHITE);
  doc.text("PRESCRIPTION", W - margin, 11, { align: "right" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(190, 210, 255);
  const today = new Date();
  const dateStr = today.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
  doc.text(`Date: ${dateStr}`, W - margin, 17, { align: "right" });
  if (appointment?.appointmentDate) {
    doc.text(`Appointment: ${appointment.appointmentDate}`, W - margin, 22, { align: "right" });
  }

  y = 35;

  // ── DOCTOR & PATIENT INFO ───────────────────────────────────────────────────
  const cardH = 30;
  const halfW = (contentW - 6) / 2;

  // Doctor card
  setFill(PRIMARY_L);
  doc.roundedRect(margin, y, halfW, cardH, 2, 2, "F");

  setTextColor(PRIMARY);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.text("DOCTOR", margin + 4, y + 6);

  setTextColor(GRAY_D);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9.5);
  const dName = doctor?.name || "Dr. —";
  doc.text(dName.startsWith("Dr.") ? dName : `Dr. ${dName}`, margin + 4, y + 12.5);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  setTextColor(EMERALD);
  doc.text(doctor?.specialty || "Specialist", margin + 4, y + 18);

  setTextColor(GRAY_M);
  doc.setFontSize(6.5);
  let docInfoY = y + 23;
  if (doctor?.qualification) {
    doc.text(doctor.qualification, margin + 4, docInfoY);
    docInfoY += 4;
  }
  if (doctor?.phoneNumber) {
    doc.text(`Tel: ${doctor.phoneNumber}`, margin + 4, docInfoY);
  }

  // Patient card
  const patX = margin + halfW + 6;
  setFill(EMERALD_L);
  doc.roundedRect(patX, y, halfW, cardH, 2, 2, "F");

  setTextColor(EMERALD);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.text("PATIENT", patX + 4, y + 6);

  setTextColor(GRAY_D);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9.5);
  doc.text(appointment?.patientName || "—", patX + 4, y + 12.5);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.5);
  setTextColor(GRAY_M);
  let patInfoY = y + 18;
  if (appointment?.patientPhone) {
    doc.text(`Tel: ${appointment.patientPhone}`, patX + 4, patInfoY);
    patInfoY += 4;
  }
  if (appointment?.consultationType) {
    doc.text(`Consultation: ${appointment.consultationType}`, patX + 4, patInfoY);
    patInfoY += 4;
  }
  if (appointment?.serialNumber) {
    doc.text(`Serial #${appointment.serialNumber}`, patX + 4, patInfoY);
  }

  y += cardH + 6;

  // ── DIAGNOSIS ───────────────────────────────────────────────────────────────
  if (prescription?.diagnosis) {
    setFill(PRIMARY_L);
    doc.roundedRect(margin, y, contentW, 12, 2, 2, "F");
    setFill(PRIMARY);
    doc.roundedRect(margin, y, 3, 12, 1, 1, "F");

    setTextColor(PRIMARY);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.text("DIAGNOSIS", margin + 7, y + 5);

    setTextColor(GRAY_D);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    const diagLines = doc.splitTextToSize(prescription.diagnosis, contentW - 14);
    doc.text(diagLines, margin + 7, y + 9.5);
    y += Math.max(12, 10 + diagLines.length * 4);
    y += 4;
  }

  // ── Rx MEDICATIONS ──────────────────────────────────────────────────────────
  setFill(PRIMARY);
  doc.roundedRect(margin, y, contentW, 8, 2, 2, "F");
  setTextColor(WHITE);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.text("Rx   MEDICATIONS", margin + 4, y + 5.5);
  y += 10;

  const meds = prescription?.medications || [];
  if (meds.length === 0) {
    setTextColor(GRAY_M);
    doc.setFont("helvetica", "italic");
    doc.setFontSize(8);
    doc.text("No medications prescribed.", margin + 4, y + 5);
    y += 10;
  } else {
    const cols = { no: 8, name: 42, dosage: 26, freq: 30, dur: 24, inst: contentW - 8 - 42 - 26 - 30 - 24 };
    const colX = {
      no:   margin,
      name: margin + cols.no,
      dos:  margin + cols.no + cols.name,
      frq:  margin + cols.no + cols.name + cols.dosage,
      dur:  margin + cols.no + cols.name + cols.dosage + cols.freq,
      ins:  margin + cols.no + cols.name + cols.dosage + cols.freq + cols.dur,
    };

    const theadH = 7;
    setFill("#e0e7ff");
    doc.rect(margin, y, contentW, theadH, "F");
    setTextColor(PRIMARY);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(6.5);
    doc.text("#",            colX.no + 2,   y + 5);
    doc.text("Medicine",     colX.name + 2, y + 5);
    doc.text("Dosage",       colX.dos + 2,  y + 5);
    doc.text("Frequency",    colX.frq + 2,  y + 5);
    doc.text("Duration",     colX.dur + 2,  y + 5);
    doc.text("Instructions", colX.ins + 2,  y + 5);
    y += theadH;

    meds.forEach((med, idx) => {
      const rowH = 8;
      if (y + rowH > 270) { doc.addPage(); y = 15; }

      setFill(idx % 2 === 0 ? WHITE : GRAY_L);
      doc.rect(margin, y, contentW, rowH, "F");

      setFill(idx % 2 === 0 ? PRIMARY_M : EMERALD);
      doc.rect(margin, y, 1.2, rowH, "F");

      setTextColor(GRAY_D);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7);
      doc.text(String(idx + 1),              colX.no + 2,   y + 5.5);
      doc.setFont("helvetica", "bold");
      doc.text(med.name        || "—",       colX.name + 2, y + 5.5, { maxWidth: cols.name - 3 });
      doc.setFont("helvetica", "normal");
      doc.text(med.dosage      || "—",       colX.dos + 2,  y + 5.5, { maxWidth: cols.dosage - 3 });
      doc.text(med.frequency   || "—",       colX.frq + 2,  y + 5.5, { maxWidth: cols.freq - 3 });
      doc.text(med.duration    || "—",       colX.dur + 2,  y + 5.5, { maxWidth: cols.dur - 3 });
      doc.text(med.instructions|| "—",       colX.ins + 2,  y + 5.5, { maxWidth: cols.inst - 3 });

      setDraw("#e5e7eb");
      doc.setLineWidth(0.15);
      doc.line(margin, y + rowH, margin + contentW, y + rowH);
      y += rowH;
    });

    setDraw(PRIMARY);
    doc.setLineWidth(0.4);
    doc.line(margin, y, margin + contentW, y);
    y += 6;
  }

  // ── LAB TESTS & ADVICE ─────────────────────────────────────────────────────
  const hasLab    = prescription?.labTests?.trim();
  const hasAdvice = prescription?.advice?.trim();

  if (hasLab || hasAdvice) {
    const colW = hasLab && hasAdvice ? (contentW - 6) / 2 : contentW;

    if (hasLab) {
      const labX = margin;
      if (y + 30 > 270) { doc.addPage(); y = 15; }

      setFill(AMBER_L);
      doc.roundedRect(labX, y, colW, 28, 2, 2, "F");
      setFill(AMBER);
      doc.roundedRect(labX, y, colW, 7, 2, 2, "F");
      doc.rect(labX, y + 4, colW, 3, "F");
      setTextColor(WHITE);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(7);
      doc.text("LAB TESTS", labX + 4, y + 5);

      setTextColor(GRAY_D);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.5);
      const labLines = doc.splitTextToSize(prescription.labTests, colW - 8);
      doc.text(labLines, labX + 4, y + 13);
    }

    if (hasAdvice) {
      const advX = hasLab ? margin + colW + 6 : margin;
      const advW = hasLab ? colW : contentW;
      if (!hasLab && y + 30 > 270) { doc.addPage(); y = 15; }

      setFill(EMERALD_L);
      doc.roundedRect(advX, y, advW, 28, 2, 2, "F");
      setFill(EMERALD);
      doc.roundedRect(advX, y, advW, 7, 2, 2, "F");
      doc.rect(advX, y + 4, advW, 3, "F");
      setTextColor(WHITE);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(7);
      doc.text("ADVICE", advX + 4, y + 5);

      setTextColor(GRAY_D);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.5);
      const advLines = doc.splitTextToSize(prescription.advice, advW - 8);
      doc.text(advLines, advX + 4, y + 13);
    }

    y += 34;
  }

  // ── FOLLOW-UP DATE ──────────────────────────────────────────────────────────
  if (prescription?.followUpDate) {
    if (y + 14 > 270) { doc.addPage(); y = 15; }
    const fuDate = String(prescription.followUpDate).split("T")[0];
    setFill(RED_L);
    doc.roundedRect(margin, y, contentW, 10, 2, 2, "F");
    setFill(RED);
    doc.roundedRect(margin, y, 3, 10, 1, 1, "F");

    setTextColor(RED);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.text("FOLLOW-UP DATE", margin + 7, y + 5);
    setTextColor(GRAY_D);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.text(fuDate, margin + 45, y + 5);
    y += 14;
  }

  // ── SIGNATURE ───────────────────────────────────────────────────────────────
  const sigY = Math.max(y + 12, 250);

  setDraw("#d1d5db");
  doc.setLineWidth(0.3);
  doc.line(W - margin - 70, sigY, W - margin, sigY);

  setTextColor(GRAY_D);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  const sigDoctorName = doctor?.name || "Doctor";
  doc.text(sigDoctorName.startsWith("Dr.") ? sigDoctorName : `Dr. ${sigDoctorName}`, W - margin, sigY + 5, { align: "right" });

  setTextColor(GRAY_M);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.5);
  doc.text(doctor?.specialty || "", W - margin, sigY + 9.5, { align: "right" });
  doc.text("Authorized Signature", W - margin, sigY + 13.5, { align: "right" });

  // ── FOOTER ──────────────────────────────────────────────────────────────────
  setFill(PRIMARY);
  doc.rect(0, 284, W, 13, "F");

  setTextColor(WHITE);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(6);
  doc.text(
    "This prescription is digitally generated by VitaBridge Healthcare Platform. Valid when signed by the treating physician.",
    W / 2, 290, { align: "center", maxWidth: W - 30 }
  );
  doc.setFontSize(5.5);
  doc.setTextColor(180, 200, 255);
  doc.text("www.vitabridge.com  |  Digital Healthcare, Reimagined", W / 2, 294.5, { align: "center" });

  // ── SAVE ────────────────────────────────────────────────────────────────────
  const filename = `Prescription_${(appointment?.patientName || "Patient").replace(/\s+/g, "_")}_${appointment?.appointmentDate || "date"}.pdf`;
  doc.save(filename);
}
