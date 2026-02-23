import { useState, useCallback, useEffect } from 'react';
import { MapContainer, TileLayer, Rectangle, Tooltip, CircleMarker, useMapEvents, useMap } from 'react-leaflet';
import { LatLngBounds } from 'leaflet';
import 'leaflet/dist/leaflet.css';
import api from '../api/client';

interface Territory {
  latCell: number;
  lngCell: number;
  ownerUsername: string;
  myScore: number;
  ownerScore: number;
  ownedByMe: boolean;
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
        map.flyTo([coords.latitude, coords.longitude], 15, { duration: 1.2 });
        onLocated(coords.latitude, coords.longitude);
      },
      () => { /* permission denied or unavailable — stay at default */ },
      { timeout: 8000 }
    );
  }, [map, onLocated]);

  return null;
}

function TerritoryLayer() {
  const [territories, setTerritories] = useState<Territory[]>([]);
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

  return (
    <>
      {territories.map(t => {
        const bounds: [[number, number], [number, number]] = [
          [t.latCell, t.lngCell],
          [t.latCell + 0.01, t.lngCell + 0.01],
        ];
        const color = t.ownedByMe ? '#22c55e' : '#ef4444';
        return (
          <Rectangle
            key={`${t.latCell},${t.lngCell}`}
            bounds={bounds}
            pathOptions={{ color, fillColor: color, fillOpacity: 0.3, weight: 1.5, opacity: 0.8 }}
          >
            <Tooltip sticky className="territory-tooltip">
              {t.ownedByMe ? '👑' : '⚔️'} {t.ownerUsername} · {t.ownerScore} pts
              {!t.ownedByMe && t.myScore > 0 && ` (you: ${t.myScore})`}
            </Tooltip>
          </Rectangle>
        );
      })}
    </>
  );
}

export default function TerritoryMap({ username }: Props) {
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
        url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        subdomains="abcd"
        maxZoom={19}
      />
      <LocateUser onLocated={(lat, lng) => setUserPos([lat, lng])} />
      <TerritoryLayer />
      {userPos && (
        <CircleMarker
          center={userPos}
          radius={9}
          pathOptions={{ color: '#fff', fillColor: '#3b82f6', fillOpacity: 1, weight: 2.5 }}
        />
      )}
    </MapContainer>
  );
}
