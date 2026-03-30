package com.vitabridge.controller;

import com.vitabridge.service.PaymentService;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.io.IOException;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/payments")
public class PaymentController {

    private static final Logger log = LoggerFactory.getLogger(PaymentController.class);

    @Autowired
    private PaymentService paymentService;

    @Value("${aamarpay.frontendRedirectUrl}")
    private String frontendUrl;

    @PreAuthorize("isAuthenticated()")
    @GetMapping("/appointment/{appointmentId}")
    public ResponseEntity<Map<String, Object>> getPaymentByAppointment(@PathVariable UUID appointmentId) {
        return ResponseEntity.ok(paymentService.getPaymentSummary(appointmentId));
    }

    @PreAuthorize("hasAnyRole('ADMIN', 'ASSISTANT')")
    @PostMapping("/appointment/{appointmentId}/process")
    public ResponseEntity<Map<String, Object>> processPayment(@PathVariable UUID appointmentId,
            @RequestParam String paymentMethod,
            @RequestParam String transactionId) {
        paymentService.processPayment(appointmentId, paymentMethod, transactionId);
        return ResponseEntity.ok(paymentService.getPaymentSummary(appointmentId));
    }

    @PostMapping("/appointment/{appointmentId}/init-aamarpay")
    public ResponseEntity<Map<String, String>> initAamarPay(
            @PathVariable UUID appointmentId,
            @RequestBody(required = false) Map<String, String> body) {
        String clientOrigin = body != null ? body.get("clientOrigin") : null;
        String paymentUrl = paymentService.initAamarPayPayment(appointmentId, clientOrigin);
        return ResponseEntity.ok(Map.of("paymentUrl", paymentUrl));
    }

    @PostMapping(value = "/aamarpay/success", consumes = MediaType.APPLICATION_FORM_URLENCODED_VALUE)
    public void aamarPaySuccess(@RequestParam Map<String, String> requestData,
            HttpServletResponse response) throws IOException {
        log.info("AamarPay success callback received (POST). Data: {}", requestData);
        handlePaymentCallback(requestData, response);
    }

    @GetMapping("/aamarpay/success")
    public void aamarPaySuccessGet(@RequestParam Map<String, String> requestData,
            HttpServletResponse response) throws IOException {
        log.info("AamarPay success callback received (GET). Data: {}", requestData);
        handlePaymentCallback(requestData, response);
    }

    private void handlePaymentCallback(Map<String, String> requestData, HttpServletResponse response)
            throws IOException {
        String optA = requestData.getOrDefault("opt_a", "");
        
       // opt_b holds the clientOrigin sent by the frontend on payment initiation
        String base = resolveBase(requestData.getOrDefault("opt_b", ""));
        try {
            paymentService.processAamarPaySuccess(requestData);
            log.info("Payment processed successfully. Redirecting to success page for appointment {}", optA);
        } catch (Exception e) {
            log.error("Error processing AamarPay success callback: {}", e.getMessage(), e);
            String encodedError = URLEncoder.encode(
                    e.getMessage() != null ? e.getMessage() : "Unknown error",
                    StandardCharsets.UTF_8);
            redirectToFrontend(response,
                    base + "/patient/payment/fail?error=" + encodedError + "&appointmentId=" + optA);
            return;
        }
        redirectToFrontend(response, base + "/patient/payment/success?appointmentId=" + optA);
    }

    @PostMapping(value = "/aamarpay/fail", consumes = MediaType.APPLICATION_FORM_URLENCODED_VALUE)
    public void aamarPayFail(@RequestParam Map<String, String> requestData,
            HttpServletResponse response) throws IOException {
        log.info("AamarPay fail callback received (POST). Data: {}", requestData);
        handlePaymentFail(requestData, response);
    }

    @GetMapping("/aamarpay/fail")
    public void aamarPayFailGet(@RequestParam Map<String, String> requestData,
            HttpServletResponse response) throws IOException {
        log.info("AamarPay fail callback received (GET). Data: {}", requestData);
        handlePaymentFail(requestData, response);
    }

    private void handlePaymentFail(Map<String, String> requestData, HttpServletResponse response) throws IOException {
        try {
            paymentService.processAamarPayFail(requestData);
        } catch (Exception e) {
            log.error("Error processing AamarPay fail callback: {}", e.getMessage(), e);
        }
        String optA = requestData.getOrDefault("opt_a", "");
        String base = resolveBase(requestData.getOrDefault("opt_b", ""));
        redirectToFrontend(response, base + "/patient/payment/fail?appointmentId=" + optA);
    }

    @PostMapping(value = "/aamarpay/cancel", consumes = MediaType.APPLICATION_FORM_URLENCODED_VALUE)
    public void aamarPayCancel(@RequestParam Map<String, String> requestData,
            HttpServletResponse response) throws IOException {
        log.info("AamarPay cancel callback received (POST). Data: {}", requestData);
        handlePaymentCancel(requestData, response);
    }

    @GetMapping("/aamarpay/cancel")
    public void aamarPayCancelGet(@RequestParam Map<String, String> requestData,
            HttpServletResponse response) throws IOException {
        log.info("AamarPay cancel callback received (GET). Data: {}", requestData);
        handlePaymentCancel(requestData, response);
    }

    private void handlePaymentCancel(Map<String, String> requestData, HttpServletResponse response) throws IOException {
        String optA = requestData.getOrDefault("opt_a", "");
        String base = resolveBase(requestData.getOrDefault("opt_b", ""));
        redirectToFrontend(response, base + "/patient/payment/cancel?appointmentId=" + optA);
    }

    /** Returns opt_b (the browser origin) if it looks like a valid HTTPS origin, otherwise falls back to config. */
    private String resolveBase(String optB) {
        if (optB != null && optB.startsWith("https://") && !optB.contains(" ") && optB.length() < 100) {
            return optB;
        }
        return frontendUrl;
    }

    private void redirectToFrontend(HttpServletResponse response, String redirectUrl) throws IOException {
        response.setStatus(HttpServletResponse.SC_OK);
        response.setContentType("text/html; charset=UTF-8");
        String safeUrl = redirectUrl.replace("'", "\\'");
        String html = "<!DOCTYPE html><html><head><title>Redirecting…</title>"
                + "<meta http-equiv=\"refresh\" content=\"0;url='" + safeUrl + "'\">"
                + "</head><body>"
                + "<script>"
                + "var url='" + safeUrl + "';"
                + "if(window.top&&window.top!==window.self){window.top.location.href=url;}"
                + "else{window.location.href=url;}"
                + "</script>"
                + "<p style=\"font-family:sans-serif;text-align:center;margin-top:80px\">"
                + "Redirecting, please wait…</p>"
                + "</body></html>";
        response.getWriter().write(html);
        response.flushBuffer();
    }
}
