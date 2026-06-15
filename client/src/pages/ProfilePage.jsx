import { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { Camera, Edit3, Save, X, UserPlus, UserCheck, Clock, UserX, Loader, ShieldAlert, Trash2, Settings, Lock } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { usersAPI, postsAPI, friendsAPI } from '../services/api';
import { useToast } from '../context/ToastContext';
import PostCard from '../components/PostCard';
import SettingsModal from '../components/SettingsModal';
import './ProfilePage.css';

const API_URL = 'http://localhost:5000';

const isUserActive = (lastActive) => {
  if (!lastActive) return false;
  const last = new Date(lastActive).getTime();
  const now = new Date().getTime();
  return (now - last) <= 5 * 60 * 1000;
};

export default function ProfilePage() {
  const { handle } = useParams();
  const username = handle?.startsWith('@') ? handle.slice(1) : handle;
  const { user: currentUser, updateUser } = useAuth();
  const [profile, setProfile] = useState(null);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({ display_name: '', bio: '' });
  const [friendStatus, setFriendStatus] = useState({ status: 'none', requestId: null, isSender: false });
  const [actionLoading, setActionLoading] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [isPrivateProfile, setIsPrivateProfile] = useState(false);
  const { toast } = useToast();
  const fileInputRef = useRef(null);
  const isOwn = currentUser?.username === username;

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // Fetch profile by username
        const profileRes = await usersAPI.getProfile(username);
        const profileData = profileRes.data.user;
        setProfile(profileData);

        // Use numeric ID for posts + friend status
        const postsRes = await postsAPI.getByUser(profileData.id);
        setPosts(postsRes.data.posts);
        setIsPrivateProfile(!!postsRes.data.isPrivate);
        setEditForm({
          display_name: profileData.display_name || '',
          bio: profileData.bio || '',
        });

        if (currentUser?.username !== username) {
          const statusRes = await friendsAPI.getStatus(profileData.id);
          setFriendStatus(statusRes.data);
        }
      } catch (err) {
        console.error('Profile error:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [username, currentUser]);

  const handleAvatarUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('avatar', file);
    try {
      const res = await usersAPI.uploadAvatar(formData);
      setProfile((prev) => ({ ...prev, avatar_url: res.data.avatar_url }));
      updateUser(res.data.user);
    } catch (err) {
      console.error('Avatar upload error:', err);
    }
  };

  const handleSaveProfile = async () => {
    try {
      const res = await usersAPI.updateProfile(editForm);
      setProfile((prev) => ({ ...prev, ...res.data.user }));
      updateUser(res.data.user);
      setEditing(false);
    } catch (err) {
      console.error('Update profile error:', err);
    }
  };

  const handleFriendAction = async (action) => {
    setActionLoading(true);
    try {
      if (action === 'send') {
        await friendsAPI.sendRequest(profile.id);
        setFriendStatus({ status: 'pending', isSender: true });
      } else if (action === 'accept') {
        await friendsAPI.accept(friendStatus.requestId);
        setFriendStatus({ status: 'accepted' });
      } else if (action === 'reject') {
        await friendsAPI.reject(friendStatus.requestId);
        setFriendStatus({ status: 'rejected' });
      }
    } catch (err) {
      console.error('Friend action error:', err);
      toast.error('Failed to perform friend action');
    } finally {
      setActionLoading(false);
    }
  };

  const handleUnfriend = async () => {
    if (!window.confirm('Are you sure you want to unfriend this user?')) return;
    setActionLoading(true);
    try {
      await friendsAPI.removeFriend(profile.id);
      setFriendStatus({ status: 'none', requestId: null, isSender: false });
      setProfile((prev) => ({ ...prev, friendCount: prev.friendCount - 1 }));
      toast.success('Unfriended successfully');
    } catch (err) {
      toast.error('Failed to unfriend');
    } finally {
      setActionLoading(false);
    }
  };

  const handleBlock = async () => {
    if (!profile.isBlocked) {
      if (!window.confirm('Are you sure you want to block this user? They will not be able to interact with you.')) return;
      try {
        await usersAPI.block(profile.id);
        toast.success('User blocked');
        setProfile((prev) => ({ ...prev, isBlocked: true }));
      } catch (err) {
        toast.error(err.response?.data?.error || 'Failed to block user');
      }
    } else {
      try {
        await usersAPI.unblock(profile.id);
        toast.success('User unblocked');
        setProfile((prev) => ({ ...prev, isBlocked: false }));
      } catch (err) {
        toast.error(err.response?.data?.error || 'Failed to unblock user');
      }
    }
  };

  const handleDeletePost = async (postId) => {
    await postsAPI.delete(postId);
    setPosts(posts.filter((p) => p.id !== postId));
    if (profile) {
      setProfile((prev) => ({ ...prev, postCount: prev.postCount - 1 }));
    }
  };

  if (loading) {
    return (
      <div className="profile-page">
        <div className="profile-loading">
          <Loader size={32} className="spinner" />
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="profile-page">
        <div className="profile-not-found">User not found.</div>
      </div>
    );
  }

  const renderFriendButton = () => {
    if (isOwn) return null;
    if (actionLoading) return <button className="friend-btn loading" disabled><Loader size={16} className="spinner" /></button>;

    switch (friendStatus.status) {
      case 'accepted':
        return (
          <div className="friend-action-group">
            <button className="friend-btn friends"><UserCheck size={16} /><span>Friends</span></button>
            <button className="friend-btn reject" onClick={handleUnfriend} title="Unfriend">
              <UserX size={16} /><span>Unfriend</span>
            </button>
          </div>
        );
      case 'pending':
        if (friendStatus.isSender) {
          return <button className="friend-btn pending"><Clock size={16} /><span>Request Sent</span></button>;
        }
        return (
          <div className="friend-action-group">
            <button className="friend-btn accept" onClick={() => handleFriendAction('accept')}>
              <UserCheck size={16} /><span>Accept</span>
            </button>
            <button className="friend-btn reject" onClick={() => handleFriendAction('reject')}>
              <UserX size={16} /><span>Reject</span>
            </button>
          </div>
        );
      default:
        return (
          <button className="friend-btn add" onClick={() => handleFriendAction('send')}>
            <UserPlus size={16} /><span>Add Friend</span>
          </button>
        );
    }
  };

  return (
    <div className="profile-page">
      <div className="profile-container">
        <div className="profile-header-card">
          <div className="profile-cover">
            <div className="profile-cover-gradient"></div>
          </div>

          <div className="profile-info-section">
            <div className="profile-avatar-wrapper">
              {profile.avatar_url ? (
                <img src={`${API_URL}${profile.avatar_url}`} alt="" className="profile-avatar" />
              ) : (
                <div className="profile-avatar-placeholder">
                  {(profile.display_name || profile.username)[0].toUpperCase()}
                </div>
              )}
              {!isOwn && (
                <div className={`avatar-active-badge ${isUserActive(profile.last_active) ? 'online' : 'offline'}`} title={isUserActive(profile.last_active) ? "Online" : "Offline"}></div>
              )}
              {isOwn && (
                <>
                  <input type="file" accept="image/*" ref={fileInputRef} onChange={handleAvatarUpload} className="file-input-hidden" />
                  <button className="avatar-edit-btn" onClick={() => fileInputRef.current?.click()}>
                    <Camera size={16} />
                  </button>
                </>
              )}
            </div>

            <div className="profile-details">
              {editing ? (
                <div className="profile-edit-form">
                  <input
                    type="text"
                    value={editForm.display_name}
                    onChange={(e) => setEditForm({ ...editForm, display_name: e.target.value })}
                    placeholder="Display name"
                    className="edit-input"
                  />
                  <textarea
                    value={editForm.bio}
                    onChange={(e) => setEditForm({ ...editForm, bio: e.target.value })}
                    placeholder="Write something about yourself..."
                    className="edit-textarea"
                    rows={3}
                  />
                  <div className="edit-actions">
                    <button className="edit-save-btn" onClick={handleSaveProfile}>
                      <Save size={14} /><span>Save</span>
                    </button>
                    <button className="edit-cancel-btn" onClick={() => setEditing(false)}>
                      <X size={14} /><span>Cancel</span>
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <h1 className="profile-name">
                    {profile.display_name || profile.username}
                  </h1>
                  <p className="profile-username">@{profile.username}</p>
                  {profile.bio && <p className="profile-bio">{profile.bio}</p>}

                  <div className="profile-stats">
                    <div className="stat">
                      <span className="stat-value">{profile.postCount || 0}</span>
                      <span className="stat-label">Posts</span>
                    </div>
                    <div className="stat">
                      <span className="stat-value">{profile.friendCount || 0}</span>
                      <span className="stat-label">Friends</span>
                    </div>
                  </div>
                </>
              )}
            </div>

            <div className="profile-actions">
              {isOwn && !editing && (
                <div className="profile-owner-actions">
                  <button className="edit-profile-btn" onClick={() => setEditing(true)}>
                    <Edit3 size={16} /><span>Edit</span>
                  </button>
                  <button className="edit-profile-btn" onClick={() => setShowSettings(true)}>
                    <Settings size={16} /><span>Settings</span>
                  </button>
                </div>
              )}
              {!profile.isBlocked && renderFriendButton()}
              {!isOwn && (
                <button 
                  className={`friend-btn ${profile.isBlocked ? 'accept' : 'reject'}`} 
                  onClick={handleBlock} 
                  title={profile.isBlocked ? "Unblock User" : "Block User"} 
                  style={{ marginLeft: '8px' }}
                >
                  <ShieldAlert size={16} /><span>{profile.isBlocked ? 'Unblock' : 'Block'}</span>
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="profile-posts">
          <h3 className="profile-posts-title">
            {isOwn ? 'Your Posts' : `${profile.display_name || profile.username}'s Posts`}
          </h3>
          {profile.isBlocked ? (
            <div className="profile-no-posts">
              <p>You have blocked this user.</p>
            </div>
          ) : isPrivateProfile && !isOwn ? (
            <div className="profile-no-posts">
              <Lock size={24} style={{ marginBottom: '8px', opacity: 0.4 }} />
              <p>This account is private</p>
              <p style={{ fontSize: '13px', marginTop: '4px', opacity: 0.5 }}>Add this user as a friend to see their posts.</p>
            </div>
          ) : posts.length === 0 ? (
            <div className="profile-no-posts">
              <p>No posts yet.</p>
            </div>
          ) : (
            posts.map((post) => (
              <PostCard
                key={post.id}
                post={post}
                onDelete={handleDeletePost}
              />
            ))
          )}
        </div>
      </div>

      {showSettings && (
        <SettingsModal 
          onClose={() => setShowSettings(false)} 
          isPrivate={profile?.is_private || false}
          onPrivateChange={(val) => setProfile(prev => ({ ...prev, is_private: val }))}
        />
      )}
    </div>
  );
}