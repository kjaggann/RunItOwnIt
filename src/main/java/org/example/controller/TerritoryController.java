package org.example.controller;

import org.example.dto.LeaderboardEntry;
import org.example.dto.TerritoryResponse;
import org.example.service.TerritoryService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/territories")
public class TerritoryController {

    private final TerritoryService territoryService;

    public TerritoryController(TerritoryService territoryService) {
        this.territoryService = territoryService;
    }

    @GetMapping
    public ResponseEntity<List<TerritoryResponse>> getTerritories(
            @AuthenticationPrincipal UserDetails userDetails,
            @RequestParam double minLat,
            @RequestParam double maxLat,
            @RequestParam double minLng,
            @RequestParam double maxLng) {
        return ResponseEntity.ok(territoryService.getTerritoriesInBounds(
                userDetails.getUsername(), minLat, maxLat, minLng, maxLng));
    }

    @GetMapping("/leaderboard")
    public ResponseEntity<List<LeaderboardEntry>> getLeaderboard(
            @RequestParam int latCell,
            @RequestParam int lngCell) {
        return ResponseEntity.ok(territoryService.getLeaderboard(latCell, lngCell));
    }
}
