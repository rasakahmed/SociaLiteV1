import { useState, useRef } from 'react';
import { X, Save, Loader, ImagePlus, ChevronLeft, ChevronRight } from 'lucide-react';
import { postsAPI } from '../services/api';
import { useToast } from '../context/ToastContext';
import './EditPostModal.css';

const API_URL = 'http://localhost:5000';

export default function EditPostModal({ post, onClose, onUpdated }) {
  const [content, setContent] = useState(post.content || '');
  
  // existing media is the ones currently on post. 
  // We initialize previews with post.media or [] (if it had image_url).
  const [existingMediaUrls, setExistingMediaUrls] = useState(
    post.media && post.media.length > 0
      ? post.media.map(m => m.media_url) 
      : post.image_url ? [post.image_url] : []
  );

  const [files, setFiles] = useState([]);       // new File objects
  const [newPreviews, setNewPreviews] = useState([]);  // { url, type } for newly uploaded files
  
  // Single array of previews to display:
  const getCombinedPreviews = () => {
    const existing = existingMediaUrls.map(url => ({ 
      url: url.startsWith('/') ? `${API_URL}${url}` : url, 
      originalUrl: url, 
      type: url.includes('.mp4') || url.includes('.webm') ? 'video' : 'image', 
      isExisting: true 
    }));
    const newOnes = newPreviews.map((p, index) => ({ ...p, isExisting: false, index }));
    return [...existing, ...newOnes];
  };

  const combinedPreviews = getCombinedPreviews();
  const [previewIndex, setPreviewIndex] = useState(0);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const { toast } = useToast();
  const fileInputRef = useRef(null);

  const handleFilesSelect = (e) => {
    const selected = Array.from(e.target.files);
    if (selected.length === 0) return;

    const maxSize = 50 * 1024 * 1024;
    const valid = [];
    const createdPreviews = [];

    for (const file of selected) {
      if (file.size > maxSize) {
        setError(`${file.name} exceeds 50MB`);
        continue;
      }
      valid.push(file);
      const type = file.type.startsWith('video/') ? 'video' : 'image';
      createdPreviews.push({ url: URL.createObjectURL(file), type });
    }

    if (existingMediaUrls.length + files.length + valid.length > 10) {
      setError('Maximum 10 files per post');
      return;
    }

    setFiles(prev => [...prev, ...valid]);
    setNewPreviews(prev => [...prev, ...createdPreviews]);
    setError('');
    e.target.value = null;
  };

  const removeMedia = (index) => {
    const target = combinedPreviews[index];
    if (target.isExisting) {
      setExistingMediaUrls(prev => prev.filter(u => u !== target.originalUrl));
    } else {
      URL.revokeObjectURL(target.url);
      setFiles(prev => prev.filter((_, i) => i !== target.index));
      setNewPreviews(prev => prev.filter((_, i) => i !== target.index));
    }
    if (previewIndex >= combinedPreviews.length - 1 && previewIndex > 0) {
      setPreviewIndex(previewIndex - 1);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!content.trim() && combinedPreviews.length === 0) return;
    setSaving(true);
    try {
      const formData = new FormData();
      formData.append('content', content.trim());
      
      existingMediaUrls.forEach(url => {
        formData.append('existingMediaUrls', url);
      });
      
      files.forEach(file => {
        formData.append('media', file);
      });

      const res = await postsAPI.edit(post.id, formData);
      toast.success('Post updated successfully');
      
      // Cleanup Object URLs
      newPreviews.forEach(p => URL.revokeObjectURL(p.url));
      
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
      <div className="modal-container edit-post-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '600px', width: '100%' }}>
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
            rows={4}
            autoFocus
            placeholder="What's on your mind?"
            style={{ borderBottom: 'none', paddingBottom: '8px' }}
          />
          
          {error && <div className="create-post-error" style={{padding: '0 16px', color: '#ef4444', fontSize: '14px', marginBottom: '8px'}}>{error}</div>}

          {combinedPreviews.length > 0 && (
            <div className="media-preview-section" style={{ margin: '0 16px 16px', position: 'relative' }}>
              <div className="media-carousel-container" style={{ borderRadius: '8px', overflow: 'hidden', position: 'relative', background: '#000', height: '240px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {combinedPreviews[previewIndex].type === 'video' ? (
                  <video
                    key={previewIndex}
                    src={combinedPreviews[previewIndex].url}
                    controls
                    style={{ maxHeight: '100%', maxWidth: '100%', objectFit: 'contain' }}
                  />
                ) : (
                  <img
                    key={previewIndex}
                    src={combinedPreviews[previewIndex].url}
                    alt="Preview"
                    style={{ maxHeight: '100%', maxWidth: '100%', objectFit: 'contain' }}
                  />
                )}
                
                <button type="button" onClick={() => removeMedia(previewIndex)} style={{ position: 'absolute', top: '8px', right: '8px', background: 'rgba(0,0,0,0.5)', color: 'white', border: 'none', borderRadius: '50%', width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', zIndex: 10 }}>
                  <X size={14} />
                </button>
                
                {combinedPreviews.length > 1 && (
                  <>
                    <button
                      type="button"
                      className="carousel-nav-btn carousel-prev"
                      onClick={() => setPreviewIndex((prev) => (prev === 0 ? combinedPreviews.length - 1 : prev - 1))}
                      style={{ position: 'absolute', left: '8px', top: '50%', transform: 'translateY(-50%)', background: 'rgba(0,0,0,0.5)', color: 'white', border: 'none', borderRadius: '50%', width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                    >
                      <ChevronLeft size={16} />
                    </button>
                    <button
                      type="button"
                      className="carousel-nav-btn carousel-next"
                      onClick={() => setPreviewIndex((prev) => (prev === combinedPreviews.length - 1 ? 0 : prev + 1))}
                      style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', background: 'rgba(0,0,0,0.5)', color: 'white', border: 'none', borderRadius: '50%', width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                    >
                      <ChevronRight size={16} />
                    </button>
                    <div className="carousel-dots" style={{ position: 'absolute', bottom: '8px', left: '0', right: '0', display: 'flex', justifyContent: 'center', gap: '4px' }}>
                      {combinedPreviews.map((_, i) => (
                        <div key={i} className={`carousel-dot ${i === previewIndex ? 'active' : ''}`} style={{ width: '6px', height: '6px', borderRadius: '50%', background: i === previewIndex ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.4)' }} />
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          <div className="modal-footer" style={{ borderTop: '1px solid rgba(255, 255, 255, 0.1)', padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-secondary)' }}>
            <div className="create-post-actions">
              <input
                type="file"
                multiple
                accept="image/*,video/*"
                onChange={handleFilesSelect}
                ref={fileInputRef}
                style={{ display: 'none' }}
              />
              <button
                type="button"
                className="action-btn"
                onClick={() => fileInputRef.current?.click()}
                disabled={combinedPreviews.length >= 10 || saving}
                style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <ImagePlus size={20} />
                <span style={{ fontSize: '14px' }}>Add</span>
              </button>
            </div>
            
            <div style={{ display: 'flex', gap: '10px' }}>
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
                disabled={saving || (!content.trim() && combinedPreviews.length === 0)}
              >
                {saving ? <Loader size={16} className="spinner" /> : <Save size={16} />}
                <span>{saving ? 'Saving...' : 'Save'}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}