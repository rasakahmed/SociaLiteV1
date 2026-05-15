import { useState, useEffect, useCallback, useRef } from 'react';
import { postsAPI } from '../services/api';
import { useToast } from '../context/ToastContext';
import PostCard from '../components/PostCard';
import CreatePost from '../components/CreatePost';
import SuggestedFriends from '../components/SuggestedFriends';
import { PostCardSkeleton } from '../components/Skeleton';
import { Loader } from 'lucide-react';
import './FeedPage.css';

export default function FeedPage() {
  const [posts, setPosts] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const { toast } = useToast();
  const loadingMoreRef = useRef(false);

  const fetchPosts = useCallback(async (pageNum = 1, append = false) => {
    try {
      if (append) {
        setLoadingMore(true);
        loadingMoreRef.current = true;
      } else {
        setLoading(true);
      }

      const res = await postsAPI.getFeed(pageNum);
      if (append) {
        setPosts((prev) => [...prev, ...res.data.posts]);
      } else {
        setPosts(res.data.posts);
      }
      setTotalPages(res.data.pagination.totalPages);
    } catch (err) {
      toast.error('Failed to load feed');
    } finally {
      setLoading(false);
      setLoadingMore(false);
      loadingMoreRef.current = false;
    }
  }, [toast]);

  useEffect(() => {
    fetchPosts(1);
  }, [fetchPosts]);

  const handlePostCreated = (newPost) => {
    setPosts([newPost, ...posts]);
    toast.success('Post created!');
  };

  const handleDeletePost = async (postId) => {
    await postsAPI.delete(postId);
    setPosts(posts.filter((p) => p.id !== postId));
  };

  const handleUpdatePost = (updatedPost) => {
    setPosts(posts.map((p) => (p.id === updatedPost.id ? { ...p, ...updatedPost } : p)));
  };

  // Infinite scroll with ref guard to prevent duplicate calls
  useEffect(() => {
    const handleScroll = () => {
      if (
        window.innerHeight + document.documentElement.scrollTop >=
        document.documentElement.offsetHeight - 300
      ) {
        if (!loadingMoreRef.current && page < totalPages) {
          const nextPage = page + 1;
          setPage(nextPage);
          fetchPosts(nextPage, true);
        }
      }
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [page, totalPages, fetchPosts]);

  return (
    <div className="feed-page">
      <div className="feed-container">
        <div className="feed-main">
          <h2 className="feed-title">Your Feed</h2>
          <CreatePost onPostCreated={handlePostCreated} />

          {loading ? (
            <div className="feed-skeletons">
              {[1, 2, 3].map((i) => (
                <PostCardSkeleton key={i} />
              ))}
            </div>
          ) : posts.length === 0 ? (
            <div className="feed-empty">
              <div className="feed-empty-icon">📝</div>
              <h3>No posts yet</h3>
              <p>Start by creating a post or adding friends to see their posts here!</p>
            </div>
          ) : (
            <>
              {posts.map((post) => (
                <PostCard
                  key={post.id}
                  post={post}
                  onDelete={handleDeletePost}
                  onUpdate={handleUpdatePost}
                />
              ))}
              {loadingMore && (
                <div className="feed-loading-more">
                  <Loader size={24} className="spinner" />
                </div>
              )}
              {page >= totalPages && posts.length > 0 && (
                <p className="feed-end">You've reached the end ✨</p>
              )}
            </>
          )}
        </div>
        <aside className="feed-sidebar">
          <SuggestedFriends />
        </aside>
      </div>
    </div>
  );
}
