import { useEffect, useState } from 'react';

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

function MemoryCard({ memory, onDeleteMemory, onUpdateMemory }) {
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    title: memory.title,
    content: memory.content,
    mood: memory.mood || '',
    tags: Array.isArray(memory.tags) ? memory.tags.join(', ') : '',
    importance: memory.importance ?? 3,
  });

  useEffect(() => {
    setFormData({
      title: memory.title,
      content: memory.content,
      mood: memory.mood || '',
      tags: Array.isArray(memory.tags) ? memory.tags.join(', ') : '',
      importance: memory.importance ?? 3,
    });
  }, [memory]);

  function handleChange(event) {
    const { name, value } = event.target;
    setFormData((current) => ({
      ...current,
      [name]: name === 'importance' ? Number(value) : value,
    }));
  }

  async function handleSave() {
    const payload = {
      title: formData.title,
      content: formData.content,
      mood: formData.mood || undefined,
      tags: formData.tags
        .split(',')
        .map((tag) => tag.trim())
        .filter(Boolean),
      importance: Number(formData.importance),
    };

    await onUpdateMemory(memory.id, payload);
    setIsEditing(false);
  }

  return (
    <article className="memory-card">
      <div className="memory-card-top">
        <div>
          <h3>{memory.title}</h3>
          <p className="memory-date">{formatDate(memory.created_at)}</p>
        </div>
        <div className="memory-card-top-right">
          <span className="importance-badge">Priority {memory.importance ?? 3}</span>
          <div className="memory-card-actions">
            <button
              type="button"
              className="text-button"
              onClick={() => setIsEditing((current) => !current)}
            >
              {isEditing ? 'Cancel' : 'Edit'}
            </button>
            <button
              type="button"
              className="text-button"
              onClick={() => onDeleteMemory?.(memory.id)}
            >
              Delete
            </button>
          </div>
        </div>
      </div>

      {isEditing ? (
        <div className="memory-edit-form">
          <label className="field">
            <span>Title</span>
            <input
              type="text"
              name="title"
              value={formData.title}
              onChange={handleChange}
            />
          </label>
          <label className="field">
            <span>Content</span>
            <textarea
              name="content"
              rows="4"
              value={formData.content}
              onChange={handleChange}
            />
          </label>
          <div className="form-grid">
            <label className="field">
              <span>Mood</span>
              <input
                type="text"
                name="mood"
                value={formData.mood}
                onChange={handleChange}
              />
            </label>
            <label className="field">
              <span>Importance</span>
              <select
                name="importance"
                value={formData.importance}
                onChange={handleChange}
              >
                <option value={1}>1 - Low</option>
                <option value={2}>2</option>
                <option value={3}>3 - Medium</option>
                <option value={4}>4</option>
                <option value={5}>5 - High</option>
              </select>
            </label>
          </div>
          <label className="field">
            <span>Tags</span>
            <input
              type="text"
              name="tags"
              value={formData.tags}
              onChange={handleChange}
            />
          </label>
          <div className="memory-edit-actions">
            <button type="button" className="secondary-button" onClick={() => setIsEditing(false)}>
              Cancel
            </button>
            <button type="button" className="primary-button" onClick={handleSave}>
              Save changes
            </button>
          </div>
        </div>
      ) : (
        <>
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
        </>
      )}
    </article>
  );
}

function MemoryList({ memories, isLoading, error, sortOption, onChangeSort, onDeleteMemory, onUpdateMemory }) {
  return (
    <section className="panel">
      <div className="panel-header">
        <div>
          <p className="eyebrow">Memory history</p>
          <h2>Saved memories</h2>
        </div>
        <div className="panel-header-actions">
          <select value={sortOption} onChange={(event) => onChangeSort(event.target.value)}>
            <option value="date">Newest first</option>
            <option value="title">Title</option>
            <option value="importance">Priority</option>
          </select>
          <span className="muted-pill">{memories.length} total</span>
        </div>
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
          <MemoryCard
            key={memory.id}
            memory={memory}
            onDeleteMemory={onDeleteMemory}
            onUpdateMemory={onUpdateMemory}
          />
        ))}
      </div>
    </section>
  );
}

export default MemoryList;
