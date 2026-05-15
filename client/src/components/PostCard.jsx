import { useState, useRef, useEffect } from 'react';
import { Heart, MessageCircle, Trash2, Send, ChevronDown, ChevronUp, MoreHorizontal, Edit3, Flag, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { likesAPI, commentsAPI } from '../services/api';
import EditPostModal from './EditPostModal';
import ReportModal from './ReportModal';
import CommentItem from './CommentItem';
import './PostCard.css';

const API_URL = 'http://localhost:5000';

export default function PostCard({ post, onDelete, onUpdate }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [liked, setLiked] = useState(post.isLiked);
  const [likeCount, setLikeCount] = useState(post.likeCount || 0);
  const [comments, setComments] = useState(post.comments || []);
  const [showComments, setShowComments] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [replyingTo, setReplyingTo] = useState(null);
  const [likeAnimating, setLikeAnimating] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [currentContent, setCurrentContent] = useState(post.content);
  const [imageLoaded, setImageLoaded] = useState(false);
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

  // Optimistic like toggle
  const handleLike = async (e) => {
    e.preventDefault();
    e.stopPropagation();
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
    if (!commentText.trim()) return;
    try {
      // Determine the true parent. If replying to a reply, the parent might be the same.
      // But we just use replyTarget.id as parent_id and the backend does the rest.
      const parent_id = replyingTo ? replyingTo.id : null;
      const res = await commentsAPI.create(post.id, commentText.trim(), parent_id);
      
      const newComment = res.data.comment;
      if (!parent_id) {
        setComments((prev) => [...prev, newComment]);
      } else {
        // Recursive function to insert a reply
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
      
      setCommentText('');
      setReplyingTo(null);
      setShowComments(true);
      toast.success('Comment added');
    } catch (err) {
      toast.error('Failed to add comment');
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

  return (
    <article className="post-card">
      <div className="post-header">
        <Link to={`/profile/${post.author.id}`} className="post-author-link">
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
        <p>{currentContent}</p>
        {post.image_url && (
          <div className={`post-image-container ${imageLoaded ? 'loaded' : 'loading'}`}>
            <img
              src={`${API_URL}${post.image_url}`}
              alt="Post"
              className="post-image"
              loading="eager"
              onLoad={() => setImageLoaded(true)}
            />
            {!imageLoaded && <div className="image-placeholder-shimmer" />}
          </div>
        )}
      </div>

      <div className="post-actions">
        <button type="button" className={`action-btn like-btn ${liked ? 'liked' : ''} ${likeAnimating ? 'animating' : ''}`} onClick={handleLike}>
          <Heart size={18} fill={liked ? 'currentColor' : 'none'} />
          <span>{likeCount}</span>
        </button>
        <button type="button" className="action-btn comment-btn" onClick={() => setShowComments(!showComments)}>
          <MessageCircle size={18} />
          <span>{comments.length}</span>
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
                placeholder={replyingTo ? 'Write a reply...' : 'Write a comment...'}
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                className="comment-input"
              />
              <button type="submit" className="comment-submit" disabled={!commentText.trim()}>
                <Send size={16} />
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
