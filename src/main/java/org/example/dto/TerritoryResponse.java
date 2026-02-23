package org.example.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class TerritoryResponse {
    private double latCell;
    private double lngCell;
    private String ownerUsername;
    private long myScore;
    private long ownerScore;
    private boolean ownedByMe;
}
