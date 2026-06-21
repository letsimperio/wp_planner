import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  addDays,
  addMonths,
  subMonths,
  isSameMonth,
  isSameDay,
  isToday,
} from 'date-fns';
import { tr } from 'date-fns/locale';
import type { Task } from '../hooks/useTasks';
import api from '../services/api';

const CalendarView = () => {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [tasks, setTasks] = useState<Task[]>([]);

  useEffect(() => {
    const fetchTasks = async () => {
      try {
        const start = startOfWeek(startOfMonth(currentMonth), { weekStartsOn: 1 });
        const end = endOfWeek(endOfMonth(currentMonth), { weekStartsOn: 1 });
        const res = await api.get(
          `/tasks/calendar?start=${start.toISOString()}&end=${end.toISOString()}`
        );
        setTasks(res.data);
      } catch (err) {
        console.error('Failed to fetch calendar tasks:', err);
      }
    };
    fetchTasks();
  }, [currentMonth]);

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const startDate = startOfWeek(monthStart, { weekStartsOn: 1 });
  const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 });

  const days: Date[] = [];
  let day = startDate;
  while (day <= endDate) {
    days.push(day);
    day = addDays(day, 1);
  }

  const dayHeaders = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'];

  const getTasksForDay = (date: Date) =>
    tasks.filter((t) => t.nextDueAt && isSameDay(new Date(t.nextDueAt), date));

  return (
    <div className="calendar">
      <div className="calendar-header">
        <button className="btn-icon" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}>
          <ChevronLeft size={18} />
        </button>
        <h3 className="calendar-title">
          {format(currentMonth, 'MMMM yyyy', { locale: tr })}
        </h3>
        <button className="btn-icon" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>
          <ChevronRight size={18} />
        </button>
      </div>

      <div className="calendar-grid">
        {dayHeaders.map((h) => (
          <div key={h} className="calendar-day-header">{h}</div>
        ))}

        {days.map((d, i) => {
          const dayTasks = getTasksForDay(d);
          return (
            <div
              key={i}
              className={`calendar-day ${isToday(d) ? 'today' : ''} ${
                !isSameMonth(d, currentMonth) ? 'other-month' : ''
              }`}
            >
              <div className="calendar-day-number">{format(d, 'd')}</div>
              {dayTasks.slice(0, 3).map((t) => (
                <div key={t.id} className="calendar-task-label" title={t.title}>
                  {t.title}
                </div>
              ))}
              {dayTasks.length > 3 && (
                <div style={{ fontSize: '10px', color: 'var(--text-muted)', paddingLeft: '4px' }}>
                  +{dayTasks.length - 3} daha
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default CalendarView;
