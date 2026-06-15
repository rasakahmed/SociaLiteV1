import { useState, useRef, useEffect } from 'react';
import { Heart, MessageCircle, Trash2, Send, ChevronDown, ChevronUp, ChevronLeft, ChevronRight, MoreHorizontal, Edit3, Flag, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { likesAPI, commentsAPI, postsAPI } from '../services/api';
import EditPostModal from './EditPostModal';
import ReportModal from './ReportModal';
import CommentItem from './CommentItem';
import VideoPlayer from './VideoPlayer';
import './PostCard.css';

const API_URL = 'http://localhost:5000';

export default function PostCard({ post, onDelete, onUpdate }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [liked, setLiked] = useState(post.isLiked);
  const [likeCount, setLikeCount] = useState(post.likeCount || 0);
  const [commentCount, setCommentCount] = useState(post.commentCount || 0);
  const [comments, setComments] = useState(post.comments || []);
  const [showComments, setShowComments] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [replyingTo, setReplyingTo] = useState(null);
  const [likeAnimating, setLikeAnimating] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [commentSubmitting, setCommentSubmitting] = useState(false);
  const [currentContent, setCurrentContent] = useState(post.content);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [mediaIndex, setMediaIndex] = useState(0);
  const menuRef = useRef(null);
  const commentInputRef = useRef(null);

  // Close menu on outside click
  useEffect(() => {
    const handleClick = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setShowMenu(false);
      }
    };
    if (showMenu) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [showMenu]);

  // Real-time polling for post stats
  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await postsAPI.getStats(post.id);
        const { likeCount: updatedLikes, isLiked, commentCount: updatedComments } = res.data;
        // Only update if not animating/submitting to avoid race conditions
        if (!likeAnimating) {
          setLikeCount(updatedLikes);
          setLiked(isLiked);
        }
        setCommentCount(updatedComments);
      } catch (err) {
        // silently fail polling
      }
    };
    
    // Poll every 10 seconds
    const interval = setInterval(fetchStats, 10000);
    return () => clearInterval(interval);
  }, [post.id, likeAnimating]);

  // Fetch comments automatically when expanding comment section
  useEffect(() => {
    if (showComments) {
      commentsAPI.getByPost(post.id)
        .then(res => setComments(res.data.comments))
        .catch(() => toast.error('Failed to load latest comments'));
    }
  }, [showComments, post.id, toast]);

  // Optimistic like toggle
  const handleLike = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (likeAnimating) return;
    const prevLiked = liked;
    const prevCount = likeCount;
    setLiked(!liked);
    setLikeCount(liked ? likeCount - 1 : likeCount + 1);
    setLikeAnimating(true);
    setTimeout(() => setLikeAnimating(false), 400);

    try {
      const res = await likesAPI.toggle(post.id);
      setLiked(res.data.liked);
      setLikeCount(res.data.likeCount);
    } catch (err) {
      setLiked(prevLiked);
      setLikeCount(prevCount);
      toast.error('Failed to update like');
    }
  };

  const handleComment = async (e) => {
    e.preventDefault();
    if (!commentText.trim() || commentSubmitting) return;
    setCommentSubmitting(true);
    try {
      // Identify true root parent so all replies stay 1-level deep visually
      const parent_id = replyingTo ? (replyingTo.parent_id || replyingTo.id) : null;
      const res = await commentsAPI.create(post.id, commentText.trim(), parent_id);
      
      const newComment = res.data.comment;
      if (!parent_id) {
        setComments((prev) => [...prev, newComment]);
      } else {
        const insertReply = (list) => {
          return list.map(c => {
            if (c.id === parent_id) {
              return { ...c, replies: [...(c.replies || []), newComment] };
            }
            if (c.replies && c.replies.length > 0) {
              return { ...c, replies: insertReply(c.replies) };
            }
            return c;
          });
        };
        setComments((prev) => insertReply(prev));
      }
      
      setCommentCount(prev => prev + 1);
      setCommentText('');
      setReplyingTo(null);
      setShowComments(true);
      toast.success('Comment added');
    } catch (err) {
      toast.error('Failed to add comment');
    } finally {
      setCommentSubmitting(false);
    }
  };

  const handleReplyClick = (commentTarget) => {
    setReplyingTo(commentTarget);
    setShowComments(true);
    // Mentions are cool for Instagram-like: Focus input and pre-fill handle
    setCommentText(`@${commentTarget.author.username} `);
    if (commentInputRef.current) {
      commentInputRef.current.focus();
    }
  };

  const cancelReply = () => {
    setReplyingTo(null);
    setCommentText('');
  };

  const handleDeleteComment = async (commentId) => {
    try {
      await commentsAPI.delete(commentId);
      
      const removeComment = (list) => {
        return list.filter(c => c.id !== commentId).map(c => {
          if (c.replies && c.replies.length > 0) {
            return { ...c, replies: removeComment(c.replies) };
          }
          return c;
        });
      };
      setComments((prev) => removeComment(prev));
      setCommentCount(prev => Math.max(0, prev - 1));
      toast.success('Comment deleted');
    } catch (err) {
      toast.error('Failed to delete comment');
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Delete this post?')) return;
    try {
      await onDelete(post.id);
      toast.success('Post deleted');
    } catch (err) {
      toast.error('Failed to delete post');
    }
  };

  const handlePostUpdated = (updatedPost) => {
    setCurrentContent(updatedPost.content);
    if (onUpdate) onUpdate(updatedPost);
  };

  const timeAgo = (dateStr) => {
    if (!dateStr) return 'just now';
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return 'just now';
    const diff = Date.now() - date.getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString();
  };

  const postDate = post.created_at || post.createdAt;
  const isOwner = user.id === post.author.id;

  // Build media array: prefer new PostMedia, fallback to legacy image_url
  const mediaItems = (post.media && post.media.length > 0)
    ? post.media
    : post.image_url
      ? [{ id: 'legacy', media_url: post.image_url, media_type: 'image' }]
      : [];

  const renderMedia = () => {
    if (mediaItems.length === 0) return null;
    const idx = mediaItems[mediaIndex] ? mediaIndex : 0;

    const getDotStyle = (i, activeIdx, total) => {
      if (total <= 5) return { transform: 'scale(1)' };
      const diff = Math.abs(i - activeIdx);
      if (diff === 0) return { transform: 'scale(1)', width: '6px', height: '6px', margin: '0 3px', opacity: 1 };
      if (diff === 1) return { transform: 'scale(1)', width: '6px', height: '6px', margin: '0 3px', opacity: 0.6 };
      if (diff === 2) return { transform: 'scale(0.7)', width: '6px', height: '6px', margin: '0 3px', opacity: 0.4 };
      if (diff === 3) return { transform: 'scale(0.4)', width: '6px', height: '6px', margin: '0 3px', opacity: 0.2 };
      return { width: 0, height: 0, margin: 0, opacity: 0, overflow: 'hidden', border: 'none' };
    };

    return (
      <div className="post-media-carousel" style={{ position: 'relative' }}>
        <div className="post-media-viewport" style={{ position: 'relative', width: '100%', overflow: 'hidden' }}>
          <div 
            className="post-media-track" 
            style={{ 
              display: 'flex', 
              width: '100%', 
              transition: 'transform 0.3s cubic-bezier(0.25, 0.8, 0.5, 1)', 
              transform: `translateX(-${idx * 100}%)`,
              alignItems: 'center'
            }}
          >
            {mediaItems.map((item, i) => (
              <div key={item.id || i} style={{ width: '100%', flexShrink: 0, display: 'flex', justifyContent: 'center' }}>
                {item.media_type === 'video' ? (
                  <VideoPlayer
                    src={`${API_URL}${item.media_url}`}
                  />
                ) : (
                  <img
                    src={`${API_URL}${item.media_url}`}
                    alt="Post media"
                    className="post-media-item"
                    loading={i === 0 ? "eager" : "lazy"}
                  />
                )}
              </div>
            ))}
          </div>

          {/* Overlaid UI */}
          {mediaItems.length > 1 && (
            <>
              {/* Badge */}
              <div className="carousel-counter-pill overlay-pill">
                {idx + 1}/{mediaItems.length}
              </div>

              {/* Navigation Arrows */}
              {idx > 0 && (
                <button
                  type="button"
                  className="carousel-nav-btn carousel-prev overlay-btn"
                  onClick={() => setMediaIndex(idx - 1)}
                >
                  <ChevronLeft size={18} />
                </button>
              )}
              {idx < mediaItems.length - 1 && (
                <button
                  type="button"
                  className="carousel-nav-btn carousel-next overlay-btn"
                  onClick={() => setMediaIndex(idx + 1)}
                >
                  <ChevronRight size={18} />
                </button>
              )}

              {/* Floating Bottom Dots */}
              <div className="carousel-dots-wrapper">
                {mediaItems.map((_, i) => (
                  <button
                    key={i}
                    type="button"
                    className={`carousel-dot ${i === idx ? 'active' : ''}`}
                    style={getDotStyle(i, idx, mediaItems.length)}
                    onClick={() => setMediaIndex(i)}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    );
  };

  return (
    <article className="post-card">
      <div className="post-header">
        <Link to={`/@${post.author.username}`} className="post-author-link">
          {post.author.avatar_url ? (
            <img src={`${API_URL}${post.author.avatar_url}`} alt="" className="post-avatar" />
          ) : (
            <div className="post-avatar-placeholder">
              {(post.author.display_name || post.author.username)[0].toUpperCase()}
            </div>
          )}
          <div className="post-author-info">
            <span className="post-author-name">{post.author.display_name || post.author.username}</span>
            <span className="post-time">@{post.author.username} · {timeAgo(postDate)}</span>
          </div>
        </Link>

        {/* Context menu */}
        <div className="post-menu-wrapper" ref={menuRef}>
          <button type="button" className="post-menu-btn" onClick={() => setShowMenu(!showMenu)}>
            <MoreHorizontal size={18} />
          </button>
          {showMenu && (
            <div className="post-context-menu">
              {isOwner && (
                <>
                  <button onClick={() => { setShowEditModal(true); setShowMenu(false); }}>
                    <Edit3 size={14} /> Edit Post
                  </button>
                  <button className="danger" onClick={() => { handleDelete(); setShowMenu(false); }}>
                    <Trash2 size={14} /> Delete Post
                  </button>
                </>
              )}
              {!isOwner && (
                <button onClick={() => { setShowReportModal(true); setShowMenu(false); }}>
                  <Flag size={14} /> Report Post
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="post-content">
        {currentContent && <p>{currentContent}</p>}
        {renderMedia()}
      </div>

      <div className="post-actions">
        <button type="button" className={`action-btn like-btn ${liked ? 'liked' : ''} ${likeAnimating ? 'animating' : ''}`} onClick={handleLike}>
          <Heart size={18} fill={liked ? 'currentColor' : 'none'} />
          <span>{likeCount}</span>
        </button>
        <button type="button" className="action-btn comment-btn" onClick={() => setShowComments(!showComments)}>
          <MessageCircle size={18} />
          <span>{commentCount}</span>
          {showComments ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>
      </div>

      {showComments && (
        <div className="comments-section">
          {comments.length > 0 && (
            <div className="comments-list">
              {comments.map((comment) => (
                <CommentItem 
                  key={comment.id}
                  comment={comment}
                  onDelete={handleDeleteComment}
                  onReply={handleReplyClick}
                  timeAgo={timeAgo}
                />
              ))}
            </div>
          )}

          <div className="comment-form-container">
            {replyingTo && (
              <div className="replying-indicator">
                <span>Replying to <strong>@{replyingTo.author.username}</strong></span>
                <button type="button" onClick={cancelReply} aria-label="Cancel reply">
                  <X size={12} />
                </button>
              </div>
            )}
            <form className="comment-form" onSubmit={handleComment}>
              <input
                ref={commentInputRef}
                type="text"
                placeholder={replyingTo ? `Replying to @${replyingTo.author.username}...` : "Write a comment..."}
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                className="comment-input insta-comment-input"
                disabled={commentSubmitting}
              />
              <button
                type="submit"
                className="insta-comment-btn"
                disabled={!commentText.trim() || commentSubmitting}
              >
                Post
              </button>
            </form>
          </div>
        </div>
      )}

      {showEditModal && (
        <EditPostModal
          post={{ ...post, content: currentContent }}
          onClose={() => setShowEditModal(false)}
          onUpdated={handlePostUpdated}
        />
      )}

      {showReportModal && (
        <ReportModal
          postId={post.id}
          onClose={() => setShowReportModal(false)}
        />
      )}
    </article>
  );
}