import { useState, useRef, useEffect } from 'react';
import { Heart, Reply, MoreHorizontal } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { commentsAPI } from '../services/api';

const API_URL = 'http://localhost:5000';

export default function CommentItem({ comment: initialComment, onDelete, onReply, timeAgo, depth = 0 }) {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [comment, setComment] = useState(initialComment);
  const [liked, setLiked] = useState(comment.isLiked);
  const [likeCount, setLikeCount] = useState(comment.likeCount || 0);
  const [likeAnimating, setLikeAnimating] = useState(false);
  const [showReplies, setShowReplies] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(comment.content);
  const [isSaving, setIsSaving] = useState(false);
  const editInputRef = useRef(null);

  useEffect(() => {
    setComment(initialComment);
    setEditContent(initialComment.content);
  }, [initialComment]);

  useEffect(() => {
    if (isEditing && editInputRef.current) {
      editInputRef.current.focus();
    }
  }, [isEditing]);

  const handleLike = async () => {
    if (likeAnimating) return;
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

  const handleEditSave = async (e) => {
    if (e) e.preventDefault();
    if (!editContent.trim() || editContent === comment.content) {
      setIsEditing(false);
      return;
    }
    setIsSaving(true);
    try {
      const res = await commentsAPI.edit(comment.id, editContent.trim());
      setComment({ ...comment, content: res.data.comment.content });
      toast.success('Comment updated');
      setIsEditing(false);
    } catch (err) {
      toast.error('Failed to update comment');
    } finally {
      setIsSaving(false);
    }
  };

  const hasReplies = comment.replies && comment.replies.length > 0;
  const styleDepth = Math.min(depth, 3);
  
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
    <div className={`comment-thread ${depth > 0 ? 'is-reply' : ''}`} style={{ marginLeft: depth > 0 ? '40px' : '0' }}>
      <div className="comment-item" style={{ borderBottom: 'none', padding: '6px 0', alignItems: 'flex-start', display: 'flex', gap: '12px' }}>
        <Link to={`/@${comment.author.username}`} className="comment-avatar-link">
          {comment.author.avatar_url ? (
            <img src={`${API_URL}${comment.author.avatar_url}`} alt="" className="comment-avatar" style={{width: '32px', height: '32px'}} />
          ) : (
            <div className="comment-avatar-placeholder" style={{width: '32px', height: '32px'}}>
              {(comment.author.display_name || comment.author.username)[0].toUpperCase()}
            </div>
          )}
        </Link>
        
        <div className="comment-body" style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            
            {isEditing ? (
              <form onSubmit={handleEditSave} style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <input
                  ref={editInputRef}
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  className="insta-comment-input"
                  style={{ borderBottom: '1px solid rgba(255,255,255,0.2)', paddingBottom: '2px', flex: 1, color: 'white' }}
                  disabled={isSaving}
                />
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button type="submit" disabled={isSaving || !editContent.trim()} className="insta-comment-btn">Save</button>
                  <button type="button" onClick={() => setIsEditing(false)} className="insta-comment-btn" style={{ color: '#ef4444' }}>X</button>
                </div>
              </form>
            ) : (
              <p className="comment-text" style={{ fontSize: '14px', lineHeight: '1.4' }}>
                <Link to={`/@${comment.author.username}`} className="comment-author" style={{ fontWeight: '600', marginRight: '6px' }}>
                  {comment.author.display_name || comment.author.username}
                </Link>
                {renderContent(comment.content)}
              </p>
            )}

            <div className="comment-footbar" style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '6px', fontSize: '12px', color: 'rgba(255,255,255,0.5)' }}>
              <span>{timeAgo(comment.created_at || comment.createdAt)}</span>
              
              {likeCount > 0 && <span style={{ fontWeight: 600 }}>{likeCount} like{likeCount !== 1 ? 's' : ''}</span>}
              
              <button type="button" onClick={() => onReply(comment)} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.5)', cursor: 'pointer', fontWeight: 600, padding: 0 }}>
                Reply
              </button>
              
              {user.id === comment.author.id && (
                <>
                  <button type="button" onClick={() => setIsEditing(true)} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.5)', cursor: 'pointer', fontWeight: 600, padding: 0 }}>
                    Edit
                  </button>
                  <button type="button" onClick={() => onDelete(comment.id)} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.5)', cursor: 'pointer', fontWeight: 600, padding: 0 }}>
                    Delete
                  </button>
                </>
              )}
            </div>
          </div>
        </div>

        <button 
          className={`comment-like-btn ${likeAnimating ? 'animating' : ''}`}
          onClick={handleLike} 
          style={{ background: 'none', border: 'none', padding: '6px', cursor: 'pointer', color: liked ? '#ef4444' : 'rgba(255,255,255,0.4)', marginTop: '-2px' }}
        >
          <Heart size={14} fill={liked ? 'currentColor' : 'none'} strokeWidth={2.5} />
        </button>
      </div>

      {hasReplies && (
        <div className="replies-wrapper" style={{ marginTop: '0', paddingLeft: '0', borderLeft: 'none' }}>
          {!showReplies ? (
            <button type="button" className="view-replies-btn" onClick={() => setShowReplies(true)} style={{ color: 'rgba(255,255,255,0.4)', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', fontWeight: 600, marginTop: '4px' }}>
              <div style={{ width: '24px', height: '1px', backgroundColor: 'rgba(255,255,255,0.2)' }}></div>
              View replies ({comment.replies.length})
            </button>
          ) : (
            <div style={{ marginTop: '8px' }}>
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
              <button type="button" className="view-replies-btn hide" onClick={() => setShowReplies(false)} style={{ color: 'rgba(255,255,255,0.4)', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', fontWeight: 600, marginTop: '8px' }}>
                <div style={{ width: '24px', height: '1px', backgroundColor: 'rgba(255,255,255,0.2)' }}></div>
                Hide replies
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}