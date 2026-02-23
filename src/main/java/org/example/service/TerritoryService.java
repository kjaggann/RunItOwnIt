package org.example.service;

import org.example.dto.TerritoryResponse;
import org.example.model.RoutePoint;
import org.example.model.TerritoryScore;
import org.example.model.User;
import org.example.repository.TerritoryScoreRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;
import java.util.stream.Collectors;

@Service
public class TerritoryService {

    private final TerritoryScoreRepository territoryScoreRepository;

    public TerritoryService(TerritoryScoreRepository territoryScoreRepository) {
        this.territoryScoreRepository = territoryScoreRepository;
    }

    @Transactional
    public void processRun(User user, List<RoutePoint> points) {
        // Group points by grid cell
        Map<String, Long> cellCounts = new HashMap<>();
        Map<String, int[]> cellKeys = new HashMap<>();

        for (RoutePoint point : points) {
            int latCell = (int) Math.floor(point.getLatitude() * 100);
            int lngCell = (int) Math.floor(point.getLongitude() * 100);
            String key = latCell + "," + lngCell;
            cellCounts.merge(key, 1L, Long::sum);
            cellKeys.putIfAbsent(key, new int[]{latCell, lngCell});
        }

        for (Map.Entry<String, Long> entry : cellCounts.entrySet()) {
            int[] cells = cellKeys.get(entry.getKey());
            int latCell = cells[0];
            int lngCell = cells[1];
            long count = entry.getValue();

            TerritoryScore score = territoryScoreRepository
                    .findByLatCellAndLngCellAndUser(latCell, lngCell, user)
                    .orElseGet(() -> {
                        TerritoryScore s = new TerritoryScore();
                        s.setLatCell(latCell);
                        s.setLngCell(lngCell);
                        s.setUser(user);
                        s.setWaypointCount(0L);
                        return s;
                    });

            score.setWaypointCount(score.getWaypointCount() + count);
            territoryScoreRepository.save(score);
        }
    }

    @Transactional(readOnly = true)
    public List<TerritoryResponse> getTerritoriesInBounds(String username,
                                                           double minLat, double maxLat,
                                                           double minLng, double maxLng) {
        int minLatCell = (int) Math.floor(minLat * 100);
        int maxLatCell = (int) Math.floor(maxLat * 100);
        int minLngCell = (int) Math.floor(minLng * 100);
        int maxLngCell = (int) Math.floor(maxLng * 100);

        List<TerritoryScore> scores = territoryScoreRepository
                .findInBounds(minLatCell, maxLatCell, minLngCell, maxLngCell);

        // Group by cell, find top scorer per cell
        Map<String, List<TerritoryScore>> byCell = scores.stream()
                .collect(Collectors.groupingBy(s -> s.getLatCell() + "," + s.getLngCell()));

        List<TerritoryResponse> result = new ArrayList<>();
        for (Map.Entry<String, List<TerritoryScore>> entry : byCell.entrySet()) {
            List<TerritoryScore> cellScores = entry.getValue();

            TerritoryScore owner = cellScores.stream()
                    .max(Comparator.comparingLong(TerritoryScore::getWaypointCount))
                    .orElse(null);
            if (owner == null) continue;

            long myScore = cellScores.stream()
                    .filter(s -> s.getUser().getUsername().equals(username))
                    .mapToLong(TerritoryScore::getWaypointCount)
                    .findFirst()
                    .orElse(0L);

            boolean ownedByMe = owner.getUser().getUsername().equals(username);

            result.add(new TerritoryResponse(
                    owner.getLatCell() / 100.0,
                    owner.getLngCell() / 100.0,
                    owner.getUser().getUsername(),
                    myScore,
                    owner.getWaypointCount(),
                    ownedByMe
            ));
        }

        return result;
    }
}
