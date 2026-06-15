import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { UserPlus, Users, Sparkles, Loader } from 'lucide-react';
import { friendsAPI } from '../services/api';
import { useToast } from '../context/ToastContext';
import { SuggestionCardSkeleton } from './Skeleton';
import './SuggestedFriends.css';

const API_URL = 'http://localhost:5000';

export default function SuggestedFriends() {
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const fetch = async () => {
      try {
        const res = await friendsAPI.getSuggestions();
        setSuggestions(res.data.suggestions || []);
      } catch (err) {
        console.error('Suggestions error:', err);
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, []);

  const handleSendRequest = async (userId) => {
    try {
      await friendsAPI.sendRequest(userId);
      setSuggestions((prev) =>
        prev.map((s) => (s.id === userId ? { ...s, requestSent: true } : s))
      );
      toast.success('Friend request sent!');
    } catch (err) {
      const msg = err.response?.data?.error || 'Failed to send request';
      toast.error(msg);
    }
  };

  if (loading) {
    return (
      <div className="suggestions-card">
        <div className="suggestions-header">
          <Sparkles size={18} />
          <h3>People You May Know</h3>
        </div>
        <div className="suggestions-list">
          {[1, 2, 3].map((i) => (
            <SuggestionCardSkeleton key={i} />
          ))}
        </div>
      </div>
    );
  }

  if (suggestions.length === 0) return null;

  return (
    <div className="suggestions-card" id="suggestions-card">
      <div className="suggestions-header">
        <Sparkles size={18} />
        <h3>People You May Know</h3>
      </div>
      <div className="suggestions-list">
        {suggestions.slice(0, 5).map((user) => (
          <div key={user.id} className="suggestion-item">
            <Link to={`/@${user.username}`} className="suggestion-link">
              {user.avatar_url ? (
                <>
                  <img src={`${API_URL}${user.avatar_url}`} alt="" className="suggestion-avatar" onError={(e)=>{e.target.style.display='none'; if(e.target.nextSibling) e.target.nextSibling.style.display='flex';}} />
                  <div className="suggestion-avatar-ph" style={{ display: 'none' }}>
                    {(user.display_name || user.username)[0].toUpperCase()}
                  </div>
                </>
              ) : (
                <div className="suggestion-avatar-ph">
                  {(user.display_name || user.username)[0].toUpperCase()}
                </div>
              )}
              <div className="suggestion-info">
                <span className="suggestion-name">{user.display_name || user.username}</span>
                <span className="suggestion-meta">
                  {user.mutualCount > 0
                    ? `${user.mutualCount} mutual friend${user.mutualCount > 1 ? 's' : ''}`
                    : `@${user.username}`}
                </span>
              </div>
            </Link>
            {!user.requestSent ? (
              <button
                className="suggestion-add-btn"
                onClick={() => handleSendRequest(user.id)}
                title="Send friend request"
              >
                <UserPlus size={14} />
              </button>
            ) : (
              <span className="suggestion-sent">Sent</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}