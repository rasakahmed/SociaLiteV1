import { useState } from 'react';
import { X, Activity, Bell, Lock, Moon, Key, ShieldAlert, FileText, Trash2 } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { authAPI, usersAPI } from '../services/api';
import BlockedUsersModal from './BlockedUsersModal';
import './SettingsModal.css';

export default function SettingsModal({ onClose, isPrivate = false, onPrivateChange }) {
  const { theme, toggleTheme } = useTheme();
  const { user, logout, updateUser } = useAuth();
  const { toast } = useToast();

  const [activeStatus, setActiveStatus] = useState(true);
  const [notifications, setNotifications] = useState(user?.notifications_enabled !== false);
  const [privateProfile, setPrivateProfile] = useState(isPrivate);

  // Sub-views
  const [view, setView] = useState('main'); // 'main' | 'changePassword' | 'blocked' | 'privacy' | 'deleteAccount'

  // Change password state
  const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [passwordLoading, setPasswordLoading] = useState(false);

  // Delete account state
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteLoading, setDeleteLoading] = useState(false);

  const handleChangePassword = async () => {
    if (!passwordForm.currentPassword || !passwordForm.newPassword) {
      toast.error('Please fill in all fields');
      return;
    }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }
    if (passwordForm.newPassword.length < 6) {
      toast.error('New password must be at least 6 characters');
      return;
    }

    setPasswordLoading(true);
    try {
      await authAPI.changePassword(passwordForm.currentPassword, passwordForm.newPassword);
      toast.success('Password changed successfully');
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setView('main');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to change password');
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!deletePassword) {
      toast.error('Please enter your password to confirm');
      return;
    }

    if (!window.confirm('This action is PERMANENT. Are you absolutely sure you want to delete your account?')) return;

    setDeleteLoading(true);
    try {
      await authAPI.deleteAccount(deletePassword);
      toast.success('Account deleted');
      logout();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to delete account');
    } finally {
      setDeleteLoading(false);
    }
  };

  // -- Sub-view: Change Password --
  if (view === 'changePassword') {
    return (
      <div className="modal-overlay" onClick={onClose}>
        <div className="settings-modal" onClick={(e) => e.stopPropagation()}>
          <div className="settings-header">
            <h2>Change Password</h2>
            <button className="modal-close-btn" onClick={() => setView('main')}>
              <X size={20} />
            </button>
          </div>
          <div className="settings-body">
            <div className="settings-form">
              <input
                type="password"
                placeholder="Current password"
                value={passwordForm.currentPassword}
                onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                className="settings-input"
              />
              <input
                type="password"
                placeholder="New password"
                value={passwordForm.newPassword}
                onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                className="settings-input"
              />
              <input
                type="password"
                placeholder="Confirm new password"
                value={passwordForm.confirmPassword}
                onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                className="settings-input"
              />
            </div>
          </div>
          <div className="settings-footer">
            <button className="settings-done-btn" onClick={handleChangePassword} disabled={passwordLoading}>
              {passwordLoading ? 'Saving...' : 'Save Password'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // -- Sub-view: Blocked Users --
  if (view === 'blocked') {
    return <BlockedUsersModal onClose={() => setView('main')} />;
  }

  // -- Sub-view: Privacy Policy --
  if (view === 'privacy') {
    return (
      <div className="modal-overlay" onClick={onClose}>
        <div className="settings-modal" onClick={(e) => e.stopPropagation()}>
          <div className="settings-header">
            <h2>Privacy Policy</h2>
            <button className="modal-close-btn" onClick={() => setView('main')}>
              <X size={20} />
            </button>
          </div>
          <div className="settings-body">
            <div className="privacy-content">
              <p>At Socialite, we take your privacy seriously. This policy outlines how we collect, use, and protect your personal information.</p>
              <h4>Information We Collect</h4>
              <p>We collect information you provide directly, including your username, email, display name, bio, profile picture, and content you post.</p>
              <h4>How We Use Your Information</h4>
              <p>Your information is used to provide and improve the Socialite experience, including showing your profile to other users, delivering notifications, and enabling social interactions.</p>
              <h4>Data Protection</h4>
              <p>We use industry-standard security measures to protect your data. Passwords are encrypted and never stored in plain text.</p>
              <h4>Your Rights</h4>
              <p>You can update or delete your account at any time. Blocking users prevents them from seeing your content and interacting with you.</p>
            </div>
          </div>
          <div className="settings-footer">
            <button className="settings-done-btn" onClick={() => setView('main')}>
              Back
            </button>
          </div>
        </div>
      </div>
    );
  }

  // -- Sub-view: Delete Account --
  if (view === 'deleteAccount') {
    return (
      <div className="modal-overlay" onClick={onClose}>
        <div className="settings-modal" onClick={(e) => e.stopPropagation()}>
          <div className="settings-header">
            <h2 style={{ color: '#f87171' }}>Delete Account</h2>
            <button className="modal-close-btn" onClick={() => setView('main')}>
              <X size={20} />
            </button>
          </div>
          <div className="settings-body">
            <div className="delete-warning">
              <Trash2 size={32} />
              <p>This action is <strong>permanent</strong> and cannot be undone. All your posts, comments, and data will be deleted forever.</p>
            </div>
            <div className="settings-form">
              <input
                type="password"
                placeholder="Enter your password to confirm"
                value={deletePassword}
                onChange={(e) => setDeletePassword(e.target.value)}
                className="settings-input"
              />
            </div>
          </div>
          <div className="settings-footer">
            <button className="settings-back-btn" onClick={() => setView('main')}>Cancel</button>
            <button className="settings-delete-btn" onClick={handleDeleteAccount} disabled={deleteLoading}>
              {deleteLoading ? 'Deleting...' : 'Delete My Account'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // -- Main Settings View --
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="settings-modal" onClick={(e) => e.stopPropagation()}>
        <div className="settings-header">
          <h2>Settings</h2>
          <button className="modal-close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="settings-body">
          {/* Toggle Items */}
          <div className="settings-toggle-item">
            <div className="settings-toggle-icon" style={{ background: 'rgba(34, 197, 94, 0.15)' }}>
              <Activity size={18} style={{ color: '#4ade80' }} />
            </div>
            <div className="settings-toggle-info">
              <span className="settings-toggle-label">Active Status</span>
              <span className="settings-toggle-desc">Show when you're online</span>
            </div>
            <label className="toggle-switch">
              <input type="checkbox" checked={activeStatus} onChange={() => setActiveStatus(!activeStatus)} />
              <span className="toggle-slider"></span>
            </label>
          </div>

          <div className="settings-toggle-item">
            <div className="settings-toggle-icon" style={{ background: 'rgba(168, 85, 247, 0.15)' }}>
              <Bell size={18} style={{ color: '#a855f7' }} />
            </div>
            <div className="settings-toggle-info">
              <span className="settings-toggle-label">Notifications</span>
              <span className="settings-toggle-desc">Get notified about activity</span>
            </div>
            <label className="toggle-switch">
              <input type="checkbox" checked={notifications} onChange={async () => {
                const newVal = !notifications;
                setNotifications(newVal);
                try {
                  await usersAPI.updateProfile({ notifications_enabled: newVal });
                  updateUser({ ...user, notifications_enabled: newVal });
                  toast.success(newVal ? 'Notifications enabled' : 'Notifications disabled');
                } catch (err) {
                  setNotifications(!newVal);
                  toast.error('Failed to update notifications');
                }
              }} />
              <span className="toggle-slider"></span>
            </label>
          </div>

          <div className="settings-toggle-item">
            <div className="settings-toggle-icon" style={{ background: 'rgba(239, 68, 68, 0.15)' }}>
              <Lock size={18} style={{ color: '#f87171' }} />
            </div>
            <div className="settings-toggle-info">
              <span className="settings-toggle-label">Private Profile</span>
              <span className="settings-toggle-desc">Only friends can see your posts</span>
            </div>
            <label className="toggle-switch">
              <input type="checkbox" checked={privateProfile} onChange={async () => {
                const newVal = !privateProfile;
                setPrivateProfile(newVal);
                try {
                  await usersAPI.updateProfile({ is_private: newVal });
                  if (onPrivateChange) onPrivateChange(newVal);
                  toast.success(newVal ? 'Profile set to private' : 'Profile set to public');
                } catch (err) {
                  setPrivateProfile(!newVal);
                  toast.error('Failed to update privacy');
                }
              }} />
              <span className="toggle-slider"></span>
            </label>
          </div>

          <div className="settings-toggle-item">
            <div className="settings-toggle-icon" style={{ background: 'rgba(99, 102, 241, 0.15)' }}>
              <Moon size={18} style={{ color: '#818cf8' }} />
            </div>
            <div className="settings-toggle-info">
              <span className="settings-toggle-label">Dark Mode</span>
              <span className="settings-toggle-desc">Use dark theme</span>
            </div>
            <label className="toggle-switch">
              <input type="checkbox" checked={theme === 'dark'} onChange={toggleTheme} />
              <span className="toggle-slider"></span>
            </label>
          </div>

          {/* Account Section */}
          <div className="settings-section-label">Account</div>

          <button type="button" className="settings-action-item" onClick={() => setView('changePassword')}>
            <Key size={16} />
            <span>Change Password</span>
          </button>

          <button type="button" className="settings-action-item" onClick={() => setView('blocked')}>
            <ShieldAlert size={16} />
            <span>Blocked Users</span>
          </button>

          <button type="button" className="settings-action-item" onClick={() => setView('privacy')}>
            <FileText size={16} />
            <span>Privacy Policy</span>
          </button>

          <button type="button" className="settings-action-item danger" onClick={() => setView('deleteAccount')}>
            <Trash2 size={16} />
            <span>Delete Account</span>
          </button>
        </div>

        <div className="settings-footer">
          <button className="settings-done-btn" onClick={onClose}>Done</button>
        </div>
      </div>
    </div>
  );
}