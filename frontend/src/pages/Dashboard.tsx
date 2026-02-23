import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api/client';
import RunCard from '../components/RunCard';
import StatsChart from '../components/StatsChart';
import TerritoryMap from '../components/TerritoryMap';

interface Run {
  id: number;
  title: string;
  date: string;
  distanceKm: number;
  durationSeconds: number;
  avgPaceSecPerKm: number;
  calories: number;
  stepCount?: number;
  notes: string;
}

interface Stats {
  totalRuns: number;
  totalKm: number;
  totalDurationSeconds: number;
  last30DaysRuns: number;
  last30DaysKm: number;
}

export default function Dashboard() {
  const { username, logout } = useAuth();
  const navigate = useNavigate();
  const [runs, setRuns] = useState<Run[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [weeklyData, setWeeklyData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get('/api/runs'),
      api.get('/api/stats/summary'),
      api.get('/api/stats/weekly'),
    ]).then(([runsRes, statsRes, weeklyRes]) => {
      setRuns(runsRes.data.content || []);
      setStats(statsRes.data);
      setWeeklyData(weeklyRes.data);
    }).catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this run?')) return;
    await api.delete(`/api/runs/${id}`);
    setRuns(runs.filter(r => r.id !== id));
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const formatTime = (secs: number) => {
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Navbar */}
      <nav className="bg-gray-800 border-b border-gray-700 px-6 py-4 flex items-center justify-between">
        <span className="text-xl font-bold text-green-400">RunItOwnIt</span>
        <div className="flex items-center gap-4">
          <span className="text-gray-400 text-sm">Hey, {username}</span>
          <Link
            to="/runs/new"
            className="bg-green-500 hover:bg-green-600 text-white text-sm font-semibold px-4 py-2 rounded-lg transition"
          >
            + New Run
          </Link>
          <button
            onClick={handleLogout}
            className="text-gray-400 hover:text-white text-sm transition"
          >
            Logout
          </button>
        </div>
      </nav>

      <div className="max-w-5xl mx-auto px-6 py-8">
        {/* Stats summary */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            {[
              { label: 'Total Runs', value: stats.totalRuns },
              { label: 'Total Distance', value: `${stats.totalKm.toFixed(1)} km` },
              { label: 'Total Time', value: formatTime(stats.totalDurationSeconds) },
              { label: 'Last 30 Days', value: `${stats.last30DaysKm.toFixed(1)} km` },
            ].map(stat => (
              <div key={stat.label} className="bg-gray-800 rounded-xl p-4 text-center">
                <p className="text-2xl font-bold text-green-400">{stat.value}</p>
                <p className="text-gray-400 text-sm mt-1">{stat.label}</p>
              </div>
            ))}
          </div>
        )}

        {/* Weekly chart */}
        {weeklyData.length > 0 && (
          <div className="bg-gray-800 rounded-xl p-6 mb-8">
            <h2 className="text-lg font-semibold mb-4">Weekly Distance (km)</h2>
            <StatsChart data={weeklyData} />
          </div>
        )}

        {/* Territory Map */}
        <div className="bg-gray-800 rounded-xl p-6 mb-8">
          <h2 className="text-lg font-semibold mb-4">Territory Map</h2>
          <p className="text-gray-400 text-sm mb-4">
            Green = your territory · Orange = contested · Click a territory for its leaderboard
          </p>
          <TerritoryMap username={username!} />
        </div>

        {/* Runs list */}
        <div>
          <h2 className="text-lg font-semibold mb-4">Your Runs</h2>
          {loading ? (
            <p className="text-gray-400">Loading...</p>
          ) : runs.length === 0 ? (
            <div className="text-center py-16 text-gray-500">
              <p className="text-lg">No runs yet.</p>
              <Link to="/runs/new" className="text-green-400 hover:underline mt-2 inline-block">
                Log your first run
              </Link>
            </div>
          ) : (
            <div className="grid gap-4">
              {runs.map(run => (
                <RunCard key={run.id} run={run} onDelete={handleDelete} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
