package org.example.controller;

import org.example.dto.StatsResponse;
import org.example.service.StatsService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/stats")
public class StatsController {

    private final StatsService statsService;

    public StatsController(StatsService statsService) {
        this.statsService = statsService;
    }

    @GetMapping("/summary")
    public ResponseEntity<StatsResponse> getSummary(@AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(statsService.getSummary(userDetails.getUsername()));
    }

    @GetMapping("/weekly")
    public ResponseEntity<List<Map<String, Object>>> getWeekly(@AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(statsService.getWeekly(userDetails.getUsername()));
    }
}
