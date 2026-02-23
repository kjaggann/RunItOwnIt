import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import api from '../api/client';
import RouteMap from '../components/RouteMap';

interface RoutePoint {
  id: number;
  latitude: number;
  longitude: number;
  altitudeM?: number;
  sequence: number;
}

interface Run {
  id: number;
  title: string;
  date: string;
  distanceKm: number;
  durationSeconds: number;
  avgPaceSecPerKm: number;
  calories: number;
  notes: string;
  routePoints: RoutePoint[];
}

function formatDuration(secs: number): string {
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = secs % 60;
  return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}` : `${m}:${String(s).padStart(2, '0')}`;
}

function formatPace(secPerKm: number): string {
  const m = Math.floor(secPerKm / 60);
  const s = secPerKm % 60;
  return `${m}:${String(s).padStart(2, '0')} /km`;
}

export default function RunDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [run, setRun] = useState<Run | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get(`/api/runs/${id}`)
      .then(res => setRun(res.data))
      .catch(() => navigate('/'))
      .finally(() => setLoading(false));
  }, [id, navigate]);

  const handleDelete = async () => {
    if (!confirm('Delete this run?')) return;
    await api.delete(`/api/runs/${id}`);
    navigate('/');
  };

  if (loading) return <div className="min-h-screen bg-gray-900 flex items-center justify-center text-white">Loading...</div>;
  if (!run) return null;

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <nav className="bg-gray-800 border-b border-gray-700 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link to="/" className="text-gray-400 hover:text-white transition">← Dashboard</Link>
          <span className="text-xl font-bold text-white">{run.title || 'Run Detail'}</span>
        </div>
        <button
          onClick={handleDelete}
          className="text-red-400 hover:text-red-300 text-sm transition"
        >
          Delete Run
        </button>
      </nav>

      <div className="max-w-4xl mx-auto px-6 py-8 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Date', value: run.date },
            { label: 'Distance', value: run.distanceKm ? `${run.distanceKm.toFixed(2)} km` : '—' },
            { label: 'Duration', value: run.durationSeconds ? formatDuration(run.durationSeconds) : '—' },
            { label: 'Avg Pace', value: run.avgPaceSecPerKm ? formatPace(run.avgPaceSecPerKm) : '—' },
          ].map(stat => (
            <div key={stat.label} className="bg-gray-800 rounded-xl p-4 text-center">
              <p className="text-xl font-bold text-green-400">{stat.value}</p>
              <p className="text-gray-400 text-sm mt-1">{stat.label}</p>
            </div>
          ))}
        </div>

        {run.calories && (
          <div className="bg-gray-800 rounded-xl p-4">
            <p className="text-gray-400 text-sm">Calories burned</p>
            <p className="text-2xl font-bold text-green-400">{run.calories} kcal</p>
          </div>
        )}

        {run.notes && (
          <div className="bg-gray-800 rounded-xl p-4">
            <p className="text-gray-400 text-sm mb-1">Notes</p>
            <p className="text-white">{run.notes}</p>
          </div>
        )}

        {/* Map */}
        {run.routePoints.length > 0 && (
          <div className="bg-gray-800 rounded-xl p-4">
            <p className="text-gray-300 font-medium mb-3">Route ({run.routePoints.length} points)</p>
            <RouteMap points={run.routePoints} />
          </div>
        )}
      </div>
    </div>
  );
}
