import { useState } from 'react';
import { Plus } from 'lucide-react';
import Header from '../components/Header';
import TaskList from '../components/TaskList';
import TaskModal from '../components/TaskModal';
import { useTasks, type Task } from '../hooks/useTasks';

const Tasks = () => {
  const { tasks, loading, createTask, completeTask, deleteTask, updateTask, fetchTasks } = useTasks();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [activeFilter, setActiveFilter] = useState<string>('all');

  const filters = [
    { key: 'all', label: 'Tümü' },
    { key: 'PENDING', label: 'Bekleyen' },
    { key: 'IN_PROGRESS', label: 'Devam Eden' },
    { key: 'COMPLETED', label: 'Tamamlanan' },
  ];

  const handleFilter = (key: string) => {
    setActiveFilter(key);
    if (key === 'all') {
      fetchTasks();
    } else {
      fetchTasks({ status: key });
    }
  };

  const handleSave = async (data: any) => {
    if (editingTask) {
      await updateTask(editingTask.id, data);
    } else {
      await createTask(data);
    }
    setModalOpen(false);
    setEditingTask(null);
  };

  const handleEdit = (task: Task) => {
    setEditingTask(task);
    setModalOpen(true);
  };

  return (
    <>
      <Header title="Görevler">
        <button
          className="btn btn-primary"
          onClick={() => { setEditingTask(null); setModalOpen(true); }}
          id="add-task-btn-tasks-page"
        >
          <Plus size={16} />
          Yeni Görev
        </button>
      </Header>

      <div className="page-content">
        <div className="filters-bar">
          {filters.map((f) => (
            <button
              key={f.key}
              className={`filter-chip ${activeFilter === f.key ? 'active' : ''}`}
              onClick={() => handleFilter(f.key)}
            >
              {f.label}
            </button>
          ))}
        </div>

        <TaskList
          tasks={tasks}
          loading={loading}
          onComplete={(id) => completeTask(id)}
          onDelete={(id) => {
            if (confirm('Bu görevi silmek istediğinize emin misiniz?')) {
              deleteTask(id);
            }
          }}
          onEdit={handleEdit}
        />
      </div>

      <TaskModal
        isOpen={modalOpen}
        task={editingTask}
        onClose={() => { setModalOpen(false); setEditingTask(null); }}
        onSave={handleSave}
      />
    </>
  );
};

export default Tasks;
