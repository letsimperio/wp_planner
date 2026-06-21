import { useState } from 'react';
import { Plus } from 'lucide-react';
import Header from '../components/Header';
import Stats from '../components/Stats';
import TaskList from '../components/TaskList';
import TaskModal from '../components/TaskModal';
import { useTasks, type Task } from '../hooks/useTasks';

const Dashboard = () => {
  const { tasks, stats, loading, createTask, completeTask, deleteTask, updateTask } = useTasks();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  // Show only active (non-completed) tasks, limited to 10
  const activeTasks = tasks
    .filter((t) => t.status !== 'COMPLETED')
    .slice(0, 10);

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

  const handleComplete = async (id: string) => {
    await completeTask(id);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Bu görevi silmek istediğinize emin misiniz?')) {
      await deleteTask(id);
    }
  };

  return (
    <>
      <Header title="Dashboard">
        <button
          className="btn btn-primary"
          onClick={() => { setEditingTask(null); setModalOpen(true); }}
          id="add-task-btn"
        >
          <Plus size={16} />
          Yeni Görev
        </button>
      </Header>

      <div className="page-content">
        <Stats stats={stats} />

        <div className="section-header">
          <h2 className="section-title">Aktif Görevler</h2>
        </div>

        <TaskList
          tasks={activeTasks}
          loading={loading}
          onComplete={handleComplete}
          onDelete={handleDelete}
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

export default Dashboard;
