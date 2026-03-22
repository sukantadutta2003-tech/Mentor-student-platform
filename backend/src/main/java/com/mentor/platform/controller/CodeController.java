package com.mentor.platform.controller;

import com.mentor.platform.dto.CodeUpdateDto;
import lombok.RequiredArgsConstructor;
import org.springframework.messaging.handler.annotation.DestinationVariable;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Controller;

@Controller
@RequiredArgsConstructor
public class CodeController {

    private final SimpMessagingTemplate messagingTemplate;

    @MessageMapping("/code/{sessionId}")
    public void sendCodeUpdate(@DestinationVariable String sessionId, @Payload CodeUpdateDto codeUpdate) {
        // Broadcast code directly over the STOMP channel as it relies on last-write-wins in real-time
        messagingTemplate.convertAndSend("/topic/session/" + sessionId + "/code", codeUpdate);
    }
}
