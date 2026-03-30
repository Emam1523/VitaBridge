package com.vitabridge.service;

import com.vitabridge.model.User;
import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

//Sends transactional emails (welcome + appointment confirmation)
@Service
public class EmailService {

  private static final Logger log = LoggerFactory.getLogger(EmailService.class);

  @Autowired
  private JavaMailSender mailSender;

  @Value("${app.email.from}")
  private String fromAddress;

  @Value("${app.email.fromName:VitaBridge}")
  private String fromName;

  @Value("${app.frontendUrl:https://localhost:5173}")
  private String frontendUrl;

  @Value("${app.email.adminEmail:admin@vitabridge.com}")
  private String adminEmail;

  // Public send methods

  @Async
  public void sendWelcomeEmail(User user) {
    String subject = "Welcome to VitaBridge!";
    String body = buildWelcomeHtml(user.getName(), user.getEmail());
    safeSend(user.getEmail(), subject, body);
  }

  // All params are plain values extracted before the async call
  @Async
  public void sendAppointmentConfirmationEmail(
      String patientEmail, String patientName,
      String doctorName, String specialty,
      String appointmentDate, String consultationType,
      Double consultationFee, Integer serialNumber) {

    String subject = "Appointment Confirmed – " + doctorName;
    String body = buildAppointmentHtml(
        patientName, doctorName, specialty,
        appointmentDate, consultationType, consultationFee, serialNumber);
    safeSend(patientEmail, subject, body);
  }

  // Forwards a contact-page enquiry to the admin inbox.
  @Async
  public void sendContactEmail(String senderName, String senderEmail,
      String subject, String message) {
    String html = buildContactHtml(senderName, senderEmail, subject, message);
    safeSend(adminEmail, "VitaBridge Contact: " + subject, html);
  }

  // Sends OTP verification email for new account registration
  public void sendOtpEmail(String toEmail, String otpCode, int expiryMinutes) {
    String subject = "Your VitaBridge Verification Code";
    String body = buildOtpHtml(toEmail, otpCode, expiryMinutes);
    safeSend(toEmail, subject, body);
  }

  // Sends OTP verification email for password change
  public void sendPasswordChangeOtpEmail(String toEmail, String otpCode, int expiryMinutes) {
    String subject = "VitaBridge – Password Change Verification Code";
    String body = buildPasswordChangeOtpHtml(toEmail, otpCode, expiryMinutes);
    safeSend(toEmail, subject, body);
  }

  // Private helpers

  private void safeSend(String to, String subject, String html) {
    try {
      MimeMessage message = mailSender.createMimeMessage();
      MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");
      helper.setFrom(fromAddress, fromName);
      helper.setTo(to);
      helper.setSubject(subject);
      helper.setText(html, true);
      mailSender.send(message);
      log.info("Email sent to {}: {}", to, subject);
    } catch (MessagingException | java.io.UnsupportedEncodingException e) {
      log.error("Failed to send email to {}: {}", to, e.getMessage());
    }
  }

  // HTML templates

  private String buildWelcomeHtml(String name, String email) {
    String firstName = name.contains(" ") ? name.substring(0, name.indexOf(' ')) : name;
    return """
        <!DOCTYPE html>
        <html lang="en">
        <head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
        <body style="margin:0;padding:0;background:#f3f4f6;font-family:Arial,Helvetica,sans-serif;">
          <table width="100%%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:40px 16px;">
            <tr><td align="center">
              <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;max-width:600px;width:100%%;">
                <!-- Header -->
                <tr>
                  <td style="background:#0d9488;padding:32px 40px;text-align:center;">
                    <h1 style="margin:0;color:#ffffff;font-size:28px;font-weight:700;letter-spacing:-0.5px;">VitaBridge</h1>
                    <p style="margin:6px 0 0;color:#99f6e4;font-size:14px;">Your health bridge, simplified.</p>
                  </td>
                </tr>
                <!-- Body -->
                <tr>
                  <td style="padding:40px 40px 32px;">
                    <h2 style="margin:0 0 12px;color:#111827;font-size:22px;">Welcome, %s! 👋</h2>
                    <p style="margin:0 0 16px;color:#4b5563;font-size:15px;line-height:1.6;">
                      Your account has been created successfully. Here are your details:
                    </p>
                    <table width="100%%" cellpadding="0" cellspacing="0" style="background:#f9fafb;border-radius:12px;padding:20px;">
                      <tr><td style="padding:8px 0;border-bottom:1px solid #e5e7eb;">
                        <span style="color:#6b7280;font-size:13px;">Email</span><br>
                        <strong style="color:#111827;font-size:15px;">%s</strong>
                      </td></tr>
                      <tr><td style="padding:8px 0;">
                        <span style="color:#6b7280;font-size:13px;">Role</span><br>
                        <strong style="color:#111827;font-size:15px;">Patient</strong>
                      </td></tr>
                    </table>
                    <div style="margin:28px 0;text-align:center;">
                      <a href="%s/login" style="display:inline-block;background:#0d9488;color:#ffffff;text-decoration:none;padding:14px 36px;border-radius:10px;font-size:15px;font-weight:600;">
                        Go to Dashboard
                      </a>
                    </div>
                    <p style="margin:0;color:#9ca3af;font-size:13px;line-height:1.6;">
                      If you did not create this account, please ignore this email or contact our support team.
                    </p>
                  </td>
                </tr>
                <!-- Footer -->
                <tr>
                  <td style="background:#f9fafb;padding:20px 40px;border-top:1px solid #e5e7eb;text-align:center;">
                    <p style="margin:0;color:#9ca3af;font-size:12px;">© 2026 VitaBridge · All rights reserved.</p>
                  </td>
                </tr>
              </table>
            </td></tr>
          </table>
        </body>
        </html>
        """
        .formatted(firstName, email, frontendUrl);
  }

  private String buildAppointmentHtml(
      String patientName,
      String doctorName, String specialty,
      String date, String consultationType,
      Double consultationFee, Integer serialNumber) {

    String firstName = patientName.contains(" ")
        ? patientName.substring(0, patientName.indexOf(' '))
        : patientName;
    String typeLabel = "ONLINE".equals(consultationType) ? "Online" : "In-Person";
    String fee = consultationFee != null ? "৳" + consultationFee : "N/A";
    String serial = serialNumber != null ? "#" + serialNumber : "N/A";

    return """
        <!DOCTYPE html>
        <html lang="en">
        <head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
        <body style="margin:0;padding:0;background:#f3f4f6;font-family:Arial,Helvetica,sans-serif;">
          <table width="100%%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:40px 16px;">
            <tr><td align="center">
              <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;max-width:600px;width:100%%;">
                <!-- Header -->
                <tr>
                  <td style="background:#0d9488;padding:32px 40px;text-align:center;">
                    <h1 style="margin:0;color:#ffffff;font-size:28px;font-weight:700;">VitaBridge</h1>
                    <p style="margin:6px 0 0;color:#99f6e4;font-size:14px;">Appointment Confirmation</p>
                  </td>
                </tr>
                <!-- Body -->
                <tr>
                  <td style="padding:40px 40px 32px;">
                    <h2 style="margin:0 0 8px;color:#111827;font-size:22px;">Hi %s,</h2>
                    <p style="margin:0 0 24px;color:#4b5563;font-size:15px;line-height:1.6;">
                      Your appointment has been booked. Thank you for choosing VitaBridge.
                    </p>

                    <!-- Appointment card -->
                    <table width="100%%" cellpadding="0" cellspacing="0" style="background:#f0fdfa;border:1px solid #99f6e4;border-radius:12px;padding:20px;margin-bottom:24px;">
                      <tr><td style="padding:10px 0;border-bottom:1px solid #ccfbf1;">
                        <span style="color:#6b7280;font-size:12px;text-transform:uppercase;letter-spacing:.5px;">Doctor</span><br>
                        <strong style="color:#111827;font-size:16px;">%s</strong>
                        <span style="color:#0d9488;font-size:13px;"> — %s</span>
                      </td></tr>
                      <tr><td style="padding:10px 0;border-bottom:1px solid #ccfbf1;">
                        <span style="color:#6b7280;font-size:12px;text-transform:uppercase;letter-spacing:.5px;">Date</span><br>
                        <strong style="color:#111827;font-size:15px;">%s</strong>
                      </td></tr>
                      <tr><td style="padding:10px 0;border-bottom:1px solid #ccfbf1;">
                        <span style="color:#6b7280;font-size:12px;text-transform:uppercase;letter-spacing:.5px;">Type</span><br>
                        <strong style="color:#111827;font-size:15px;">%s</strong>
                      </td></tr>
                      <tr><td style="padding:10px 0;border-bottom:1px solid #ccfbf1;">
                        <span style="color:#6b7280;font-size:12px;text-transform:uppercase;letter-spacing:.5px;">Consultation Fee</span><br>
                        <strong style="color:#0d9488;font-size:18px;">%s</strong>
                      </td></tr>
                      <tr><td style="padding:10px 0;">
                        <span style="color:#6b7280;font-size:12px;text-transform:uppercase;letter-spacing:.5px;">Your Serial Number</span><br>
                        <strong style="color:#111827;font-size:20px;">%s</strong>
                      </td></tr>
                    </table>

                    <div style="background:#fffbeb;border:1px solid #fde68a;border-radius:10px;padding:14px 18px;margin-bottom:24px;">
                      <p style="margin:0;color:#92400e;font-size:13px;line-height:1.6;">
                        ✅ <strong>Payment received.</strong> Please join the consultation when your serial number is called.
                      </p>
                    </div>

                    <div style="text-align:center;">
                      <a href="%s/patient/appointments" style="display:inline-block;background:#0d9488;color:#ffffff;text-decoration:none;padding:14px 36px;border-radius:10px;font-size:15px;font-weight:600;">
                        View My Appointments
                      </a>
                    </div>
                  </td>
                </tr>
                <!-- Footer -->
                <tr>
                  <td style="background:#f9fafb;padding:20px 40px;border-top:1px solid #e5e7eb;text-align:center;">
                    <p style="margin:0;color:#9ca3af;font-size:12px;">© 2026 VitaBridge · All rights reserved.</p>
                  </td>
                </tr>
              </table>
            </td></tr>
          </table>
        </body>
        </html>
        """
        .formatted(firstName, doctorName, specialty, date, typeLabel, fee, serial, frontendUrl);
  }

  @Async
  public void sendAppointmentCancellationEmail(
      String patientEmail, String patientName,
      String doctorName, String specialty,
      String appointmentDate, String consultationType) {

    String subject = "Appointment Cancelled – " + doctorName;
    String body = buildAppointmentCancellationHtml(
        patientName, doctorName, specialty,
        appointmentDate, consultationType);
    safeSend(patientEmail, subject, body);
  }

  private String buildAppointmentCancellationHtml(
      String patientName, String doctorName, String specialty,
      String date, String consultationType) {

    String firstName = patientName.contains(" ")
        ? patientName.substring(0, patientName.indexOf(' '))
        : patientName;
    String typeLabel = "ONLINE".equals(consultationType) ? "Online" : "In-Person";

    return """
        <!DOCTYPE html>
        <html lang="en">
        <head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
        <body style="margin:0;padding:0;background:#f3f4f6;font-family:Arial,Helvetica,sans-serif;">
          <table width="100%%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:40px 16px;">
            <tr><td align="center">
              <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;max-width:600px;width:100%%;">
                <tr>
                  <td style="background:#dc2626;padding:32px 40px;text-align:center;">
                    <h1 style="margin:0;color:#ffffff;font-size:28px;font-weight:700;">VitaBridge</h1>
                    <p style="margin:6px 0 0;color:#fecaca;font-size:14px;">Appointment Cancelled</p>
                  </td>
                </tr>
                <tr>
                  <td style="padding:40px 40px 32px;">
                    <h2 style="margin:0 0 8px;color:#111827;font-size:22px;">Hi %s,</h2>
                    <p style="margin:0 0 24px;color:#4b5563;font-size:15px;line-height:1.6;">
                      Your appointment with <strong>%s</strong> (%s) scheduled for <strong>%s</strong> (%s) has been cancelled.
                    </p>
                    <p style="margin:0 0 24px;color:#4b5563;font-size:15px;line-height:1.6;">
                      If you would like to book another appointment, please visit your appointments page.
                    </p>
                    <div style="text-align:center;">
                      <a href="%s/patient/appointments" style="display:inline-block;background:#0d9488;color:#ffffff;text-decoration:none;padding:14px 36px;border-radius:10px;font-size:15px;font-weight:600;">
                        View My Appointments
                      </a>
                    </div>
                  </td>
                </tr>
                <tr>
                  <td style="background:#f9fafb;padding:20px 40px;border-top:1px solid #e5e7eb;text-align:center;">
                    <p style="margin:0;color:#9ca3af;font-size:12px;">© 2026 VitaBridge · All rights reserved.</p>
                  </td>
                </tr>
              </table>
            </td></tr>
          </table>
        </body>
        </html>
        """
        .formatted(firstName, doctorName, specialty, date, typeLabel, frontendUrl);
  }

  private String buildContactHtml(String name, String email, String subject, String message) {
    return """
        <!DOCTYPE html>
        <html lang="en">
        <head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
        <body style="margin:0;padding:0;background:#f3f4f6;font-family:Arial,Helvetica,sans-serif;">
          <table width="100%%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:40px 16px;">
            <tr><td align="center">
              <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;max-width:600px;width:100%%;">
                <tr>
                  <td style="background:#0d9488;padding:28px 40px;text-align:center;">
                    <h1 style="margin:0;color:#ffffff;font-size:24px;font-weight:700;">VitaBridge</h1>
                    <p style="margin:4px 0 0;color:#99f6e4;font-size:13px;">New Contact Form Submission</p>
                  </td>
                </tr>
                <tr>
                  <td style="padding:36px 40px;">
                    <h2 style="margin:0 0 20px;color:#111827;font-size:18px;">New message from the contact form</h2>
                    <table width="100%%" cellpadding="0" cellspacing="0" style="background:#f9fafb;border-radius:12px;padding:20px;margin-bottom:20px;">
                      <tr><td style="padding:8px 0;border-bottom:1px solid #e5e7eb;">
                        <span style="color:#6b7280;font-size:12px;">From</span><br>
                        <strong style="color:#111827;font-size:15px;">%s</strong>
                      </td></tr>
                      <tr><td style="padding:8px 0;border-bottom:1px solid #e5e7eb;">
                        <span style="color:#6b7280;font-size:12px;">Email</span><br>
                        <strong style="color:#111827;font-size:15px;">%s</strong>
                      </td></tr>
                      <tr><td style="padding:8px 0;">
                        <span style="color:#6b7280;font-size:12px;">Subject</span><br>
                        <strong style="color:#111827;font-size:15px;">%s</strong>
                      </td></tr>
                    </table>
                    <div style="background:#f0fdfa;border:1px solid #99f6e4;border-radius:12px;padding:20px;">
                      <p style="margin:0 0 8px;color:#6b7280;font-size:12px;text-transform:uppercase;letter-spacing:.5px;">Message</p>
                      <p style="margin:0;color:#111827;font-size:15px;line-height:1.7;white-space:pre-wrap;">%s</p>
                    </div>
                  </td>
                </tr>
                <tr>
                  <td style="background:#f9fafb;padding:16px 40px;border-top:1px solid #e5e7eb;text-align:center;">
                    <p style="margin:0;color:#9ca3af;font-size:12px;">© 2026 VitaBridge · Contact Form</p>
                  </td>
                </tr>
              </table>
            </td></tr>
          </table>
        </body>
        </html>
        """
        .formatted(name, email, subject, message);
  }

  private String buildPasswordChangeOtpHtml(String email, String otpCode, int expiryMinutes) {
    return """
        <!DOCTYPE html>
        <html lang="en">
        <head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
        <body style="margin:0;padding:0;background:#f3f4f6;font-family:Arial,Helvetica,sans-serif;">
          <table width="100%%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:40px 16px;">
            <tr><td align="center">
              <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;max-width:600px;width:100%%;">
                <!-- Header -->
                <tr>
                  <td style="background:#0d9488;padding:32px 40px;text-align:center;">
                    <h1 style="margin:0;color:#ffffff;font-size:28px;font-weight:700;letter-spacing:-0.5px;">VitaBridge</h1>
                    <p style="margin:6px 0 0;color:#99f6e4;font-size:14px;">Password Change Verification</p>
                  </td>
                </tr>
                <!-- Body -->
                <tr>
                  <td style="padding:40px 40px 32px;">
                    <h2 style="margin:0 0 12px;color:#111827;font-size:22px;">Password Change Request</h2>
                    <p style="margin:0 0 24px;color:#4b5563;font-size:15px;line-height:1.6;">
                      We received a request to change the password for your VitaBridge account: <strong>%s</strong>
                    </p>
                    <p style="margin:0 0 16px;color:#4b5563;font-size:15px;line-height:1.6;">
                      Please use the verification code below to confirm your identity:
                    </p>
                    <!-- OTP Code Box -->
                    <div style="text-align:center;margin:28px 0;">
                      <div style="display:inline-block;background:#fff7ed;border:2px solid #f97316;border-radius:16px;padding:24px 48px;">
                        <p style="margin:0 0 8px;color:#6b7280;font-size:13px;text-transform:uppercase;letter-spacing:1px;">Your Verification Code</p>
                        <p style="margin:0;color:#ea580c;font-size:42px;font-weight:700;letter-spacing:12px;font-family:monospace;">%s</p>
                      </div>
                    </div>
                    <p style="margin:0 0 16px;color:#6b7280;font-size:14px;text-align:center;">
                      This code will expire in <strong>%d minutes</strong>.
                    </p>
                    <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:10px;padding:14px 18px;margin-bottom:16px;">
                      <p style="margin:0;color:#991b1b;font-size:13px;line-height:1.6;">
                        ⚠️ <strong>Security notice:</strong> If you did not request a password change, please ignore this email and your password will remain unchanged. Consider reviewing your account security.
                      </p>
                    </div>
                  </td>
                </tr>
                <!-- Footer -->
                <tr>
                  <td style="background:#f9fafb;padding:20px 40px;border-top:1px solid #e5e7eb;text-align:center;">
                    <p style="margin:0;color:#9ca3af;font-size:12px;">© 2026 VitaBridge · All rights reserved.</p>
                  </td>
                </tr>
              </table>
            </td></tr>
          </table>
        </body>
        </html>
        """
        .formatted(email, otpCode, expiryMinutes);
  }

  private String buildOtpHtml(String email, String otpCode, int expiryMinutes) {
    return """
        <!DOCTYPE html>
        <html lang="en">
        <head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
        <body style="margin:0;padding:0;background:#f3f4f6;font-family:Arial,Helvetica,sans-serif;">
          <table width="100%%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:40px 16px;">
            <tr><td align="center">
              <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;max-width:600px;width:100%%;">
                <!-- Header -->
                <tr>
                  <td style="background:#0d9488;padding:32px 40px;text-align:center;">
                    <h1 style="margin:0;color:#ffffff;font-size:28px;font-weight:700;letter-spacing:-0.5px;">VitaBridge</h1>
                    <p style="margin:6px 0 0;color:#99f6e4;font-size:14px;">Email Verification</p>
                  </td>
                </tr>
                <!-- Body -->
                <tr>
                  <td style="padding:40px 40px 32px;">
                    <h2 style="margin:0 0 12px;color:#111827;font-size:22px;">Verify Your Email Address</h2>
                    <p style="margin:0 0 24px;color:#4b5563;font-size:15px;line-height:1.6;">
                      You requested to create a VitaBridge account with this email address: <strong>%s</strong>
                    </p>
                    <p style="margin:0 0 16px;color:#4b5563;font-size:15px;line-height:1.6;">
                      Please use the verification code below to complete your registration:
                    </p>
                    <!-- OTP Code Box -->
                    <div style="text-align:center;margin:28px 0;">
                      <div style="display:inline-block;background:#f0fdfa;border:2px solid #0d9488;border-radius:16px;padding:24px 48px;">
                        <p style="margin:0 0 8px;color:#6b7280;font-size:13px;text-transform:uppercase;letter-spacing:1px;">Your Verification Code</p>
                        <p style="margin:0;color:#0d9488;font-size:42px;font-weight:700;letter-spacing:12px;font-family:monospace;">%s</p>
                      </div>
                    </div>
                    <p style="margin:0 0 16px;color:#6b7280;font-size:14px;text-align:center;">
                      This code will expire in <strong>%d minutes</strong>.
                    </p>
                    <p style="margin:0;color:#9ca3af;font-size:13px;line-height:1.6;">
                      If you did not request this verification code, please ignore this email. Your account will not be created without completing the verification.
                    </p>
                  </td>
                </tr>
                <!-- Footer -->
                <tr>
                  <td style="background:#f9fafb;padding:20px 40px;border-top:1px solid #e5e7eb;text-align:center;">
                    <p style="margin:0;color:#9ca3af;font-size:12px;">© 2026 VitaBridge · All rights reserved.</p>
                  </td>
                </tr>
              </table>
            </td></tr>
          </table>
        </body>
        </html>
        """
        .formatted(email, otpCode, expiryMinutes);
  }
}
