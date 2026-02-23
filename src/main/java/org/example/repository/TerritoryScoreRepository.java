package org.example.repository;

import org.example.model.TerritoryScore;
import org.example.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface TerritoryScoreRepository extends JpaRepository<TerritoryScore, Long> {

    Optional<TerritoryScore> findByLatCellAndLngCellAndUser(int latCell, int lngCell, User user);

    @Query("SELECT t FROM TerritoryScore t WHERE t.latCell >= :minLat AND t.latCell <= :maxLat " +
           "AND t.lngCell >= :minLng AND t.lngCell <= :maxLng")
    List<TerritoryScore> findInBounds(@Param("minLat") int minLat, @Param("maxLat") int maxLat,
                                      @Param("minLng") int minLng, @Param("maxLng") int maxLng);

    List<TerritoryScore> findByLatCellAndLngCellOrderByWaypointCountDesc(int latCell, int lngCell);
}
