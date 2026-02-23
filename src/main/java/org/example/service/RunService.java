package org.example.service;

import org.example.dto.RunRequest;
import org.example.dto.RunResponse;
import org.example.model.RoutePoint;
import org.example.model.Run;
import org.example.model.User;
import org.example.repository.RoutePointRepository;
import org.example.repository.RunRepository;
import org.example.repository.UserRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.Collections;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class RunService {

    private final RunRepository runRepository;
    private final RoutePointRepository routePointRepository;
    private final UserRepository userRepository;
    private final TerritoryService territoryService;

    public RunService(RunRepository runRepository,
                      RoutePointRepository routePointRepository,
                      UserRepository userRepository,
                      TerritoryService territoryService) {
        this.runRepository = runRepository;
        this.routePointRepository = routePointRepository;
        this.userRepository = userRepository;
        this.territoryService = territoryService;
    }

    private User getUser(String username) {
        return userRepository.findByUsername(username)
                .orElseThrow(() -> new UsernameNotFoundException("User not found: " + username));
    }

    @Transactional(readOnly = true)
    public Page<RunResponse> getRuns(String username, int page, int size) {
        User user = getUser(username);
        return runRepository.findByUserOrderByDateDesc(user, PageRequest.of(page, size))
                .map(run -> toResponse(run, false));
    }

    @Transactional
    public RunResponse createRun(String username, RunRequest request) {
        User user = getUser(username);
        Run run = new Run();
        run.setUser(user);
        run.setTitle(request.getTitle());
        run.setDate(request.getDate());
        run.setDistanceKm(request.getDistanceKm());
        run.setDurationSeconds(request.getDurationSeconds());
        run.setCalories(request.getCalories());
        run.setNotes(request.getNotes());
        run.setStepCount(request.getStepCount());

        if (request.getDistanceKm() != null && request.getDurationSeconds() != null && request.getDistanceKm() > 0) {
            run.setAvgPaceSecPerKm((int) (request.getDurationSeconds() / request.getDistanceKm()));
        }

        Run saved = runRepository.save(run);

        if (request.getRoutePoints() != null && !request.getRoutePoints().isEmpty()) {
            List<RoutePoint> points = request.getRoutePoints().stream().map(rp -> {
                RoutePoint point = new RoutePoint();
                point.setRun(saved);
                point.setLatitude(rp.getLatitude());
                point.setLongitude(rp.getLongitude());
                point.setAltitudeM(rp.getAltitudeM());
                point.setSequence(rp.getSequence());
                if (rp.getTimestamp() != null) {
                    point.setTimestamp(Instant.parse(rp.getTimestamp()));
                }
                return point;
            }).collect(Collectors.toList());
            routePointRepository.saveAll(points);
            territoryService.processRun(user, points);
            saved.setRoutePoints(points);
        }

        return toResponse(saved, true);
    }

    @Transactional(readOnly = true)
    public RunResponse getRun(String username, Long id) {
        User user = getUser(username);
        Run run = runRepository.findByIdAndUser(id, user)
                .orElseThrow(() -> new IllegalArgumentException("Run not found"));
        return toResponse(run, true);
    }

    @Transactional
    public void deleteRun(String username, Long id) {
        User user = getUser(username);
        Run run = runRepository.findByIdAndUser(id, user)
                .orElseThrow(() -> new IllegalArgumentException("Run not found"));
        runRepository.delete(run);
    }

    private RunResponse toResponse(Run run, boolean includePoints) {
        List<RunResponse.RoutePointResponse> points = Collections.emptyList();
        if (includePoints) {
            points = routePointRepository.findByRunOrderBySequenceAsc(run).stream()
                    .map(rp -> new RunResponse.RoutePointResponse(
                            rp.getId(),
                            rp.getLatitude(),
                            rp.getLongitude(),
                            rp.getAltitudeM(),
                            rp.getTimestamp() != null ? rp.getTimestamp().toString() : null,
                            rp.getSequence()
                    )).collect(Collectors.toList());
        }
        return new RunResponse(
                run.getId(),
                run.getTitle(),
                run.getDate(),
                run.getDistanceKm(),
                run.getDurationSeconds(),
                run.getAvgPaceSecPerKm(),
                run.getCalories(),
                run.getNotes(),
                run.getStepCount(),
                points
        );
    }
}
