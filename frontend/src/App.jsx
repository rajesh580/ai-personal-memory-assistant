import { useEffect, useRef, useState } from 'react';
import AuthPanel from './components/AuthPanel';
import InsightsPanel from './components/InsightsPanel';
import MemoryForm from './components/MemoryForm';
import MemoryList from './components/MemoryList';
import SearchPanel from './components/SearchPanel';
import ChatAgent from './components/ChatAgent';
import {
  buildApiUrl,
  createMemory,
  deleteMemory,
  exportMemories,
  fetchCurrentUser,
  fetchInsights,
  fetchMemories,
  getStoredToken,
  loginUser,
  logoutUser,
  registerUser,
  searchMemories,
  setAuthToken,
  updateMemory,
} from './services/api';

function safeText(value, fallback = '') {
  if (typeof value === 'string') {
    return value;
  }
  if (value === null || value === undefined) {
    return fallback;
  }
  return String(value);
}

function normalizeCaptureAssets(capture) {
  if (!capture) {
    return capture;
  }

  const audioUrl = capture.audioUrl || capture.audio_url;
  const imageUrl = capture.imageUrl || capture.image_url;

  return {
    ...capture,
    audioUrl: audioUrl ? buildApiUrl(audioUrl) : null,
    audio_url: audioUrl ? buildApiUrl(audioUrl) : null,
    imageUrl: imageUrl ? buildApiUrl(imageUrl) : null,
    image_url: imageUrl ? buildApiUrl(imageUrl) : null,
  };
}

function getAudioMimeType(audioUrl) {
  const normalizedUrl = (audioUrl || '').toLowerCase();
  if (normalizedUrl.includes('.mp3')) return 'audio/mpeg';
  if (normalizedUrl.includes('.m4a') || normalizedUrl.includes('.mp4')) return 'audio/mp4';
  if (normalizedUrl.includes('.wav')) return 'audio/wav';
  if (normalizedUrl.includes('.ogg')) return 'audio/ogg';
  return 'audio/webm';
}

function normalizeNote(note) {
  if (!note) {
    return note;
  }

  return {
    ...note,
    title: safeText(note.title),
    content: safeText(note.content),
    createdAt: note.createdAt || note.created_at,
    updatedAt: note.updatedAt || note.updated_at || note.created_at,
  };
}

function normalizeHabit(habit) {
  if (!habit) {
    return habit;
  }

  return {
    ...habit,
    days: Array.isArray(habit.days) ? habit.days.map(Boolean) : Array(7).fill(false),
  };
}

function normalizeSavedDate(item) {
  if (!item) {
    return item;
  }

  return {
    ...item,
    title: safeText(item.title),
    date: safeText(item.date),
    note: safeText(item.note),
  };
}

function AppContent({
  user,
  theme,
  setTheme,
  memories,
  insights,
  searchResults,
  sortOption,
  setSortOption,
  isLoadingMemories,
  isLoadingInsights,
  isSearching,
  isSubmitting,
  isExporting,
  memoriesError,
  searchError,
  insightsError,
  onCreateMemory,
  onSearch,
  onClearSearch,
  onDeleteMemory,
  onUpdateMemory,
  onRefreshInsights,
  onExportMemories,
  onLogout,
  currentPage,
  setCurrentPage,
  isInlineChatOpen,
  setIsInlineChatOpen,
  isNavChatOpen,
  setIsNavChatOpen,
  // To-Do List Props
  todos,
  newTodoText,
  setNewTodoText,
  newTodoImportance,
  setNewTodoImportance,
  handleAddTodo,
  handleToggleTodo,
  handleDeleteTodo,
  // Notes Props
  notes,
  newNoteTitle, setNewNoteTitle, newNoteContent, setNewNoteContent, editingNoteId, handleSaveNote, handleEditNote, handleCancelEditNote, handleDeleteNote,
  // Meetings Props
  meetings,
  newMeetingTitle, setNewMeetingTitle,
  newMeetingDate, setNewMeetingDate,
  newMeetingTime, setNewMeetingTime,
  newMeetingWith, setNewMeetingWith,
  newMeetingLocation, setNewMeetingLocation,
  newMeetingType, setNewMeetingType,
  handleAddMeeting, handleDeleteMeeting,
  // Deadlines Props
  deadlines,
  newDeadlineTitle, setNewDeadlineTitle,
  newDeadlineDate, setNewDeadlineDate,
  newDeadlinePriority, setNewDeadlinePriority,
  handleAddDeadline, handleDeleteDeadline,
  // Habits Props
  habits,
  newHabitName, setNewHabitName,
  handleAddHabit, handleToggleHabitDay, handleDeleteHabit,
  // Saved Dates Props
  savedDates,
  newSavedDateTitle, setNewSavedDateTitle,
  newSavedDateValue, setNewSavedDateValue,
  newSavedDateNote, setNewSavedDateNote,
  handleAddSavedDate, handleDeleteSavedDate,
  // Captures Props
  captures,
  newCaptureType, setNewCaptureType,
  newCaptureContent, setNewCaptureContent,
  isRecordingCapture, setIsRecordingCapture,
  capturedImage, setCapturedImage,
  isCapturingImage, setIsCapturingImage,
  cameraStream, isCameraPreview,
  recordingDuration,
  startVoiceRecording, stopVoiceRecording, startCameraPreview, captureFromStream, stopCameraPreview,
  handleAddCapture, handleDeleteCapture,
}) {
  const sortedMemories = [...memories].sort((a, b) => {
    if (sortOption === 'importance') {
      return (b.importance ?? 0) - (a.importance ?? 0);
    }
    if (sortOption === 'title') {
      return (a.title || '').localeCompare(b.title || '');
    }
    return new Date(b.created_at) - new Date(a.created_at);
  });

  const quickStats = {
    total: memories.length,
    highPriority: memories.filter((memory) => (memory.importance ?? 0) >= 4).length,
    tagged: memories.filter((memory) => Array.isArray(memory.tags) && memory.tags.length > 0).length,
    moodsTracked: new Set(
      memories.map((memory) => memory.mood?.trim()).filter(Boolean)
    ).size,
  };

  const today = new Date();
  const todayKey = today.toISOString().slice(0, 10);
  const weekStart = new Date(today);
  weekStart.setDate(today.getDate() - 7);
  const monthStart = new Date(today);
  monthStart.setDate(today.getDate() - 30);
  const weekEnd = new Date(today);
  weekEnd.setDate(today.getDate() + 7);

  const completedTodosThisWeek = todos.filter((todo) => {
    if (!todo.completed) {
      return false;
    }
    const createdAt = new Date(todo.created_at || todo.createdAt || todo.id);
    return !Number.isNaN(createdAt.getTime()) && createdAt >= weekStart;
  }).length;

  const maxHabitStreak = habits.reduce(
    (max, habit) => Math.max(max, habit.streak || 0),
    0
  );

  const completedHabitsToday = habits.filter(
    (habit) => Array.isArray(habit.days) && habit.days[today.getDay()]
  ).length;

  const goalsAchievedThisMonth = deadlines.filter((deadline) => {
    if (!deadline.date) {
      return false;
    }
    const dueDate = new Date(`${deadline.date}T00:00:00`);
    return !Number.isNaN(dueDate.getTime()) && dueDate >= monthStart;
  }).length;

  const productivityScore = Math.min(
    100,
    completedTodosThisWeek * 12 + completedHabitsToday * 8 + quickStats.highPriority * 5
  );

  const meetingsToday = meetings.filter((meeting) => meeting.date === todayKey).length;

  const deadlinesThisWeek = deadlines.filter((deadline) => {
    if (!deadline.date) {
      return false;
    }
    const dueDate = new Date(`${deadline.date}T00:00:00`);
    return !Number.isNaN(dueDate.getTime()) && dueDate >= today && dueDate <= weekEnd;
  }).length;

  const allActivities = [
    ...(memories || []).map((m) => ({ id: `mem-${m.id}`, type: 'Memory', cssType: 'chat', title: m.title, date: new Date(m.created_at).getTime(), content: safeText(m.content) })),
    ...(notes || []).map((n) => ({ id: `note-${n.id}`, type: 'Note', cssType: 'note', title: n.title || 'Untitled Note', date: new Date(n.updatedAt || n.createdAt).getTime(), content: safeText(n.content) })),
    ...(todos || []).map((t) => ({ id: `todo-${t.id}`, type: 'Task', cssType: 'task', title: t.text, date: t.id, content: `Priority: ${t.importance}` })),
    ...(meetings || []).map((m) => ({ id: `meet-${m.id}`, type: 'Meeting', cssType: 'meeting', title: m.title, date: new Date(`${m.date}T${m.time || '00:00'}`).getTime() || m.id, content: `With: ${m.withPerson} | Loc: ${m.location} | Type: ${m.type}` })),
    ...(deadlines || []).map((d) => ({ id: `dead-${d.id}`, type: 'Deadline', cssType: 'task', title: d.title, date: d.date ? new Date(`${d.date}T00:00`).getTime() : d.id, content: `Priority: ${d.priority}` })),
    ...(savedDates || []).map((d) => ({ id: `saved-${d.id}`, type: 'Saved Date', cssType: 'meeting', title: d.title, date: d.date ? new Date(`${d.date}T00:00`).getTime() : d.id, content: d.note || `Remember on ${d.date}` })),
    ...(captures || []).map((c) => ({
      id: `cap-${c.id}`,
      type: `Capture (${c.type})`,
      cssType: ['voice', 'task', 'chat', 'meeting'].includes(c.type) ? c.type : (c.type === 'photo' ? 'meeting' : 'note'),
      title: c.type === 'voice' ? 'Voice Memo' : c.type === 'photo' ? 'Photo Upload' : c.type === 'task' ? 'Quick Task' : c.type === 'meeting' ? 'Quick Meeting' : c.type === 'chat' ? 'Chat Log' : 'Quick Note',
      date: new Date(c.date).getTime(),
      content: safeText(c.content),
      audioUrl: normalizeCaptureAssets(c).audioUrl,
      imageUrl: normalizeCaptureAssets(c).imageUrl
    }))
  ].sort((a, b) => b.date - a.date).slice(0, 10);

  return (
    <>
      <div className="dashboard">
      <div className="sidebar">
        <div className="sidebar-logo">
          <div className="sidebar-logo-icon">
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2a2 2 0 0 1 2 2c0 .74-.4 1.38-1 1.73V7h1a7 7 0 0 1 7 7h1a1 1 0 0 1 0 2h-1v1a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-1H2a1 1 0 0 1 0-2h1a7 7 0 0 1 7-7h1V5.73c-.6-.35-1-.99-1-1.73a2 2 0 0 1 2-2z"/>
            </svg>
          </div>
          <div className="sidebar-logo-text">MindVault</div>
        </div>
        <div className="nav-section">Main</div>
        <div className={`nav-item ${currentPage === 'dashboard' ? 'active' : ''}`} onClick={() => setCurrentPage('dashboard')}>
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z"/>
          </svg>
          Overview
        </div>
        <div className={`nav-item ${currentPage === 'ai-chat' ? 'active' : ''}`} onClick={() => setCurrentPage('ai-chat')}>
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M20 2H4c-1.1 0-1.99.9-1.99 2L2 22l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/>
          </svg>
          AI Chat
        </div>
        <div className={`nav-item ${currentPage === 'track' ? 'active' : ''}`} onClick={() => setCurrentPage('track')}>
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
          </svg>
          Track
        </div>

        <div className="nav-section">Schedule</div>
        <div className={`nav-item ${currentPage === 'meetings' ? 'active' : ''}`} onClick={() => setCurrentPage('meetings')}>
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M17 12h-5v5h5v-5zM16 1v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2h-1V1h-2zm3 18H5V8h14v11z"/>
          </svg>
          Meetings
          <div className="nav-badge">{meetingsToday}</div>
        </div>
        <div className={`nav-item ${currentPage === 'deadlines' ? 'active' : ''}`} onClick={() => setCurrentPage('deadlines')}>
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67V7z"/>
          </svg>
          Deadlines
          <div className="nav-badge">{deadlinesThisWeek}</div>
        </div>

        <div className="nav-section">Habits</div>
        <div className={`nav-item ${currentPage === 'habits' ? 'active' : ''}`} onClick={() => setCurrentPage('habits')}>
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
          </svg>
          Habits
        </div>

        <div className="nav-section">Capture</div>
        <div className={`nav-item ${currentPage === 'capture' ? 'active' : ''}`} onClick={() => setCurrentPage('capture')}>
          <svg viewBox="0 0 24 24" fill="currentColor">
            <circle cx="12" cy="12" r="3.2"/>
            <path d="M9 2L7.17 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2h-3.17L15 2H9zm3 15c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5z"/>
          </svg>
          Capture
        </div>
        <div className={`nav-item ${currentPage === 'notes' ? 'active' : ''}`} onClick={() => setCurrentPage('notes')}>
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M9 11H7v2h2v-2zm4 0h-2v2h2v-2zm4 0h-2v2h2v-2zm2-7h-1V2h-2v2H8V2H6v2H5c-1.1 0-1.99.9-1.99 2L3 20c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V9h14v11z"/>
          </svg>
          Notes
        </div>
        <div className={`nav-item ${currentPage === 'memories' ? 'active' : ''}`} onClick={() => setCurrentPage('memories')}>
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M21 3H3c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h5v2h8v-2h5c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 14H3V5h18v12z"/>
          </svg>
          Memories
        </div>

        <div className="nav-section">Life</div>
        <div className={`nav-item ${currentPage === 'digital-life' ? 'active' : ''}`} onClick={() => setCurrentPage('digital-life')}>
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
          </svg>
          Digital Life
        </div>
        <div className={`nav-item ${currentPage === 'saved-dates' ? 'active' : ''}`} onClick={() => setCurrentPage('saved-dates')}>
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M19 4h-1V2h-2v2H8V2H6v2H5c-1.11 0-1.99.9-1.99 2L3 20c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V10h14v10zm0-12H5V6h14v2zm-7 5h5v5h-5z"/>
          </svg>
          Saved Dates
        </div>
        <div className={`nav-item ${currentPage === 'todo-list' ? 'active' : ''}`} onClick={() => setCurrentPage('todo-list')}>
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6zm4 18H6V4h7v5h5v11z"/>
            <path d="M9 13l2 2 4-4"/>
          </svg>
          To-Do List
        </div>
        <div className={`nav-item ${currentPage === 'settings' ? 'active' : ''}`} onClick={() => setCurrentPage('settings')}>
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M19.14,12.94c0.04-0.3,0.06-0.61,0.06-0.94c0-0.32-0.02-0.64-0.07-0.94l2.03-1.58c0.18-0.14,0.23-0.41,0.12-0.61 l-1.92-3.32c-0.12-0.22-0.37-0.29-0.59-0.22l-2.39,0.96c-0.5-0.38-1.03-0.7-1.62-0.94L14.4,2.81c-0.04-0.24-0.24-0.41-0.48-0.41 h-3.84c-0.24,0-0.43,0.17-0.47,0.41L9.25,5.35C8.66,5.59,8.12,5.92,7.63,6.29L5.24,5.33c-0.22-0.08-0.47,0-0.59,0.22L2.74,8.87 C2.62,9.08,2.66,9.34,2.86,9.48l2.03,1.58C4.84,11.36,4.82,11.69,4.82,12s0.02,0.64,0.07,0.94l-2.03,1.58 c-0.18,0.14-0.23,0.41-0.12,0.61l1.92,3.32c0.12,0.22,0.37,0.29,0.59,0.22l2.39-0.96c0.5,0.38,1.03,0.7,1.62,0.94l0.36,2.54 c0.05,0.24,0.24,0.41,0.48,0.41h3.84c0.24,0,0.43-0.17,0.47-0.41l0.36-2.54c0.59-0.24,1.13-0.56,1.62-0.94l2.39,0.96 c0.22,0.08,0.47,0,0.59-0.22l1.92-3.32c0.12-0.22,0.07-0.47-0.12-0.61L19.14,12.94z M12,15.6c-1.98,0-3.6-1.62-3.6-3.6 s1.62-3.6,3.6-3.6s3.6,1.62,3.6,3.6S13.98,15.6,12,15.6z"/>
          </svg>
          Settings
        </div>
        <div className="sidebar-bottom">
          <div className="user-card" onClick={onLogout}>
            <div className="user-avatar">{user ? user.email.charAt(0).toUpperCase() : 'U'}</div>
            <div>
              <div className="user-name">{user ? user.email.split('@')[0] : 'User'}</div>
              <div className="user-role">Sign out</div>
            </div>
          </div>
        </div>
      </div>

      <div className="main">
        {currentPage === 'dashboard' && (
          <div className="page active">
            <div className="topbar">
              <div>
                <div className="topbar-title">Good morning 👋</div>
                <div className="topbar-sub">Welcome back, {user ? user.email.split('@')[0] : 'User'}</div>
              </div>
              <div className="topbar-actions">
                <button className="btn-sm teal" onClick={() => setIsNavChatOpen(true)}>✦ Ask AI</button>
                <button className="btn-sm accent" onClick={() => {
                  setCurrentPage('memories');
                  setIsInlineChatOpen(true);
                }}>🎤 Voice Note</button>
                <button className="btn-sm" onClick={() => setCurrentPage('memories')}>+ Memory</button>
              </div>
            </div>

            {/* Inspiration Quote */}
            <div className="quote-card">
              <div className="quote-text">"The best way to predict the future is to create it."</div>
              <div className="quote-author">— Peter Drucker</div>
            </div>

            <div className="stats-grid">
              <div className="stat-card">
                <div className="stat-icon" style={{ background: 'rgba(108,99,255,0.12)' }}>
                  <svg viewBox="0 0 24 24" fill="var(--accent2)" width="18">
                    <path d="M21 3H3c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h5v2h8v-2h5c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2z"/>
                  </svg>
                </div>
                <div className="stat-val">{quickStats.total}</div>
                <div className="stat-label">Memories</div>
                <div className="stat-delta" style={{ color: 'var(--teal)' }}>↑ stored safely</div>
              </div>
              <div className="stat-card">
                <div className="stat-icon" style={{ background: 'rgba(0,217,184,0.1)' }}>
                  <svg viewBox="0 0 24 24" fill="var(--teal)" width="18">
                    <path d="M17 12h-5v5h5v-5zM16 1v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2h-1V1h-2zm3 18H5V8h14v11z"/>
                  </svg>
                </div>
                <div className="stat-val">{meetingsToday}</div>
                <div className="stat-label">Meetings Today</div>
                <div className="stat-delta" style={{ color: 'var(--text2)' }}>—</div>
              </div>
              <div className="stat-card">
                <div className="stat-icon" style={{ background: 'rgba(255,209,102,0.1)' }}>
                  <svg viewBox="0 0 24 24" fill="var(--gold)" width="18">
                    <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 10.99h7c-.53 4.12-3.28 7.79-7 8.94V12H5V6.3l7-3.11v8.8z"/>
                  </svg>
                </div>
                <div className="stat-val">{completedHabitsToday}</div>
                <div className="stat-label">Habits Today</div>
                <div className="stat-delta" style={{ color: 'var(--gold)' }}>completed</div>
              </div>
              <div className="stat-card">
                <div className="stat-icon" style={{ background: 'rgba(255,107,107,0.1)' }}>
                  <svg viewBox="0 0 24 24" fill="var(--danger)" width="18">
                    <path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67V7z"/>
                  </svg>
                </div>
                <div className="stat-val">{deadlinesThisWeek}</div>
                <div className="stat-label">Deadlines Due</div>
                <div className="stat-delta" style={{ color: 'var(--danger)' }}>this week</div>
              </div>
            </div>

            <div className="grid-2">
              <div className="panel">
                <div className="panel-header">
                  <div className="panel-title">📝 Recent Memories</div>
                  <div className="panel-action" onClick={() => setCurrentPage('memories')}>View all →</div>
                </div>
                <MemoryList
                  memories={sortedMemories.slice(0, 5)}
                  isLoading={isLoadingMemories}
                  error={memoriesError}
                  sortOption={sortOption}
                  onChangeSort={setSortOption}
                  onDeleteMemory={onDeleteMemory}
                  onUpdateMemory={onUpdateMemory}
                />
              </div>
              <div className="panel">
                <div className="panel-header">
                  <div className="panel-title">💡 Insights</div>
                  <div className="panel-action" onClick={onRefreshInsights}>Refresh →</div>
                </div>
                <InsightsPanel
                  insights={insights}
                  isLoading={isLoadingInsights}
                  error={insightsError}
                  onRefresh={onRefreshInsights}
                  onExport={onExportMemories}
                  isExporting={isExporting}
                />
              </div>
            </div>
            
            <div className="panel" style={{ marginTop: '1.2rem' }}>
              <div className="panel-title" style={{ marginBottom: '1rem' }}>Activity Timeline</div>
              {allActivities.length === 0 ? (
                <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text3)' }}>
                  No recent activity found. Start adding memories, notes, or tasks!
                </div>
              ) : (
                <div className="activity-timeline">
                  {allActivities.map((activity) => (
                    <div className="life-entry" key={activity.id}>
                      <div className="life-entry-header">
                        <span className={`life-entry-type life-type-${activity.cssType}`}>{activity.type}</span>
                        <span className="life-entry-time">{new Date(activity.date).toLocaleString()}</span>
                      </div>
                      <div style={{ fontWeight: '600', fontSize: '0.9rem', marginBottom: '4px' }}>
                        {activity.title}
                      </div>
                      <div className="life-entry-content">{safeText(activity.content).substring(0, 120)}{safeText(activity.content).length > 120 ? '...' : ''}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {currentPage === 'memories' && (
          <div className="page active">
            <div className="topbar">
              <div>
                <div className="topbar-title">Memory Vault</div>
                <div className="topbar-sub">Search and browse your memories</div>
              </div>
            </div>
            <div className="grid-2">
              <div className="panel">
                <div className="panel-header">
                  <div className="panel-title">Add Memory</div>
                </div>
                <MemoryForm 
                  onCreateMemory={onCreateMemory} 
                  isSubmitting={isSubmitting} 
                  user={user}
                  isInlineChatOpen={isInlineChatOpen}
                  setIsInlineChatOpen={setIsInlineChatOpen}
                />
              </div>
              <div className="panel">
                <div className="panel-header">
                  <div className="panel-title">Search</div>
                </div>
                <SearchPanel
                  onSearch={onSearch}
                  onClear={onClearSearch}
                  results={searchResults}
                  isSearching={isSearching}
                  error={searchError}
                />
              </div>
            </div>
            <div className="panel">
              <div className="panel-header">
                <div className="panel-title">All Memories</div>
              </div>
              <MemoryList
                memories={sortedMemories}
                isLoading={isLoadingMemories}
                error={memoriesError}
                sortOption={sortOption}
                onChangeSort={setSortOption}
                onDeleteMemory={onDeleteMemory}
                onUpdateMemory={onUpdateMemory}
              />
            </div>
          </div>
        )}

        {currentPage === 'settings' && (
          <div className="page active">
            <div className="topbar">
              <div>
                <div className="topbar-title">Settings</div>
                <div className="topbar-sub">Manage your account and preferences</div>
              </div>
            </div>
            <div className="grid-2">
              <div className="panel">
                <div className="panel-header">
                  <div className="panel-title">Profile</div>
                </div>
                <div style={{ padding: '1rem' }}>
                  <div>
                    <p style={{ color: 'var(--text2)', marginBottom: '0.5rem' }}>Email Address</p>
                    <p style={{ fontWeight: '600' }}>{user ? user.email : ''}</p>
                  </div>
                </div>
              </div>
              <div className="panel">
                <div className="panel-header">
                  <div className="panel-title">Preferences</div>
                </div>
                <div style={{ padding: '1rem' }}>
                  <div style={{ marginBottom: '1rem' }}>
                    <p style={{ marginBottom: '0.5rem' }}>Theme</p>
                    <button
                      className="btn-sm"
                      onClick={() => setTheme((current) => (current === 'light' ? 'dark' : 'light'))}
                    >
                      Switch to {theme === 'light' ? 'Dark' : 'Light'} Mode
                    </button>
                  </div>
                  <div style={{ borderTop: '1px solid var(--border)', paddingTop: '1rem' }}>
                    <button className="btn-sm danger" onClick={onLogout}>
                      Log Out
                    </button>
                  </div>
                </div>
              </div>
            </div>
            <div className="panel">
              <div className="panel-header">
                <div className="panel-title">Data Export</div>
              </div>
              <div style={{ padding: '1rem' }}>
                <p style={{ marginBottom: '1rem' }}>Download a complete JSON backup of your memories.</p>
                <button className="btn-sm accent" onClick={onExportMemories} disabled={isExporting}>
                  {isExporting ? 'Exporting...' : 'Export All Data'}
                </button>
              </div>
            </div>
          </div>
        )}

        {currentPage === 'meetings' && (
          <div className="page active">
            <div className="topbar">
              <div>
                <div className="topbar-title">📅 Meetings</div>
                <div className="topbar-sub">Track your scheduled meetings</div>
              </div>
            </div>
            <div className="panel" style={{ marginBottom: '1.2rem' }}>
              <div className="panel-title" style={{ marginBottom: '1rem' }}>Add Meeting</div>
              <div className="input-row">
                <input className="inp" placeholder="Meeting title…" value={newMeetingTitle} onChange={(e) => setNewMeetingTitle(e.target.value)} />
                <input className="inp" type="date" style={{ maxWidth: '160px' }} value={newMeetingDate} onChange={(e) => setNewMeetingDate(e.target.value)} />
                <input className="inp" type="time" style={{ maxWidth: '130px' }} value={newMeetingTime} onChange={(e) => setNewMeetingTime(e.target.value)} />
              </div>
              <div className="input-row">
                <input className="inp" placeholder="With (person/team)…" value={newMeetingWith} onChange={(e) => setNewMeetingWith(e.target.value)} />
                <input className="inp" placeholder="Location / link…" value={newMeetingLocation} onChange={(e) => setNewMeetingLocation(e.target.value)} />
                <select className="inp" style={{ maxWidth: '140px' }} value={newMeetingType} onChange={(e) => setNewMeetingType(e.target.value)}>
                  <option value="meeting">Meeting</option>
                  <option value="call">Call</option>
                  <option value="standup">Standup</option>
                  <option value="review">Review</option>
                </select>
                <button className="inp-btn" onClick={handleAddMeeting}>+ Add</button>
              </div>
            </div>
            <div className="panel">
              <div className="panel-title" style={{ marginBottom: '1rem' }}>Upcoming Meetings</div>
              <div id="meetingsList">
                {meetings.length === 0 ? (
                  <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text3)' }}>
                    No meetings scheduled. Add one above!
                  </div>
                ) : (
                  <div className="track-list">
                    {meetings.map((meeting) => (
                      <div className="track-item" key={meeting.id}>
                        <div className="track-dot" style={{ background: 'var(--teal)' }}></div>
                        <div className="track-body">
                          <div className="track-title">{meeting.title} <span className="track-badge badge-ok">{meeting.type}</span></div>
                          <div className="track-meta">
                            {meeting.date} {meeting.time} • With: {meeting.withPerson} • {meeting.location}
                          </div>
                        </div>
                        <button className="track-del" onClick={() => handleDeleteMeeting(meeting.id)}>✕</button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {currentPage === 'deadlines' && (
          <div className="page active">
            <div className="topbar">
              <div>
                <div className="topbar-title">⏰ Deadlines</div>
                <div className="topbar-sub">Never miss a deadline</div>
              </div>
            </div>
            <div className="panel" style={{ marginBottom: '1.2rem' }}>
              <div className="panel-title" style={{ marginBottom: '1rem' }}>Add Deadline</div>
              <div className="input-row">
                <input className="inp" placeholder="Deadline title…" value={newDeadlineTitle} onChange={(e) => setNewDeadlineTitle(e.target.value)} />
                <input className="inp" type="date" style={{ maxWidth: '160px' }} value={newDeadlineDate} onChange={(e) => setNewDeadlineDate(e.target.value)} />
                <select className="inp" style={{ maxWidth: '130px' }} value={newDeadlinePriority} onChange={(e) => setNewDeadlinePriority(e.target.value)}>
                  <option value="critical">Critical</option>
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>
                <button className="inp-btn" onClick={handleAddDeadline}>+ Add</button>
              </div>
            </div>
            <div className="panel">
              <div className="panel-title" style={{ marginBottom: '1rem' }}>Upcoming Deadlines</div>
              <div id="deadlinesList">
                {deadlines.length === 0 ? (
                  <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text3)' }}>
                    No deadlines scheduled. Add one above!
                  </div>
                ) : (
                  <div className="track-list">
                    {deadlines.map((deadline) => (
                      <div className="track-item" key={deadline.id}>
                        <div className="track-dot" style={{ background: deadline.priority === 'critical' ? 'var(--danger)' : deadline.priority === 'high' ? 'var(--warn)' : deadline.priority === 'medium' ? 'var(--teal)' : 'var(--text3)' }}></div>
                        <div className="track-body">
                          <div className="track-title">{deadline.title} <span className={`track-badge ${deadline.priority === 'critical' ? 'badge-urgent' : deadline.priority === 'high' ? 'badge-soon' : deadline.priority === 'medium' ? 'badge-ok' : 'badge-done'}`}>{deadline.priority}</span></div>
                          <div className="track-meta">Due: {deadline.date || 'No date set'}</div>
                        </div>
                        <button className="track-del" onClick={() => handleDeleteDeadline(deadline.id)}>✕</button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {currentPage === 'habits' && (
          <div className="page active">
            <div className="topbar">
              <div>
                <div className="topbar-title">✅ Habits</div>
                <div className="topbar-sub">Build and track your daily habits</div>
              </div>
            </div>
            <div className="panel" style={{ marginBottom: '1.2rem' }}>
              <div className="panel-title" style={{ marginBottom: '1rem' }}>Add Habit</div>
              <div className="input-row">
                <input
                  className="inp"
                  placeholder="Habit name…"
                  value={newHabitName}
                  onChange={(e) => setNewHabitName(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') handleAddHabit();
                  }}
                />
                <button className="inp-btn" onClick={handleAddHabit}>+ Add</button>
              </div>
            </div>
            <div className="panel">
              <div className="panel-title" style={{ marginBottom: '1rem' }}>Your Habits</div>
              <div id="habitsList">
                {habits.length === 0 ? (
                  <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text3)' }}>
                    No habits tracked yet. Add one above!
                  </div>
                ) : (
                  <div className="habit-list">
                    {habits.map((habit) => (
                      <div className="habit-card" key={habit.id}>
                        <div className="habit-header">
                          <div className="habit-name">{habit.name}</div>
                          <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
                            <div className="habit-streak">🔥 {habit.streak} Day Streak</div>
                            <button className="text-button" onClick={() => handleDeleteHabit(habit.id)} style={{ color: 'var(--text3)' }}>✕</button>
                          </div>
                        </div>
                        <div className="habit-dots">
                          {habit.days.map((isDone, index) => (
                            <div
                              key={index}
                              className={`habit-dot ${isDone ? 'done' : ''}`}
                              onClick={() => handleToggleHabitDay(habit.id, index)}
                              title={`Day ${index + 1}`}
                            ></div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {currentPage === 'notes' && (
          <div className="page active">
            <div className="topbar">
              <div>
                <div className="topbar-title">📝 Notes</div>
                <div className="topbar-sub">Quick notes and thoughts</div>
              </div>
              <div className="topbar-actions">
                <button className="btn-sm accent" onClick={() => setCurrentPage('notes')}>+ New Note</button>
              </div>
            </div>
            <div className="grid-2">
              <div className="panel">
                <div className="panel-title" style={{ marginBottom: '1rem' }}>Recent Notes</div>
                {notes.length === 0 ? (
                  <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text3)' }}>
                    No notes yet. Start writing one!
                  </div>
                ) : (
                  <div className="note-list">
                    {notes.map((note) => (
                      <div className="note-item" key={note.id}>
                        <div className="note-item-header">
                          <strong>{note.title || 'Untitled Note'}</strong>
                          <div className="note-actions">
                            <button className="text-button" onClick={() => handleEditNote(note)}>Edit</button>
                            <button className="text-button" onClick={() => handleDeleteNote(note.id)}>Delete</button>
                          </div>
                        </div>
                        <p className="note-item-content">{safeText(note.content).substring(0, 100)}{safeText(note.content).length > 100 ? '...' : ''}</p>
                        <small className="note-item-date">
                          {new Date(note.updatedAt).toLocaleString()}
                        </small>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="panel">
                <div className="panel-title" style={{ marginBottom: '1rem' }}>Note Editor</div>
                <div className="note-editor">
                  <input
                    className="note-editor-title"
                    placeholder="Note title..."
                    value={newNoteTitle}
                    onChange={(e) => setNewNoteTitle(e.target.value)}
                  />
                  <textarea
                    className="note-editor-body"
                    placeholder="Write your note here..."
                    value={newNoteContent}
                    onChange={(e) => setNewNoteContent(e.target.value)}
                  ></textarea>
                </div>
                <div style={{ display: 'flex', gap: '8px', marginTop: '1rem' }}>
                  <button className="btn-sm accent" onClick={handleSaveNote}>
                    {editingNoteId ? 'Update Note' : 'Save Note'}
                  </button>
                  {editingNoteId && (
                    <button
                      className="btn-sm"
                      onClick={handleCancelEditNote}
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {currentPage === 'todo-list' && (
          <div className="page active">
            <div className="topbar">
              <div>
                <div className="topbar-title">📋 To-Do List</div>
                <div className="topbar-sub">Organize your tasks</div>
              </div>
            </div>
            <div className="panel" style={{ marginBottom: '1.2rem' }}>
              <div className="panel-title" style={{ marginBottom: '1rem' }}>Add Task</div>
              <div className="input-row">
                <input
                  className="inp"
                  placeholder="Task description…"
                  value={newTodoText}
                  onChange={(e) => setNewTodoText(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      handleAddTodo();
                    }
                  }}
                />
                <select
                  className="inp"
                  style={{ maxWidth: '130px' }}
                  value={newTodoImportance}
                  onChange={(e) => setNewTodoImportance(e.target.value)}
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="critical">Critical</option>
                </select>
                <button className="inp-btn" onClick={handleAddTodo}>+ Add</button>
              </div>
            </div>
            <div className="panel">
              <div className="panel-title" style={{ marginBottom: '1rem' }}>Your Tasks</div>
              <div id="todosList">
                {todos.length === 0 ? (
                  <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text3)' }}>
                    No tasks yet. Add one above!
                  </div>
                ) : (
                  <div className="todo-list">
                    {todos.map((todo) => (
                      <div className="todo-item" key={todo.id}>
                        <input
                          type="checkbox"
                          checked={todo.completed}
                          onChange={() => handleToggleTodo(todo.id)}
                        />
                        <span
                          style={{
                            textDecoration: todo.completed ? 'line-through' : 'none',
                            flexGrow: 1,
                          }}
                        >
                          {todo.text} <span className="tag" style={{ marginLeft: '0.5rem' }}>{todo.importance}</span>
                        </span>
                        <button className="text-button" onClick={() => handleDeleteTodo(todo.id)}>Delete</button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {currentPage === 'ai-chat' && (
          <div className="page active">
            <div className="topbar">
              <div>
                <div className="topbar-title">🤖 AI Chat</div>
                <div className="topbar-sub">Chat with your AI assistant</div>
              </div>
            </div>
            <div style={{ height: 'calc(100vh - 120px)', width: '100%', paddingBottom: '1rem' }}>
              <ChatAgent 
                user={user} 
                isOpen={true} 
                setIsOpen={() => {}} 
                inline={true} 
                mode="general" 
              />
            </div>
          </div>
        )}

        {currentPage === 'track' && (
          <div className="page active">
            <div className="topbar">
              <div>
                <div className="topbar-title">📊 Track</div>
                <div className="topbar-sub">Monitor your progress and analytics</div>
              </div>
            </div>
            <div className="stats-grid">
              <div className="stat-card">
                <div className="stat-icon" style={{ background: 'rgba(108,99,255,0.12)' }}>
                  <svg viewBox="0 0 24 24" fill="var(--accent2)" width="18">
                    <path d="M9 11H7v2h2v-2zm4 0h-2v2h2v-2zm4 0h-2v2h2v-2zm2-7h-1V2h-2v2H8V2H6v2H5c-1.1 0-1.99.9-1.99 2L3 20c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V9h14v11z"/>
                  </svg>
                </div>
                <div className="stat-val">{completedTodosThisWeek}</div>
                <div className="stat-label">Tasks Completed</div>
                <div className="stat-delta" style={{ color: 'var(--teal)' }}>this week</div>
              </div>
              <div className="stat-card">
                <div className="stat-icon" style={{ background: 'rgba(0,217,184,0.1)' }}>
                  <svg viewBox="0 0 24 24" fill="var(--teal)" width="18">
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                  </svg>
                </div>
                <div className="stat-val">{maxHabitStreak}</div>
                <div className="stat-label">Habits Streak</div>
                <div className="stat-delta" style={{ color: 'var(--gold)' }}>days</div>
              </div>
              <div className="stat-card">
                <div className="stat-icon" style={{ background: 'rgba(255,209,102,0.1)' }}>
                  <svg viewBox="0 0 24 24" fill="var(--gold)" width="18">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                  </svg>
                </div>
                <div className="stat-val">{goalsAchievedThisMonth}</div>
                <div className="stat-label">Goals Achieved</div>
                <div className="stat-delta" style={{ color: 'var(--text2)' }}>this month</div>
              </div>
              <div className="stat-card">
                <div className="stat-icon" style={{ background: 'rgba(255,107,107,0.1)' }}>
                  <svg viewBox="0 0 24 24" fill="var(--danger)" width="18">
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                  </svg>
                </div>
                <div className="stat-val">{productivityScore}</div>
                <div className="stat-label">Productivity Score</div>
                <div className="stat-delta" style={{ color: 'var(--accent2)' }}>↑ improving</div>
              </div>
            </div>
            <div className="panel">
              <div className="panel-title" style={{ marginBottom: '1rem' }}>Activity Timeline</div>
              {allActivities.length === 0 ? (
                <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text3)' }}>
                  No recent activity found.
                </div>
              ) : (
                <div className="activity-timeline">
                  {allActivities.map((activity) => (
                    <div className="life-entry" key={activity.id}>
                      <div className="life-entry-header">
                        <span className={`life-entry-type life-type-${activity.cssType}`}>{activity.type}</span>
                        <span className="life-entry-time">{new Date(activity.date).toLocaleString()}</span>
                      </div>
                      <div style={{ fontWeight: '600', fontSize: '0.9rem', marginBottom: '4px' }}>
                        {activity.title}
                      </div>
                      <div className="life-entry-content">{safeText(activity.content).substring(0, 120)}{safeText(activity.content).length > 120 ? '...' : ''}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {currentPage === 'capture' && (
          <div className="page active">
            <div className="topbar">
              <div>
                <div className="topbar-title">📸 Capture</div>
                <div className="topbar-sub">Capture moments and thoughts</div>
              </div>
            </div>
            <div className="grid-2">
              <div className="panel">
                <div className="panel-title" style={{ marginBottom: '1rem' }}>Quick Capture</div>
                <div style={{ display: 'flex', gap: '10px', marginBottom: '1.2rem' }}>
                  <button className={`btn-sm ${newCaptureType === 'note' ? 'accent' : ''}`} onClick={() => setNewCaptureType('note')}>📝 Note</button>
                  <button className={`btn-sm ${newCaptureType === 'voice' ? 'teal' : ''}`} onClick={() => setNewCaptureType('voice')}>🎤 Voice</button>
                  <button className={`btn-sm ${newCaptureType === 'photo' ? 'danger' : ''}`} onClick={() => setNewCaptureType('photo')}>📷 Photo</button>
                </div>

                {['note', 'task', 'meeting', 'chat'].includes(newCaptureType) && (
                  <>
                    <textarea 
                      className="inp" 
                      style={{ width: '100%', minHeight: '120px', resize: 'vertical', marginBottom: '1rem' }} 
                      placeholder="Type a quick thought..."
                      value={newCaptureContent}
                      onChange={(e) => setNewCaptureContent(e.target.value)}
                    />
                    <button className="inp-btn" onClick={handleAddCapture}>Save Note</button>
                  </>
                )}

                {newCaptureType === 'voice' && (
                  <div style={{ textAlign: 'center', padding: '2rem 0' }}>
                    {!isRecordingCapture ? (
                      <button className="chat-send" style={{ width: '64px', height: '64px', margin: '0 auto 1rem', background: 'var(--teal)' }} onClick={startVoiceRecording}>
                        <svg viewBox="0 0 24 24" fill="currentColor" width="28"><path d="M12 14c1.66 0 2.99-1.34 2.99-3L15 5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.3-3c0 3-2.54 5.1-5.3 5.1S6.7 14 6.7 11H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c3.28-.48 6-3.3 6-6.72h-1.7z"/></svg>
                      </button>
                    ) : (
                      <button className="chat-send" style={{ width: '64px', height: '64px', margin: '0 auto 1rem', background: 'var(--danger)', animation: 'rec-pulse 1s infinite' }} onClick={handleAddCapture}>
                        <svg viewBox="0 0 24 24" fill="currentColor" width="28"><path d="M6 6h12v12H6z"/></svg>
                      </button>
                    )}
                    <div style={{ color: isRecordingCapture ? 'var(--danger)' : 'var(--text2)' }}>
                      {isRecordingCapture ? `Recording... ${recordingDuration}s - Tap to stop & save` : 'Tap to start recording'}
                    </div>
                  </div>
                )}

                {newCaptureType === 'photo' && (
                  <div style={{ textAlign: 'center', padding: '2rem 0' }}>
                    {capturedImage ? (
                      <div>
                        <img src={capturedImage} alt="Captured" style={{ maxWidth: '100%', maxHeight: '200px', borderRadius: '8px', marginBottom: '1rem' }} />
                        <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
                          <button className="btn-sm accent" onClick={handleAddCapture}>Save Photo</button>
                          <button className="btn-sm" onClick={() => { setCapturedImage(null); setIsCapturingImage(false); }}>Retake</button>
                        </div>
                      </div>
                    ) : isCameraPreview ? (
                      <div>
                        <video 
                          autoPlay 
                          playsInline 
                          muted 
                          style={{ 
                            width: '100%', 
                            maxWidth: '300px', 
                            height: 'auto', 
                            borderRadius: '8px', 
                            marginBottom: '1rem',
                            transform: 'scaleX(-1)' // Mirror effect for selfie
                          }} 
                          ref={(video) => {
                            if (video && cameraStream) {
                              video.srcObject = cameraStream;
                            }
                          }}
                        />
                        <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
                          <button className="btn-sm danger" onClick={captureFromStream} style={{ fontSize: '1.2rem' }}>📷 Capture</button>
                          <button className="btn-sm" onClick={stopCameraPreview}>Cancel</button>
                        </div>
                      </div>
                    ) : (
                      <div>
                        <svg viewBox="0 0 24 24" fill="var(--text3)" width="48" style={{ marginBottom: '1rem' }}><circle cx="12" cy="12" r="3.2"/><path d="M9 2L7.17 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2h-3.17L15 2H9zm3 15c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5z"/></svg>
                        <div style={{ color: 'var(--text2)', marginBottom: '1rem' }}>Take a photo or upload</div>
                        <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
                          <button className="btn-sm danger" onClick={startCameraPreview}>📷 Take Photo</button>
                          <button className="btn-sm accent" onClick={() => { setNewCaptureContent('Uploaded Photo - IMG_' + Math.floor(Math.random() * 9000 + 1000) + '.jpg'); handleAddCapture(); }}>Upload</button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
              
              <div className="panel">
                <div className="panel-title" style={{ marginBottom: '1rem' }}>Recent Captures</div>
                <div id="capturesList">
                  {captures.length === 0 ? (
                    <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text3)' }}>
                      No captures yet.
                    </div>
                  ) : (
                    <div className="track-list">
                      {captures.map((capture) => (
                        <div className="track-item" key={capture.id}>
                          <div className="track-dot" style={{ background: capture.type === 'voice' ? 'var(--teal)' : capture.type === 'photo' ? 'var(--danger)' : 'var(--accent)' }}></div>
                          <div className="track-body">
                            <div className="track-title">
                              {capture.content} 
                              <span className={`track-badge ${capture.type === 'voice' ? 'badge-ok' : capture.type === 'photo' ? 'badge-urgent' : 'badge-soon'}`}>{capture.type}</span>
                            </div>
                            {capture.type === 'voice' && (capture.audioUrl || capture.audio_url) && (
                              <audio
                                controls
                                preload="metadata"
                                src={capture.audioUrl || capture.audio_url}
                                style={{ width: '100%', marginTop: '0.5rem' }}
                              >
                                Your browser does not support the audio element.
                              </audio>
                            )}
                            {capture.type === 'photo' && (capture.imageUrl || capture.image_url) && (
                              <img src={capture.imageUrl || capture.image_url} alt="Captured" style={{ width: '100%', maxHeight: '150px', objectFit: 'cover', borderRadius: '4px', marginTop: '0.5rem' }} />
                            )}
                            <div className="track-meta">{new Date(capture.date).toLocaleString()}</div>
                          </div>
                          <button className="track-del" onClick={() => handleDeleteCapture(capture.id)}>✕</button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {currentPage === 'digital-life' && (
          <div className="page active">
            <div className="topbar">
              <div>
                <div className="topbar-title">🌟 Digital Life Journal</div>
                <div className="topbar-sub">Track your digital activities and thoughts</div>
              </div>
            </div>
            <div className="grid-2">
              <div className="panel">
                <div className="panel-title" style={{ marginBottom: '1rem' }}>Quick Capture</div>
                <div style={{ display: 'flex', gap: '10px', marginBottom: '1.2rem' }}>
                  <button className={`btn-sm ${newCaptureType === 'note' ? 'accent' : ''}`} onClick={() => setNewCaptureType('note')}>📝 Note</button>
                  <button className={`btn-sm ${newCaptureType === 'voice' ? 'teal' : ''}`} onClick={() => setNewCaptureType('voice')}>🎤 Voice</button>
                  <button className={`btn-sm ${newCaptureType === 'photo' ? 'danger' : ''}`} onClick={() => setNewCaptureType('photo')}>📷 Photo</button>
                  <button className={`btn-sm ${newCaptureType === 'task' ? 'badge-soon' : ''}`} onClick={() => setNewCaptureType('task')}>✅ Task</button>
                  <button className={`btn-sm ${newCaptureType === 'meeting' ? 'badge-urgent' : ''}`} onClick={() => setNewCaptureType('meeting')}>📅 Meeting</button>
                  <button className={`btn-sm ${newCaptureType === 'chat' ? 'badge-ok' : ''}`} onClick={() => setNewCaptureType('chat')}>💬 Chat</button>
                </div>

                {['note', 'task', 'meeting', 'chat'].includes(newCaptureType) && (
                  <>
                    <textarea 
                      className="inp" 
                      style={{ width: '100%', minHeight: '120px', resize: 'vertical', marginBottom: '1rem' }} 
                      placeholder="Type a quick thought..."
                      value={newCaptureContent}
                      onChange={(e) => setNewCaptureContent(e.target.value)}
                    />
                    <button className="inp-btn" onClick={handleAddCapture}>Save Entry</button>
                  </>
                )}

                {newCaptureType === 'voice' && (
                  <div style={{ textAlign: 'center', padding: '2rem 0' }}>
                    {!isRecordingCapture ? (
                      <button className="chat-send" style={{ width: '64px', height: '64px', margin: '0 auto 1rem', background: 'var(--teal)' }} onClick={startVoiceRecording}>
                        <svg viewBox="0 0 24 24" fill="currentColor" width="28"><path d="M12 14c1.66 0 2.99-1.34 2.99-3L15 5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.3-3c0 3-2.54 5.1-5.3 5.1S6.7 14 6.7 11H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c3.28-.48 6-3.3 6-6.72h-1.7z"/></svg>
                      </button>
                    ) : (
                      <button className="chat-send" style={{ width: '64px', height: '64px', margin: '0 auto 1rem', background: 'var(--danger)', animation: 'rec-pulse 1s infinite' }} onClick={handleAddCapture}>
                        <svg viewBox="0 0 24 24" fill="currentColor" width="28"><path d="M6 6h12v12H6z"/></svg>
                      </button>
                    )}
                    <div style={{ color: isRecordingCapture ? 'var(--danger)' : 'var(--text2)' }}>
                      {isRecordingCapture ? `Recording... ${recordingDuration}s - Tap to stop & save` : 'Tap to start recording'}
                    </div>
                  </div>
                )}

                {newCaptureType === 'photo' && (
                  <div style={{ textAlign: 'center', padding: '2rem 0' }}>
                    {capturedImage ? (
                      <div>
                        <img src={capturedImage} alt="Captured" style={{ maxWidth: '100%', maxHeight: '200px', borderRadius: '8px', marginBottom: '1rem' }} />
                        <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
                          <button className="btn-sm accent" onClick={handleAddCapture}>Save Photo</button>
                          <button className="btn-sm" onClick={() => { setCapturedImage(null); setIsCapturingImage(false); }}>Retake</button>
                        </div>
                      </div>
                    ) : isCameraPreview ? (
                      <div>
                        <video 
                          autoPlay 
                          playsInline 
                          muted 
                          style={{ 
                            width: '100%', 
                            maxWidth: '300px', 
                            height: 'auto', 
                            borderRadius: '8px', 
                            marginBottom: '1rem',
                            transform: 'scaleX(-1)' // Mirror effect for selfie
                          }} 
                          ref={(video) => {
                            if (video && cameraStream) {
                              video.srcObject = cameraStream;
                            }
                          }}
                        />
                        <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
                          <button className="btn-sm danger" onClick={captureFromStream} style={{ fontSize: '1.2rem' }}>📷 Capture</button>
                          <button className="btn-sm" onClick={stopCameraPreview}>Cancel</button>
                        </div>
                      </div>
                    ) : (
                      <div>
                        <svg viewBox="0 0 24 24" fill="var(--text3)" width="48" style={{ marginBottom: '1rem' }}><circle cx="12" cy="12" r="3.2"/><path d="M9 2L7.17 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2h-3.17L15 2H9zm3 15c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5z"/></svg>
                        <div style={{ color: 'var(--text2)', marginBottom: '1rem' }}>Take a photo or upload</div>
                        <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
                          <button className="btn-sm danger" onClick={startCameraPreview}>📷 Take Photo</button>
                          <button className="btn-sm accent" onClick={() => { setNewCaptureContent('Uploaded Photo - IMG_' + Math.floor(Math.random() * 9000 + 1000) + '.jpg'); handleAddCapture(); }}>Upload</button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
              
              <div className="panel">
                <div className="panel-title" style={{ marginBottom: '1rem' }}>Life Entries</div>
                {allActivities.length === 0 ? (
                  <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text3)' }}>
                    No life entries yet.
                  </div>
                ) : (
                  <div className="activity-timeline">
                    {allActivities.map((activity) => (
                      <div className="life-entry" key={activity.id}>
                        <div className="life-entry-header">
                          <span className={`life-entry-type life-type-${activity.cssType}`}>{activity.type}</span>
                          <span className="life-entry-time">{new Date(activity.date).toLocaleString()}</span>
                        </div>
                        <div style={{ fontWeight: '600', fontSize: '0.9rem', marginBottom: '4px' }}>
                          {activity.title}
                        </div>
                        <div className="life-entry-content">{safeText(activity.content).substring(0, 120)}{safeText(activity.content).length > 120 ? '...' : ''}</div>
                        {activity.type === 'Capture (voice)' && activity.audioUrl && (
                          <audio
                            controls
                            preload="metadata"
                            src={activity.audioUrl}
                            style={{ width: '100%', marginTop: '0.5rem' }}
                          >
                            Your browser does not support the audio element.
                          </audio>
                        )}
                        {activity.type === 'Capture (photo)' && activity.imageUrl && (
                          <img src={activity.imageUrl} alt="Captured" style={{ width: '100%', maxHeight: '150px', objectFit: 'cover', borderRadius: '4px', marginTop: '0.5rem' }} />
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {currentPage === 'saved-dates' && (
          <div className="page active">
            <div className="topbar">
              <div>
                <div className="topbar-title">📅 Saved Dates</div>
                <div className="topbar-sub">Important dates and events</div>
              </div>
            </div>
            <div className="panel" style={{ marginBottom: '1.2rem' }}>
              <div className="panel-title" style={{ marginBottom: '1rem' }}>Add Important Date</div>
              <div className="input-row">
                <input className="inp" placeholder="Event name" value={newSavedDateTitle} onChange={(e) => setNewSavedDateTitle(e.target.value)} />
                <input className="inp" type="date" style={{ maxWidth: '160px' }} value={newSavedDateValue} onChange={(e) => setNewSavedDateValue(e.target.value)} />
                <input className="inp" placeholder="Optional note" value={newSavedDateNote} onChange={(e) => setNewSavedDateNote(e.target.value)} />
                <button className="inp-btn" onClick={handleAddSavedDate}>+ Add</button>
              </div>
            </div>
            <div className="panel">
              <div className="panel-title">Saved Dates</div>
              {savedDates.length === 0 ? (
                <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text3)' }}>
                  No saved dates yet. Add birthdays, anniversaries, launches, or milestones above.
                </div>
              ) : (
                <div className="track-list">
                  {savedDates.map((item) => (
                    <div className="track-item" key={item.id}>
                      <div className="track-dot" style={{ background: 'var(--gold)' }}></div>
                      <div className="track-body">
                        <div className="track-title">{item.title} <span className="track-badge badge-soon">{item.date}</span></div>
                        <div className="track-meta">{item.note || 'No note added.'}</div>
                      </div>
                      <button className="track-del" onClick={() => handleDeleteSavedDate(item.id)}>x</button>
                    </div>
                  ))}
                </div>
              )}
            </div>
            {false && (
              <>
            <div className="panel" style={{ marginBottom: '1.2rem' }}>
              <div className="panel-title" style={{ marginBottom: '1rem' }}>Add Important Date</div>
              <div className="input-row">
                <input className="inp" placeholder="Event name…" />
                <input className="inp" type="date" style={{ maxWidth: '160px' }} />
                <button className="inp-btn">+ Add</button>
              </div>
            </div>
            <div className="panel">
              <div className="panel-title">Saved Dates</div>
              <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text3)' }}>
                No saved dates
              </div>
            </div>
              </>
            )}
          </div>
        )}
      </div>
      </div>
      
      <ChatAgent 
        user={user} 
        isOpen={isNavChatOpen} 
        setIsOpen={setIsNavChatOpen} 
        inline={false} 
        mode="general" 
      />
    </>
  );
}

export default function App() {
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [memories, setMemories] = useState([]);
  const [insights, setInsights] = useState(null);
  const [searchResults, setSearchResults] = useState([]);
  const [user, setUser] = useState(null);
  const [authMode, setAuthMode] = useState('login');
  const [authError, setAuthError] = useState('');
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [isCheckingSession, setIsCheckingSession] = useState(Boolean(getStoredToken()));
  const [theme, setTheme] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = window.localStorage.getItem('memory-app-theme');
      return saved === 'light' ? 'light' : 'dark';
    }
    return 'dark';
  });
  const [sortOption, setSortOption] = useState('date');
  const [isLoadingMemories, setIsLoadingMemories] = useState(false);
  const [isLoadingInsights, setIsLoadingInsights] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [memoriesError, setMemoriesError] = useState('');
  const [searchError, setSearchError] = useState('');
  const [insightsError, setInsightsError] = useState('');
  const [isInlineChatOpen, setIsInlineChatOpen] = useState(false);
  const [isNavChatOpen, setIsNavChatOpen] = useState(false);

  // Notes State
  const [notes, setNotes] = useState([]);
  const [newNoteTitle, setNewNoteTitle] = useState('');
  const [newNoteContent, setNewNoteContent] = useState('');
  const [editingNoteId, setEditingNoteId] = useState(null);

  // To-Do List State
  const [todos, setTodos] = useState([]);
  const [newTodoText, setNewTodoText] = useState('');
  const [newTodoImportance, setNewTodoImportance] = useState('medium');

  // Meetings State
  const [meetings, setMeetings] = useState([]);
  const [newMeetingTitle, setNewMeetingTitle] = useState('');
  const [newMeetingDate, setNewMeetingDate] = useState('');
  const [newMeetingTime, setNewMeetingTime] = useState('');
  const [newMeetingWith, setNewMeetingWith] = useState('');
  const [newMeetingLocation, setNewMeetingLocation] = useState('');
  const [newMeetingType, setNewMeetingType] = useState('meeting');

  // Deadlines State
  const [deadlines, setDeadlines] = useState([]);
  const [newDeadlineTitle, setNewDeadlineTitle] = useState('');
  const [newDeadlineDate, setNewDeadlineDate] = useState('');
  const [newDeadlinePriority, setNewDeadlinePriority] = useState('medium');

  // Habits State
  const [habits, setHabits] = useState([]);
  const [newHabitName, setNewHabitName] = useState('');

  // Saved Dates State
  const [savedDates, setSavedDates] = useState([]);
  const [newSavedDateTitle, setNewSavedDateTitle] = useState('');
  const [newSavedDateValue, setNewSavedDateValue] = useState('');
  const [newSavedDateNote, setNewSavedDateNote] = useState('');

  // Captures State
  const [captures, setCaptures] = useState([]);
  const [newCaptureType, setNewCaptureType] = useState('note');
  const [newCaptureContent, setNewCaptureContent] = useState('');
  const [isRecordingCapture, setIsRecordingCapture] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState(null);
  const [recordedAudio, setRecordedAudio] = useState(null);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [recordingInterval, setRecordingInterval] = useState(null);
  const [capturedImage, setCapturedImage] = useState(null);
  const [isCapturingImage, setIsCapturingImage] = useState(false);
  const [cameraStream, setCameraStream] = useState(null);
  const [isCameraPreview, setIsCameraPreview] = useState(false);
  const stopRecordingResolverRef = useRef(null);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('memory-app-theme', theme);
    }
  }, [theme]);

  const apiCall = async (method, endpoint, body = null, isFormData = false) => {
    const token = getStoredToken();
    if (!token) {
      throw new Error('Authentication required.');
    }

    const headers = {
      Authorization: `Bearer ${token}`,
    };

    if (!isFormData) {
      headers['Content-Type'] = 'application/json';
    }

    const res = await fetch(buildApiUrl(endpoint), {
      method,
      headers,
      body: isFormData ? body : (body ? JSON.stringify(body) : null),
    });

    const contentType = res.headers.get('content-type') || '';
    const data = contentType.includes('application/json')
      ? await res.json()
      : await res.text();

    if (!res.ok) {
      const message = typeof data === 'string' ? data : data?.detail || data?.message;
      throw new Error(message || `Request failed for ${endpoint}.`);
    }

    return data;
  };

  useEffect(() => {
    async function restoreSession() {
      const token = getStoredToken();
      if (!token) {
        setIsCheckingSession(false);
        return;
      }

      try {
        const currentUser = await fetchCurrentUser();
        setUser(currentUser);
      } catch (error) {
        setAuthToken('');
      } finally {
        setIsCheckingSession(false);
      }
    }

    restoreSession();
  }, []);

  useEffect(() => {
    if (!user) {
      setMemories([]);
      setInsights(null);
      setSearchResults([]);
      setNotes([]);
      setTodos([]);
      setMeetings([]);
      setDeadlines([]);
      setHabits([]);
      setSavedDates([]);
      setCaptures([]);
      return;
    }

    loadMemories();
    loadInsights();
    loadWorkspaceData();
  }, [user]);

  async function loadMemories() {
    setMemoriesError('');
    setIsLoadingMemories(true);
    try {
      const data = await fetchMemories();
      setMemories(Array.isArray(data) ? data : []);
    } catch (error) {
      handleProtectedError(error, setMemoriesError, 'Unable to load memories.');
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
      handleProtectedError(error, setInsightsError, 'Unable to load insights.');
    } finally {
      setIsLoadingInsights(false);
    }
  }

  async function loadWorkspaceData() {
    try {
      const [
        notesData,
        todosData,
        meetingsData,
        deadlinesData,
        habitsData,
        savedDatesData,
        capturesData,
      ] = await Promise.all([
        apiCall('GET', 'notes'),
        apiCall('GET', 'todos'),
        apiCall('GET', 'meetings'),
        apiCall('GET', 'deadlines'),
        apiCall('GET', 'habits'),
        apiCall('GET', 'saved-dates'),
        apiCall('GET', 'captures'),
      ]);

      setNotes(Array.isArray(notesData) ? notesData.map(normalizeNote) : []);
      setTodos(Array.isArray(todosData) ? todosData : []);
      setMeetings(Array.isArray(meetingsData) ? meetingsData : []);
      setDeadlines(Array.isArray(deadlinesData) ? deadlinesData : []);
      setHabits(Array.isArray(habitsData) ? habitsData.map(normalizeHabit) : []);
      setSavedDates(Array.isArray(savedDatesData) ? savedDatesData.map(normalizeSavedDate) : []);
      setCaptures(Array.isArray(capturesData) ? capturesData.map(normalizeCaptureAssets) : []);
    } catch (error) {
      handleProtectedError(error, setMemoriesError, 'Unable to load planner data.');
    }
  }

  function handleProtectedError(error, setter, fallbackMessage) {
    const message = error.message || fallbackMessage;
    if (message.toLowerCase().includes('authentication') || message.toLowerCase().includes('session')) {
      setAuthToken('');
      setUser(null);
      setter('Your session ended. Please sign in again.');
      return;
    }
    setter(message);
  }

  async function handleAuthenticate(payload) {
    setAuthError('');
    setIsAuthenticating(true);
    try {
      const data =
        authMode === 'login' ? await loginUser(payload) : await registerUser(payload);
      setAuthToken(data.token);
      setUser(data.user);
      setSearchResults([]);
      setMemoriesError('');
      setSearchError('');
      setInsightsError('');
    } catch (error) {
      setAuthError(error.message || 'Authentication failed.');
    } finally {
      setIsAuthenticating(false);
    }
  }

  async function handleLogout() {
    try {
      await logoutUser();
    } catch (error) {
      // Ignore logout errors and clear local session regardless.
    } finally {
      setAuthToken('');
      setUser(null);
      setAuthMode('login');
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

  async function handleSearch(payload) {
    setSearchError('');
    setIsSearching(true);
    try {
      const results = await searchMemories(payload);
      setSearchResults(Array.isArray(results) ? results : []);
    } catch (error) {
      handleProtectedError(error, setSearchError, 'Search failed.');
    } finally {
      setIsSearching(false);
    }
  }

  function handleClearSearch() {
    setSearchError('');
    setSearchResults([]);
  }

  async function handleDeleteMemory(memoryId) {
    if (!window.confirm('Are you sure you want to delete this memory?')) {
      return;
    }

    try {
      await deleteMemory(memoryId);
      await loadMemories();
      await loadInsights();
      setSearchResults((current) => current.filter((item) => item.memory?.id !== memoryId));
    } catch (error) {
      handleProtectedError(error, setMemoriesError, 'Unable to delete memory.');
    }
  }

  async function handleUpdateMemory(memoryId, payload) {
    try {
      const updatedMemory = await updateMemory(memoryId, payload);
      await loadInsights();
      setMemories((current) =>
        current.map((memory) => (memory.id === memoryId ? updatedMemory : memory))
      );
      setSearchResults((current) =>
        current.map((item) =>
          item.memory?.id === memoryId ? { ...item, memory: updatedMemory } : item
        )
      );
    } catch (error) {
      handleProtectedError(error, setMemoriesError, 'Unable to update memory.');
    }
  }

  async function handleExportMemories() {
    setInsightsError('');
    setIsExporting(true);
    try {
      const data = await exportMemories();
      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: 'application/json',
      });
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = `${user.email.replace(/[^a-z0-9]/gi, '_').toLowerCase()}-memories.json`;
      link.click();
      window.URL.revokeObjectURL(downloadUrl);
    } catch (error) {
      handleProtectedError(error, setInsightsError, 'Unable to export memories.');
    } finally {
      setIsExporting(false);
    }
  }

  // Notes Handlers
  async function handleSaveNote() {
    if (newNoteTitle.trim() || newNoteContent.trim()) {
      const payload = { title: newNoteTitle.trim(), content: newNoteContent.trim() };
      if (editingNoteId) {
        const updated = await apiCall('PUT', `notes/${editingNoteId}`, payload);
        setNotes((prev) =>
          prev.map((note) =>
            note.id === editingNoteId
              ? normalizeNote(updated || { ...note, ...payload, updatedAt: new Date().toISOString() })
              : note
          )
        );
        setEditingNoteId(null);
      } else {
        const created = await apiCall('POST', 'notes', payload);
        setNotes((prev) => [
          ...prev,
          normalizeNote(created || { id: Date.now(), ...payload, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }),
        ]);
      }
      setNewNoteTitle('');
      setNewNoteContent('');
    }
  }

  function handleEditNote(note) {
    setNewNoteTitle(note.title);
    setNewNoteContent(note.content);
    setEditingNoteId(note.id);
  }

  function handleCancelEditNote() {
    setEditingNoteId(null);
    setNewNoteTitle('');
    setNewNoteContent('');
  }

  async function handleDeleteNote(id) {
    await apiCall('DELETE', `notes/${id}`);
    setNotes((prev) => prev.filter((note) => note.id !== id));
    if (editingNoteId === id) {
      setEditingNoteId(null);
      setNewNoteTitle('');
      setNewNoteContent('');
    }
  }

  // To-Do List Handlers
  async function handleAddTodo() {
    if (newTodoText.trim()) {
      const payload = { text: newTodoText.trim(), importance: newTodoImportance, completed: false };
      const created = await apiCall('POST', 'todos', payload);
      setTodos((prev) => [...prev, (created || { id: Date.now(), ...payload })]);
      setNewTodoText('');
      setNewTodoImportance('medium');
    }
  }

  async function handleToggleTodo(id) {
    const todo = todos.find(t => t.id === id);
    if (todo) {
      const updated = await apiCall('PUT', `todos/${id}`, { completed: !todo.completed });
      setTodos((prev) => prev.map((t) => (t.id === id ? (updated || { ...t, completed: !t.completed }) : t)));
    }
  }

  async function handleDeleteTodo(id) {
    await apiCall('DELETE', `todos/${id}`);
    setTodos((prev) => prev.filter((todo) => todo.id !== id));
  }

  // Meetings Handlers
  async function handleAddMeeting() {
    if (newMeetingTitle.trim()) {
      const payload = {
        title: newMeetingTitle.trim(),
        date: newMeetingDate,
        time: newMeetingTime,
        withPerson: newMeetingWith.trim(),
        location: newMeetingLocation.trim(),
        type: newMeetingType,
      };
      const created = await apiCall('POST', 'meetings', payload);
      setMeetings((prev) => [
        ...prev,
        (created || { id: Date.now(), ...payload }),
      ]);
      setNewMeetingTitle('');
      setNewMeetingDate('');
      setNewMeetingTime('');
      setNewMeetingWith('');
      setNewMeetingLocation('');
      setNewMeetingType('meeting');
    }
  }

  async function handleDeleteMeeting(id) {
    await apiCall('DELETE', `meetings/${id}`);
    setMeetings((prev) => prev.filter((m) => m.id !== id));
  }

  // Deadlines Handlers
  async function handleAddDeadline() {
    if (newDeadlineTitle.trim()) {
      const payload = {
        title: newDeadlineTitle.trim(),
        date: newDeadlineDate,
        priority: newDeadlinePriority,
      };
      const created = await apiCall('POST', 'deadlines', payload);
      setDeadlines((prev) => [
        ...prev,
        (created || { id: Date.now(), ...payload }),
      ]);
      setNewDeadlineTitle('');
      setNewDeadlineDate('');
      setNewDeadlinePriority('medium');
    }
  }

  async function handleDeleteDeadline(id) {
    await apiCall('DELETE', `deadlines/${id}`);
    setDeadlines((prev) => prev.filter((d) => d.id !== id));
  }

  // Habits Handlers
  async function handleAddHabit() {
    if (newHabitName.trim()) {
      const payload = {
        name: newHabitName.trim(),
        streak: 0,
        days: Array(7).fill(false),
      };
      const created = await apiCall('POST', 'habits', payload);
      setHabits((prev) => [
        ...prev,
        normalizeHabit(created || { id: Date.now(), ...payload }),
      ]);
      setNewHabitName('');
    }
  }

  async function handleToggleHabitDay(habitId, dayIndex) {
    const habit = habits.find(h => h.id === habitId);
    if (habit) {
      const newDays = [...habit.days];
      newDays[dayIndex] = !newDays[dayIndex];
      const streak = newDays.filter(Boolean).length;
      const payload = { days: newDays, streak };
      const updated = await apiCall('PUT', `habits/${habitId}`, payload);
      setHabits((prev) => prev.map((h) => (h.id === habitId ? normalizeHabit(updated || { ...h, ...payload }) : h)));
    }
  }

  async function handleDeleteHabit(id) {
    await apiCall('DELETE', `habits/${id}`);
    setHabits((prev) => prev.filter((h) => h.id !== id));
  }

  async function handleAddSavedDate() {
    if (newSavedDateTitle.trim() && newSavedDateValue) {
      const payload = {
        title: newSavedDateTitle.trim(),
        date: newSavedDateValue,
        note: newSavedDateNote.trim(),
      };
      const created = await apiCall('POST', 'saved-dates', payload);
      setSavedDates((prev) => [
        ...prev,
        normalizeSavedDate(created || { id: Date.now(), ...payload }),
      ]);
      setNewSavedDateTitle('');
      setNewSavedDateValue('');
      setNewSavedDateNote('');
    }
  }

  async function handleDeleteSavedDate(id) {
    await apiCall('DELETE', `saved-dates/${id}`);
    setSavedDates((prev) => prev.filter((item) => item.id !== id));
  }

  // Captures Handlers
  const startVoiceRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const chunks = [];

      if (recordedAudio?.url) {
        URL.revokeObjectURL(recordedAudio.url);
      }
      setRecordedAudio(null);

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunks.push(e.data);
        }
      };

      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'audio/webm' });
        const audioUrl = URL.createObjectURL(blob);
        const audioData = { blob, url: audioUrl };
        setRecordedAudio(audioData);
        if (stopRecordingResolverRef.current) {
          stopRecordingResolverRef.current(audioData);
          stopRecordingResolverRef.current = null;
        }
        stream.getTracks().forEach(track => track.stop());
      };

      setMediaRecorder(recorder);
      recorder.start();
      setIsRecordingCapture(true);
      setRecordingDuration(0);

      const interval = setInterval(() => {
        setRecordingDuration(prev => prev + 1);
      }, 1000);
      setRecordingInterval(interval);
    } catch (error) {
      console.error('Error starting recording:', error);
      alert('Could not access microphone. Please check permissions.');
    }
  };

  const stopVoiceRecording = () => {
    if (!mediaRecorder || mediaRecorder.state !== 'recording') {
      return Promise.resolve(recordedAudio);
    }

    return new Promise((resolve) => {
      stopRecordingResolverRef.current = resolve;
      mediaRecorder.stop();
      setMediaRecorder(null);
      setIsRecordingCapture(false);
      if (recordingInterval) {
        clearInterval(recordingInterval);
        setRecordingInterval(null);
      }
    });
  };

  const startCameraPreview = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      setCameraStream(stream);
      setIsCameraPreview(true);
    } catch (error) {
      console.error('Error accessing camera:', error);
      alert('Could not access camera. Please check permissions.');
    }
  };

  const captureFromStream = () => {
    if (!cameraStream) return;

    const video = document.createElement('video');
    video.srcObject = cameraStream;
    video.play();

    // Wait for video to load
    video.onloadedmetadata = () => {
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(video, 0, 0);

      const imageUrl = canvas.toDataURL('image/jpeg');
      setCapturedImage(imageUrl);
      setIsCameraPreview(false);

      // Stop the stream
      cameraStream.getTracks().forEach(track => track.stop());
      setCameraStream(null);
    };
  };

  const stopCameraPreview = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
      setCameraStream(null);
    }
    setIsCameraPreview(false);
  };

  async function handleAddCapture() {
    let content = newCaptureContent.trim();
    let audioUrl = null;
    let imageUrl = null;

    if (newCaptureType === 'voice') {
      const finalRecording = isRecordingCapture ? await stopVoiceRecording() : recordedAudio;

      if (finalRecording) {
        content = `Voice Recording (${recordingDuration}s)`;
        const formData = new FormData();
        formData.append('file', finalRecording.blob, 'recording.webm');
        const uploadResponse = await apiCall('POST', 'upload', formData, true);
        audioUrl = uploadResponse?.url ? buildApiUrl(uploadResponse.url) : null;
      } else {
        content = 'Voice Recording';
      }
    } else if (newCaptureType === 'photo') {
      if (capturedImage) {
        content = content || 'Captured Photo';
        const response = await fetch(capturedImage);
        const blob = await response.blob();
        const formData = new FormData();
        formData.append('file', blob, 'photo.jpg');
        const uploadResponse = await apiCall('POST', 'upload', formData, true);
        imageUrl = uploadResponse?.url ? buildApiUrl(uploadResponse.url) : null;
      } else {
        content = content || 'Uploaded Photo';
      }
    }

    if (content || newCaptureType === 'photo' || newCaptureType === 'voice') {
      const payload = {
        type: newCaptureType,
        content: content,
        date: new Date().toISOString(),
        audio_url: audioUrl,
        image_url: imageUrl,
      };

      const created = await apiCall('POST', 'captures', payload);
      setCaptures((prev) => [
        ...prev,
        normalizeCaptureAssets(created || { id: Date.now(), ...payload }),
      ]);

      setNewCaptureContent('');
      setIsRecordingCapture(false);
      if (recordedAudio?.url) {
        URL.revokeObjectURL(recordedAudio.url);
      }
      setRecordedAudio(null);
      setRecordingDuration(0);
      setCapturedImage(null);
      setIsCapturingImage(false);
      setNewCaptureType('note');
    }
  }

  async function handleDeleteCapture(id) {
    await apiCall('DELETE', `captures/${id}`);
    setCaptures((prev) => prev.filter((c) => c.id !== id));
  }

  if (isCheckingSession) {
    return (
      <div className="auth-shell">
        <section className="auth-card">
          <p className="status-message">Restoring your session...</p>
        </section>
      </div>
    );
  }

  if (!user) {
    return (
      <AuthPanel
        mode={authMode}
        onSubmit={handleAuthenticate}
        isSubmitting={isAuthenticating}
        onSwitchMode={() => {
          setAuthError('');
          setAuthMode((current) => (current === 'login' ? 'register' : 'login'));
        }}
        error={authError}
      />
    );
  }

  return (
    <AppContent
      user={user}
      theme={theme}
      setTheme={setTheme}
      memories={memories}
      insights={insights}
      searchResults={searchResults}
      sortOption={sortOption}
      setSortOption={setSortOption}
      isLoadingMemories={isLoadingMemories}
      isLoadingInsights={isLoadingInsights}
      isSearching={isSearching}
      isSubmitting={isSubmitting}
      isExporting={isExporting}
      memoriesError={memoriesError}
      searchError={searchError}
      insightsError={insightsError}
      onCreateMemory={handleCreateMemory}
      onSearch={handleSearch}
      onClearSearch={handleClearSearch}
      onDeleteMemory={handleDeleteMemory}
      onUpdateMemory={handleUpdateMemory}
      onRefreshInsights={loadInsights}
      onExportMemories={handleExportMemories}
      onLogout={handleLogout}
      currentPage={currentPage}
      setCurrentPage={setCurrentPage}
      isInlineChatOpen={isInlineChatOpen}
      setIsInlineChatOpen={setIsInlineChatOpen}
      isNavChatOpen={isNavChatOpen}
      setIsNavChatOpen={setIsNavChatOpen}
      // Notes Props
      notes={notes}
      newNoteTitle={newNoteTitle}
      setNewNoteTitle={setNewNoteTitle}
      newNoteContent={newNoteContent}
      setNewNoteContent={setNewNoteContent}
      editingNoteId={editingNoteId}
      handleSaveNote={handleSaveNote}
      handleEditNote={handleEditNote}
      handleCancelEditNote={handleCancelEditNote}
      handleDeleteNote={handleDeleteNote}
      // To-Do List Props
      todos={todos}
      newTodoText={newTodoText}
      setNewTodoText={setNewTodoText}
      newTodoImportance={newTodoImportance}
      setNewTodoImportance={setNewTodoImportance}
      handleAddTodo={handleAddTodo}
      handleToggleTodo={handleToggleTodo}
      handleDeleteTodo={handleDeleteTodo}
      // Meetings Props
      meetings={meetings}
      newMeetingTitle={newMeetingTitle}
      setNewMeetingTitle={setNewMeetingTitle}
      newMeetingDate={newMeetingDate}
      setNewMeetingDate={setNewMeetingDate}
      newMeetingTime={newMeetingTime}
      setNewMeetingTime={setNewMeetingTime}
      newMeetingWith={newMeetingWith}
      setNewMeetingWith={setNewMeetingWith}
      newMeetingLocation={newMeetingLocation}
      setNewMeetingLocation={setNewMeetingLocation}
      newMeetingType={newMeetingType}
      setNewMeetingType={setNewMeetingType}
      handleAddMeeting={handleAddMeeting}
      handleDeleteMeeting={handleDeleteMeeting}
      // Deadlines Props
      deadlines={deadlines}
      newDeadlineTitle={newDeadlineTitle}
      setNewDeadlineTitle={setNewDeadlineTitle}
      newDeadlineDate={newDeadlineDate}
      setNewDeadlineDate={setNewDeadlineDate}
      newDeadlinePriority={newDeadlinePriority}
      setNewDeadlinePriority={setNewDeadlinePriority}
      handleAddDeadline={handleAddDeadline}
      handleDeleteDeadline={handleDeleteDeadline}
      // Habits Props
      habits={habits}
      newHabitName={newHabitName}
      setNewHabitName={setNewHabitName}
      handleAddHabit={handleAddHabit}
      handleToggleHabitDay={handleToggleHabitDay}
      handleDeleteHabit={handleDeleteHabit}
      savedDates={savedDates}
      newSavedDateTitle={newSavedDateTitle}
      setNewSavedDateTitle={setNewSavedDateTitle}
      newSavedDateValue={newSavedDateValue}
      setNewSavedDateValue={setNewSavedDateValue}
      newSavedDateNote={newSavedDateNote}
      setNewSavedDateNote={setNewSavedDateNote}
      handleAddSavedDate={handleAddSavedDate}
      handleDeleteSavedDate={handleDeleteSavedDate}
      // Captures Props
      captures={captures}
      newCaptureType={newCaptureType}
      setNewCaptureType={setNewCaptureType}
      newCaptureContent={newCaptureContent}
      setNewCaptureContent={setNewCaptureContent}
      isRecordingCapture={isRecordingCapture}
      setIsRecordingCapture={setIsRecordingCapture}
      capturedImage={capturedImage}
      setCapturedImage={setCapturedImage}
      isCapturingImage={isCapturingImage}
      setIsCapturingImage={setIsCapturingImage}
      cameraStream={cameraStream}
      isCameraPreview={isCameraPreview}
      recordingDuration={recordingDuration}
      startVoiceRecording={startVoiceRecording}
      stopVoiceRecording={stopVoiceRecording}
      startCameraPreview={startCameraPreview}
      captureFromStream={captureFromStream}
      stopCameraPreview={stopCameraPreview}
      handleAddCapture={handleAddCapture}
      handleDeleteCapture={handleDeleteCapture}
    />
  );
}
