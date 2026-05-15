import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Home, Users, Bell, User, LogOut, Menu, X, Search, Sun, Moon, ShieldAlert } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { notificationsAPI } from '../services/api';
import BlockedUsersModal from './BlockedUsersModal';
import './Navbar.css';

const API_URL = 'http://localhost:5000';

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { theme, toggleTheme } = useTheme();
  const [unreadCount, setUnreadCount] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);
  const [showBlockedModal, setShowBlockedModal] = useState(false);

  useEffect(() => {
    if (!user) return;
    const fetchUnread = () => {
      notificationsAPI.getUnreadCount()
        .then((res) => setUnreadCount(res.data.unreadCount))
        .catch(() => {});
    };
    fetchUnread();
    const interval = setInterval(fetchUnread, 5000);
    return () => clearInterval(interval);
  }, [user]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  if (!user) return null;

  const isActive = (path) => location.pathname === path;

  return (
    <nav className="navbar">
      <div className="navbar-container">
        <Link to="/" className="navbar-brand">
          <div className="brand-icon">S</div>
          <span className="brand-text">Socialite</span>
        </Link>

        <div className={`navbar-links ${menuOpen ? 'open' : ''}`}>
          <Link to="/" className={`nav-link ${isActive('/') ? 'active' : ''}`} onClick={() => setMenuOpen(false)}>
            <Home size={20} />
            <span>Feed</span>
          </Link>
          <Link to="/search" className={`nav-link ${isActive('/search') ? 'active' : ''}`} onClick={() => setMenuOpen(false)}>
            <Search size={20} />
            <span>Search</span>
          </Link>
          <Link to="/friends" className={`nav-link ${isActive('/friends') ? 'active' : ''}`} onClick={() => setMenuOpen(false)}>
            <Users size={20} />
            <span>Friends</span>
          </Link>
          <Link to="/notifications" className={`nav-link ${isActive('/notifications') ? 'active' : ''}`} onClick={() => setMenuOpen(false)}>
            <div className="notification-icon-wrapper">
              <Bell size={20} />
              {unreadCount > 0 && <span className="notification-badge">{unreadCount > 9 ? '9+' : unreadCount}</span>}
            </div>
            <span>Alerts</span>
          </Link>
          <Link to={`/profile/${user.id}`} className={`nav-link ${location.pathname.startsWith('/profile') ? 'active' : ''}`} onClick={() => setMenuOpen(false)}>
            {user.avatar_url ? (
              <img src={`${API_URL}${user.avatar_url}`} alt="" className="nav-avatar" />
            ) : (
              <User size={20} />
            )}
            <span>Profile</span>
          </Link>

          <button className="nav-link theme-toggle-btn" onClick={toggleTheme} title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}>
            {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
            <span>{theme === 'dark' ? 'Light' : 'Dark'}</span>
          </button>

          <button className="nav-link" onClick={() => { setShowBlockedModal(true); setMenuOpen(false); }}>
            <ShieldAlert size={20} />
            <span>Blocks</span>
          </button>

          <button className="nav-link logout-btn" onClick={handleLogout}>
            <LogOut size={20} />
            <span>Logout</span>
          </button>
        </div>

        <button className="mobile-menu-toggle" onClick={() => setMenuOpen(!menuOpen)}>
          {menuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {showBlockedModal && (
        <BlockedUsersModal onClose={() => setShowBlockedModal(false)} />
      )}
    </nav>
  );
}
