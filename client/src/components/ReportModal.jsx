import { useState } from 'react';
import { X, Flag, Loader } from 'lucide-react';
import { postsAPI } from '../services/api';
import { useToast } from '../context/ToastContext';
import './EditPostModal.css'; /* shares modal styles */

const REASONS = [
  { value: 'spam', label: 'Spam', emoji: '🚫' },
  { value: 'harassment', label: 'Harassment or Bullying', emoji: '😠' },
  { value: 'inappropriate', label: 'Inappropriate Content', emoji: '⚠️' },
  { value: 'misinformation', label: 'Misinformation', emoji: '❌' },
  { value: 'other', label: 'Other', emoji: '📋' },
];

export default function ReportModal({ postId, onClose }) {
  const [reason, setReason] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!reason) return;
    setSubmitting(true);
    try {
      await postsAPI.report(postId, reason, description.trim() || undefined);
      toast.success('Report submitted. Thank you for helping keep the community safe.');
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to submit report');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-container report-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>
            <Flag size={18} style={{ marginRight: 8, verticalAlign: 'middle' }} />
            Report Post
          </h3>
          <button className="modal-close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="report-body">
            <p className="report-subtitle">Why are you reporting this post?</p>
            <div className="report-reasons">
              {REASONS.map((r) => (
                <label
                  key={r.value}
                  className={`report-reason-option ${reason === r.value ? 'selected' : ''}`}
                >
                  <input
                    type="radio"
                    name="reason"
                    value={r.value}
                    checked={reason === r.value}
                    onChange={() => setReason(r.value)}
                  />
                  <span className="reason-emoji">{r.emoji}</span>
                  <span className="reason-label">{r.label}</span>
                </label>
              ))}
            </div>
            <textarea
              className="report-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Additional details (optional)"
              rows={3}
              maxLength={500}
            />
          </div>
          <div className="modal-footer">
            <button type="button" className="modal-cancel-btn" onClick={onClose} disabled={submitting}>
              Cancel
            </button>
            <button
              type="submit"
              className="modal-save-btn report-submit-btn"
              disabled={submitting || !reason}
            >
              {submitting ? <Loader size={16} className="spinner" /> : <Flag size={16} />}
              <span>{submitting ? 'Submitting...' : 'Submit Report'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
