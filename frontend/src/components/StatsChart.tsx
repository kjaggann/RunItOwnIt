import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

interface WeeklyEntry {
  date: string;
  km: number;
}

interface Props {
  data: WeeklyEntry[];
}

export default function StatsChart({ data }: Props) {
  const formatted = data.map(d => ({
    ...d,
    date: d.date.slice(5), // MM-DD
    km: Math.round(d.km * 100) / 100,
  }));

  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={formatted} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
        <XAxis dataKey="date" tick={{ fill: '#9CA3AF', fontSize: 12 }} />
        <YAxis tick={{ fill: '#9CA3AF', fontSize: 12 }} unit=" km" />
        <Tooltip
          contentStyle={{ backgroundColor: '#1F2937', border: '1px solid #374151', borderRadius: '8px' }}
          labelStyle={{ color: '#F9FAFB' }}
          itemStyle={{ color: '#34D399' }}
        />
        <Bar dataKey="km" fill="#22c55e" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
