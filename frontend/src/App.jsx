import { useEffect, useState } from 'react';
import AuthPanel from './components/AuthPanel';
import InsightsPanel from './components/InsightsPanel';
import MemoryForm from './components/MemoryForm';
import MemoryList from './components/MemoryList';
import SearchPanel from './components/SearchPanel';
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
      <header className="app-header">
        <div>
          <p className="eyebrow">AI Personal Memory Assistant</p>
          <h1>Capture your moments and keep them private.</h1>
          <p className="subtitle">
            Signed in as <strong>{user.email}</strong>. Your memories, search results, and insights
            are now isolated to your account only.
          </p>
        </div>
        <div className="header-actions">
          <button
            className="secondary-button"
            type="button"
            onClick={() => setTheme((current) => (current === 'light' ? 'dark' : 'light'))}
          >
            {theme === 'light' ? 'Dark mode' : 'Light mode'}
          </button>
          <button className="secondary-button" type="button" onClick={onLogout}>
            Log out
          </button>
        </div>
      </header>

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
          <MemoryForm onCreateMemory={onCreateMemory} isSubmitting={isSubmitting} />
          <InsightsPanel
            insights={insights}
            isLoading={isLoadingInsights}
            error={insightsError}
            onRefresh={onRefreshInsights}
            onExport={onExportMemories}
            isExporting={isExporting}
          />
        </div>

        <div className="right-column">
          <SearchPanel
            onSearch={onSearch}
            onClear={onClearSearch}
            results={searchResults}
            isSearching={isSearching}
            error={searchError}
          />
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
    </div>
  );
}

export default function App() {
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
    />
  );
}
