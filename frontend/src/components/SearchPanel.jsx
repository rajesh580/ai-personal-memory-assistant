import { useState } from 'react';

function formatScore(score) {
  if (typeof score !== 'number') {
    return 'N/A';
  }

  return score.toFixed(3);
}

function SearchPanel({ onSearch, onClear, results, isSearching, error }) {
  const [query, setQuery] = useState('');
  const [mood, setMood] = useState('');
  const [importance, setImportance] = useState('');
  const [tag, setTag] = useState('');
  const [limit, setLimit] = useState('5');
  const [hasSearched, setHasSearched] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();

    if (!query.trim()) {
      return;
    }

    setHasSearched(true);
    await onSearch({
      query: query.trim(),
      mood: mood.trim() || undefined,
      importance: importance ? Number(importance) : undefined,
      tag: tag.trim() || undefined,
      limit: Number(limit),
    });
  }

  return (
    <section className="panel">
      <div className="panel-header">
        <div>
          <p className="eyebrow">Semantic search</p>
          <h2>Find related memories</h2>
        </div>
      </div>

      <form className="search-form" onSubmit={handleSubmit}>
        <input
          type="text"
          placeholder="Search by meaning, feeling, or topic..."
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          disabled={isSearching}
        />
        <select
          value={limit}
          onChange={(event) => setLimit(event.target.value)}
          disabled={isSearching}
        >
          <option value="5">Top 5</option>
          <option value="10">Top 10</option>
          <option value="15">Top 15</option>
        </select>
        <button className="primary-button" type="submit" disabled={isSearching}>
          {isSearching ? 'Searching...' : 'Search'}
        </button>
      </form>

      <div className="search-filters">
        <input
          type="text"
          placeholder="Filter mood"
          value={mood}
          onChange={(event) => setMood(event.target.value)}
          disabled={isSearching}
        />
        <select
          value={importance}
          onChange={(event) => setImportance(event.target.value)}
          disabled={isSearching}
        >
          <option value="">All importance</option>
          <option value="1">Priority 1</option>
          <option value="2">Priority 2</option>
          <option value="3">Priority 3</option>
          <option value="4">Priority 4</option>
          <option value="5">Priority 5</option>
        </select>
        <input
          type="text"
          placeholder="Filter tag"
          value={tag}
          onChange={(event) => setTag(event.target.value)}
          disabled={isSearching}
        />
        <button
          type="button"
          className="secondary-button"
          onClick={() => {
            setQuery('');
            setMood('');
            setImportance('');
            setTag('');
            setLimit('5');
            setHasSearched(false);
            onClear?.();
          }}
          disabled={isSearching}
        >
          Clear search
        </button>
      </div>

      {error ? <p className="status-message error">{error}</p> : null}

      {!error && !hasSearched ? (
        <div className="empty-state compact">
          <p>Try a phrase like "family trip", "stress at work", or "when I felt proud".</p>
        </div>
      ) : null}

      {!error && hasSearched && results.length === 0 ? (
        <div className="empty-state compact">
          <p>No memories matched that search and filter combination.</p>
        </div>
      ) : null}

      <div className="search-results">
        {results.map((item, index) => (
          <article className="search-result-card" key={`${item.memory?.id || index}-${index}`}>
            <div className="search-result-header">
              <div>
                <h3>{item.memory?.title || 'Untitled memory'}</h3>
                <p className="memory-date">{item.memory?.created_at ? new Date(item.memory.created_at).toLocaleString() : ''}</p>
              </div>
              <span className="score-badge">Score {formatScore(item.score)}</span>
            </div>

            <p className="memory-content">{item.memory?.content}</p>

            {item.reason ? <p className="search-reason">{item.reason}</p> : null}

            {Array.isArray(item.memory?.tags) && item.memory.tags.length > 0 ? (
              <div className="tag-list">
                {item.memory.tags.map((tag) => (
                  <span className="tag" key={`${item.memory.id}-${tag}`}>
                    #{tag}
                  </span>
                ))}
              </div>
            ) : null}
          </article>
        ))}
      </div>
    </section>
  );
}

export default SearchPanel;
