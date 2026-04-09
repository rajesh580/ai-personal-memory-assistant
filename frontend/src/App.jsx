import { useEffect, useState } from 'react';
import InsightsPanel from './components/InsightsPanel';
import MemoryForm from './components/MemoryForm';
import MemoryList from './components/MemoryList';
import SearchPanel from './components/SearchPanel';
import {
  fetchMemories,
  createMemory,
  searchMemories,
  fetchInsights,
} from './services/api';

export default function App() {
  const [memories, setMemories] = useState([]);
  const [insights, setInsights] = useState(null);
  const [searchResults, setSearchResults] = useState([]);
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

  async function handleSearch(query) {
    setSearchError('');
    setIsSearching(true);
    try {
      const results = await searchMemories(query);
      setSearchResults(Array.isArray(results) ? results : []);
    } catch (error) {
      setSearchError(error.message || 'Search failed.');
    } finally {
      setIsSearching(false);
    }
  }

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
            results={searchResults}
            isSearching={isSearching}
            error={searchError}
          />
          <MemoryList
            memories={memories}
            isLoading={isLoadingMemories}
            error={memoriesError}
          />
        </div>
      </main>
    </div>
  );
}
