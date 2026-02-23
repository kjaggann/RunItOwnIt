package org.example.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class StatsResponse {
    private long totalRuns;
    private double totalKm;
    private long totalDurationSeconds;
    private long last30DaysRuns;
    private double last30DaysKm;
    private long last30DaysDurationSeconds;
}
