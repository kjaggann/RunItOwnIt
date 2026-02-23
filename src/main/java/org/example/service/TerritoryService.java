package org.example.service;

import org.example.dto.LeaderboardEntry;
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

    // ~10km × ~9km cells — city/town level
    private static int latCell(double lat) { return (int) Math.floor(lat * 10); }
    private static int lngCell(double lng) { return (int) Math.floor(lng * 10); }

    @Transactional
    public void processRun(User user, List<RoutePoint> points) {
        Map<String, Long> cellCounts = new HashMap<>();
        Map<String, int[]> cellKeys = new HashMap<>();

        for (RoutePoint point : points) {
            int lc = latCell(point.getLatitude());
            int nc = lngCell(point.getLongitude());
            String key = lc + "," + nc;
            cellCounts.merge(key, 1L, Long::sum);
            cellKeys.putIfAbsent(key, new int[]{lc, nc});
        }

        for (Map.Entry<String, Long> entry : cellCounts.entrySet()) {
            int[] cells = cellKeys.get(entry.getKey());
            long count = entry.getValue();

            TerritoryScore score = territoryScoreRepository
                    .findByLatCellAndLngCellAndUser(cells[0], cells[1], user)
                    .orElseGet(() -> {
                        TerritoryScore s = new TerritoryScore();
                        s.setLatCell(cells[0]);
                        s.setLngCell(cells[1]);
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
        int minLatCell = latCell(minLat);
        int maxLatCell = latCell(maxLat);
        int minLngCell = lngCell(minLng);
        int maxLngCell = lngCell(maxLng);

        List<TerritoryScore> scores = territoryScoreRepository
                .findInBounds(minLatCell, maxLatCell, minLngCell, maxLngCell);

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
                    owner.getLatCell(),
                    owner.getLngCell(),
                    owner.getLatCell() / 10.0,
                    owner.getLngCell() / 10.0,
                    owner.getUser().getUsername(),
                    myScore,
                    owner.getWaypointCount(),
                    ownedByMe
            ));
        }

        return result;
    }

    @Transactional(readOnly = true)
    public List<LeaderboardEntry> getLeaderboard(int latCell, int lngCell) {
        List<TerritoryScore> scores = territoryScoreRepository
                .findByLatCellAndLngCellOrderByWaypointCountDesc(latCell, lngCell);
        List<LeaderboardEntry> entries = new ArrayList<>();
        for (int i = 0; i < scores.size(); i++) {
            TerritoryScore s = scores.get(i);
            entries.add(new LeaderboardEntry(i + 1, s.getUser().getUsername(), s.getWaypointCount()));
        }
        return entries;
    }
}
