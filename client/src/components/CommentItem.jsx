import { useState } from 'react';
import { Heart, Trash2, Reply } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { commentsAPI } from '../services/api';

const API_URL = 'http://localhost:5000';

export default function CommentItem({ comment, onDelete, onReply, timeAgo, depth = 0 }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [liked, setLiked] = useState(comment.isLiked);
  const [likeCount, setLikeCount] = useState(comment.likeCount || 0);
  const [likeAnimating, setLikeAnimating] = useState(false);
  const [showReplies, setShowReplies] = useState(false);

  const handleLike = async () => {
    const prevLiked = liked;
    const prevCount = likeCount;
    setLiked(!liked);
    setLikeCount(liked ? likeCount - 1 : likeCount + 1);
    setLikeAnimating(true);
    setTimeout(() => setLikeAnimating(false), 400);

    try {
      const res = await commentsAPI.like(comment.id);
      setLiked(res.data.liked);
      setLikeCount(res.data.likeCount);
    } catch (err) {
      setLiked(prevLiked);
      setLikeCount(prevCount);
      toast.error('Failed to update like');
    }
  };

  const hasReplies = comment.replies && comment.replies.length > 0;

  // We limit nesting depth to prevent infinite shifting to the right.
  const styleDepth = Math.min(depth, 3);
  
  // Format mentions to be highlighted
  const renderContent = (content) => {
    if (!content) return null;
    const parts = content.split(/(@\w+)/g);
    return parts.map((part, i) => {
      if (part.startsWith('@')) {
        return <span key={i} className="mention-text">{part}</span>;
      }
      return part;
    });
  };

  return (
    <div className={`comment-thread ${depth > 0 ? 'is-reply' : ''}`} style={{ marginLeft: depth > 0 ? '30px' : '0' }}>
      <div className="comment-item">
        <Link to={`/profile/${comment.author.id}`} className="comment-avatar-link">
          {comment.author.avatar_url ? (
            <img src={`${API_URL}${comment.author.avatar_url}`} alt="" className="comment-avatar" />
          ) : (
            <div className="comment-avatar-placeholder">
              {(comment.author.display_name || comment.author.username)[0].toUpperCase()}
            </div>
          )}
        </Link>
        <div className="comment-body">
          <div className="comment-header">
            <Link to={`/profile/${comment.author.id}`} className="comment-author">
              {comment.author.display_name || comment.author.username}
            </Link>
            <span className="comment-time">{timeAgo(comment.created_at || comment.createdAt)}</span>
          </div>
          <p className="comment-text">{renderContent(comment.content)}</p>
          
          <div className="comment-footbar">
            <button type="button" className={`comment-foot-btn ${liked ? 'liked' : ''}`} onClick={handleLike}>
              <Heart size={12} fill={liked ? 'currentColor' : 'none'} />
              <span>{likeCount > 0 ? likeCount : ''} Like</span>
            </button>
            <button type="button" className="comment-foot-btn" onClick={() => onReply(comment)}>
              <Reply size={12} />
              <span>Reply</span>
            </button>
            {user.id === comment.author.id && (
              <button type="button" className="comment-foot-btn danger" onClick={() => onDelete(comment.id)}>
                <Trash2 size={12} />
                <span>Delete</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {hasReplies && (
        <div className="replies-wrapper">
          {!showReplies ? (
            <button type="button" className="view-replies-btn" onClick={() => setShowReplies(true)}>
              <span>—— View replies ({comment.replies.length})</span>
            </button>
          ) : (
            <>
              {comment.replies.map((reply) => (
                <CommentItem
                  key={reply.id}
                  comment={reply}
                  onDelete={onDelete}
                  onReply={onReply}
                  timeAgo={timeAgo}
                  depth={depth + 1}
                />
              ))}
              <button type="button" className="view-replies-btn hide" onClick={() => setShowReplies(false)}>
                <span>—— Hide replies</span>
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
