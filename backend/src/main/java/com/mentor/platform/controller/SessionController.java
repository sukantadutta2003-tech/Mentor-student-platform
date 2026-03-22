package com.mentor.platform.controller;

import com.mentor.platform.dto.JoinSessionRequest;
import com.mentor.platform.dto.SessionResponse;
import com.mentor.platform.service.SessionService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/sessions")
@RequiredArgsConstructor
public class SessionController {

    private final SessionService sessionService;

    @PostMapping("/create")
    public ResponseEntity<SessionResponse> createSession() {
        return ResponseEntity.ok(sessionService.createSession());
    }

    @PostMapping("/join")
    public ResponseEntity<SessionResponse> joinSession(@Valid @RequestBody JoinSessionRequest request) {
        return ResponseEntity.ok(sessionService.joinSession(request.getSessionId()));
    }

    @PostMapping("/{id}/end")
    public ResponseEntity<SessionResponse> endSession(@PathVariable String id) {
        return ResponseEntity.ok(sessionService.endSession(id));
    }

    @GetMapping("/{id}")
    public ResponseEntity<SessionResponse> getSession(@PathVariable String id) {
        return ResponseEntity.ok(sessionService.getSession(id));
    }

    @GetMapping("/my")
    public ResponseEntity<List<SessionResponse>> getMySessions() {
        return ResponseEntity.ok(sessionService.getMySessions());
    }
}
