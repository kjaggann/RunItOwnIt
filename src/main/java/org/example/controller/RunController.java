package org.example.controller;

import org.example.dto.RunRequest;
import org.example.dto.RunResponse;
import org.example.service.RunService;
import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/runs")
public class RunController {

    private final RunService runService;

    public RunController(RunService runService) {
        this.runService = runService;
    }

    @GetMapping
    public ResponseEntity<Page<RunResponse>> getRuns(
            @AuthenticationPrincipal UserDetails userDetails,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return ResponseEntity.ok(runService.getRuns(userDetails.getUsername(), page, size));
    }

    @PostMapping
    public ResponseEntity<RunResponse> createRun(
            @AuthenticationPrincipal UserDetails userDetails,
            @RequestBody RunRequest request) {
        return ResponseEntity.ok(runService.createRun(userDetails.getUsername(), request));
    }

    @GetMapping("/{id}")
    public ResponseEntity<RunResponse> getRun(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable Long id) {
        try {
            return ResponseEntity.ok(runService.getRun(userDetails.getUsername(), id));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.notFound().build();
        }
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteRun(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable Long id) {
        try {
            runService.deleteRun(userDetails.getUsername(), id);
            return ResponseEntity.noContent().build();
        } catch (IllegalArgumentException e) {
            return ResponseEntity.notFound().build();
        }
    }
}
