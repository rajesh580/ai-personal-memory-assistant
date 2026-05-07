import { useState, useEffect, useRef } from 'react';
import { getStoredToken } from '../services/api';

function ChatAgent({ user, isOpen, setIsOpen, inline = false, mode = 'general', onMemoryChange }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const wsRef = useRef(null);
  const scrollContainerRef = useRef(null);

  useEffect(() => {
    if (isOpen && !wsRef.current) {
      const token = getStoredToken();
      if (!token) return;

      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const host = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' ? '127.0.0.1:8000' : window.location.host;
      const wsUrl = `${protocol}//${host}/chat/ws?token=${token}&mode=${mode}`;

      try {
        wsRef.current = new WebSocket(wsUrl);
        wsRef.current.onmessage = (event) => {
          const data = JSON.parse(event.data);
          setMessages((prev) => {
            if (data.type === 'greeting' && prev.length > 0) {
              return prev;
            }
            return [...prev, data];
          });
          if (['memory_saved', 'memory_updated', 'memory_deleted'].includes(data.type)) {
            setStatusMessage(
              data.type === 'memory_saved'
                ? 'Memory saved.'
                : data.type === 'memory_updated'
                  ? 'Memory updated.'
                  : 'Memory deleted.'
            );
            onMemoryChange?.(data);
          } else {
            setStatusMessage('');
          }
          setIsTyping(false);
        };
        wsRef.current.onclose = () => {
          wsRef.current = null;
        };
      } catch (error) {
        console.error("WebSocket connection failed:", error);
      }
    }

    return () => {
      if (wsRef.current && !isOpen) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [isOpen]);

  useEffect(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({
        top: scrollContainerRef.current.scrollHeight,
        behavior: 'smooth'
      });
    }
  }, [messages, isTyping]);

  const handleSend = (e) => {
    e.preventDefault();
    if (!input.trim()) return;

    const newMsg = { role: 'user', content: input.trim() };
    setMessages((prev) => [...prev, newMsg]);
    setInput('');
    setIsTyping(true);

    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(newMsg));
    } else {
      setTimeout(() => {
        setMessages((prev) => [...prev, {
          role: 'agent',
          content: 'I am running in simulated mode. Please wire up the backend WebSocket to connect me to your memories!'
        }]);
        setIsTyping(false);
      }, 1000);
    }
  };

  if (!isOpen) {
    if (inline) return null;
    return (
      <button
        className="primary-button"
        onClick={() => setIsOpen(true)}
        style={{ position: 'fixed', bottom: '2rem', right: '2rem', borderRadius: '50%', width: '4.5rem', height: '4.5rem', fontSize: '1.75rem', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 6px 16px rgba(0,0,0,0.2)', zIndex: 1000, transition: 'transform 0.2s ease-in-out' }}
        title="Chat with your memories"
        onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
        onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
      >
        ✨
      </button>
    );
  }

  const containerStyle = inline
    ? { width: '100%', height: '500px', display: 'flex', flexDirection: 'column', padding: 0, overflow: 'hidden', marginBottom: '1.5rem', borderRadius: '12px', border: '1px solid var(--border)', background: 'var(--bg)', boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }
    : { position: 'fixed', bottom: '2rem', right: '2rem', width: '380px', height: '600px', display: 'flex', flexDirection: 'column', zIndex: 1000, boxShadow: '0 12px 40px rgba(0,0,0,0.2)', padding: 0, overflow: 'hidden', borderRadius: '16px', border: '1px solid var(--border)', background: 'var(--bg)' };

  return (
    <div className="panel" style={containerStyle}>
      <div className="panel-header" style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--border)', background: 'var(--bg)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
          <h3 style={{ margin: 0, fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><span style={{ fontSize: '1.25rem' }}>🤖</span> AI Assistant</h3>
          {!inline && <button className="text-link-button" onClick={() => setIsOpen(false)} style={{ margin: 0, padding: '0.25rem 0.5rem' }}>Close</button>}
        </div>
      </div>

      <div ref={scrollContainerRef} style={{ flex: 1, overflowY: 'auto', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem', background: 'var(--bg-inset)' }}>
        {messages.map((msg, i) => {
          const isUser = msg.role === 'user';
          return (
            <div key={i} style={{
              alignSelf: isUser ? 'flex-end' : 'flex-start',
              background: isUser ? 'var(--primary)' : 'var(--bg)',
              color: isUser ? 'var(--bg)' : 'var(--text)',
              padding: '0.85rem 1.25rem',
              borderRadius: '18px',
              borderBottomRightRadius: isUser ? '4px' : '18px',
              borderBottomLeftRadius: !isUser ? '4px' : '18px',
              maxWidth: '85%',
              border: !isUser ? '1px solid var(--border)' : 'none',
              lineHeight: '1.5',
              whiteSpace: 'pre-wrap',
              boxShadow: '0 2px 6px rgba(0,0,0,0.04)',
              fontSize: '0.95rem'
            }}>
              {msg.content}
            </div>
          );
        })}
        {isTyping && <div style={{ alignSelf: 'flex-start', color: 'var(--text-muted)', fontSize: '0.9rem', padding: '0 0.5rem' }}>Agent is typing...</div>}
      </div>

      {statusMessage ? (
        <div style={{ padding: '0.75rem 1rem 0', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
          {statusMessage}
        </div>
      ) : null}

      <form onSubmit={handleSend} style={{ display: 'flex', padding: '1rem', borderTop: '1px solid var(--border)', gap: '0.5rem', background: 'var(--bg)' }}>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={mode === 'add_memory' ? "Tell me what to remember..." : "Ask about a memory..."}
          style={{ flex: 1, padding: '0.75rem 1rem', borderRadius: '24px', border: '1px solid var(--border)', background: 'var(--bg-inset)', color: 'var(--text)', outline: 'none', fontSize: '0.95rem' }}
        />
        <button type="submit" className="primary-button" disabled={isTyping || !input.trim()} style={{ borderRadius: '24px', padding: '0.75rem 1.25rem' }}>Send</button>
      </form>
    </div>
  );
}

export default ChatAgent;
