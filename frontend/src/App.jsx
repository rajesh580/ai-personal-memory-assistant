import { useEffect, useState } from 'react';
import AuthPanel from './components/AuthPanel';
import InsightsPanel from './components/InsightsPanel';
import MemoryForm from './components/MemoryForm';
import MemoryList from './components/MemoryList';
import SearchPanel from './components/SearchPanel';
import NavBar from './components/NavBar';
import ChatAgent from './components/ChatAgent';
import {
  createMemory,
  deleteMemory,
  exportMemories,
  fetchCurrentUser,
  fetchInsights,
  fetchMemories,
  getStoredToken,
  loginUser,
  logoutUser,
  registerUser,
  searchMemories,
  setAuthToken,
  updateMemory,
} from './services/api';

function AppContent({
  user,
  theme,
  setTheme,
  memories,
  insights,
  searchResults,
  sortOption,
  setSortOption,
  isLoadingMemories,
  isLoadingInsights,
  isSearching,
  isSubmitting,
  isExporting,
  memoriesError,
  searchError,
  insightsError,
  onCreateMemory,
  onSearch,
  onClearSearch,
  onDeleteMemory,
  onUpdateMemory,
  onRefreshInsights,
  onExportMemories,
  onLogout,
  currentPage,
  setCurrentPage,
  isInlineChatOpen,
  setIsInlineChatOpen,
  isNavChatOpen,
  setIsNavChatOpen,
}) {
  const sortedMemories = [...memories].sort((a, b) => {
    if (sortOption === 'importance') {
      return (b.importance ?? 0) - (a.importance ?? 0);
    }
    if (sortOption === 'title') {
      return (a.title || '').localeCompare(b.title || '');
    }
    return new Date(b.created_at) - new Date(a.created_at);
  });

  const quickStats = {
    total: memories.length,
    highPriority: memories.filter((memory) => (memory.importance ?? 0) >= 4).length,
    tagged: memories.filter((memory) => Array.isArray(memory.tags) && memory.tags.length > 0).length,
    moodsTracked: new Set(
      memories.map((memory) => memory.mood?.trim()).filter(Boolean)
    ).size,
  };

  return (
    <div className="app-shell">
      <NavBar
        user={user}
        theme={theme}
        setTheme={setTheme}
        onLogout={onLogout}
        currentPage={currentPage}
        setCurrentPage={setCurrentPage}
        onToggleChat={() => setIsNavChatOpen((prev) => !prev)}
      />
      <header className="app-header">
        {currentPage === 'dashboard' && (
          <div>
            <p className="eyebrow">Welcome back, {user.email.split('@')[0]}</p>
            <h1>Your Personal Memory Dashboard</h1>
            <p className="subtitle">Here's a snapshot of your captured moments and insights.</p>
          </div>
        )}
        {currentPage === 'memories' && (
          <div>
            <p className="eyebrow">Search and browse</p>
            <h1>Memory Vault</h1>
            <p className="subtitle">Search through your past entries or browse them all.</p>
          </div>
        )}
        {currentPage === 'settings' && (
          <div>
            <p className="eyebrow">Preferences</p>
            <h1>Account Settings</h1>
            <p className="subtitle">Manage your account, appearance, and data.</p>
          </div>
        )}
      </header>

      {currentPage === 'dashboard' && (
        <>
          <section className="hero-stats">
            <article className="hero-stat-card">
              <span>Total captured</span>
              <strong>{quickStats.total}</strong>
            </article>
            <article className="hero-stat-card">
              <span>High priority</span>
              <strong>{quickStats.highPriority}</strong>
            </article>
            <article className="hero-stat-card">
              <span>Tagged memories</span>
              <strong>{quickStats.tagged}</strong>
            </article>
            <article className="hero-stat-card">
              <span>Moods tracked</span>
              <strong>{quickStats.moodsTracked}</strong>
            </article>
          </section>

          <main className="main-grid">
            <div className="left-column">
              <MemoryForm 
                onCreateMemory={onCreateMemory} 
                isSubmitting={isSubmitting} 
                user={user}
                isInlineChatOpen={isInlineChatOpen}
                setIsInlineChatOpen={setIsInlineChatOpen}
              />
            </div>
            <div className="right-column">
              <InsightsPanel
                insights={insights}
                isLoading={isLoadingInsights}
                error={insightsError}
                onRefresh={onRefreshInsights}
                onExport={onExportMemories}
                isExporting={isExporting}
              />
            </div>
          </main>
        </>
      )}

      {currentPage === 'memories' && (
        <main className="main-grid">
          <div className="left-column">
            <SearchPanel
              onSearch={onSearch}
              onClear={onClearSearch}
              results={searchResults}
              isSearching={isSearching}
              error={searchError}
            />
          </div>
          <div className="right-column">
            <MemoryList
              memories={sortedMemories}
              isLoading={isLoadingMemories}
              error={memoriesError}
              sortOption={sortOption}
              onChangeSort={setSortOption}
              onDeleteMemory={onDeleteMemory}
              onUpdateMemory={onUpdateMemory}
            />
          </div>
        </main>
      )}

      {currentPage === 'settings' && (
        <main className="main-grid">
          <div className="left-column">
            <section className="panel">
              <div className="panel-header">
                <div>
                  <p className="eyebrow">Profile</p>
                  <h2>Account Details</h2>
                </div>
              </div>
              <div style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div>
                  <p className="muted-text">Email Address</p>
                  <p><strong>{user.email}</strong></p>
                </div>
              </div>
            </section>

            <section className="panel" style={{ marginTop: '2rem' }}>
              <div className="panel-header">
                <div>
                  <p className="eyebrow">Data</p>
                  <h2>Export & Data</h2>
                </div>
              </div>
              <div style={{ padding: '1rem' }}>
                <p style={{ marginBottom: '1rem' }}>Download a complete JSON backup of your memories.</p>
                <button className="secondary-button" onClick={onExportMemories} disabled={isExporting}>
                  {isExporting ? 'Exporting...' : 'Export All Data'}
                </button>
              </div>
            </section>
          </div>

          <div className="right-column">
            <section className="panel">
              <div className="panel-header">
                <div>
                  <p className="eyebrow">System</p>
                  <h2>Preferences</h2>
                </div>
              </div>
              <div style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                <div>
                  <p style={{ marginBottom: '0.5rem' }}>Theme Preference</p>
                  <button
                    className="secondary-button"
                    onClick={() => setTheme((current) => (current === 'light' ? 'dark' : 'light'))}
                  >
                    Switch to {theme === 'light' ? 'Dark' : 'Light'} Mode
                  </button>
                </div>
                <div style={{ borderTop: '1px solid var(--border)', paddingTop: '1.5rem' }}>
                  <p style={{ marginBottom: '0.5rem' }}>Session</p>
                  <button className="primary-button" onClick={onLogout}>
                    Log Out
                  </button>
                </div>
              </div>
            </section>
          </div>
        </main>
      )}

      <ChatAgent user={user} isOpen={isNavChatOpen} setIsOpen={setIsNavChatOpen} mode="general" />
    </div>
  );
}

export default function App() {
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [memories, setMemories] = useState([]);
  const [insights, setInsights] = useState(null);
  const [searchResults, setSearchResults] = useState([]);
  const [user, setUser] = useState(null);
  const [authMode, setAuthMode] = useState('login');
  const [authError, setAuthError] = useState('');
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [isCheckingSession, setIsCheckingSession] = useState(Boolean(getStoredToken()));
  const [theme, setTheme] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = window.localStorage.getItem('memory-app-theme');
      return saved === 'dark' ? 'dark' : 'light';
    }
    return 'light';
  });
  const [sortOption, setSortOption] = useState('date');
  const [isLoadingMemories, setIsLoadingMemories] = useState(false);
  const [isLoadingInsights, setIsLoadingInsights] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [memoriesError, setMemoriesError] = useState('');
  const [searchError, setSearchError] = useState('');
  const [insightsError, setInsightsError] = useState('');
  const [isInlineChatOpen, setIsInlineChatOpen] = useState(false);
  const [isNavChatOpen, setIsNavChatOpen] = useState(false);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('memory-app-theme', theme);
    }
  }, [theme]);

  useEffect(() => {
    async function restoreSession() {
      const token = getStoredToken();
      if (!token) {
        setIsCheckingSession(false);
        return;
      }

      try {
        const currentUser = await fetchCurrentUser();
        setUser(currentUser);
      } catch (error) {
        setAuthToken('');
      } finally {
        setIsCheckingSession(false);
      }
    }

    restoreSession();
  }, []);

  useEffect(() => {
    if (!user) {
      setMemories([]);
      setInsights(null);
      setSearchResults([]);
      return;
    }

    loadMemories();
    loadInsights();
  }, [user]);

  async function loadMemories() {
    setMemoriesError('');
    setIsLoadingMemories(true);
    try {
      const data = await fetchMemories();
      setMemories(Array.isArray(data) ? data : []);
    } catch (error) {
      handleProtectedError(error, setMemoriesError, 'Unable to load memories.');
    } finally {
      setIsLoadingMemories(false);
    }
  }

  async function loadInsights() {
    setInsightsError('');
    setIsLoadingInsights(true);
    try {
      const data = await fetchInsights();
      setInsights(data);
    } catch (error) {
      handleProtectedError(error, setInsightsError, 'Unable to load insights.');
    } finally {
      setIsLoadingInsights(false);
    }
  }

  function handleProtectedError(error, setter, fallbackMessage) {
    const message = error.message || fallbackMessage;
    if (message.toLowerCase().includes('authentication') || message.toLowerCase().includes('session')) {
      setAuthToken('');
      setUser(null);
      setter('Your session ended. Please sign in again.');
      return;
    }
    setter(message);
  }

  async function handleAuthenticate(payload) {
    setAuthError('');
    setIsAuthenticating(true);
    try {
      const data =
        authMode === 'login' ? await loginUser(payload) : await registerUser(payload);
      setAuthToken(data.token);
      setUser(data.user);
      setSearchResults([]);
      setMemoriesError('');
      setSearchError('');
      setInsightsError('');
    } catch (error) {
      setAuthError(error.message || 'Authentication failed.');
    } finally {
      setIsAuthenticating(false);
    }
  }

  async function handleLogout() {
    try {
      await logoutUser();
    } catch (error) {
      // Ignore logout errors and clear local session regardless.
    } finally {
      setAuthToken('');
      setUser(null);
      setAuthMode('login');
    }
  }

  async function handleCreateMemory(payload) {
    setIsSubmitting(true);
    try {
      await createMemory(payload);
      await loadMemories();
      await loadInsights();
    } catch (error) {
      throw error;
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleSearch(payload) {
    setSearchError('');
    setIsSearching(true);
    try {
      const results = await searchMemories(payload);
      setSearchResults(Array.isArray(results) ? results : []);
    } catch (error) {
      handleProtectedError(error, setSearchError, 'Search failed.');
    } finally {
      setIsSearching(false);
    }
  }

  function handleClearSearch() {
    setSearchError('');
    setSearchResults([]);
  }

  async function handleDeleteMemory(memoryId) {
    if (!window.confirm('Are you sure you want to delete this memory?')) {
      return;
    }

    try {
      await deleteMemory(memoryId);
      await loadMemories();
      await loadInsights();
      setSearchResults((current) => current.filter((item) => item.memory?.id !== memoryId));
    } catch (error) {
      handleProtectedError(error, setMemoriesError, 'Unable to delete memory.');
    }
  }

  async function handleUpdateMemory(memoryId, payload) {
    try {
      const updatedMemory = await updateMemory(memoryId, payload);
      await loadInsights();
      setMemories((current) =>
        current.map((memory) => (memory.id === memoryId ? updatedMemory : memory))
      );
      setSearchResults((current) =>
        current.map((item) =>
          item.memory?.id === memoryId ? { ...item, memory: updatedMemory } : item
        )
      );
    } catch (error) {
      handleProtectedError(error, setMemoriesError, 'Unable to update memory.');
    }
  }

  async function handleExportMemories() {
    setInsightsError('');
    setIsExporting(true);
    try {
      const data = await exportMemories();
      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: 'application/json',
      });
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = `${user.email.replace(/[^a-z0-9]/gi, '_').toLowerCase()}-memories.json`;
      link.click();
      window.URL.revokeObjectURL(downloadUrl);
    } catch (error) {
      handleProtectedError(error, setInsightsError, 'Unable to export memories.');
    } finally {
      setIsExporting(false);
    }
  }

  if (isCheckingSession) {
    return (
      <div className="auth-shell">
        <section className="auth-card">
          <p className="status-message">Restoring your session...</p>
        </section>
      </div>
    );
  }

  if (!user) {
    return (
      <AuthPanel
        mode={authMode}
        onSubmit={handleAuthenticate}
        isSubmitting={isAuthenticating}
        onSwitchMode={() => {
          setAuthError('');
          setAuthMode((current) => (current === 'login' ? 'register' : 'login'));
        }}
        error={authError}
      />
    );
  }

  return (
    <AppContent
      user={user}
      theme={theme}
      setTheme={setTheme}
      memories={memories}
      insights={insights}
      searchResults={searchResults}
      sortOption={sortOption}
      setSortOption={setSortOption}
      isLoadingMemories={isLoadingMemories}
      isLoadingInsights={isLoadingInsights}
      isSearching={isSearching}
      isSubmitting={isSubmitting}
      isExporting={isExporting}
      memoriesError={memoriesError}
      searchError={searchError}
      insightsError={insightsError}
      onCreateMemory={handleCreateMemory}
      onSearch={handleSearch}
      onClearSearch={handleClearSearch}
      onDeleteMemory={handleDeleteMemory}
      onUpdateMemory={handleUpdateMemory}
      onRefreshInsights={loadInsights}
      onExportMemories={handleExportMemories}
      onLogout={handleLogout}
      currentPage={currentPage}
      setCurrentPage={setCurrentPage}
      isInlineChatOpen={isInlineChatOpen}
      setIsInlineChatOpen={setIsInlineChatOpen}
      isNavChatOpen={isNavChatOpen}
      setIsNavChatOpen={setIsNavChatOpen}
    />
  );
}
