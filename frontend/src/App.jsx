import { useEffect, useState } from 'react';
import InsightsPanel from './components/InsightsPanel';
import MemoryForm from './components/MemoryForm';
import MemoryList from './components/MemoryList';
import SearchPanel from './components/SearchPanel';
import {
  fetchMemories,
  createMemory,
  searchMemories,
  deleteMemory,
  updateMemory,
  fetchInsights,
} from './services/api';

export default function App() {
  const [memories, setMemories] = useState([]);
  const [insights, setInsights] = useState(null);
  const [searchResults, setSearchResults] = useState([]);
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
  const [memoriesError, setMemoriesError] = useState('');
  const [searchError, setSearchError] = useState('');
  const [insightsError, setInsightsError] = useState('');

  useEffect(() => {
    loadMemories();
    loadInsights();
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('memory-app-theme', theme);
    }
  }, [theme]);

  async function loadMemories() {
    setMemoriesError('');
    setIsLoadingMemories(true);
    try {
      const data = await fetchMemories();
      setMemories(Array.isArray(data) ? data : []);
    } catch (error) {
      setMemoriesError(error.message || 'Unable to load memories.');
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
      setInsightsError(error.message || 'Unable to load insights.');
    } finally {
      setIsLoadingInsights(false);
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

  async function handleSearch(query, filters = {}) {
    setSearchError('');
    setIsSearching(true);
    try {
      const results = await searchMemories(query);
      let filtered = Array.isArray(results) ? results : [];

      if (filters.mood) {
        filtered = filtered.filter((item) =>
          item.memory?.mood?.toLowerCase().includes(filters.mood.toLowerCase())
        );
      }

      if (filters.importance) {
        filtered = filtered.filter(
          (item) => item.memory?.importance === Number(filters.importance)
        );
      }

      if (filters.tag) {
        filtered = filtered.filter((item) =>
          item.memory?.tags?.some((tag) =>
            tag.toLowerCase().includes(filters.tag.toLowerCase())
          )
        );
      }

      setSearchResults(filtered);
    } catch (error) {
      setSearchError(error.message || 'Search failed.');
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
      setMemoriesError(error.message || 'Unable to delete memory.');
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
      setMemoriesError(error.message || 'Unable to update memory.');
    }
  }

  const sortedMemories = [...memories].sort((a, b) => {
    if (sortOption === 'importance') {
      return (b.importance ?? 0) - (a.importance ?? 0);
    }
    if (sortOption === 'title') {
      return (a.title || '').localeCompare(b.title || '');
    }
    return new Date(b.created_at) - new Date(a.created_at);
  });

  return (
    <div className="app-shell">
      <header className="app-header">
        <div>
          <p className="eyebrow">AI Personal Memory Assistant</p>
          <h1>Capture your moments and recall them later.</h1>
          <p className="subtitle">
            Add memories, search them semantically, and review insights from your stored moments.
          </p>
        </div>
        <button
          className="secondary-button"
          type="button"
          onClick={() => setTheme((current) => (current === 'light' ? 'dark' : 'light'))}
        >
          {theme === 'light' ? 'Dark mode' : 'Light mode'}
        </button>
      </header>

      <main className="main-grid">
        <div className="left-column">
          <MemoryForm onCreateMemory={handleCreateMemory} isSubmitting={isSubmitting} />
          <InsightsPanel
            insights={insights}
            isLoading={isLoadingInsights}
            error={insightsError}
            onRefresh={loadInsights}
          />
        </div>

        <div className="right-column">
          <SearchPanel
            onSearch={handleSearch}
            onClear={handleClearSearch}
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
            onDeleteMemory={handleDeleteMemory}
            onUpdateMemory={handleUpdateMemory}
          />
        </div>
      </main>
    </div>
  );
}
