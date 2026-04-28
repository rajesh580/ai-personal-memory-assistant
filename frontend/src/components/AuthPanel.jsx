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
    <div className="auth-wrap">
      <div className="auth-bg"></div>
      <div className="auth-grid"></div>
      <div className="auth-card">
        <div className="auth-logo">
          <div className="auth-logo-icon">
            <svg viewBox="0 0 24 24">
              <path d="M12 2a2 2 0 0 1 2 2c0 .74-.4 1.38-1 1.73V7h1a7 7 0 0 1 7 7h1a1 1 0 0 1 0 2h-1v1a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-1H2a1 1 0 0 1 0-2h1a7 7 0 0 1 7-7h1V5.73c-.6-.35-1-.99-1-1.73a2 2 0 0 1 2-2z"/>
            </svg>
          </div>
          <div className="auth-logo-text">MindVault AI</div>
        </div>
        <div className="auth-title">
          {mode === 'login' ? 'Welcome back' : 'Create account'}
        </div>
        <div className="auth-sub">
          {mode === 'login' ? 'Your intelligent second brain awaits' : 'Start building your memory palace'}
        </div>
        {error && <div className="auth-error" style={{ display: 'block' }}>{error}</div>}
        <div className="field">
          <label>Email</label>
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
        </div>
        <div className="field">
          <label>Password</label>
          <input
            type="password"
            id="auth-password"
            name="password"
            placeholder={mode === 'login' ? '••••••••' : 'Min. 6 characters'}
            value={formData.password}
            onChange={handleChange}
            autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            disabled={isSubmitting}
          />
        </div>
        <button className="btn-primary" onClick={handleSubmit} disabled={isSubmitting}>
          {isSubmitting
            ? mode === 'login'
              ? 'Signing in...'
              : 'Creating account...'
            : mode === 'login'
              ? 'Sign In →'
              : 'Create Account →'}
        </button>
        <div className="auth-switch">
          {mode === 'login'
            ? 'No account? '
            : 'Already have an account? '}
          <a onClick={onSwitchMode} style={{ cursor: 'pointer' }}>
            {mode === 'login' ? 'Create one free' : 'Sign in'}
          </a>
        </div>
      </div>
    </div>
  );
}

export default AuthPanel;
