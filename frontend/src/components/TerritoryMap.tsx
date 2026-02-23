import { useState, useCallback, useEffect } from 'react';
import { MapContainer, TileLayer, Rectangle, Tooltip, Popup, CircleMarker, useMapEvents, useMap } from 'react-leaflet';
import { LatLngBounds } from 'leaflet';
import 'leaflet/dist/leaflet.css';
import api from '../api/client';

interface Territory {
  latCell: number;
  lngCell: number;
  lat: number;
  lng: number;
  ownerUsername: string;
  myScore: number;
  ownerScore: number;
  ownedByMe: boolean;
}

interface LeaderboardEntry {
  rank: number;
  username: string;
  score: number;
}

interface Props {
  username: string;
}

function LocateUser({ onLocated }: { onLocated: (lat: number, lng: number) => void }) {
  const map = useMap();

  useEffect(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        map.flyTo([coords.latitude, coords.longitude], 13, { duration: 1.2 });
        onLocated(coords.latitude, coords.longitude);
      },
      () => {},
      { timeout: 8000 }
    );
  }, [map, onLocated]);

  return null;
}

function TerritoryLayer() {
  const [territories, setTerritories] = useState<Territory[]>([]);
  const [selected, setSelected] = useState<Territory | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[] | null>(null);
  const map = useMap();

  const fetchTerritories = useCallback((bounds: LatLngBounds) => {
    api.get('/api/territories', {
      params: {
        minLat: bounds.getSouth(),
        maxLat: bounds.getNorth(),
        minLng: bounds.getWest(),
        maxLng: bounds.getEast(),
      },
    })
      .then(res => setTerritories(res.data))
      .catch(console.error);
  }, []);

  useEffect(() => {
    fetchTerritories(map.getBounds());
  }, [map, fetchTerritories]);

  useMapEvents({
    moveend(e) { fetchTerritories(e.target.getBounds()); },
    zoomend(e) { fetchTerritories(e.target.getBounds()); },
  });

  const handleClick = (t: Territory) => {
    setSelected(t);
    setLeaderboard(null);
    api.get('/api/territories/leaderboard', {
      params: { latCell: t.latCell, lngCell: t.lngCell },
    })
      .then(res => setLeaderboard(res.data))
      .catch(console.error);
  };

  return (
    <>
      {territories.map(t => {
        const bounds: [[number, number], [number, number]] = [
          [t.lat, t.lng],
          [t.lat + 0.1, t.lng + 0.1],
        ];
        const color = t.ownedByMe ? '#16a34a' : '#ea580c';
        const fillColor = t.ownedByMe ? '#86efac' : '#fdba74';
        return (
          <Rectangle
            key={`${t.latCell},${t.lngCell}`}
            bounds={bounds}
            pathOptions={{ color, fillColor, fillOpacity: 0.4, weight: 1.5, opacity: 0.9 }}
            eventHandlers={{ click: () => handleClick(t) }}
          >
            <Tooltip sticky>
              {t.ownedByMe ? '👑' : '⚔️'} <strong>{t.ownerUsername}</strong> · {t.ownerScore} pts
              {!t.ownedByMe && t.myScore > 0 && ` (you: ${t.myScore})`}
            </Tooltip>
          </Rectangle>
        );
      })}

      {selected && (
        <Popup
          position={[selected.lat + 0.05, selected.lng + 0.05]}
          onClose={() => { setSelected(null); setLeaderboard(null); }}
        >
          <div style={{ minWidth: 200, fontFamily: 'sans-serif' }}>
            <p style={{ fontWeight: 700, fontSize: 14, marginBottom: 8, borderBottom: '1px solid #e5e7eb', paddingBottom: 6 }}>
              Territory Leaderboard
            </p>
            {leaderboard === null ? (
              <p style={{ color: '#6b7280', fontSize: 13 }}>Loading…</p>
            ) : leaderboard.length === 0 ? (
              <p style={{ color: '#6b7280', fontSize: 13 }}>No data</p>
            ) : (
              leaderboard.map(e => (
                <div key={e.rank} style={{ display: 'flex', justifyContent: 'space-between', gap: 16, padding: '3px 0', fontSize: 13 }}>
                  <span>
                    {e.rank === 1 ? '🥇' : e.rank === 2 ? '🥈' : e.rank === 3 ? '🥉' : `${e.rank}.`}{' '}
                    {e.username}
                  </span>
                  <span style={{ color: '#6b7280' }}>{e.score.toLocaleString()} pts</span>
                </div>
              ))
            )}
          </div>
        </Popup>
      )}
    </>
  );
}

export default function TerritoryMap({ username: _ }: Props) {
  const [userPos, setUserPos] = useState<[number, number] | null>(null);

  return (
    <MapContainer
      center={[20, 0]}
      zoom={2}
      style={{ height: '500px', width: '100%', borderRadius: '10px' }}
      zoomControl={true}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
        url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
        subdomains="abcd"
        maxZoom={19}
      />
      <LocateUser onLocated={(lat, lng) => setUserPos([lat, lng])} />
      <TerritoryLayer />
      {userPos && (
        <CircleMarker
          center={userPos}
          radius={9}
          pathOptions={{ color: '#1e40af', fillColor: '#3b82f6', fillOpacity: 1, weight: 2.5 }}
        />
      )}
    </MapContainer>
  );
}
