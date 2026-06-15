import { useState, useEffect, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Search as SearchIcon, UserPlus, Loader, X } from 'lucide-react';
import { usersAPI, friendsAPI } from '../services/api';
import { useToast } from '../context/ToastContext';
import './SearchPage.css';

const API_URL = 'http://localhost:5000';

export default function SearchPage() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [searched, setSearched] = useState(false);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const debounceRef = useRef(null);

  // Debounced instant search (300ms)
  const debouncedSearch = useCallback((q) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (q.trim().length < 2) {
      setResults([]);
      setSearched(false);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await usersAPI.search(q.trim());
        setResults(res.data.users);
        setSearched(true);
      } catch (err) {
        console.error('Search error:', err);
      } finally {
        setLoading(false);
      }
    }, 300);
  }, []);

  useEffect(() => {
    debouncedSearch(query);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, debouncedSearch]);

  const handleSendRequest = async (userId) => {
    try {
      await friendsAPI.sendRequest(userId);
      setResults(results.map((u) =>
        u.id === userId ? { ...u, requestSent: true } : u
      ));
      toast.success('Friend request sent!');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to send request');
    }
  };

  const clearSearch = () => {
    setQuery('');
    setResults([]);
    setSearched(false);
  };

  return (
    <div className="search-page">
      <div className="search-container">
        <h2 className="search-title">Find People</h2>

        <div className="search-form">
          <div className="search-input-wrapper">
            <SearchIcon size={20} className="search-icon" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by name, username, or bio..."
              className="search-input"
              autoFocus
              id="user-search-input"
            />
            {query && (
              <button className="search-clear-btn" onClick={clearSearch}>
                <X size={16} />
              </button>
            )}
          </div>
          {loading && (
            <div className="search-loading-indicator">
              <Loader size={18} className="spinner" />
            </div>
          )}
        </div>

        {searched && (
          <div className="search-results">
            <p className="search-results-count">{results.length} result{results.length !== 1 ? 's' : ''} found</p>
            {results.length === 0 ? (
              <div className="no-results">
                <p>No users found for "{query}"</p>
              </div>
            ) : (
              <div className="results-grid">
                {results.map((user) => (
                  <div key={user.id} className="user-result-card">
                    <Link to={`/@${user.username}`} className="user-result-link">
                      {user.avatar_url ? (
                        <img src={`${API_URL}${user.avatar_url}`} alt="" className="result-avatar" />
                      ) : (
                        <div className="result-avatar-placeholder">
                          {(user.display_name || user.username)[0].toUpperCase()}
                        </div>
                      )}
                      <div className="result-info">
                        <span className="result-name">{user.display_name || user.username}</span>
                        <span className="result-username">@{user.username}</span>
                        {user.bio && <p className="result-bio">{user.bio}</p>}
                      </div>
                    </Link>
                    {!user.requestSent ? (
                      <button className="add-friend-btn" onClick={() => handleSendRequest(user.id)} title="Send friend request">
                        <UserPlus size={16} />
                      </button>
                    ) : (
                      <span className="request-sent-badge">Sent</span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}