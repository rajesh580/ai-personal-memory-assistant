import { useState } from 'react';

const initialFormState = {
  title: '',
  content: '',
  mood: '',
  tags: '',
  importance: 3,
};

function MemoryForm({ onCreateMemory, isSubmitting }) {
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

      <form className="memory-form" onSubmit={handleSubmit}>
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
