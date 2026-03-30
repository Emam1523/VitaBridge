package com.vitabridge.service;

import io.agora.media.RtcTokenBuilder2;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

@Service
public class AgoraTokenService {

    private static final Logger log = LoggerFactory.getLogger(AgoraTokenService.class);

    @Value("${agora.appId}")
    private String appId;

    @Value("${agora.appCertificate:}")
    private String appCertificate;

    @Value("${agora.useToken:false}")
    private boolean useToken;

    public String getAppId() {
        return appId != null ? appId.trim() : null;
    }

   // Generate an RTC token for the given channel and uid
    public String generateRtcToken(String channelName, int uid) {
        if (!useToken) {
            log.debug("Token generation disabled (agora.useToken=false). Joining without token.");
            return null;
        }

        String cleanedAppCertificate = appCertificate != null ? appCertificate.trim() : null;
        String cleanedAppId = getAppId();

        if (cleanedAppCertificate == null || cleanedAppCertificate.isEmpty()) {
            log.warn("agora.useToken is true but no appCertificate configured. Joining without token.");
            return null;
        }

        if (cleanedAppId == null || cleanedAppId.isEmpty()) {
            log.error("App ID is missing!");
            return null;
        }

        log.info("Generating Agora Token | App ID Length: {} | Cert Length: {}", 
            cleanedAppId.length(), cleanedAppCertificate.length());

        try {
            int expireTime = 3600;
            int currentTs = (int) (System.currentTimeMillis() / 1000);
            int privilegeExpiredTs = currentTs + expireTime;

            RtcTokenBuilder2 tokenBuilder = new RtcTokenBuilder2();
            String token = tokenBuilder.buildTokenWithUid(
                    cleanedAppId,
                    cleanedAppCertificate,
                    channelName,
                    uid,
                    RtcTokenBuilder2.Role.ROLE_PUBLISHER,
                    privilegeExpiredTs,
                    privilegeExpiredTs
            );

            if (token == null || token.isEmpty()) {
                log.warn("Token generation returned empty token. Joining without token.");
                return null;
            }

            return token;
        } catch (Exception e) {
            log.error("Failed to generate Agora RTC token: {}", e.getMessage(), e);
            return null;
        }
    }
}
