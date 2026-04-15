import React from 'react';

function NavBar({ user, theme, setTheme, onLogout, currentPage, setCurrentPage, onToggleChat }) {
  const navStyles = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '1.25rem 2.5rem',
    background: 'var(--bg)',
    borderBottom: '1px solid var(--border)',
    boxShadow: '0 2px 10px rgba(0,0,0,0.03)',
    position: 'sticky',
    top: 0,
    zIndex: 100,
  };

  const brandStyles = {
    fontWeight: 'bold',
    fontSize: '1.3rem',
    cursor: 'pointer',
    color: 'var(--text)',
  };
  
  const linksContainerStyles = {
    display: 'flex',
    gap: '1.5rem',
    alignItems: 'center',
    marginLeft: '2rem',
  };

  const getLinkStyles = (pageId) => ({
    background: 'transparent',
    border: 'none',
    color: currentPage === pageId ? 'var(--primary)' : 'var(--text)',
    fontWeight: currentPage === pageId ? 'bold' : 'normal',
    fontSize: '1rem',
    cursor: 'pointer',
    padding: '0.5rem 0',
    borderBottom: currentPage === pageId ? '2px solid var(--primary)' : '2px solid transparent',
  });

  const actionsStyles = {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
  };

  const greetingStyles = {
    color: 'var(--text-muted)',
  };

  return (
    <nav style={navStyles}>
      <div style={{ display: 'flex', alignItems: 'center' }}>
        <div style={brandStyles} onClick={() => setCurrentPage('dashboard')}>
          🧠 Memory Bank
        </div>
        <div style={linksContainerStyles}>
          <button type="button" style={getLinkStyles('dashboard')} onClick={() => setCurrentPage('dashboard')}>Dashboard</button>
          <button type="button" style={getLinkStyles('memories')} onClick={() => setCurrentPage('memories')}>Memories</button>
          <button type="button" style={getLinkStyles('settings')} onClick={() => setCurrentPage('settings')}>Settings</button>
        </div>
      </div>
      <div style={actionsStyles}>
        <span style={greetingStyles}>Hi, {user.email.split('@')[0]}</span>
        <button className="secondary-button" type="button" onClick={onToggleChat} title="Chat with AI">
          💬 Chat
        </button>
        <button
          className="secondary-button"
          type="button"
          onClick={() => setTheme(current => (current === 'light' ? 'dark' : 'light'))}
          title="Toggle theme"
          style={{ padding: '0.5rem' }}
        >
          {theme === 'light' ? '🌙' : '☀️'}
        </button>
        <button className="secondary-button" type="button" onClick={onLogout}>
          Log Out
        </button>
      </div>
    </nav>
  );
}

export default NavBar;