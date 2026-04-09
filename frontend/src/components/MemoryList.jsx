function formatDate(value) {
  if (!value) {
    return 'Unknown date';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString();
}

function MemoryCard({ memory }) {
  return (
    <article className="memory-card">
      <div className="memory-card-top">
        <div>
          <h3>{memory.title}</h3>
          <p className="memory-date">{formatDate(memory.created_at)}</p>
        </div>
        <span className="importance-badge">Priority {memory.importance ?? 3}</span>
      </div>

      {memory.mood ? <p className="memory-mood">Mood: {memory.mood}</p> : null}

      <p className="memory-content">{memory.content}</p>

      {Array.isArray(memory.tags) && memory.tags.length > 0 ? (
        <div className="tag-list">
          {memory.tags.map((tag) => (
            <span className="tag" key={`${memory.id}-${tag}`}>
              #{tag}
            </span>
          ))}
        </div>
      ) : null}
    </article>
  );
}

function MemoryList({ memories, isLoading, error }) {
  return (
    <section className="panel">
      <div className="panel-header">
        <div>
          <p className="eyebrow">Memory history</p>
          <h2>Saved memories</h2>
        </div>
        <span className="muted-pill">{memories.length} total</span>
      </div>

      {isLoading ? <p className="status-message">Loading memories...</p> : null}
      {error ? <p className="status-message error">{error}</p> : null}

      {!isLoading && !error && memories.length === 0 ? (
        <div className="empty-state">
          <p>No memories yet. Start by adding your first memory.</p>
        </div>
      ) : null}

      <div className="memory-list">
        {memories.map((memory) => (
          <MemoryCard key={memory.id} memory={memory} />
        ))}
      </div>
    </section>
  );
}

export default MemoryList;