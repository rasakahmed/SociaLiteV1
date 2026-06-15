import { useState, useEffect, useRef } from 'react';
import { X, Send, Lock, Loader } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { messagesAPI } from '../services/api';
import { encryptMessage, decryptMessage } from '../utils/crypto';
import './ChatModal.css';

export default function ChatModal({ otherUser, onClose }) {
  const { user } = useAuth();
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef(null);

  // Poll for messages every 3 seconds
  useEffect(() => {
    let interval;
    const fetchMessages = async () => {
      try {
        const res = await messagesAPI.getChat(otherUser.id);
        const myPrivKey = localStorage.getItem(`priv_${user.id}`);
        // Decrypt all messages
        const decryptedMessages = await Promise.all(
          res.data.messages.map(async (msg) => {
            // For sender: we could decrypt with our own private key if we stored it encrypted for ourselves,
            // but typical simple E2E encrypts with the *receiver's* public key only.
            // Wait, if we sent it, we encrypted it with *their* public key. 
            // So we can't decrypt our own sent messages easily unless we also encrypt a copy for ourselves!
            
            // To simplify for this demo, if it's sent by us, we try decrypting, but it usually fails.
            // Let's just catch it. Or if it fails, maybe we have a placeholder "You sent an encrypted message".
            if (msg.sender_id === user.id) {
              return { ...msg, decrypted: '🔒 [Sent encrypted message]' };
            }
            
            const decryptedContent = await decryptMessage(
              msg.encrypted_content,
              msg.encrypted_key,
              msg.iv,
              myPrivKey
            );
            return { ...msg, decrypted: decryptedContent };
          })
        );
        setMessages(decryptedMessages);
        setLoading(false);
      } catch (err) {
        console.error('Fetch chat error', err);
      }
    };

    fetchMessages();
    interval = setInterval(fetchMessages, 3000);
    return () => clearInterval(interval);
  }, [otherUser.id, user.id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!text.trim()) return;

    if (!otherUser.public_key) {
      alert('This user has not set up End-to-End Encryption yet.');
      return;
    }

    setSending(true);
    try {
      const encryptedData = await encryptMessage(text.trim(), otherUser.public_key);
      const res = await messagesAPI.sendMessage(otherUser.id, encryptedData);
      
      // Temporarily add to UI seamlessly
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
    <div className="modal-overlay">
      <div className="chat-modal">
        <div className="chat-header">
          <div className="chat-userInfo">
            <div className="chat-avatar-wrapper">
              {otherUser.avatar_url ? (
                <img src={`http://localhost:5000${otherUser.avatar_url}`} alt="" className="chat-avatar" />
              ) : (
                <div className="chat-avatar-ph">{(otherUser.display_name || otherUser.username)[0].toUpperCase()}</div>
              )}
            </div>
            <div>
              <h3>{otherUser.display_name || otherUser.username}</h3>
              <span><Lock size={10} /> End-to-End Encrypted</span>
            </div>
          </div>
          <button className="modal-close-btn" onClick={onClose}><X size={20} /></button>
        </div>

        <div className="chat-body">
          {loading ? (
            <div className="chat-loading"><Loader size={24} className="spinner" /></div>
          ) : messages.length === 0 ? (
            <div className="chat-empty">
              <Lock size={32} />
              <p>No messages yet.<br/>Send a message to start an encrypted chat.</p>
            </div>
          ) : (
            messages.map((msg, i) => (
              <div key={msg.id || i} className={`chat-bubble-container ${msg.sender_id === user.id ? 'sent' : 'received'}`}>
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
            placeholder={otherUser.public_key ? "Type an encrypted message..." : "User hasn't enabled encryption"}
            value={text}
            onChange={(e) => setText(e.target.value)}
            disabled={!otherUser.public_key || sending}
          />
          <button type="submit" disabled={!text.trim() || !otherUser.public_key || sending}>
            {sending ? <Loader size={18} className="spinner" /> : <Send size={18} />}
          </button>
        </form>
      </div>
    </div>
  );
}
