package org.example.repository;

import org.example.model.RoutePoint;
import org.example.model.Run;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface RoutePointRepository extends JpaRepository<RoutePoint, Long> {
    List<RoutePoint> findByRunOrderBySequenceAsc(Run run);
}
