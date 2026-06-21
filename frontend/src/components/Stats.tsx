import { ListChecks, CheckCircle2, Clock, AlertTriangle, CalendarClock } from 'lucide-react';
import { type TaskStats } from '../hooks/useTasks';

interface StatsProps {
  stats: TaskStats;
}

const Stats = ({ stats }: StatsProps) => {
  const items = [
    { label: 'Toplam Görev', value: stats.total, icon: ListChecks, color: 'purple' },
    { label: 'Tamamlanan', value: stats.completed, icon: CheckCircle2, color: 'green' },
    { label: 'Bekleyen', value: stats.pending, icon: Clock, color: 'yellow' },
    { label: 'Gecikmiş', value: stats.overdue, icon: AlertTriangle, color: 'red' },
    { label: 'Bugün', value: stats.dueToday, icon: CalendarClock, color: 'cyan' },
  ];

  return (
    <div className="stats-grid">
      {items.map((item) => (
        <div key={item.label} className="stat-card">
          <div className={`stat-icon ${item.color}`}>
            <item.icon size={22} />
          </div>
          <div className="stat-info">
            <div className="stat-value">{item.value}</div>
            <div className="stat-label">{item.label}</div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default Stats;
