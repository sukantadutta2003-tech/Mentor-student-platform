package com.mentor.platform.repository;

import com.mentor.platform.entity.Session;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface SessionRepository extends JpaRepository<Session, String> {
    List<Session> findByMentorIdOrStudentIdOrderByStartTimeDesc(Long mentorId, Long studentId);
}
