import { Link } from 'react-router-dom';

interface Run {
  id: number;
  title: string;
  date: string;
  distanceKm: number;
  durationSeconds: number;
  avgPaceSecPerKm: number;
}

interface Props {
  run: Run;
  onDelete: (id: number) => void;
}

function formatDuration(secs: number): string {
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

function formatPace(secPerKm: number): string {
  const m = Math.floor(secPerKm / 60);
  const s = secPerKm % 60;
  return `${m}:${String(s).padStart(2, '0')} /km`;
}

export default function RunCard({ run, onDelete }: Props) {
  return (
    <div className="bg-gray-800 rounded-xl p-5 flex items-center justify-between hover:bg-gray-750 transition">
      <Link to={`/runs/${run.id}`} className="flex-1">
        <div className="flex items-center gap-6">
          <div>
            <p className="font-semibold text-white">{run.title || 'Untitled Run'}</p>
            <p className="text-gray-400 text-sm">{run.date}</p>
          </div>
          <div className="flex gap-6 text-sm">
            <div>
              <p className="text-green-400 font-bold">{run.distanceKm?.toFixed(2) ?? '—'} km</p>
              <p className="text-gray-500">distance</p>
            </div>
            <div>
              <p className="text-white font-medium">{run.durationSeconds ? formatDuration(run.durationSeconds) : '—'}</p>
              <p className="text-gray-500">duration</p>
            </div>
            <div>
              <p className="text-white font-medium">{run.avgPaceSecPerKm ? formatPace(run.avgPaceSecPerKm) : '—'}</p>
              <p className="text-gray-500">pace</p>
            </div>
          </div>
        </div>
      </Link>
      <button
        onClick={() => onDelete(run.id)}
        className="text-gray-600 hover:text-red-400 transition ml-4 text-lg"
        title="Delete"
      >
        ✕
      </button>
    </div>
  );
}
