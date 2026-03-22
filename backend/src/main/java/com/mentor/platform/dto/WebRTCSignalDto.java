package com.mentor.platform.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class WebRTCSignalDto {
    private String sessionId;
    private Long senderId;
    private String type;       // "offer", "answer", "ice-candidate"
    private Object payload;    // SDP description or ICE candidate
}
