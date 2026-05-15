import { useState } from 'react';
import { X, Save, Loader } from 'lucide-react';
import { postsAPI } from '../services/api';
import { useToast } from '../context/ToastContext';
import './EditPostModal.css';

export default function EditPostModal({ post, onClose, onUpdated }) {
  const [content, setContent] = useState(post.content);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const handleSave = async (e) => {
    e.preventDefault();
    if (!content.trim()) return;
    setSaving(true);
    try {
      const res = await postsAPI.edit(post.id, content.trim());
      toast.success('Post updated successfully');
      onUpdated(res.data.post);
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to update post');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-container edit-post-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Edit Post</h3>
          <button className="modal-close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>
        <form onSubmit={handleSave}>
          <textarea
            className="edit-post-textarea"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={5}
            autoFocus
            placeholder="What's on your mind?"
          />
          <div className="modal-footer">
            <button
              type="button"
              className="modal-cancel-btn"
              onClick={onClose}
              disabled={saving}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="modal-save-btn"
              disabled={saving || !content.trim() || content.trim() === post.content}
            >
              {saving ? <Loader size={16} className="spinner" /> : <Save size={16} />}
              <span>{saving ? 'Saving...' : 'Save Changes'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
