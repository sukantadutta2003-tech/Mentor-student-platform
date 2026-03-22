package com.mentor.platform.repository;

import com.mentor.platform.entity.Message;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface MessageRepository extends JpaRepository<Message, Long> {
    List<Message> findBySessionIdOrderByTimestampAsc(String sessionId);
}
