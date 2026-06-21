import { NavLink, useLocation } from 'react-router-dom';
import { LayoutDashboard, CheckSquare, Calendar, Settings, LogOut, MessageSquare } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const Sidebar = () => {
  const { user, logout } = useAuth();
  const location = useLocation();

  const links = [
    { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/tasks', icon: CheckSquare, label: 'Görevler' },
    { to: '/calendar', icon: Calendar, label: 'Takvim' },
    { to: '/settings', icon: Settings, label: 'Ayarlar' },
  ];

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <div className="sidebar-logo-icon">
          <MessageSquare size={18} />
        </div>
        <span className="sidebar-logo-text">WP Planner</span>
      </div>

      <nav className="sidebar-nav">
        {links.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            className={({ isActive }) =>
              `sidebar-link ${isActive && location.pathname === link.to ? 'active' : ''}`
            }
            end={link.to === '/'}
          >
            <link.icon size={20} />
            <span>{link.label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="sidebar-footer">
        <div className="sidebar-user">
          <div className="sidebar-user-avatar">
            {user?.name?.charAt(0).toUpperCase()}
          </div>
          <div className="sidebar-user-info">
            <div className="sidebar-user-name">{user?.name}</div>
            <div className="sidebar-user-email">{user?.email}</div>
          </div>
          <button className="btn-icon" onClick={logout} title="Çıkış Yap">
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
