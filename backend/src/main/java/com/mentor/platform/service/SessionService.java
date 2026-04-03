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
            session.setStudentPresent(true);
            session = sessionRepository.save(session);
        } else if (currentUser.getRole() == Role.STUDENT && !session.getStudentId().equals(currentUser.getId())) {
             throw new RuntimeException("Session is already occupied by another student");
        } else if (currentUser.getRole() == Role.STUDENT && session.getStudentId().equals(currentUser.getId())) {
             session.setStudentPresent(true);
             session = sessionRepository.save(session);
        } else if (currentUser.getRole() == Role.MENTOR && session.getMentorId().equals(currentUser.getId())) {
             session.setMentorPresent(true);
             session = sessionRepository.save(session);
        }

        return mapToResponse(session);
    }

    public SessionResponse getSession(String sessionId) {
        Session session = sessionRepository.findById(sessionId)
                .orElseThrow(() -> new RuntimeException("Session not found"));
        return mapToResponse(session);
    }

    public SessionResponse endSession(String sessionId) {
        // Keeping this for explicit ends if needed
        Session session = sessionRepository.findById(sessionId)
                .orElseThrow(() -> new RuntimeException("Session not found"));
        
        User currentUser = getCurrentUser();
        if (!currentUser.getId().equals(session.getMentorId()) && 
            (session.getStudentId() != null && !currentUser.getId().equals(session.getStudentId()))) {
            throw new RuntimeException("Not authorized to end this session");
        }

        session.setStatus(SessionStatus.COMPLETED);
        session.setEndTime(LocalDateTime.now());
        session.setMentorPresent(false);
        session.setStudentPresent(false);
        
        Session savedSession = sessionRepository.save(session);
        return mapToResponse(savedSession);
    }

    public SessionResponse leaveSession(String sessionId) {
        Session session = sessionRepository.findById(sessionId)
                .orElseThrow(() -> new RuntimeException("Session not found"));
        
        User currentUser = getCurrentUser();
        
        if (currentUser.getId().equals(session.getMentorId())) {
            session.setMentorPresent(false);
        } else if (currentUser.getId().equals(session.getStudentId())) {
            session.setStudentPresent(false);
        } else {
            throw new RuntimeException("Not authorized to leave this session");
        }

        // If both left, complete session
        if (!session.isMentorPresent() && !session.isStudentPresent()) {
            session.setStatus(SessionStatus.COMPLETED);
            session.setEndTime(LocalDateTime.now());
        }

        Session savedSession = sessionRepository.save(session);
        return mapToResponse(savedSession);
    }

    public List<SessionResponse> getMySessions() {
        User currentUser = getCurrentUser();
        List<Session> sessions = sessionRepository.findByMentorIdOrStudentIdOrderByStartTimeDesc(
                currentUser.getId(), currentUser.getId());
        return sessions.stream().map(this::mapToResponse).collect(Collectors.toList());
    }

    public void clearHistory() {
        User currentUser = getCurrentUser();
        List<Session> completed = sessionRepository.findByStatusAndMentorIdOrStatusAndStudentId(
                SessionStatus.COMPLETED, currentUser.getId(),
                SessionStatus.COMPLETED, currentUser.getId());
        sessionRepository.deleteAll(completed);
    }

    private SessionResponse mapToResponse(Session session) {
        String mentorUsername = userRepository.findById(session.getMentorId())
                .map(User::getUsername).orElse("Unknown Mentor");
        String studentUsername = null;
        if (session.getStudentId() != null) {
            studentUsername = userRepository.findById(session.getStudentId())
                    .map(User::getUsername).orElse("Unknown Student");
        }

        return SessionResponse.builder()
                .id(session.getId())
                .mentorId(session.getMentorId())
                .studentId(session.getStudentId())
                .mentorUsername(mentorUsername)
                .studentUsername(studentUsername)
                .status(session.getStatus())
                .startTime(session.getStartTime())
                .endTime(session.getEndTime())
                .build();
    }
}
