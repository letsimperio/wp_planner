import { Inbox } from 'lucide-react';
import { type Task } from '../hooks/useTasks';
import TaskCard from './TaskCard';

interface TaskListProps {
  tasks: Task[];
  loading: boolean;
  onComplete: (id: string) => void;
  onDelete: (id: string) => void;
  onEdit: (task: Task) => void;
}

const TaskList = ({ tasks, loading, onComplete, onDelete, onEdit }: TaskListProps) => {
  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '2rem' }}>
        <div className="loading-spinner" />
      </div>
    );
  }

  if (tasks.length === 0) {
    return (
      <div className="empty-state">
        <Inbox size={48} />
        <div className="empty-state-title">Henüz görev yok</div>
        <div className="empty-state-text">
          Yeni bir görev ekleyerek başlayın veya WhatsApp üzerinden mesaj gönderin
        </div>
      </div>
    );
  }

  return (
    <div className="task-list">
      {tasks.map((task) => (
        <TaskCard
          key={task.id}
          task={task}
          onComplete={onComplete}
          onDelete={onDelete}
          onEdit={onEdit}
        />
      ))}
    </div>
  );
};

export default TaskList;
