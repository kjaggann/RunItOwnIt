import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import {
  MapContainer, TileLayer, Rectangle, Tooltip, Popup,
  Marker, GeoJSON, useMapEvents, useMap,
} from 'react-leaflet';
import { LatLngBounds } from 'leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import osmtogeojson from 'osmtogeojson';
import { Geolocation } from '@capacitor/geolocation';
import api from '../api/client';

/* ── Types ───────────────────────────────────────────────────────── */
interface Territory {
  latCell: number; lngCell: number;
  lat: number; lng: number;
  ownerUsername: string;
  myScore: number; ownerScore: number;
  ownedByMe: boolean;
}
interface LeaderboardEntry { rank: number; username: string; score: number; }
interface Props { username: string; }

/* ── Runner icon (custom DivIcon) ────────────────────────────────── */
const runnerIcon = L.divIcon({
  className: '',
  html: `<span class="runner-marker">🏃</span>`,
  iconSize: [40, 40],
  iconAnchor: [20, 20],
});

/* ── Inject gaming CSS once ──────────────────────────────────────── */
function GamingStyles() {
  useEffect(() => {
    const id = 'territory-gaming-css';
    if (document.getElementById(id)) return;
    const el = document.createElement('style');
    el.id = id;
    el.textContent = `
      @keyframes ownedPulse {
        0%,100% { fill-opacity:.55; }
        50%      { fill-opacity:.85; }
      }
      @keyframes enemyBeat {
        0%,100% { fill-opacity:.4; }
        50%      { fill-opacity:.18; }
      }
      @keyframes top5Glow {
        0%,100% { fill-opacity:.6; }
        50%      { fill-opacity:.92; }
      }
      @keyframes runnerPop {
        from { transform: translateY(0) scale(1); }
        to   { transform: translateY(-5px) scale(1.15); }
      }

      .t-owned  { animation: ownedPulse 2s ease-in-out infinite;
                  filter: drop-shadow(0 0 7px #39ff14); }
      .t-enemy  { animation: enemyBeat  1.7s ease-in-out infinite;
                  filter: drop-shadow(0 0 7px #ff2d55); }
      .t-top1   { animation: top5Glow 1.4s ease-in-out infinite;
                  filter: drop-shadow(0 0 12px #ffd700); }
      .t-top2   { animation: top5Glow 1.6s ease-in-out infinite;
                  filter: drop-shadow(0 0 10px #c0c0c0); }
      .t-top3   { animation: top5Glow 1.6s ease-in-out infinite;
                  filter: drop-shadow(0 0 10px #cd7f32); }
      .t-top45  { animation: top5Glow 1.8s ease-in-out infinite;
                  filter: drop-shadow(0 0 9px #c084fc); }

      .runner-marker {
        font-size: 28px;
        display: block;
        filter: drop-shadow(0 0 8px #38bdf8) drop-shadow(0 0 4px #fff);
        animation: runnerPop 0.6s ease-in-out infinite alternate;
        cursor: default;
        user-select: none;
      }

      /* standard territory tooltip */
      .gtooltip {
        background: rgba(5,5,20,.88) !important;
        border: 1px solid rgba(57,255,20,.5) !important;
        color: #e2e8f0 !important;
        font-family: 'Courier New', monospace !important;
        font-size: 12px !important;
        white-space: nowrap;
      }
      .gtooltip::before { border-top-color: rgba(57,255,20,.5) !important; }

      /* top-5 highlight tooltip */
      .top5tooltip {
        background: rgba(5,5,10,.95) !important;
        border: 1px solid rgba(255,215,0,.75) !important;
        color: #fef08a !important;
        font-family: 'Courier New', monospace !important;
        font-size: 12px !important;
        white-space: nowrap;
        box-shadow: 0 0 12px rgba(255,215,0,.3) !important;
      }
      .top5tooltip::before { border-top-color: rgba(255,215,0,.75) !important; }

      /* city border tooltip */
      .city-tooltip {
        background: rgba(5,5,20,.88) !important;
        border: 1px solid rgba(96,165,250,.5) !important;
        color: #bfdbfe !important;
        font-family: 'Courier New', monospace !important;
        font-size: 11px !important;
        font-weight: bold;
        letter-spacing: 1px;
        text-transform: uppercase;
        white-space: nowrap;
      }
      .city-tooltip::before { border-top-color: rgba(96,165,250,.5) !important; }

      /* locate button */
      .locate-btn {
        background: rgba(0,0,0,.78);
        border: 2px solid rgba(56,189,248,.65);
        border-radius: 8px;
        width: 38px; height: 38px;
        display: flex; align-items: center; justify-content: center;
        cursor: pointer; font-size: 20px;
        box-shadow: 0 0 14px rgba(56,189,248,.35);
        transition: background .18s, box-shadow .18s, transform .18s;
        user-select: none;
      }
      .locate-btn:hover {
        background: rgba(56,189,248,.22);
        box-shadow: 0 0 22px rgba(56,189,248,.6);
        transform: scale(1.12);
      }
      .locate-btn:active { transform: scale(.96); }

      /* dark popup wrapper */
      .gpopup .leaflet-popup-content-wrapper {
        background: #050514;
        border: 1px solid rgba(57,255,20,.45);
        border-radius: 10px;
        box-shadow: 0 0 24px rgba(57,255,20,.25);
        padding: 0;
        overflow: hidden;
      }
      .gpopup .leaflet-popup-content { margin: 0; }
      .gpopup .leaflet-popup-tip { background: #050514; }
      .gpopup .leaflet-popup-close-button { color: #39ff14 !important; top:6px; right:8px; }
    `;
    document.head.appendChild(el);
  }, []);
  return null;
}

/* ── Locate & fly to user GPS — runs ONCE only ───────────────────── */
function LocateUser({ onLocated }: { onLocated: (lat: number, lng: number) => void }) {
  const map    = useMap();
  const doneRef = useRef(false);
  // Use a ref for onLocated so we never need it in the dep array
  const cbRef  = useRef(onLocated);
  cbRef.current = onLocated;

  useEffect(() => {
    if (doneRef.current) return;
    doneRef.current = true;
    Geolocation.getCurrentPosition({ timeout: 8000 })
      .then(({ coords }) => {
        map.flyTo([coords.latitude, coords.longitude], 13, { duration: 1.5 });
        cbRef.current(coords.latitude, coords.longitude);
      })
      .catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // intentionally empty — run once on mount
  return null;
}

/* ── Locate-me button (bottom-right of map) ─────────────────────── */
function LocateButton({ userPos }: { userPos: [number, number] | null }) {
  const map    = useMap();
  const posRef = useRef(userPos);
  posRef.current = userPos;

  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const ctrl = (L.control as unknown as (opts: L.ControlOptions) => L.Control)({ position: 'bottomright' });
    ctrl.onAdd = () => {
      const div = L.DomUtil.create('div', 'locate-btn');
      div.title = 'Go to my location';
      div.innerHTML = '📍';
      L.DomEvent.on(div, 'click', (e) => {
        L.DomEvent.stopPropagation(e);
        if (posRef.current) map.flyTo(posRef.current, 15, { duration: 1.2 });
      });
      return div;
    };
    ctrl.addTo(map);
    return () => { ctrl.remove(); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map]); // create once; posRef always holds latest position

  return null;
}

/* ── City / village border layer (OpenStreetMap Overpass) ────────── */
function CityBordersLayer() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [geojson, setGeojson]   = useState<any>(null);
  const [renderKey, setRenderKey] = useState(0);
  const map          = useMap();
  const debounceRef  = useRef<ReturnType<typeof setTimeout> | null>(null);
  const ctrlRef      = useRef<AbortController | null>(null);

  const fetchBorders = useCallback(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      const zoom = map.getZoom();
      if (zoom < 5) { setGeojson(null); return; }

      if (ctrlRef.current) ctrlRef.current.abort();
      ctrlRef.current = new AbortController();

      const b    = map.getBounds();
      const bbox = `${b.getSouth()},${b.getWest()},${b.getNorth()},${b.getEast()}`;
      const levels = zoom < 8 ? '4|5|6' : zoom < 11 ? '6|7|8' : '7|8|9';

      const query = `[out:json][timeout:30];
(
  relation["boundary"="administrative"]["admin_level"~"^(${levels})$"](${bbox});
);
(._;>;);
out body qt;`;

      try {
        const res  = await fetch('https://overpass-api.de/api/interpreter', {
          method: 'POST',
          body: `data=${encodeURIComponent(query)}`,
          signal: ctrlRef.current.signal,
        });
        const data = await res.json();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        setGeojson(osmtogeojson(data as any));
        setRenderKey(k => k + 1);
      } catch (e: unknown) {
        if (e instanceof Error && e.name !== 'AbortError') {
          console.warn('City borders fetch failed:', e);
        }
      }
    }, 900);
  }, [map]);

  useEffect(() => { fetchBorders(); }, [fetchBorders]);
  useMapEvents({ moveend: fetchBorders, zoomend: fetchBorders });

  if (!geojson) return null;

  return (
    <GeoJSON
      key={renderKey}
      data={geojson}
      style={() => ({ color: '#60a5fa', weight: 2, opacity: 0.8, fillOpacity: 0, dashArray: '6 4' })}
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      onEachFeature={(feature: any, layer: any) => {
        const name = feature.properties?.name || feature.properties?.['name:en'] || feature.properties?.official_name;
        if (name) layer.bindTooltip(name, { className: 'city-tooltip', sticky: true });
      }}
    />
  );
}

/* ── Rank helpers ────────────────────────────────────────────────── */
const RANK_COLORS = ['#ffd700', '#c0c0c0', '#cd7f32', '#c084fc', '#c084fc'];
const RANK_MEDALS = ['🥇', '🥈', '🥉', '#4', '#5'];
function rankClass(r: number) {
  if (r === 1) return 't-top1';
  if (r === 2) return 't-top2';
  if (r === 3) return 't-top3';
  return 't-top45';
}

/* ── Territory rectangles + leaderboard popup ────────────────────── */
function TerritoryLayer({
  onStats,
  userPos,
}: {
  onStats: (owned: number, total: number) => void;
  userPos: [number, number] | null;
}) {
  const [territories, setTerritories] = useState<Territory[]>([]);
  const [selected, setSelected]       = useState<Territory | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[] | null>(null);
  const map = useMap();

  /* ~50 km radius in cells (1 cell ≈ 10 km) */
  const LOCAL_RADIUS = 5;
  const userLatCell = userPos ? Math.floor(userPos[0] * 10) : null;
  const userLngCell = userPos ? Math.floor(userPos[1] * 10) : null;

  const isNearMe = useCallback((t: Territory) => {
    if (userLatCell === null || userLngCell === null) return false;
    return (
      Math.abs(t.latCell - userLatCell) <= LOCAL_RADIUS &&
      Math.abs(t.lngCell - userLngCell) <= LOCAL_RADIUS
    );
  }, [userLatCell, userLngCell]);

  /* Top-5 computed ONLY from territories near the user's location */
  const top5Map = useMemo(() => {
    const nearby = territories.filter(isNearMe);
    const byOwner = new Map<string, number>();
    nearby.forEach(t => {
      byOwner.set(t.ownerUsername, Math.max(byOwner.get(t.ownerUsername) ?? 0, t.ownerScore));
    });
    const ranked = [...byOwner.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
    return new Map(ranked.map(([username, score], i) => [username, { rank: i + 1, score }]));
  }, [territories, isNearMe]);

  const fetchTerritories = useCallback((bounds: LatLngBounds) => {
    api.get('/api/territories', {
      params: {
        minLat: bounds.getSouth(), maxLat: bounds.getNorth(),
        minLng: bounds.getWest(),  maxLng: bounds.getEast(),
      },
    }).then(res => {
      setTerritories(res.data);
      const owned = (res.data as Territory[]).filter(t => t.ownedByMe).length;
      onStats(owned, res.data.length);
    }).catch(console.error);
  }, [onStats]);

  useEffect(() => { fetchTerritories(map.getBounds()); }, [map, fetchTerritories]);
  useMapEvents({
    moveend(e) { fetchTerritories(e.target.getBounds()); },
    zoomend(e) { fetchTerritories(e.target.getBounds()); },
  });

  const handleClick = (t: Territory) => {
    setSelected(t);
    setLeaderboard(null);
    api.get('/api/territories/leaderboard', { params: { latCell: t.latCell, lngCell: t.lngCell } })
      .then(res => setLeaderboard(res.data))
      .catch(console.error);
  };

  return (
    <>
      {territories.map(t => {
        const bounds: [[number, number], [number, number]] = [
          [t.lat, t.lng], [t.lat + 0.1, t.lng + 0.1],
        ];
        const owned   = t.ownedByMe;
        const topInfo = top5Map.get(t.ownerUsername);
        // Only highlight if the territory itself is near the user — not across the whole map
        const isTop5  = !!topInfo && !owned && isNearMe(t);

        // Pick class & color
        const className  = owned ? 't-owned' : isTop5 ? rankClass(topInfo!.rank) : 't-enemy';
        const color      = owned ? '#39ff14' : isTop5 ? RANK_COLORS[topInfo!.rank - 1] : '#ff2d55';

        return (
          <Rectangle
            key={`${t.latCell},${t.lngCell}`}
            bounds={bounds}
            pathOptions={{ className, color, fillColor: color, fillOpacity: 0.55, weight: 2, opacity: 1 }}
            eventHandlers={{ click: () => handleClick(t) }}
          >
            {isTop5 ? (
              <Tooltip sticky className="top5tooltip">
                <span>
                  {RANK_MEDALS[topInfo!.rank - 1]}{' '}
                  <strong style={{ color: RANK_COLORS[topInfo!.rank - 1] }}>{t.ownerUsername}</strong>
                  {'  '}👟 {topInfo!.score.toLocaleString()} steps
                </span>
              </Tooltip>
            ) : (
              <Tooltip sticky className="gtooltip">
                {owned ? '👑' : '⚔️'} {t.ownerUsername} · {t.ownerScore} pts
                {!owned && t.myScore > 0 && `  (you: ${t.myScore})`}
              </Tooltip>
            )}
          </Rectangle>
        );
      })}

      {selected && (
        <Popup
          className="gpopup"
          position={[selected.lat + 0.05, selected.lng + 0.05]}
          eventHandlers={{ remove: () => { setSelected(null); setLeaderboard(null); } }}
        >
          <div style={{
            background: 'linear-gradient(135deg,#0d0d1f,#12122a)',
            padding: '10px 16px',
            borderBottom: '1px solid rgba(57,255,20,.3)',
          }}>
            <p style={{ margin: 0, fontWeight: 700, fontSize: 13, color: '#39ff14',
                        fontFamily: 'monospace', letterSpacing: 1 }}>
              ⚔️ WAR ZONE — LEADERBOARD
            </p>
            <p style={{ margin: '2px 0 0', fontSize: 10, color: '#4ade80', fontFamily: 'monospace' }}>
              CELL {selected.latCell}, {selected.lngCell}
            </p>
          </div>
          <div style={{ padding: '10px 16px', minWidth: 230, background: '#050514' }}>
            {leaderboard === null ? (
              <p style={{ color: '#4ade80', fontSize: 12, margin: 0,
                          fontFamily: 'monospace', animation: 'ownedPulse 1s infinite' }}>
                LOADING…
              </p>
            ) : leaderboard.length === 0 ? (
              <p style={{ color: '#555', fontSize: 12, margin: 0, fontFamily: 'monospace' }}>
                NO RUNNERS YET
              </p>
            ) : leaderboard.map((e, idx) => (
              <div key={e.rank} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '5px 0',
                borderBottom: idx < leaderboard.length - 1 ? '1px solid #0f1a2e' : 'none',
              }}>
                <span style={{ fontFamily: 'monospace', fontSize: 13,
                               color: e.rank === 1 ? '#39ff14' : e.rank === 2 ? '#a3e635' : '#94a3b8' }}>
                  {e.rank === 1 ? '🥇' : e.rank === 2 ? '🥈' : e.rank === 3 ? '🥉' : `#${e.rank}`}{' '}
                  {e.username}
                </span>
                <span style={{ fontFamily: 'monospace', fontSize: 11, color: '#475569' }}>
                  {e.score.toLocaleString()} pts
                </span>
              </div>
            ))}
          </div>
        </Popup>
      )}
    </>
  );
}

/* ── Main export ─────────────────────────────────────────────────── */
export default function TerritoryMap({ username: _ }: Props) {
  const [userPos, setUserPos] = useState<[number, number] | null>(null);
  const [stats, setStats]     = useState({ owned: 0, total: 0 });

  const handleLocated = useCallback((lat: number, lng: number) => {
    setUserPos([lat, lng]);
  }, []);

  return (
    <div style={{ position: 'relative', borderRadius: 12, overflow: 'hidden',
                  boxShadow: '0 0 32px rgba(57,255,20,.15)' }}>
      <GamingStyles />

      <MapContainer
        center={[20, 0]}
        zoom={3}
        style={{ height: 520, width: '100%' }}
        zoomControl={true}
        scrollWheelZoom={true}
        doubleClickZoom={true}
        dragging={true}
        touchZoom={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://carto.com/attributions">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          subdomains="abcd"
          maxZoom={19}
        />
        <LocateUser onLocated={handleLocated} />
        <LocateButton userPos={userPos} />
        <CityBordersLayer />
        <TerritoryLayer onStats={(owned, total) => setStats({ owned, total })} userPos={userPos} />

        {userPos && <Marker position={userPos} icon={runnerIcon} />}
      </MapContainer>

      {/* HUD */}
      <div style={{
        position: 'absolute', top: 12, right: 48, zIndex: 1000,
        background: 'rgba(0,0,0,.72)',
        border: '1px solid rgba(57,255,20,.4)',
        borderRadius: 8, padding: '8px 14px',
        fontFamily: 'monospace', color: '#fff', fontSize: 12,
        backdropFilter: 'blur(6px)', pointerEvents: 'none',
        boxShadow: '0 0 16px rgba(57,255,20,.2)',
      }}>
        <p style={{ margin: 0, color: '#39ff14', fontWeight: 700, letterSpacing: 2, fontSize: 10 }}>⚔️ WAR ZONE</p>
        <p style={{ margin: '5px 0 0', color: '#39ff14' }}>🟢 Owned: {stats.owned}</p>
        <p style={{ margin: '2px 0 0', color: '#ff2d55' }}>🔴 Enemy: {stats.total - stats.owned}</p>
        {userPos && (
          <p style={{ margin: '4px 0 0', color: '#60a5fa', fontSize: 10 }}>
            📍 cell {Math.floor(userPos[0] * 10)}, {Math.floor(userPos[1] * 10)}
          </p>
        )}
      </div>
    </div>
  );
}
