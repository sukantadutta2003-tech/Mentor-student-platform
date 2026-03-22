package com.mentor.platform.repository;

import com.mentor.platform.entity.Session;
import org.springframework.data.jpa.repository.JpaRepository;

public interface SessionRepository extends JpaRepository<Session, String> {
}
