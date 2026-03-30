package com.vitabridge.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;
import org.springframework.web.socket.config.annotation.EnableWebSocketMessageBroker;
import org.springframework.web.socket.config.annotation.StompEndpointRegistry;
import org.springframework.web.socket.config.annotation.WebSocketMessageBrokerConfigurer;

import java.util.List;

@Configuration
@EnableWebSocketMessageBroker
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {

    @Value("${app.ws.allowed-origin-patterns:*}")
    private List<String> wsAllowedOriginPatterns;

    @Override
    public void configureMessageBroker(MessageBrokerRegistry config) {
        // Topics clients can subscribe to
        config.enableSimpleBroker("/topic", "/queue");
        // Prefix for messages from client -> server
        config.setApplicationDestinationPrefixes("/app");
        // Prefix for user-specific messages
        config.setUserDestinationPrefix("/user");
    }

    @Override
    public void registerStompEndpoints(StompEndpointRegistry registry) {
        // Native WebSocket endpoint
        registry.addEndpoint("/ws")
                .setAllowedOriginPatterns(wsAllowedOriginPatterns.toArray(String[]::new));
        // SockJS fallback for environments that need it
        registry.addEndpoint("/ws-sockjs")
                .setAllowedOriginPatterns(wsAllowedOriginPatterns.toArray(String[]::new))
                .withSockJS();
    }
}
