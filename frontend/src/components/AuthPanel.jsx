import { useState } from 'react';

const initialFormState = {
  email: '',
  password: '',
};

function AuthPanel({ mode, onSubmit, isSubmitting, onSwitchMode, error }) {
  const [formData, setFormData] = useState(initialFormState);

  function handleChange(event) {
    const { name, value } = event.target;
    setFormData((current) => ({
      ...current,
      [name]: value,
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    await onSubmit({
      email: formData.email.trim().toLowerCase(),
      password: formData.password,
    });
  }

  return (
    <div className="auth-shell">
      <section className="auth-card">
        <p className="eyebrow">Private memory vault</p>
        <h1>{mode === 'login' ? 'Sign in to your space' : 'Create your account'}</h1>
        <p className="subtitle">
          Each account gets its own memories, search results, insights, and export data.
        </p>

        <form className="memory-form" onSubmit={handleSubmit}>
          <label className="field">
            <span>Email</span>
            <input
              type="email"
              id="auth-email"
              name="email"
              placeholder="you@example.com"
              value={formData.email}
              onChange={handleChange}
              autoComplete="email"
              disabled={isSubmitting}
            />
          </label>

          <label className="field">
            <span>Password</span>
            <input
              type="password"
              id="auth-password"
              name="password"
              placeholder="At least 6 characters"
              value={formData.password}
              onChange={handleChange}
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              disabled={isSubmitting}
            />
          </label>

          {error ? <p className="status-message error">{error}</p> : null}

          <button className="primary-button" type="submit" disabled={isSubmitting}>
            {isSubmitting
              ? mode === 'login'
                ? 'Signing in...'
                : 'Creating account...'
              : mode === 'login'
                ? 'Sign in'
                : 'Create account'}
          </button>
        </form>

        <button className="text-link-button" type="button" onClick={onSwitchMode} disabled={isSubmitting}>
          {mode === 'login'
            ? 'Need an account? Register here'
            : 'Already have an account? Sign in'}
        </button>
      </section>
    </div>
  );
}

export default AuthPanel;
