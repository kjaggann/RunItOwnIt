package org.example.model;

import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import javax.persistence.*;

@Entity
@Table(name = "territory_scores",
       uniqueConstraints = @UniqueConstraint(columnNames = {"lat_cell", "lng_cell", "user_id"}))
@Getter @Setter @NoArgsConstructor
public class TerritoryScore {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "lat_cell")
    private int latCell;

    @Column(name = "lng_cell")
    private int lngCell;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id")
    private User user;

    private long waypointCount;
}
