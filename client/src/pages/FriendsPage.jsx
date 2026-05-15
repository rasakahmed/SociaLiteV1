import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { UserCheck, UserX, Users, Loader } from 'lucide-react';
import { friendsAPI } from '../services/api';
import './FriendsPage.css';

const API_URL = 'http://localhost:5000';

export default function FriendsPage() {
  const [friends, setFriends] = useState([]);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('friends');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [fRes, rRes] = await Promise.all([
          friendsAPI.getList(),
          friendsAPI.getRequests(),
        ]);
        setFriends(fRes.data.friends);
        setRequests(rRes.data.requests);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleAccept = async (requestId) => {
    try {
      await friendsAPI.accept(requestId);
      const accepted = requests.find((r) => r.id === requestId);
      setRequests(requests.filter((r) => r.id !== requestId));
      if (accepted?.sender) setFriends([...friends, accepted.sender]);
    } catch (err) { console.error(err); }
  };

  const handleReject = async (requestId) => {
    try {
      await friendsAPI.reject(requestId);
      setRequests(requests.filter((r) => r.id !== requestId));
    } catch (err) { console.error(err); }
  };

  return (
    <div className="friends-page">
      <div className="friends-container">
        <h2 className="friends-title">Friends</h2>

        <div className="friends-tabs">
          <button className={`tab-btn ${tab === 'friends' ? 'active' : ''}`} onClick={() => setTab('friends')}>
            <Users size={16} /> My Friends ({friends.length})
          </button>
          <button className={`tab-btn ${tab === 'requests' ? 'active' : ''}`} onClick={() => setTab('requests')}>
            Requests {requests.length > 0 && <span className="req-badge">{requests.length}</span>}
          </button>
        </div>

        {loading ? (
          <div className="friends-loading"><Loader size={32} className="spinner" /></div>
        ) : tab === 'friends' ? (
          friends.length === 0 ? (
            <div className="friends-empty"><Users size={40} /><p>No friends yet. Search for people to connect!</p></div>
          ) : (
            <div className="friends-grid">
              {friends.map((f) => (
                <Link to={`/profile/${f.id}`} key={f.id} className="friend-card">
                  {f.avatar_url ? (
                    <img src={`${API_URL}${f.avatar_url}`} alt="" className="friend-avatar" />
                  ) : (
                    <div className="friend-avatar-ph">{(f.display_name || f.username)[0].toUpperCase()}</div>
                  )}
                  <span className="friend-name">{f.display_name || f.username}</span>
                  <span className="friend-uname">@{f.username}</span>
                </Link>
              ))}
            </div>
          )
        ) : (
          requests.length === 0 ? (
            <div className="friends-empty"><p>No pending requests</p></div>
          ) : (
            <div className="requests-list">
              {requests.map((r) => (
                <div key={r.id} className="request-card">
                  <Link to={`/profile/${r.sender.id}`} className="req-user-link">
                    {r.sender.avatar_url ? (
                      <img src={`${API_URL}${r.sender.avatar_url}`} alt="" className="req-avatar" />
                    ) : (
                      <div className="req-avatar-ph">{(r.sender.display_name || r.sender.username)[0].toUpperCase()}</div>
                    )}
                    <div><span className="req-name">{r.sender.display_name || r.sender.username}</span><span className="req-uname">@{r.sender.username}</span></div>
                  </Link>
                  <div className="req-actions">
                    <button className="req-accept" onClick={() => handleAccept(r.id)}><UserCheck size={16} /> Accept</button>
                    <button className="req-reject" onClick={() => handleReject(r.id)}><UserX size={16} /> Reject</button>
                  </div>
                </div>
              ))}
            </div>
          )
        )}
      </div>
    </div>
  );
}
