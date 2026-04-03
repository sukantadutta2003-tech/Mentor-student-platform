package com.mentor.platform.dto;

import com.mentor.platform.entity.SessionStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class SessionResponse {
    private String id;
    private Long mentorId;
    private Long studentId;
    private SessionStatus status;
    private LocalDateTime startTime;
    private LocalDateTime endTime;
    private String mentorUsername;
    private String studentUsername;
}
