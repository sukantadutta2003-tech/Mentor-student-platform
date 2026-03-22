package com.mentor.platform.controller;

import com.mentor.platform.dto.ChatMessageDto;
import com.mentor.platform.entity.Message;
import com.mentor.platform.repository.MessageRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.messaging.handler.annotation.DestinationVariable;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.simp.SimpMessageHeaderAccessor;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequiredArgsConstructor
public class ChatController {

    private final SimpMessagingTemplate messagingTemplate;
    private final MessageRepository messageRepository;

    @MessageMapping("/chat/{sessionId}")
    public void sendChat(@DestinationVariable String sessionId, @Payload ChatMessageDto chatMessage, SimpMessageHeaderAccessor headerAccessor) {
        
        if (chatMessage.getTimestamp() == null) {
            chatMessage.setTimestamp(LocalDateTime.now());
        }

        // Save to Database
        Message message = Message.builder()
                .sessionId(sessionId)
                .senderId(chatMessage.getSenderId())
                .content(chatMessage.getContent())
                .timestamp(chatMessage.getTimestamp())
                .build();
        messageRepository.save(message);

        // Broadcast to specific session channel
        messagingTemplate.convertAndSend("/topic/session/" + sessionId, chatMessage);
    }
    
    // REST API to get history
    @GetMapping("/api/sessions/{sessionId}/messages")
    public List<ChatMessageDto> getSessionMessages(@PathVariable String sessionId) {
        return messageRepository.findBySessionIdOrderByTimestampAsc(sessionId).stream()
                .map(msg -> ChatMessageDto.builder()
                        .sessionId(msg.getSessionId())
                        .senderId(msg.getSenderId())
                        .content(msg.getContent())
                        .timestamp(msg.getTimestamp())
                        .build())
                .collect(Collectors.toList());
    }
}
