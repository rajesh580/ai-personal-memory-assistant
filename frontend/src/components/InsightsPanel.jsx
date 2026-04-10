function formatDate(value) {
  if (!value) {
    return 'Unknown date';
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}

function renderTopTags(topTags) {
  if (!Array.isArray(topTags) || topTags.length === 0) {
    return <p className="muted-text">No tag trends yet.</p>;
  }

  return (
    <div className="stat-list">
      {topTags.map((item, index) => {
        const label = Array.isArray(item) ? item[0] : item?.tag || item?.name || `Tag ${index + 1}`;
        const value = Array.isArray(item) ? item[1] : item?.count || 0;

        return (
          <div className="stat-row" key={`${label}-${index}`}>
            <span>{label}</span>
            <strong>{value}</strong>
          </div>
        );
      })}
    </div>
  );
}

function renderMoodDistribution(distribution) {
  const entries = distribution ? Object.entries(distribution) : [];

  if (entries.length === 0) {
    return <p className="muted-text">No mood distribution available.</p>;
  }

  return (
    <div className="stat-list">
      {entries.map(([mood, count]) => (
        <div className="stat-row" key={mood}>
          <span>{mood}</span>
          <strong>{count}</strong>
        </div>
      ))}
    </div>
  );
}

function MemoryMiniList({ items, emptyMessage }) {
  if (!Array.isArray(items) || items.length === 0) {
    return <p className="muted-text">{emptyMessage}</p>;
  }

  return (
    <div className="mini-memory-list">
      {items.map((memory) => (
        <div className="mini-memory-card" key={memory.id}>
          <div className="mini-memory-head">
            <strong>{memory.title}</strong>
            <span>Priority {memory.importance ?? 3}</span>
          </div>
          <p>{memory.content}</p>
          <small>{formatDate(memory.created_at || memory.updated_at)}</small>
        </div>
      ))}
    </div>
  );
}

function renderHighlights(items) {
  if (!Array.isArray(items) || items.length === 0) {
    return <p className="muted-text">Highlights will appear as more memories are added.</p>;
  }

  return (
    <div className="highlight-list">
      {items.map((item, index) => (
        <div className="highlight-chip" key={`${item}-${index}`}>
          {item}
        </div>
      ))}
    </div>
  );
}

function InsightsPanel({ insights, isLoading, error, onRefresh, onExport, isExporting }) {
  return (
    <section className="panel">
      <div className="panel-header">
        <div>
          <p className="eyebrow">AI overview</p>
          <h2>Insights and patterns</h2>
        </div>
        <div className="panel-header-actions">
          <button className="secondary-button" type="button" onClick={onExport} disabled={isExporting}>
            {isExporting ? 'Exporting...' : 'Export JSON'}
          </button>
          <button className="secondary-button" type="button" onClick={onRefresh} disabled={isLoading}>
            {isLoading ? 'Refreshing...' : 'Refresh insights'}
          </button>
        </div>
      </div>

      {error ? <p className="status-message error">{error}</p> : null}
      {isLoading && !insights ? <p className="status-message">Loading insights...</p> : null}

      {insights ? (
        <div className="insights-layout">
          <div className="summary-card">
            <span className="summary-label">Generated summary</span>
            <p>{insights.generated_summary || 'No summary available yet.'}</p>
          </div>

          <div className="stats-grid">
            <div className="stat-card">
              <span>Total memories</span>
              <strong>{insights.total_memories ?? 0}</strong>
            </div>
            <div className="stat-card">
              <span>Average priority</span>
              <strong>{insights.average_importance?.toFixed?.(2) ?? '0.00'}</strong>
            </div>
            <div className="stat-card">
              <span>Last 7 days</span>
              <strong>{insights.memories_last_7_days ?? 0}</strong>
            </div>
            <div className="stat-card">
              <span>Last 30 days</span>
              <strong>{insights.memories_last_30_days ?? 0}</strong>
            </div>
            <div className="stat-card">
              <span>Tracked moods</span>
              <strong>{Object.keys(insights.mood_distribution || {}).length}</strong>
            </div>
            <div className="stat-card">
              <span>Top tags</span>
              <strong>{Array.isArray(insights.top_tags) ? insights.top_tags.length : 0}</strong>
            </div>
          </div>

          <div className="insight-card">
            <h3>Mood highlights</h3>
            {renderHighlights(insights.mood_highlights)}
            {insights.busiest_day ? (
              <p className="muted-text">Most active capture day: {insights.busiest_day}</p>
            ) : null}
          </div>

          <div className="insight-columns">
            <div className="insight-card">
              <h3>Mood distribution</h3>
              {renderMoodDistribution(insights.mood_distribution)}
            </div>

            <div className="insight-card">
              <h3>Top tags</h3>
              {renderTopTags(insights.top_tags)}
            </div>
          </div>

          <div className="insight-columns">
            <div className="insight-card">
              <h3>Important memories</h3>
              <MemoryMiniList
                items={insights.important_memories}
                emptyMessage="No high-priority memories yet."
              />
            </div>

            <div className="insight-card">
              <h3>Recent memories</h3>
              <MemoryMiniList
                items={insights.recent_memories}
                emptyMessage="No recent memories available."
              />
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}

export default InsightsPanel;
