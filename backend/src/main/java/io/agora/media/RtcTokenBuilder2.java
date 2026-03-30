package io.agora.media;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.ByteBuffer;
import java.nio.ByteOrder;
import java.security.MessageDigest;
import java.util.Base64;
import java.util.zip.CRC32;

//Agora RTC Token Builder for generating access tokens
public class RtcTokenBuilder2 {

    public enum Role {
        ROLE_PUBLISHER(1),
        ROLE_SUBSCRIBER(2),
        ROLE_ATTENDEE(0);

        private final int value;

        Role(int value) {
            this.value = value;
        }

        public int getValue() {
            return value;
        }
    }

    private static final String VERSION = "007";

    //Build RTC token with UID
    public String buildTokenWithUid(
            String appId,
            String appCertificate,
            String channelName,
            int uid,
            Role role,
            int privilegeExpiredTs,
            int accountExpiredTs
    ) {
        return buildTokenWithAccount(appId, appCertificate, channelName, 
                String.valueOf(uid), role, privilegeExpiredTs, accountExpiredTs);
    }

    //Build RTC token with user account
    public String buildTokenWithAccount(
            String appId,
            String appCertificate,
            String channelName,
            String account,
            Role role,
            int privilegeExpiredTs,
            int accountExpiredTs
    ) {
        try {
            AccessToken token = new AccessToken(appId, appCertificate, channelName, account);
            token.addPrivilege(AccessToken.Privileges.JOIN_CHANNEL, privilegeExpiredTs);
            
            if (role == Role.ROLE_PUBLISHER || role == Role.ROLE_ATTENDEE) {
                token.addPrivilege(AccessToken.Privileges.PUBLISH_AUDIO_STREAM, privilegeExpiredTs);
                token.addPrivilege(AccessToken.Privileges.PUBLISH_VIDEO_STREAM, privilegeExpiredTs);
                token.addPrivilege(AccessToken.Privileges.PUBLISH_DATA_STREAM, privilegeExpiredTs);
            }
            
            token.setExpireTimestamp(accountExpiredTs);
            return token.build();
        } catch (Exception e) {
            throw new RuntimeException("Failed to generate Agora token", e);
        }
    }

    //Internal AccessToken class for token generation
    private static class AccessToken {
        enum Privileges {
            JOIN_CHANNEL(1),
            PUBLISH_AUDIO_STREAM(2),
            PUBLISH_VIDEO_STREAM(3),
            PUBLISH_DATA_STREAM(4);

            final int value;

            Privileges(int value) {
                this.value = value;
            }
        }

        private final String appId;
        private final String appCertificate;
        private final String channelName;
        private final String account;
        private final StringBuilder privileges;
        private int expireTimestamp;
        private int issueTimestamp;
        private int salt;

        AccessToken(String appId, String appCertificate, String channelName, String account) {
            this.appId = appId;
            this.appCertificate = appCertificate;
            this.channelName = channelName;
            this.account = account;
            this.privileges = new StringBuilder();
            this.issueTimestamp = (int) (System.currentTimeMillis() / 1000);
            this.salt = (int) (Math.random() * 100000000);
            this.expireTimestamp = 0;
        }

        void addPrivilege(Privileges privilege, int expireTimestamp) {
            privileges.append(privilege.value).append(",").append(expireTimestamp).append(";");
        }

        void setExpireTimestamp(int expireTimestamp) {
            this.expireTimestamp = expireTimestamp;
        }

        String build() throws Exception {
            if (appCertificate == null || appCertificate.isEmpty()) {
                return "";
            }

            String message = buildMessage();
            byte[] signature = hmacSign(appCertificate, message);
            
            CRC32 crc = new CRC32();
            crc.update(message.getBytes());
            int crcChannelName = (int) crc.getValue();
            crc.reset();
            crc.update(account.getBytes());
            int crcUid = (int) crc.getValue();

            ByteBuffer buffer = ByteBuffer.allocate(1024);
            buffer.order(ByteOrder.LITTLE_ENDIAN);
            
            packString(buffer, signature);
            buffer.putInt(crcChannelName);
            buffer.putInt(crcUid);
            packString(buffer, message.getBytes());

            byte[] content = new byte[buffer.position()];
            buffer.flip();
            buffer.get(content);

            return VERSION + appId + Base64.getEncoder().encodeToString(content);
        }

        private String buildMessage() {
            StringBuilder msg = new StringBuilder();
            msg.append(appId);
            msg.append(channelName);
            msg.append(account);
            msg.append(salt);
            msg.append(issueTimestamp);
            msg.append(expireTimestamp);
            msg.append(privileges.toString());
            return msg.toString();
        }

        private byte[] hmacSign(String key, String message) throws Exception {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] keyBytes = digest.digest(key.getBytes());
            
            Mac mac = Mac.getInstance("HmacSHA256");
            SecretKeySpec secretKey = new SecretKeySpec(keyBytes, "HmacSHA256");
            mac.init(secretKey);
            return mac.doFinal(message.getBytes());
        }

        private void packString(ByteBuffer buffer, byte[] data) {
            buffer.putShort((short) data.length);
            buffer.put(data);
        }
    }
}
