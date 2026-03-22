package com.mentor.platform.controller;

import com.mentor.platform.dto.WebRTCSignalDto;
import lombok.RequiredArgsConstructor;
import org.springframework.messaging.handler.annotation.DestinationVariable;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Controller;

@Controller
@RequiredArgsConstructor
public class SignalingController {

    private final SimpMessagingTemplate messagingTemplate;

    @MessageMapping("/signal/{sessionId}")
    public void handleSignal(@DestinationVariable String sessionId, @Payload WebRTCSignalDto signal) {
        // Relay the signaling message to the other peer in the session
        messagingTemplate.convertAndSend("/topic/session/" + sessionId + "/signal", signal);
    }
}
