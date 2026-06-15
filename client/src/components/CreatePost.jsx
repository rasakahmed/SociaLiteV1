import { useState, useRef } from 'react';
import { ImagePlus, Film, X, Send, Loader, ChevronLeft, ChevronRight } from 'lucide-react';
import { postsAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import VideoPlayer from './VideoPlayer';
import './CreatePost.css';

const API_URL = 'http://localhost:5000';

export default function CreatePost({ onPostCreated }) {
  const { user } = useAuth();
  const [content, setContent] = useState('');
  const [files, setFiles] = useState([]);
  const [previews, setPreviews] = useState([]);
  const [previewIndex, setPreviewIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const fileInputRef = useRef(null);

  const handleFilesSelect = (e) => {
    const selected = Array.from(e.target.files);
    if (selected.length === 0) return;

    const maxSize = 50 * 1024 * 1024;
    const valid = [];
    const newPreviews = [];

    for (const file of selected) {
      if (file.size > maxSize) {
        setError(`${file.name} exceeds 50MB limit`);
        continue;
      }
      valid.push(file);
      const type = file.type.startsWith('video/') ? 'video' : 'image';
      newPreviews.push({ url: URL.createObjectURL(file), type });
    }

    if (files.length + valid.length > 10) {
      setError('Maximum 10 files per post');
      return;
    }

    setFiles(prev => [...prev, ...valid]);
    setPreviews(prev => [...prev, ...newPreviews]);
    setError('');
    e.target.value = null;
  };

  const removeFile = (index) => {
    URL.revokeObjectURL(previews[index].url);
    setFiles(prev => prev.filter((_, i) => i !== index));
    setPreviews(prev => prev.filter((_, i) => i !== index));
    if (previewIndex >= previews.length - 1 && previewIndex > 0) {
      setPreviewIndex(previewIndex - 1);
    }
  };

  const clearAllFiles = () => {
    previews.forEach(p => URL.revokeObjectURL(p.url));
    setFiles([]);
    setPreviews([]);
    setPreviewIndex(0);
    if (fileInputRef.current) fileInputRef.current.value = null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!content.trim() && files.length === 0) return;

    setLoading(true);
    setError('');

    try {
      const formData = new FormData();
      formData.append('content', content.trim());
      files.forEach(file => {
        formData.append('media', file);
      });

      const res = await postsAPI.create(formData);
      setContent('');
      clearAllFiles();
      setIsFocused(false);
      if (onPostCreated) {
        onPostCreated(res.data.post);
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create post');
    } finally {
      setLoading(false);
    }
  };

  const getDotStyle = (i, activeIdx, total) => {
    if (total <= 5) return {};
    const diff = Math.abs(i - activeIdx);
    if (diff === 0) return { transform: 'scale(1)', opacity: 1 };
    if (diff === 1) return { transform: 'scale(1)', opacity: 0.6 };
    if (diff === 2) return { transform: 'scale(0.7)', opacity: 0.4 };
    if (diff === 3) return { transform: 'scale(0.5)', opacity: 0.2 };
    return { width: 0, height: 0, margin: 0, opacity: 0, overflow: 'hidden', border: 'none' };
  };

  const isExpanded = isFocused || content.length > 0 || previews.length > 0;

  return (
    <div className={`create-post ${isExpanded ? 'expanded' : ''}`}>
      <form onSubmit={handleSubmit}>
        {/* Top row: Avatar + Input */}
        <div className="create-post-top">
          <div className="create-post-avatar-wrapper">
            {user.avatar_url ? (
              <img src={`${API_URL}${user.avatar_url}`} alt="" className="create-post-avatar" />
            ) : (
              <div className="create-post-avatar-placeholder">
                {(user.display_name || user.username)[0].toUpperCase()}
              </div>
            )}
            <div className="avatar-online-dot" />
          </div>
          <div className="create-post-input-wrapper">
            <textarea
              placeholder="What's on your mind?"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              onFocus={() => setIsFocused(true)}
              className="create-post-input"
              rows={isExpanded ? 4 : 2}
            />
          </div>
        </div>

        {/* Media Preview */}
        {previews.length > 0 && (
          <div className="cp-media-section">
            <div className="cp-media-viewport-wrap">
              <div className="cp-media-viewport">
                {previews[previewIndex].type === 'video' ? (
                  <VideoPlayer
                    key={previewIndex}
                    src={previews[previewIndex].url}
                  />
                ) : (
                  <img
                    key={previewIndex}
                    src={previews[previewIndex].url}
                    alt="Preview"
                    className="cp-media-img"
                  />
                )}

                {/* Remove button */}
                <button type="button" className="cp-media-remove" onClick={() => removeFile(previewIndex)}>
                  <X size={14} />
                </button>

                {/* Counter pill */}
                {previews.length > 1 && (
                  <div className="cp-media-counter">
                    {previewIndex + 1}/{previews.length}
                  </div>
                )}

                {/* Nav arrows */}
                {previews.length > 1 && previewIndex > 0 && (
                  <button
                    type="button"
                    className="cp-nav-btn cp-nav-prev"
                    onClick={() => setPreviewIndex(previewIndex - 1)}
                  >
                    <ChevronLeft size={16} />
                  </button>
                )}
                {previews.length > 1 && previewIndex < previews.length - 1 && (
                  <button
                    type="button"
                    className="cp-nav-btn cp-nav-next"
                    onClick={() => setPreviewIndex(previewIndex + 1)}
                  >
                    <ChevronRight size={16} />
                  </button>
                )}
              </div>

              {/* Dots */}
              {previews.length > 1 && (
                <div className="cp-dots-row">
                  {previews.map((_, i) => (
                    <button
                      key={i}
                      type="button"
                      className={`cp-dot ${i === previewIndex ? 'active' : ''}`}
                      style={getDotStyle(i, previewIndex, previews.length)}
                      onClick={() => setPreviewIndex(i)}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Thumbnails strip */}
            {previews.length > 1 && (
              <div className="cp-thumb-strip">
                {previews.map((p, i) => (
                  <button
                    key={i}
                    type="button"
                    className={`cp-thumb ${i === previewIndex ? 'active' : ''}`}
                    onClick={() => setPreviewIndex(i)}
                  >
                    {p.type === 'video' ? (
                      <div className="cp-thumb-video">
                        <Film size={14} />
                      </div>
                    ) : (
                      <img src={p.url} alt="" className="cp-thumb-img" />
                    )}
                    <button
                      type="button"
                      className="cp-thumb-remove"
                      onClick={(e) => { e.stopPropagation(); removeFile(i); }}
                    >
                      <X size={10} />
                    </button>
                  </button>
                ))}
              </div>
            )}

            <div className="cp-media-meta">
              <span className="cp-file-count">{previews.length}/10 files</span>
              <button type="button" className="cp-clear-btn" onClick={clearAllFiles}>Clear all</button>
            </div>
          </div>
        )}

        {error && <p className="create-post-error">{error}</p>}

        {/* Bottom toolbar */}
        <div className="create-post-bottom">
          <input
            type="file"
            accept="image/*,video/*"
            ref={fileInputRef}
            onChange={handleFilesSelect}
            className="file-input-hidden"
            multiple
          />
          <div className="cp-toolbar">
            <button
              type="button"
              className="cp-tool-btn"
              onClick={() => fileInputRef.current?.click()}
              title="Add photos"
            >
              <ImagePlus size={20} />
              <span>Photo</span>
            </button>
            <button
              type="button"
              className="cp-tool-btn"
              onClick={() => fileInputRef.current?.click()}
              title="Add videos"
            >
              <Film size={20} />
              <span>Video</span>
            </button>
          </div>

          <button
            type="submit"
            className="cp-submit-btn"
            disabled={loading || (!content.trim() && files.length === 0)}
          >
            {loading ? (
              <>
                <Loader size={16} className="spinner" />
                <span>Posting...</span>
              </>
            ) : (
              <>
                <Send size={16} />
                <span>Post</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}