import { useState, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Geolocation } from '@capacitor/geolocation';
import api from '../api/client';

interface RoutePoint {
  latitude: number;
  longitude: number;
  altitudeM?: number;
  timestamp: string;
  sequence: number;
}

export default function NewRun() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    title: '',
    date: new Date().toISOString().split('T')[0],
    distanceKm: '',
    durationSeconds: '',
    calories: '',
    stepCount: '',
    notes: '',
  });
  const [recording, setRecording] = useState(false);
  const [routePoints, setRoutePoints] = useState<RoutePoint[]>([]);
  const [error, setError] = useState('');
  const watchId = useRef<string | null>(null);
  const sequence = useRef(0);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  const startRecording = async () => {
    setError('');
    setRoutePoints([]);
    sequence.current = 0;
    try {
      await Geolocation.requestPermissions();
    } catch {
      // permissions API not available on web — proceed anyway
    }
    setRecording(true);
    const id = await Geolocation.watchPosition(
      { enableHighAccuracy: true },
      (pos, err) => {
        if (err || !pos) { setError('GPS error: ' + (err?.message ?? 'unknown')); return; }
        const point: RoutePoint = {
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          altitudeM: pos.coords.altitude ?? undefined,
          timestamp: new Date(pos.timestamp).toISOString(),
          sequence: sequence.current++,
        };
        setRoutePoints(prev => [...prev, point]);
      },
    );
    watchId.current = id;
  };

  const stopRecording = async () => {
    if (watchId.current !== null) {
      await Geolocation.clearWatch({ id: watchId.current });
      watchId.current = null;
    }
    setRecording(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (recording) await stopRecording();
    try {
      const payload = {
        ...form,
        distanceKm: form.distanceKm ? parseFloat(form.distanceKm) : null,
        durationSeconds: form.durationSeconds ? parseInt(form.durationSeconds) : null,
        calories: form.calories ? parseInt(form.calories) : null,
        stepCount: form.stepCount ? parseInt(form.stepCount) : null,
        routePoints: routePoints.length > 0 ? routePoints : [],
      };
      const res = await api.post('/api/runs', payload);
      navigate(`/runs/${res.data.id}`);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: string } } };
      setError(e.response?.data?.error || 'Failed to save run');
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <nav className="bg-gray-800 border-b border-gray-700 px-6 py-4 flex items-center gap-4">
        <Link to="/" className="text-gray-400 hover:text-white transition">← Back</Link>
        <span className="text-xl font-bold text-green-400">Log a Run</span>
      </nav>

      <div className="max-w-2xl mx-auto px-6 py-8">
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Title</label>
            <input
              name="title"
              value={form.title}
              onChange={handleChange}
              placeholder="Morning run"
              className="w-full px-3 py-2 bg-gray-700 text-white rounded-lg border border-gray-600 focus:outline-none focus:border-green-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Date</label>
            <input
              type="date"
              name="date"
              value={form.date}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 bg-gray-700 text-white rounded-lg border border-gray-600 focus:outline-none focus:border-green-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Distance (km)</label>
              <input
                type="number"
                step="0.01"
                name="distanceKm"
                value={form.distanceKm}
                onChange={handleChange}
                placeholder="5.0"
                className="w-full px-3 py-2 bg-gray-700 text-white rounded-lg border border-gray-600 focus:outline-none focus:border-green-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Duration (seconds)</label>
              <input
                type="number"
                name="durationSeconds"
                value={form.durationSeconds}
                onChange={handleChange}
                placeholder="1800"
                className="w-full px-3 py-2 bg-gray-700 text-white rounded-lg border border-gray-600 focus:outline-none focus:border-green-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Calories (optional)</label>
              <input
                type="number"
                name="calories"
                value={form.calories}
                onChange={handleChange}
                className="w-full px-3 py-2 bg-gray-700 text-white rounded-lg border border-gray-600 focus:outline-none focus:border-green-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Steps (optional)</label>
              <input
                type="number"
                name="stepCount"
                value={form.stepCount}
                onChange={handleChange}
                placeholder="e.g. 6000"
                className="w-full px-3 py-2 bg-gray-700 text-white rounded-lg border border-gray-600 focus:outline-none focus:border-green-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Notes (optional)</label>
            <textarea
              name="notes"
              value={form.notes}
              onChange={handleChange}
              rows={3}
              className="w-full px-3 py-2 bg-gray-700 text-white rounded-lg border border-gray-600 focus:outline-none focus:border-green-500 resize-none"
            />
          </div>

          {/* GPS Recording */}
          <div className="bg-gray-800 rounded-xl p-4">
            <p className="text-sm font-medium text-gray-300 mb-3">GPS Route Recording</p>
            <div className="flex items-center gap-3">
              {!recording ? (
                <button
                  type="button"
                  onClick={startRecording}
                  className="bg-blue-500 hover:bg-blue-600 text-white text-sm font-semibold px-4 py-2 rounded-lg transition"
                >
                  Start GPS Recording
                </button>
              ) : (
                <button
                  type="button"
                  onClick={stopRecording}
                  className="bg-red-500 hover:bg-red-600 text-white text-sm font-semibold px-4 py-2 rounded-lg transition animate-pulse"
                >
                  Stop Recording
                </button>
              )}
              {routePoints.length > 0 && (
                <span className="text-green-400 text-sm">{routePoints.length} points captured</span>
              )}
            </div>
          </div>

          {error && <p className="text-red-400 text-sm">{error}</p>}

          <button
            type="submit"
            className="w-full bg-green-500 hover:bg-green-600 text-white font-semibold py-2 rounded-lg transition"
          >
            Save Run
          </button>
        </form>
      </div>
    </div>
  );
}
