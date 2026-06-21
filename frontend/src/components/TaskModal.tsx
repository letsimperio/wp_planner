import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { type Task } from '../hooks/useTasks';

interface TaskModalProps {
  isOpen: boolean;
  task?: Task | null;
  onClose: () => void;
  onSave: (data: any) => void;
}

const TaskModal = ({ isOpen, task, onClose, onSave }: TaskModalProps) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState('MEDIUM');
  const [repeatType, setRepeatType] = useState('ONCE');
  const [repeatIntervalDays, setRepeatIntervalDays] = useState<number>(1);
  const [nextDueAt, setNextDueAt] = useState('');

  useEffect(() => {
    if (task) {
      setTitle(task.title);
      setDescription(task.description || '');
      setPriority(task.priority);
      setRepeatType(task.repeatType);
      setRepeatIntervalDays(task.repeatIntervalDays || 1);
      setNextDueAt(task.nextDueAt ? task.nextDueAt.split('T')[0] : '');
    } else {
      setTitle('');
      setDescription('');
      setPriority('MEDIUM');
      setRepeatType('ONCE');
      setRepeatIntervalDays(1);
      setNextDueAt(new Date().toISOString().split('T')[0]);
    }
  }, [task, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    onSave({
      title: title.trim(),
      description: description.trim() || undefined,
      priority,
      repeatType,
      repeatIntervalDays: repeatType === 'INTERVAL' ? repeatIntervalDays : undefined,
      nextDueAt: nextDueAt || undefined,
    });
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">{task ? 'Görevi Düzenle' : 'Yeni Görev'}</h2>
          <button className="btn-icon" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Başlık *</label>
            <input
              id="task-title-input"
              className="form-input"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Görev başlığı..."
              autoFocus
            />
          </div>

          <div className="form-group">
            <label className="form-label">Açıklama</label>
            <textarea
              id="task-description-input"
              className="form-input"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="İsteğe bağlı açıklama..."
              rows={3}
              style={{ resize: 'vertical' }}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group">
              <label className="form-label">Öncelik</label>
              <select
                id="task-priority-select"
                className="form-select"
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
              >
                <option value="LOW">Düşük</option>
                <option value="MEDIUM">Orta</option>
                <option value="HIGH">Yüksek</option>
                <option value="URGENT">Acil</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Tekrar</label>
              <select
                id="task-repeat-select"
                className="form-select"
                value={repeatType}
                onChange={(e) => setRepeatType(e.target.value)}
              >
                <option value="ONCE">Tek Seferlik</option>
                <option value="DAILY">Günlük</option>
                <option value="WEEKLY">Haftalık</option>
                <option value="MONTHLY">Aylık</option>
                <option value="INTERVAL">Özel Aralık</option>
              </select>
            </div>
          </div>

          {repeatType === 'INTERVAL' && (
            <div className="form-group">
              <label className="form-label">Tekrar Aralığı (gün)</label>
              <input
                id="task-interval-input"
                type="number"
                className="form-input"
                value={repeatIntervalDays}
                onChange={(e) => setRepeatIntervalDays(Number(e.target.value))}
                min={1}
              />
            </div>
          )}

          <div className="form-group">
            <label className="form-label">Tarih</label>
            <input
              id="task-date-input"
              type="date"
              className="form-input"
              value={nextDueAt}
              onChange={(e) => setNextDueAt(e.target.value)}
            />
          </div>

          <div className="modal-actions">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              İptal
            </button>
            <button type="submit" className="btn btn-primary" id="task-save-btn">
              {task ? 'Güncelle' : 'Oluştur'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default TaskModal;
