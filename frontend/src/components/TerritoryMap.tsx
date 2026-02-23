import { useState, useCallback, useEffect } from 'react';
import { MapContainer, TileLayer, Rectangle, Tooltip, useMapEvents, useMap } from 'react-leaflet';
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

function TerritoryLayer({ username }: { username: string }) {
  const [territories, setTerritories] = useState<Territory[]>([]);
  const map = useMap();

  const fetchTerritories = useCallback((bounds: LatLngBounds) => {
    const minLat = bounds.getSouth();
    const maxLat = bounds.getNorth();
    const minLng = bounds.getWest();
    const maxLng = bounds.getEast();

    api.get('/api/territories', {
      params: { minLat, maxLat, minLng, maxLng },
    })
      .then(res => setTerritories(res.data))
      .catch(console.error);
  }, []);

  // Fetch on initial mount
  useEffect(() => {
    fetchTerritories(map.getBounds());
  }, [map, fetchTerritories]);

  useMapEvents({
    moveend(e) {
      fetchTerritories(e.target.getBounds());
    },
    zoomend(e) {
      fetchTerritories(e.target.getBounds());
    },
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
            pathOptions={{ color, fillColor: color, fillOpacity: 0.35, weight: 1 }}
          >
            <Tooltip sticky>
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
  return (
    <MapContainer
      center={[37.7749, -122.4194]}
      zoom={13}
      style={{ height: '450px', width: '100%', borderRadius: '8px' }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <TerritoryLayer username={username} />
    </MapContainer>
  );
}
