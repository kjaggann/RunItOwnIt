package org.example.service;

import org.example.dto.StatsResponse;
import org.example.model.Run;
import org.example.model.User;
import org.example.repository.RunRepository;
import org.example.repository.UserRepository;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class StatsService {

    private final RunRepository runRepository;
    private final UserRepository userRepository;

    public StatsService(RunRepository runRepository, UserRepository userRepository) {
        this.runRepository = runRepository;
        this.userRepository = userRepository;
    }

    private User getUser(String username) {
        return userRepository.findByUsername(username)
                .orElseThrow(() -> new UsernameNotFoundException("User not found: " + username));
    }

    @Transactional(readOnly = true)
    public StatsResponse getSummary(String username) {
        User user = getUser(username);
        List<Run> allRuns = runRepository.findByUser(user);
        LocalDate thirtyDaysAgo = LocalDate.now().minusDays(30);

        List<Run> recentRuns = allRuns.stream()
                .filter(r -> r.getDate() != null && !r.getDate().isBefore(thirtyDaysAgo))
                .collect(Collectors.toList());

        return new StatsResponse(
                allRuns.size(),
                allRuns.stream().mapToDouble(r -> r.getDistanceKm() != null ? r.getDistanceKm() : 0).sum(),
                allRuns.stream().mapToLong(r -> r.getDurationSeconds() != null ? r.getDurationSeconds() : 0).sum(),
                recentRuns.size(),
                recentRuns.stream().mapToDouble(r -> r.getDistanceKm() != null ? r.getDistanceKm() : 0).sum(),
                recentRuns.stream().mapToLong(r -> r.getDurationSeconds() != null ? r.getDurationSeconds() : 0).sum()
        );
    }

    @Transactional(readOnly = true)
    public List<Map<String, Object>> getWeekly(String username) {
        User user = getUser(username);
        LocalDate today = LocalDate.now();
        LocalDate sevenDaysAgo = today.minusDays(6);

        List<Run> recentRuns = runRepository.findByUserAndDateBetween(user, sevenDaysAgo, today);

        // Build ordered map of last 7 days initialised to 0
        Map<LocalDate, Double> dailyKm = new LinkedHashMap<>();
        for (int i = 6; i >= 0; i--) {
            dailyKm.put(today.minusDays(i), 0.0);
        }
        for (Run run : recentRuns) {
            if (run.getDate() != null) {
                dailyKm.merge(run.getDate(),
                        run.getDistanceKm() != null ? run.getDistanceKm() : 0.0,
                        Double::sum);
            }
        }

        List<Map<String, Object>> result = new ArrayList<>();
        dailyKm.forEach((date, km) -> {
            Map<String, Object> entry = new LinkedHashMap<>();
            entry.put("date", date.toString());
            entry.put("km", km);
            result.add(entry);
        });
        return result;
    }
}
