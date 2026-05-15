import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Bell, Heart, MessageCircle, UserPlus, UserCheck, Loader } from 'lucide-react';
import { notificationsAPI } from '../services/api';
import './NotificationsPage.css';

const API_URL = 'http://localhost:5000';

const ICONS = {
  like: Heart,
  comment: MessageCircle,
  friend_request: UserPlus,
  friend_accept: UserCheck,
};

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    const fetch = async () => {
      try {
        const res = await notificationsAPI.getAll();
        setNotifications(res.data.notifications);
        setUnreadCount(res.data.unreadCount);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, []);

  const markAllRead = async () => {
    try {
      await notificationsAPI.markAllRead();
      setNotifications(notifications.map((n) => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error(err);
    }
  };

  const timeAgo = (dateStr) => {
    if (!dateStr) return 'just now';
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return 'just now';
    const diff = Date.now() - date.getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h`;
    return `${Math.floor(hrs / 24)}d`;
  };

  return (
    <div className="notifications-page">
      <div className="notifications-container">
        <div className="notifications-header">
          <h2 className="notifications-title">Notifications</h2>
          {unreadCount > 0 && (
            <button className="mark-read-btn" onClick={markAllRead}>
              Mark all read
            </button>
          )}
        </div>

        {loading ? (
          <div className="notif-loading"><Loader size={32} className="spinner" /></div>
        ) : notifications.length === 0 ? (
          <div className="notif-empty">
            <Bell size={40} />
            <p>No notifications yet</p>
          </div>
        ) : (
          <div className="notif-list">
            {notifications.map((n) => {
              const Icon = ICONS[n.type] || Bell;
              return (
                <div key={n.id} className={`notif-item ${!n.is_read ? 'unread' : ''}`}>
                  <div className={`notif-icon notif-icon-${n.type}`}>
                    <Icon size={16} />
                  </div>
                  <div className="notif-content">
                    {n.fromUser && (
                      <Link to={`/profile/${n.fromUser.id}`} className="notif-from">
                        {n.fromUser.avatar_url ? (
                          <img src={`${API_URL}${n.fromUser.avatar_url}`} alt="" className="notif-avatar" />
                        ) : (
                          <div className="notif-avatar-ph">{(n.fromUser.display_name || n.fromUser.username)[0].toUpperCase()}</div>
                        )}
                      </Link>
                    )}
                    <p className="notif-message">{n.message}</p>
                  </div>
                  <span className="notif-time">{timeAgo(n.created_at || n.createdAt)}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
