import { useState, useEffect, useCallback } from 'react';
import api from '../services/api';

export interface Task {
  id: string;
  userId: string;
  title: string;
  description: string | null;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED';
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  repeatType: 'ONCE' | 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'INTERVAL';
  repeatIntervalDays: number | null;
  lastCompletedAt: string | null;
  nextDueAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface TaskStats {
  total: number;
  completed: number;
  pending: number;
  overdue: number;
  dueToday: number;
}

export const useTasks = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [stats, setStats] = useState<TaskStats>({ total: 0, completed: 0, pending: 0, overdue: 0, dueToday: 0 });
  const [loading, setLoading] = useState(true);

  const fetchTasks = useCallback(async (filters?: { status?: string; priority?: string; date?: string }) => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filters?.status) params.set('status', filters.status);
      if (filters?.priority) params.set('priority', filters.priority);
      if (filters?.date) params.set('date', filters.date);

      const res = await api.get(`/tasks?${params.toString()}`);
      setTasks(res.data);
    } catch (err) {
      console.error('Failed to fetch tasks:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchStats = useCallback(async () => {
    try {
      const res = await api.get('/tasks/stats');
      setStats(res.data);
    } catch (err) {
      console.error('Failed to fetch stats:', err);
    }
  }, []);

  const createTask = async (data: {
    title: string;
    description?: string;
    priority?: string;
    repeatType?: string;
    repeatIntervalDays?: number;
    nextDueAt?: string;
  }) => {
    const res = await api.post('/tasks', data);
    setTasks(prev => [res.data, ...prev]);
    await fetchStats();
    return res.data;
  };

  const updateTask = async (id: string, data: Partial<Task>) => {
    const res = await api.put(`/tasks/${id}`, data);
    setTasks(prev => prev.map(t => (t.id === id ? res.data : t)));
    await fetchStats();
    return res.data;
  };

  const completeTask = async (id: string) => {
    const res = await api.patch(`/tasks/${id}/complete`);
    setTasks(prev => prev.map(t => (t.id === id ? res.data : t)));
    await fetchStats();
    return res.data;
  };

  const deleteTask = async (id: string) => {
    await api.delete(`/tasks/${id}`);
    setTasks(prev => prev.filter(t => t.id !== id));
    await fetchStats();
  };

  const fetchCalendarTasks = async (start: string, end: string): Promise<Task[]> => {
    const res = await api.get(`/tasks/calendar?start=${start}&end=${end}`);
    return res.data;
  };

  useEffect(() => {
    fetchTasks();
    fetchStats();
  }, [fetchTasks, fetchStats]);

  return {
    tasks,
    stats,
    loading,
    fetchTasks,
    fetchStats,
    createTask,
    updateTask,
    completeTask,
    deleteTask,
    fetchCalendarTasks,
  };
};
