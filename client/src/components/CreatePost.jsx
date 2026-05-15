import { useState, useRef } from 'react';
import { ImagePlus, X, Send, Loader } from 'lucide-react';
import { postsAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import './CreatePost.css';

const API_URL = 'http://localhost:5000';

export default function CreatePost({ onPostCreated }) {
  const { user } = useAuth();
  const [content, setContent] = useState('');
  const [image, setImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef(null);

  const handleImageSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setError('Image must be under 5MB');
        return;
      }
      setImage(file);
      const reader = new FileReader();
      reader.onload = () => setImagePreview(reader.result);
      reader.readAsDataURL(file);
      setError('');
    }
  };

  const removeImage = () => {
    setImage(null);
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!content.trim() && !image) return;

    setLoading(true);
    setError('');

    try {
      const formData = new FormData();
      formData.append('content', content.trim());
      if (image) {
        formData.append('image', image);
      }

      const res = await postsAPI.create(formData);
      setContent('');
      removeImage();
      if (onPostCreated) {
        onPostCreated(res.data.post);
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create post');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="create-post">
      <form onSubmit={handleSubmit}>
        <div className="create-post-top">
          {user.avatar_url ? (
            <img src={`${API_URL}${user.avatar_url}`} alt="" className="create-post-avatar" />
          ) : (
            <div className="create-post-avatar-placeholder">
              {(user.display_name || user.username)[0].toUpperCase()}
            </div>
          )}
          <textarea
            placeholder="What's on your mind?"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="create-post-input"
            rows={3}
          />
        </div>

        {imagePreview && (
          <div className="image-preview-container">
            <img src={imagePreview} alt="Preview" className="image-preview" />
            <button type="button" className="remove-image-btn" onClick={removeImage}>
              <X size={16} />
            </button>
          </div>
        )}

        {error && <p className="create-post-error">{error}</p>}

        <div className="create-post-bottom">
          <input
            type="file"
            accept="image/*"
            ref={fileInputRef}
            onChange={handleImageSelect}
            className="file-input-hidden"
          />
          <button
            type="button"
            className="attach-image-btn"
            onClick={() => fileInputRef.current?.click()}
          >
            <ImagePlus size={20} />
            <span>Photo</span>
          </button>

          <button
            type="submit"
            className="create-post-submit"
            disabled={loading || (!content.trim() && !image)}
          >
            {loading ? <Loader size={18} className="spinner" /> : <Send size={18} />}
            <span>{loading ? 'Posting...' : 'Post'}</span>
          </button>
        </div>
      </form>
    </div>
  );
}
