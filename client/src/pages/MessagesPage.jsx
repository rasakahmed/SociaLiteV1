import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { friendsAPI, messagesAPI } from '../services/api';
import { encryptMessage, decryptMessage } from '../utils/crypto';
import { Send, Lock, Loader, MessageCircle } from 'lucide-react';
import './MessagesPage.css';

const isUserActive = (lastActive) => {
  if (!lastActive) return false;
  const last = new Date(lastActive).getTime();
  const now = new Date().getTime();
  return (now - last) <= 5 * 60 * 1000;
};

export default function MessagesPage() {
  const { user } = useAuth();
  const [friends, setFriends] = useState([]);
  const [activeUser, setActiveUser] = useState(null);
  
  // Chat state
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [loadingObj, setLoadingObj] = useState(false);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef(null);

  // Fetch friends on mount for the sidebar
  useEffect(() => {
    const fetchFriends = async () => {
      try {
        const res = await friendsAPI.getList();
        setFriends(res.data.friends);
      } catch (err) {
        console.error('Error fetching friends', err);
      }
    };
    fetchFriends();
  }, []);

  // Poll for messages when there's an active user
  useEffect(() => {
    let interval;
    if (activeUser) {
      const fetchMessages = async () => {
        try {
          const res = await messagesAPI.getChat(activeUser.id);
          const myPrivKey = localStorage.getItem(`priv_${user.id}`);
          const decryptedMessages = await Promise.all(
            res.data.messages.map(async (msg) => {
              let keyToDecrypt = msg.encrypted_key;
              if (msg.sender_id === user.id) {
                if (!msg.sender_encrypted_key) {
                  return { ...msg, decrypted: '🔒 [Sent encrypted message]' };
                }
                keyToDecrypt = msg.sender_encrypted_key;
              }
              const decryptedContent = await decryptMessage(
                msg.encrypted_content,
                keyToDecrypt,
                msg.iv,
                myPrivKey
              );
              return { ...msg, decrypted: decryptedContent };
            })
          );
          setMessages(decryptedMessages);
          setLoadingObj(false);
        } catch (err) {
          console.error('Fetch chat error', err);
        }
      };

      setLoadingObj(true);
      fetchMessages();
      interval = setInterval(fetchMessages, 3000);
    }
    return () => clearInterval(interval);
  }, [activeUser, user.id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSelectUser = (friendUser) => {
    setActiveUser(friendUser);
    setMessages([]);
  };

  const handleSend = async (e) => {
    e.preventDefault();
    if (!text.trim() || !activeUser) return;

    if (!activeUser.public_key) {
      alert('This user has not set up End-to-End Encryption yet.');
      return;
    }

    setSending(true);
    try {
      const myPubKey = localStorage.getItem(`pub_${user.id}`);
      const encryptedData = await encryptMessage(text.trim(), activeUser.public_key, myPubKey);
      const res = await messagesAPI.sendMessage(activeUser.id, encryptedData);
      
      setMessages((prev) => [
        ...prev,
        { ...res.data.message, sender_id: user.id, decrypted: text.trim() }
      ]);
      setText('');
    } catch (err) {
      console.error(err);
      alert('Failed to send encrypted message');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="messages-page">
      <div className="messages-container">
        
        {/* Sidebar */}
        <div className="messages-sidebar">
          <div className="sidebar-header">
            <h2>Messages</h2>
          </div>
          <div className="friend-list">
            {friends.length === 0 ? (
              <div className="no-friends-container">
                <p className="no-friends">You don't have any friends yet.</p>
                <span className="no-friends-sub">Add friends to start messaging!</span>
              </div>
            ) : (
              friends.map(friend => (
                <div 
                  key={friend.id} 
                  className={`friend-item ${activeUser?.id === friend.id ? 'active' : ''}`}
                  onClick={() => handleSelectUser(friend)}
                >
                  <div className="friend-avatar-wrapper">
                    {friend.avatar_url ? (
                      <img src={`http://localhost:5000${friend.avatar_url}`} alt="" />
                    ) : (
                      <div className="friend-avatar-ph">{(friend.display_name || friend.username)[0].toUpperCase()}</div>
                    )}
                  </div>
                  <div className="friend-info">
                    <span className="friend-name">
                      {friend.display_name || friend.username}
                      <span title={isUserActive(friend.last_active) ? "Online" : "Offline"} className={`msg-active-dot ${isUserActive(friend.last_active) ? 'online' : ''}`}></span>
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Chat Area */}
        <div className="messages-chat-area">
          {!activeUser ? (
            <div className="chat-empty-state">
              <div className="icon-wrapper"><MessageCircle size={48} /></div>
              <h3>Your Messages</h3>
              <p>Send end-to-end encrypted messages to a friend.</p>
            </div>
          ) : (
            <div className="chat-window">
              <div className="chat-header">
                <div className="chat-header-info">
                  {activeUser.avatar_url ? (
                    <img src={`http://localhost:5000${activeUser.avatar_url}`} alt="" className="chat-header-avatar" />
                  ) : (
                    <div className="chat-header-avatar ph">{(activeUser.display_name || activeUser.username)[0].toUpperCase()}</div>
                  )}
                  <div>
                    <h3 className="chat-header-name">
                      {activeUser.display_name || activeUser.username}
                      <span title={isUserActive(activeUser.last_active) ? "Online" : "Offline"} className={`msg-active-dot ${isUserActive(activeUser.last_active) ? 'online' : ''}`}></span>
                    </h3>
                    <span className="chat-header-status"><Lock size={12} /> End-to-End Encrypted</span>
                  </div>
                </div>
              </div>

              <div className="chat-body">
                {loadingObj ? (
                  <div className="chat-loading"><Loader size={24} className="spinner" /></div>
                ) : messages.length === 0 ? (
                  <div className="chat-start-prompt">
                    <Lock size={32} />
                    <p>No messages yet. Send a message to start.</p>
                  </div>
                ) : (
                  messages.map((msg, i) => (
                    <div key={msg.id || i} className={`chat-bubble-wrapper ${msg.sender_id === user.id ? 'sent' : 'received'}`}>
                      <div className="chat-bubble">
                        {msg.decrypted}
                      </div>
                    </div>
                  ))
                )}
                <div ref={messagesEndRef} />
              </div>

              <form className="chat-footer" onSubmit={handleSend}>
                <input
                  type="text"
                  placeholder={activeUser.public_key ? "Message..." : "User hasn't enabled encryption"}
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  disabled={!activeUser.public_key || sending}
                />
                <button type="submit" disabled={!text.trim() || !activeUser.public_key || sending}>
                  {sending ? <Loader size={18} className="spinner" /> : <Send size={18} />}
                </button>
              </form>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
