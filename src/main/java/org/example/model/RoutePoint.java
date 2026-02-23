package org.example.model;

import javax.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;

@Entity
@Table(name = "route_points")
@Getter
@Setter
@NoArgsConstructor
public class RoutePoint {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "run_id", nullable = false)
    private Run run;

    private Double latitude;

    private Double longitude;

    private Double altitudeM;

    private Instant timestamp;

    private Integer sequence;
}
