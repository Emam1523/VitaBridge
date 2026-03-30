package com.vitabridge.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.vitabridge.model.Appointment;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.HashMap;
import java.util.Map;

@Service
public class AamarPayService {

    private static final Logger log = LoggerFactory.getLogger(AamarPayService.class);

    @Value("${aamarpay.storeId}")
    private String storeId;

    @Value("${aamarpay.signatureKey}")
    private String signatureKey;

    @Value("${aamarpay.paymentUrl}")
    private String paymentUrl;

    @Value("${aamarpay.validationUrl}")
    private String validationUrl;

    @Value("${aamarpay.successUrl}")
    private String successUrl;

    @Value("${aamarpay.failUrl}")
    private String failUrl;

    @Value("${aamarpay.cancelUrl}")
    private String cancelUrl;

    @Autowired
    private RestTemplate restTemplate;

    private final ObjectMapper objectMapper = new ObjectMapper();

    /**
     * @param clientOrigin  The browser's window.location.origin (e.g. "https://localhost:5173"
     *                      or "https://192.168.x.x:5173").  When provided, the AamarPay callback
     *                      URLs are set to go through the Vite proxy on that same origin, so:
     *                      (a) the self-signed cert is already trusted (no cert warning),
     *                      (b) the final redirect lands on the same origin as the app
     *                          (localStorage / JWT is preserved — patient stays logged in).
     */
    public String initPayment(Appointment appointment, String transactionId, String clientOrigin) {
        try {
            var patient = appointment.getPatient();

            Double fee = appointment.getDoctor().getConsultationFee();
            if (fee == null || fee <= 0) {
                fee = 1.0;
            }
            String amount = String.format("%.2f", fee);

            String cusName = notBlank(patient.getName(), "Patient");
            String cusEmail = notBlank(patient.getEmail(), "patient@vitabridge.com");
            String cusPhone = notBlank(patient.getPhoneNumber(), "01700000000");

            // Build callback URLs.  If the browser sent its origin, route callbacks
            // through the Vite proxy (/api/*) so only port 5173 must be reachable.
            boolean hasOrigin = clientOrigin != null && clientOrigin.startsWith("https://");
            String resolvedSuccessUrl = hasOrigin ? clientOrigin + "/api/payments/aamarpay/success" : successUrl;
            String resolvedFailUrl    = hasOrigin ? clientOrigin + "/api/payments/aamarpay/fail"    : failUrl;
            String resolvedCancelUrl  = hasOrigin ? clientOrigin + "/api/payments/aamarpay/cancel"  : cancelUrl;

            Map<String, Object> requestData = new HashMap<>();
            requestData.put("store_id", storeId);
            requestData.put("signature_key", signatureKey);
            requestData.put("tran_id", transactionId);
            requestData.put("success_url", resolvedSuccessUrl);
            requestData.put("fail_url", resolvedFailUrl);
            requestData.put("cancel_url", resolvedCancelUrl);
            requestData.put("amount", amount);
            requestData.put("currency", "BDT");
            requestData.put("type", "json"); // required by AamarPay
            requestData.put("desc", "VitaBridge Appointment #" + appointment.getId());

            // Customer info (required)
            requestData.put("cus_name", cusName);
            requestData.put("cus_email", cusEmail);
            requestData.put("cus_phone", cusPhone);
            requestData.put("cus_add1", "Dhaka");
            requestData.put("cus_city", "Dhaka");
            requestData.put("cus_state", "Dhaka");
            requestData.put("cus_postcode", "1000");
            requestData.put("cus_country", "Bangladesh");

            // Shipment info (required by AamarPay even for services)
            requestData.put("ship_name", cusName);
            requestData.put("ship_add1", "Dhaka");
            requestData.put("ship_city", "Dhaka");
            requestData.put("ship_state", "Dhaka");
            requestData.put("ship_postcode", "1000");
            requestData.put("ship_country", "Bangladesh");
            requestData.put("ship_phone", cusPhone);

            // opt_a = appointmentId; opt_b = clientOrigin (used for post-payment redirect)
            requestData.put("opt_a", appointment.getId().toString());
            if (hasOrigin) {
                requestData.put("opt_b", clientOrigin);
            }

            log.debug("AamarPay request to {}: store={}, amount={}, tran_id={}", paymentUrl, storeId, amount,
                    transactionId);

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            HttpEntity<Map<String, Object>> request = new HttpEntity<>(requestData, headers);

            ResponseEntity<String> responseEntity = restTemplate.postForEntity(paymentUrl, request, String.class);

            log.debug("AamarPay response: status={}, body={}", responseEntity.getStatusCode(),
                    responseEntity.getBody());

            if (responseEntity.getStatusCode().is2xxSuccessful()) {
                JsonNode responseJson = objectMapper.readTree(responseEntity.getBody());
                if (responseJson.has("result") && "true".equalsIgnoreCase(responseJson.get("result").asText())) {
                    return responseJson.get("payment_url").asText();
                } else {
                    String errMsg = responseJson.has("reason") ? responseJson.get("reason").asText()
                            : responseEntity.getBody();
                    throw new RuntimeException("AamarPay initialization failed: " + errMsg);
                }
            } else {
                throw new RuntimeException(
                        "AamarPay HTTP error: " + responseEntity.getStatusCode() + " - " + responseEntity.getBody());
            }
        } catch (Exception e) {
            log.error("Error initializing AamarPay payment", e);
            throw new RuntimeException("Error initializing AamarPay payment: " + e.getMessage(), e);
        }
    }

    private String notBlank(String value, String fallback) {
        return (value != null && !value.isBlank()) ? value : fallback;
    }

    public boolean verifyPayment(String transactionId) {
        try {
            log.info("Verifying payment with AamarPay: transactionId={}", transactionId);

            String url = validationUrl
                    + "?request_id=" + transactionId
                    + "&store_id=" + storeId
                    + "&signature_key=" + signatureKey
                    + "&type=json";

            ResponseEntity<String> responseEntity = restTemplate.getForEntity(url, String.class);

            if (responseEntity.getStatusCode().is2xxSuccessful() && responseEntity.getBody() != null) {
                JsonNode responseJson = objectMapper.readTree(responseEntity.getBody());

                String status = responseJson.has("pay_status") ? responseJson.get("pay_status").asText() : "";
                if ("Successful".equalsIgnoreCase(status)) {
                    log.info("Payment verified successfully for transactionId={}", transactionId);
                    return true;
                }

                log.warn("Payment verification returned non-success for transactionId={}: {}", transactionId, status);
                return false;
            }

            log.warn("Payment verification request failed: status={}", responseEntity.getStatusCode());
            return false;

        } catch (Exception e) {
            log.error("Error verifying payment with AamarPay: {}", e.getMessage());
            return false;
        }
    }
}
