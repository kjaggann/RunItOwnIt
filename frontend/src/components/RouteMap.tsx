import { useEffect } from 'react';
import { MapContainer, TileLayer, Polyline, Marker, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix Leaflet default icon (Vite asset bundling workaround)
const iconUrl = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png';
const iconRetinaUrl = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png';
const shadowUrl = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png';

const defaultIcon = L.icon({ iconUrl, iconRetinaUrl, shadowUrl, iconSize: [25, 41], iconAnchor: [12, 41] });
const greenIcon = L.icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-green.png',
  shadowUrl,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

interface RoutePoint {
  latitude: number;
  longitude: number;
}

interface Props {
  points: RoutePoint[];
}

function FitBounds({ positions }: { positions: [number, number][] }) {
  const map = useMap();
  useEffect(() => {
    if (positions.length === 0) return;
    const timer = setTimeout(() => {
      map.invalidateSize();
      if (positions.length > 1) {
        map.fitBounds(L.latLngBounds(positions), { padding: [40, 40] });
      } else {
        map.setView(positions[0], 15);
      }
    }, 100);
    return () => clearTimeout(timer);
  }, [map, positions]);
  return null;
}

export default function RouteMap({ points }: Props) {
  const positions: [number, number][] = points.map(p => [p.latitude, p.longitude]);
  const center: [number, number] = positions.length > 0 ? positions[0] : [0, 0];

  return (
    <MapContainer
      center={center}
      zoom={14}
      style={{ height: '350px', width: '100%', borderRadius: '8px' }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {positions.length > 1 && (
        <Polyline positions={positions} color="#22c55e" weight={4} opacity={0.8} />
      )}
      {positions.length > 0 && (
        <Marker position={positions[0]} icon={greenIcon} />
      )}
      {positions.length > 1 && (
        <Marker position={positions[positions.length - 1]} icon={defaultIcon} />
      )}
      <FitBounds positions={positions} />
    </MapContainer>
  );
}
