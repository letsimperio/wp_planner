import { Check, Trash2, Edit3, Repeat, Calendar as CalIcon } from 'lucide-react';
import { type Task } from '../hooks/useTasks';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';

interface TaskCardProps {
  task: Task;
  onComplete: (id: string) => void;
  onDelete: (id: string) => void;
  onEdit: (task: Task) => void;
}

const priorityLabels: Record<string, string> = {
  URGENT: 'Acil',
  HIGH: 'Yüksek',
  MEDIUM: 'Orta',
  LOW: 'Düşük',
};

const repeatLabels: Record<string, string> = {
  DAILY: 'Günlük',
  WEEKLY: 'Haftalık',
  MONTHLY: 'Aylık',
  INTERVAL: 'Özel',
  ONCE: '',
};

const TaskCard = ({ task, onComplete, onDelete, onEdit }: TaskCardProps) => {
  const isCompleted = task.status === 'COMPLETED';

  return (
    <div className={`task-card ${isCompleted ? 'completed' : ''}`}>
      <button
        className={`task-check ${isCompleted ? 'completed' : ''}`}
        onClick={() => onComplete(task.id)}
        title="Tamamla"
      >
        {isCompleted && <Check size={14} />}
      </button>

      <div className="task-body">
        <div className="task-title">{task.title}</div>
        <div className="task-meta">
          <span className={`badge badge-priority-${task.priority.toLowerCase()}`}>
            {priorityLabels[task.priority]}
          </span>

          {task.repeatType !== 'ONCE' && (
            <span className="badge badge-repeat">
              <Repeat size={10} />
              {repeatLabels[task.repeatType]}
              {task.repeatType === 'INTERVAL' && task.repeatIntervalDays
                ? ` (${task.repeatIntervalDays} gün)`
                : ''}
            </span>
          )}

          {task.nextDueAt && (
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <CalIcon size={11} />
              {format(new Date(task.nextDueAt), 'd MMM yyyy', { locale: tr })}
            </span>
          )}
        </div>
      </div>

      <div className="task-actions">
        <button className="btn-icon" onClick={() => onEdit(task)} title="Düzenle">
          <Edit3 size={14} />
        </button>
        <button className="btn-icon" onClick={() => onDelete(task.id)} title="Sil">
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  );
};

export default TaskCard;
