import { useState } from 'react';
import ChatAgent from './ChatAgent';

const initialFormState = {
  title: '',
  content: '',
  mood: '',
  tags: '',
  importance: 3,
};

function MemoryForm({ onCreateMemory, isSubmitting, user, isInlineChatOpen, setIsInlineChatOpen, onMemoryChange }) {
  const [formData, setFormData] = useState(initialFormState);
  const [error, setError] = useState('');

  function handleChange(event) {
    const { name, value } = event.target;
    setFormData((current) => ({
      ...current,
      [name]: name === 'importance' ? Number(value) : value,
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');

    if (!formData.title.trim() || !formData.content.trim()) {
      setError('Title and content are required.');
      return;
    }

    const payload = {
      title: formData.title.trim(),
      content: formData.content.trim(),
      mood: formData.mood.trim() || undefined,
      tags: formData.tags
        .split(',')
        .map((tag) => tag.trim())
        .filter(Boolean),
      importance: Number(formData.importance),
    };

    try {
      await onCreateMemory(payload);
      setFormData(initialFormState);
    } catch (submissionError) {
      setError(submissionError.message || 'Unable to save memory.');
    }
  }

  return (
    <section className="panel">
      <div className="panel-header">
        <div>
          <p className="eyebrow">Capture a moment</p>
          <h2>Create a new memory</h2>
        </div>
      </div>

      <div style={{ padding: '1.25rem', borderBottom: '1px solid var(--border)', background: 'var(--bg-inset)', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        <div>
          <h3 style={{ margin: '0 0 0.25rem 0', fontSize: '1.05rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>✨ AI Assistant</h3>
          <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-muted)' }}>Converse with your AI to naturally log a new memory.</p>
        </div>
        <button
          type="button"
          className={isInlineChatOpen ? "secondary-button" : "primary-button"}
          style={{ width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem', padding: '0.75rem', fontWeight: 'bold' }}
          onClick={() => setIsInlineChatOpen((prev) => !prev)}
        >
          {isInlineChatOpen ? '❌ Close Assistant' : '💬 Open Assistant'}
        </button>
        {isInlineChatOpen && (
          <div style={{ marginTop: '0.5rem', marginBottom: '-1.5rem' }}>
            <ChatAgent
              user={user}
              isOpen={isInlineChatOpen}
              setIsOpen={setIsInlineChatOpen}
              inline={true}
              mode="add_memory"
              onMemoryChange={onMemoryChange}
            />
          </div>
        )}
      </div>

      <form className="memory-form" onSubmit={handleSubmit}>
        <div style={{ marginBottom: '1rem' }}>
          <p className="eyebrow">Or log manually</p>
        </div>
        <label className="field">
          <span>Title</span>
          <input
            type="text"
            id="memory-title"
            name="title"
            placeholder="A short title for this memory"
            value={formData.title}
            onChange={handleChange}
            autoComplete="off"
            disabled={isSubmitting}
          />
        </label>

        <label className="field">
          <span>Content</span>
          <textarea
            id="memory-content"
            name="content"
            rows="5"
            placeholder="Describe the event, thought, or experience..."
            value={formData.content}
            onChange={handleChange}
            autoComplete="off"
            disabled={isSubmitting}
          />
        </label>

        <div className="form-grid">
          <label className="field">
            <span>Mood</span>
            <input
              type="text"
              id="memory-mood"
              name="mood"
              placeholder="happy, reflective, focused..."
              value={formData.mood}
              onChange={handleChange}
              autoComplete="off"
              disabled={isSubmitting}
            />
          </label>

          <label className="field">
            <span>Importance</span>
            <select
              name="importance"
              value={formData.importance}
              onChange={handleChange}
              disabled={isSubmitting}
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
            id="memory-tags"
            name="tags"
            placeholder="work, family, health, goals"
            value={formData.tags}
            onChange={handleChange}
            autoComplete="off"
            disabled={isSubmitting}
          />
          <small>Separate tags with commas.</small>
        </label>

        {error ? <p className="status-message error">{error}</p> : null}

        <button className="primary-button" type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Saving memory...' : 'Save memory'}
        </button>
      </form>
    </section>
  );
}

export default MemoryForm;
