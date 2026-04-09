import { useState } from 'react';

function formatScore(score) {
  if (typeof score !== 'number') {
    return 'N/A';
  }

  return score.toFixed(3);
}

function SearchPanel({ onSearch, results, isSearching, error }) {
  const [query, setQuery] = useState('');

  async function handleSubmit(event) {
    event.preventDefault();

    if (!query.trim()) {
      return;
    }

    await onSearch(query.trim());
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
        <button className="primary-button" type="submit" disabled={isSearching}>
          {isSearching ? 'Searching...' : 'Search'}
        </button>
      </form>

      {error ? <p className="status-message error">{error}</p> : null}

      {!error && results.length === 0 ? (
        <div className="empty-state compact">
          <p>Search results will appear here.</p>
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