package org.example.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class TerritoryResponse {
    private int latCell;        // raw int cell (e.g. 377 for lat 37.7) — used for leaderboard lookup
    private int lngCell;        // raw int cell
    private double lat;         // latCell / 10.0 — SW corner latitude
    private double lng;         // lngCell / 10.0 — SW corner longitude
    private String ownerUsername;
    private long myScore;
    private long ownerScore;
    private boolean ownedByMe;
}
