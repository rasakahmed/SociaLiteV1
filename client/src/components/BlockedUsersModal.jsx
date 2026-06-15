import { useState, useEffect } from 'react';
import { X, ShieldAlert, Loader } from 'lucide-react';
import { Link } from 'react-router-dom';
import { usersAPI } from '../services/api';
import { useToast } from '../context/ToastContext';
import './EditPostModal.css'; // Reusing modal-overlay styles

export default function BlockedUsersModal({ onClose }) {
  const [blockedUsers, setBlockedUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const fetchBlocked = async () => {
      try {
        const res = await usersAPI.getBlocked();
        setBlockedUsers(res.data.blockedUsers);
      } catch (err) {
        toast.error('Failed to load blocked users');
      } finally {
        setLoading(false);
      }
    };
    fetchBlocked();
  }, []);

  const handleUnblock = async (id) => {
    try {
      await usersAPI.unblock(id);
      setBlockedUsers(blockedUsers.filter(u => u.id !== id));
      toast.success('User unblocked');
    } catch (err) {
      toast.error('Failed to unblock user');
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-container" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3><ShieldAlert size={18} style={{ marginRight: '8px', verticalAlign: 'middle' }}/> Blocked Users</h3>
          <button className="modal-close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="modal-body" style={{ maxHeight: '400px', overflowY: 'auto' }}>
          {loading ? (
            <div style={{ padding: '20px', textAlign: 'center' }}><Loader size={24} className="spinner" /></div>
          ) : blockedUsers.length === 0 ? (
            <p style={{ textAlign: 'center', color: 'rgba(255,255,255,0.5)', padding: '20px' }}>You have no blocked users.</p>
          ) : (
            <div className="users-list" style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '10px' }}>
              {blockedUsers.map((user) => (
                <div key={user.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(255,255,255,0.05)', padding: '10px', borderRadius: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <Link to={`/@${user.username}`} onClick={onClose}>
                      {user.avatar_url ? (
                        <img src={`http://localhost:5000${user.avatar_url}`} alt="" style={{ width: '36px', height: '36px', borderRadius: '50%', objectFit: 'cover' }} />
                      ) : (
                        <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'linear-gradient(135deg, #6366f1, #a855f7)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 'bold' }}>
                          {(user.display_name || user.username)[0].toUpperCase()}
                        </div>
                      )}
                    </Link>
                    <div>
                      <Link to={`/@${user.username}`} onClick={onClose} style={{ color: '#fff', textDecoration: 'none', fontWeight: 'bold', display: 'block', fontSize: '14px' }}>
                        {user.display_name || user.username}
                      </Link>
                      <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '12px' }}>@{user.username}</span>
                    </div>
                  </div>
                  <button 
                    onClick={() => handleUnblock(user.id)}
                    style={{ background: 'rgba(255, 255, 255, 0.1)', border: 'none', color: '#fff', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '13px' }}
                  >
                    Unblock
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}