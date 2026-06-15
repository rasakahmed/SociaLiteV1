import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Home, Users, Bell, User, LogOut, Menu, X, Search, MessageCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { notificationsAPI, friendsAPI } from '../services/api';
import './Navbar.css';

const API_URL = 'http://localhost:5000';

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [unreadCount, setUnreadCount] = useState(0);
  const [friendReqCount, setFriendReqCount] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    if (!user) return;
    const fetchUnread = () => {
      notificationsAPI.getUnreadCount()
        .then((res) => setUnreadCount(res.data.unreadCount))
        .catch(() => {});
      friendsAPI.getRequests()
        .then((res) => setFriendReqCount(res.data.requests?.length || 0))
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
        <Link to="/feed" className="navbar-brand">
          <div className="brand-icon">S</div>
          <span className="brand-text">SociaLite</span>
        </Link>

        <div className={`navbar-links ${menuOpen ? 'open' : ''}`}>
          <Link to="/feed" className={`nav-link ${isActive('/feed') ? 'active' : ''}`} onClick={() => setMenuOpen(false)}>
            <Home size={20} />
            <span>Feed</span>
          </Link>
          <Link to="/search" className={`nav-link ${isActive('/search') ? 'active' : ''}`} onClick={() => setMenuOpen(false)}>
            <Search size={20} />
            <span>Search</span>
          </Link>
          <Link to="/friends" className={`nav-link ${isActive('/friends') ? 'active' : ''}`} onClick={() => setMenuOpen(false)}>
            <div className="notification-icon-wrapper">
              <Users size={20} />
              {friendReqCount > 0 && <span className="notification-badge">{friendReqCount > 9 ? '9+' : friendReqCount}</span>}
            </div>
            <span>Friends</span>
          </Link>
          <Link to="/messages" className={`nav-link ${isActive('/messages') ? 'active' : ''}`} onClick={() => setMenuOpen(false)}>
            <MessageCircle size={20} />
            <span>Messages</span>
          </Link>
          <Link to="/notifications" className={`nav-link ${isActive('/notifications') ? 'active' : ''}`} onClick={() => setMenuOpen(false)}>
            <div className="notification-icon-wrapper">
              <Bell size={20} />
              {unreadCount > 0 && <span className="notification-badge">{unreadCount > 9 ? '9+' : unreadCount}</span>}
            </div>
            <span>Alerts</span>
          </Link>
          <Link to={`/@${user.username}`} className={`nav-link ${location.pathname.startsWith('/@') ? 'active' : ''}`} onClick={() => setMenuOpen(false)}>
            {user.avatar_url ? (
              <img src={`${API_URL}${user.avatar_url}`} alt="" className="nav-avatar" />
            ) : (
              <User size={20} />
            )}
            <span>Profile</span>
          </Link>

          <button className="nav-link logout-btn" onClick={handleLogout}>
            <LogOut size={20} />
            <span>Logout</span>
          </button>
        </div>

        <button className="mobile-menu-toggle" onClick={() => setMenuOpen(!menuOpen)}>
          {menuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>
    </nav>
  );
}
