package org.example.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class RunRequest {

    private String title;
    private LocalDate date;
    private Double distanceKm;
    private Integer durationSeconds;
    private Integer calories;
    private String notes;
    private Integer stepCount;
    private List<RoutePointRequest> routePoints;

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class RoutePointRequest {
        private Double latitude;
        private Double longitude;
        private Double altitudeM;
        private String timestamp;
        private Integer sequence;
    }
}
