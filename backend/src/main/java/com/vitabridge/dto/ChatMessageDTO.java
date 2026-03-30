package com.vitabridge.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class ChatMessageDTO {

    private UUID id;
    private SenderDTO sender;
    private String content;
    private String messageType;
    private String fileUrl;
    private String fileName;
    private LocalDateTime sentAt;
    private Boolean isRead;

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class SenderDTO {
        private UUID id;
        private String name;
    }
}
