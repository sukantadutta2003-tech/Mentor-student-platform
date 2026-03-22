package com.mentor.platform.service;

import com.mentor.platform.dto.SessionResponse;
import com.mentor.platform.entity.Role;
import com.mentor.platform.entity.Session;
import com.mentor.platform.entity.SessionStatus;
import com.mentor.platform.entity.User;
import com.mentor.platform.repository.SessionRepository;
import com.mentor.platform.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class SessionService {

    private final SessionRepository sessionRepository;
    private final UserRepository userRepository;

    private User getCurrentUser() {
        Object principal = SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        if (principal instanceof UserDetails userDetails) {
            String email = userDetails.getUsername();
            return userRepository.findByEmail(email)
                    .orElseThrow(() -> new RuntimeException("User not found"));
        }
        throw new RuntimeException("Not authenticated");
    }

    public SessionResponse createSession() {
        User currentUser = getCurrentUser();
        if (currentUser.getRole() != Role.MENTOR) {
            throw new RuntimeException("Only mentors can create sessions");
        }

        Session session = Session.builder()
                .mentorId(currentUser.getId())
                .status(SessionStatus.ACTIVE)
                .build();
        
        Session savedSession = sessionRepository.save(session);
        return mapToResponse(savedSession);
    }

    public SessionResponse joinSession(String sessionId) {
        User currentUser = getCurrentUser();
        Session session = sessionRepository.findById(sessionId)
                .orElseThrow(() -> new RuntimeException("Session not found"));

        if (session.getStatus() != SessionStatus.ACTIVE) {
            throw new RuntimeException("Session is no longer active");
        }

        if (currentUser.getRole() == Role.STUDENT && session.getStudentId() == null) {
            session.setStudentId(currentUser.getId());
            session = sessionRepository.save(session);
        } else if (currentUser.getRole() == Role.STUDENT && !session.getStudentId().equals(currentUser.getId())) {
             throw new RuntimeException("Session is already occupied by another student");
        }

        return mapToResponse(session);
    }

    public SessionResponse getSession(String sessionId) {
        Session session = sessionRepository.findById(sessionId)
                .orElseThrow(() -> new RuntimeException("Session not found"));
        return mapToResponse(session);
    }

    public SessionResponse endSession(String sessionId) {
        Session session = sessionRepository.findById(sessionId)
                .orElseThrow(() -> new RuntimeException("Session not found"));
        
        User currentUser = getCurrentUser();
        if (!currentUser.getId().equals(session.getMentorId()) && 
            (session.getStudentId() != null && !currentUser.getId().equals(session.getStudentId()))) {
            throw new RuntimeException("Not authorized to end this session");
        }

        session.setStatus(SessionStatus.COMPLETED);
        session.setEndTime(LocalDateTime.now());
        
        Session savedSession = sessionRepository.save(session);
        return mapToResponse(savedSession);
    }

    public List<SessionResponse> getMySessions() {
        User currentUser = getCurrentUser();
        List<Session> sessions = sessionRepository.findByMentorIdOrStudentIdOrderByStartTimeDesc(
                currentUser.getId(), currentUser.getId());
        return sessions.stream().map(this::mapToResponse).collect(Collectors.toList());
    }

    private SessionResponse mapToResponse(Session session) {
        return SessionResponse.builder()
                .id(session.getId())
                .mentorId(session.getMentorId())
                .studentId(session.getStudentId())
                .status(session.getStatus())
                .startTime(session.getStartTime())
                .endTime(session.getEndTime())
                .build();
    }
}
