package org.example.repository;

import org.example.model.Run;
import org.example.model.User;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface RunRepository extends JpaRepository<Run, Long> {
    Page<Run> findByUserOrderByDateDesc(User user, Pageable pageable);
    List<Run> findByUser(User user);
    List<Run> findByUserAndDateBetween(User user, LocalDate start, LocalDate end);
    Optional<Run> findByIdAndUser(Long id, User user);
}
