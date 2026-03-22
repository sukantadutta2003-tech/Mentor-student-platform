package com.mentor.platform.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class CodeUpdateDto {
    private String sessionId;
    private Long senderId;
    private String content;
    private String language;
}
