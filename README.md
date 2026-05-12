# AI Personal Memory Assistant

A full-stack AI Personal Memory Assistant built with FastAPI, React, SQLite, ChromaDB, embeddings-based semantic search, and ML-powered insights.

## Project Overview

This is a sophisticated personal memory management system that leverages AI and semantic search to help users store, organize, and retrieve their personal memories with ease. The application uses **vector embeddings** to enable semantic similarity search, meaning you can find memories based on meaning and context rather than just keyword matching. It includes intelligent insights generation, mood tracking, and local LLM integration for privacy-first AI features.

### Core Problem Statement

Users want a **private, intelligent memory system** that:
- Stores personal thoughts and experiences securely
- Finds memories based on semantic meaning (not just keywords)
- Generates intelligent insights about mood trends and life themes
- Enables AI-powered assistance without cloud dependency (local Ollama)
- Maintains complete privacy with user authentication

## Technology Stack

| Layer | Technologies |
|-------|--------------|
| **Frontend** | React 18, Vite, Modern CSS, React Router |
| **Backend** | FastAPI, Python 3.10+, Pydantic, SQLAlchemy |
| **Database** | SQLite (relational data), ChromaDB (vector embeddings) |
| **AI/ML** | Ollama (local LLM), Sentence Transformers (embeddings) |
| **Authentication** | JWT tokens, bcrypt password hashing |
| **Deployment** | Can run locally or containerize with Docker |

## Project Structure

### Root Directory
```
├── backend/                # FastAPI backend application
├── frontend/               # React frontend application
├── uploads/                # Temporary file storage
└── README.md               # This file
```

### Backend Structure
```
backend/
├── requirements.txt        # Python dependencies
├── app/
│   ├── __init__.py
│   ├── main.py            # FastAPI app initialization and routes
│   ├── database.py        # SQLAlchemy setup, session management
│   ├── models.py          # SQLAlchemy ORM models (User, Memory, etc.)
│   ├── schemas.py         # Pydantic schemas for request/response validation
│   ├── api/               # API endpoints (organized by feature)
│   └── services/          # Business logic layer
│       ├── auth_service.py      # Authentication & JWT
│       ├── chat_service.py      # LLM chat integration with Ollama
│       ├── embedding_service.py # Vector embeddings & ChromaDB
│       ├── insight_service.py   # Insights generation (mood, themes, etc.)
│       └── memory_service.py    # Memory CRUD and semantic search
├── data/
│   └── chroma/            # ChromaDB vector store
└── uploads/               # Uploaded file storage
```

### Frontend Structure
```
frontend/
├── package.json           # Node dependencies and scripts
├── vite.config.js         # Vite bundler configuration
├── index.html             # HTML entry point
├── src/
│   ├── main.jsx          # React app entry
│   ├── App.jsx           # Root component with routing
│   ├── index.css         # Global styles
│   ├── components/       # React components
│   │   ├── AuthPanel.jsx       # Login/Register UI
│   │   ├── ChatAgent.jsx       # AI chat interface
│   │   ├── InsightsPanel.jsx   # Display insights and analytics
│   │   ├── MemoryForm.jsx      # Create/Edit memory form
│   │   ├── MemoryList.jsx      # Display list of memories
│   │   ├── NavBar.jsx          # Navigation component
│   │   └── SearchPanel.jsx     # Semantic search interface
│   └── services/
│       └── api.js        # Axios API client for backend
```

## Key Features (Detailed)

### 1. **User Authentication**
- **Registration**: Create new user account with username and password
- **Login**: Secure authentication with JWT tokens
- **Session Management**: Tokens stored in localStorage for persistent sessions
- **User Isolation**: All data strictly scoped to logged-in user
- **Secure Passwords**: bcrypt hashing with salt rounds

```
POST /auth/register  → Create account
POST /auth/login     → Get JWT token
GET /auth/me         → Verify current user
POST /auth/logout    → Invalidate session
```

### 2. **Memory Management**
Users can create rich memories with:
- **Title & Content**: What you want to remember
- **Mood**: Emotional state (happy, sad, neutral, excited, etc.)
- **Tags**: Categorize memories (work, personal, health, etc.)
- **Importance**: Priority level (1-5 scale)
- **Timestamps**: Auto-tracked creation and update times

Operations:
```
POST /memories           → Create new memory
GET /memories            → List all user's memories
GET /memories/{id}       → Get specific memory
PUT /memories/{id}       → Update memory
DELETE /memories/{id}    → Delete memory
```

### 3. **Semantic Search** (Advanced)
Instead of keyword matching, uses AI embeddings to understand meaning:

**How it works:**
1. Each memory is converted to a vector embedding (384-dimensional representation of meaning)
2. Your search query is also converted to an embedding
3. ChromaDB finds memories with similar embeddings (cosine similarity)
4. Results ranked by relevance, not just keyword presence

**Example:** Search "feeling accomplished" might find memories about "won a promotion" or "finished a project"

**Server-side Filters:**
- Filter by mood, tags, importance
- Limit number of results
- Sort by relevance or date

```
POST /memories/search → Semantic search with filters
```

### 4. **AI-Powered Insights**
Automatically generated analytics about your memories:

- **Average Priority**: How important your memories are overall
- **Recent Activity**: When you last added memories
- **Mood Highlights**: Most common emotional patterns
- **Top Themes**: Frequently appearing tags and topics
- **Patterns**: Identifies trends in your thinking

```
GET /insights → Get aggregate insights
```

### 5. **Chat Agent** (Local LLM)
Private AI assistant powered by Ollama (runs locally on your machine):

- **No Cloud Dependency**: Everything stays on your device
- **Memory Context**: Can reference your stored memories in conversations
- **Interactive Chat**: Multi-turn conversations
- **Privacy**: No data sent to external services

```
POST /chat → Send message to AI chat
```

### 6. **Data Export**
- Export all memories as JSON for backup or portability
- Includes full memory details and metadata
- Useful for migration or archival

```
GET /memories/export → Download all memories as JSON
```

## Database Design

### SQLite (Persistent Storage)
**Tables:**
- `user`: User accounts with hashed passwords
- `memory`: Memory records (title, content, mood, tags, importance, timestamps)

**Relationships:**
- One user can have many memories (1:N relationship)
- Cascading delete: Deleting a user deletes their memories

### ChromaDB (Vector Store)
**Purpose:** Stores vector embeddings for semantic search
- Embedding model: Sentence Transformers (384-dim vectors)
- Distance metric: Cosine similarity
- Collection naming: `{user_id}_memories`
- Records mapped: Each memory has corresponding embedding

**Sync Strategy:**
- When memory is created/updated → embedding generated and stored
- When memory is deleted → embedding removed from ChromaDB
- When memory is modified → embedding updated

## Data Flow & Architecture

### Memory Creation Flow
```
User Input (UI) 
  → Validation (Pydantic) 
  → Save to SQLite 
  → Generate embedding 
  → Store in ChromaDB 
  → Return to user
```

### Semantic Search Flow
```
Search Query 
  → Convert to embedding 
  → Query ChromaDB 
  → Apply SQLite filters 
  → Rank by relevance 
  → Return results
```

### Chat Agent Flow
```
User Message 
  → Send to Ollama LLM 
  → LLM processes with memory context 
  → Stream response back 
  → Store conversation history
```

### Insights Generation Flow
```
Fetch all user memories 
  → Aggregate statistics (mood, tags, importance) 
  → Calculate trends 
  → Analyze patterns 
  → Format insights response
```

## Services (Business Logic Layer)

### `auth_service.py`
- User registration with password hashing
- JWT token generation and validation
- Login verification
- Session management

### `memory_service.py`
- CRUD operations for memories
- Coordinates with embedding and insight services
- Handles data validation
- User data isolation

### `embedding_service.py`
- Converts text to vector embeddings
- Manages ChromaDB collections
- Semantic similarity search
- Sync embeddings with database changes

### `chat_service.py`
- Communicates with local Ollama instance
- Maintains conversation context
- Integrates user memories into chat context
- Handles streaming responses

### `insight_service.py`
- Aggregates memory statistics
- Identifies mood trends
- Extracts top themes from tags
- Calculates engagement metrics

## Key Features
- Register and sign in to a private account.
- Keep memories scoped to the currently logged-in user only.
- Add, edit, delete, and organize memories with mood, tags, and importance.
- Save memories to SQLite and keep semantic embeddings in sync with ChromaDB.
- Semantic search with server-side filters for mood, tag, importance, and result limits.
- Generate richer insights with average priority, recent activity, mood highlights, and top themes.
- Export all memories as JSON for backup or portability.

## Complete API Reference

### Authentication Endpoints
```
POST   /auth/register        Register new user
POST   /auth/login           Login and get JWT token
GET    /auth/me              Get current user info
POST   /auth/logout          Logout current user
```

### Memory Endpoints
```
POST   /memories             Create new memory
GET    /memories             Get all memories (paginated)
GET    /memories/{id}        Get specific memory
PUT    /memories/{id}        Update memory
DELETE /memories/{id}        Delete memory
POST   /memories/search      Semantic search memories
GET    /memories/export      Export all memories as JSON
```

### Insight Endpoints
```
GET    /insights             Get aggregate insights about memories
```

### Chat Endpoints
```
POST   /chat                 Send message to AI chat agent
GET    /chat/history         Get chat conversation history
```

## Local LLM setup (Windows)

To enable the local, fully private Chat Agent, install Ollama and run a lightweight model:

### Why Ollama?
- **Complete Privacy**: All processing happens on your local machine
- **No API Keys**: No external service dependencies
- **Lightweight**: Runs efficiently on consumer hardware
- **Offline Capable**: Works without internet connection after setup
- **Open Source**: Transparent and trustworthy

### Installation Steps

1. Open PowerShell and run the install command:
   ```powershell
   irm https://ollama.com/install.ps1 | iex
   ```

2. Once installed, download and start the Llama 3.2 model (leave this terminal running in the background):
   ```bat
   ollama run llama3.2:1b
   ```

3. Verify Ollama is running:
   ```bat
   curl http://localhost:11434/api/tags
   ```

### Model Selection
- **llama3.2:1b** (Recommended): Fast, lightweight, ~1GB memory requirement
- **llama3.2:3b**: Slightly slower but more capable
- **neural-chat**: Optimized for conversational tasks

The backend expects Ollama running at `http://localhost:11434` by default.

## Backend setup (Windows)

### Prerequisites
- Python 3.10 or higher installed
- Ollama running (for chat features)
- ChromaDB (installed via requirements.txt)

### Setup Steps

1. Open a terminal in the project root.

2. Create a Python virtual environment:
   ```bat
   python -m venv .venv
   ```

3. Activate the virtual environment:
   ```bat
   .venv\Scripts\activate
   ```

4. Install backend dependencies:
   ```bat
   python -m pip install -r backend/requirements.txt
   ```

   **Key dependencies:**
   - `fastapi`: Web framework
   - `sqlalchemy`: ORM for database
   - `pydantic`: Data validation
   - `chromadb`: Vector database
   - `sentence-transformers`: Embedding model
   - `ollama`: Python client for Ollama
   - `python-jose`: JWT token handling
   - `passlib`: Password hashing

5. Run the FastAPI backend:
   ```bat
   python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000 --app-dir backend
   ```

### Backend Server Access
- **URL**: `http://127.0.0.1:8000`
- **API Docs**: `http://127.0.0.1:8000/docs` (Interactive Swagger UI)
- **ReDoc**: `http://127.0.0.1:8000/redoc` (Alternative API documentation)

### Database Files
- **SQLite**: `backend/data/memories.db` (created on first run)
- **ChromaDB**: `backend/data/chroma/` (vector embeddings)

## Frontend setup (Windows)

### Prerequisites
- Node.js 16+ and npm installed
- Backend running on `http://127.0.0.1:8000`

### Setup Steps

1. Open a terminal in the `frontend` folder:
   ```bat
   cd frontend
   ```

2. Install frontend dependencies:
   ```bat
   npm install
   ```

   **Key dependencies:**
   - `react`: UI library
   - `axios`: HTTP client
   - `vite`: Lightning-fast build tool
   - `react-router-dom`: Client-side routing

3. Start the Vite development server:
   ```bat
   npm run dev
   ```

### Frontend Dev Server
- **URL**: `http://127.0.0.1:5173`
- **Hot Reload**: Automatic refresh on code changes
- **Development Mode**: Includes React DevTools and detailed error messages

### Frontend Build for Production
```bat
npm run build
```
Creates optimized production bundle in `frontend/dist/`

## Running the Full Stack

### Terminal 1: Ollama
```bat
ollama run llama3.2:1b
```
Keep running in background for chat features.

### Terminal 2: Backend
```bat
cd c:\path\to\project
.venv\Scripts\activate
python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000 --app-dir backend
```

### Terminal 3: Frontend
```bat
cd c:\path\to\project\frontend
npm run dev
```

### Access the Application
- **Frontend UI**: `http://127.0.0.1:5173`
- **Backend API**: `http://127.0.0.1:8000`
- **API Docs**: `http://127.0.0.1:8000/docs`

## Environment Variables

### Backend Configuration
Create `.env` file in `backend/` if needed:
```env
DATABASE_URL=sqlite:///./data/memories.db
OLLAMA_BASE_URL=http://localhost:11434
JWT_SECRET=your-secret-key-change-this
JWT_ALGORITHM=HS256
CORS_ORIGINS=["http://127.0.0.1:5173"]
```

### Frontend Configuration
The frontend communicates with backend at `http://127.0.0.1:8000` by default (see `frontend/src/services/api.js`).

## Troubleshooting

### Backend Issues

#### "ModuleNotFoundError: No module named 'app'"
**Solution**: Make sure you're running from project root and using the `--app-dir backend` flag.

#### "Connection refused" to Ollama
**Solution**: Ensure Ollama is running (`ollama run llama3.2:1b` in separate terminal).

#### SQLite database locked
**Solution**: 
1. Close any other Python processes using the database
2. Delete `backend/data/memories.db` and restart (this creates fresh database)

#### ChromaDB persistence issues
**Solution**: 
1. ChromaDB data stored in `backend/data/chroma/`
2. Delete this folder to reset vector store
3. Recreate embeddings by re-adding memories

### Frontend Issues

#### "Cannot find module" errors
**Solution**: 
```bat
cd frontend
rm -r node_modules package-lock.json
npm install
npm run dev
```

#### Port 5173 already in use
**Solution**:
```bat
npm run dev -- --port 5174
```
Or kill the process: `netstat -ano | findstr :5173` then `taskkill /PID <PID>`

#### Backend API not responding
**Solution**:
1. Verify backend is running: `curl http://127.0.0.1:8000/docs`
2. Check console for error messages
3. Restart both frontend and backend

### Chat Agent Issues

#### Ollama connection errors
**Solution**:
1. Verify Ollama running: `curl http://localhost:11434/api/tags`
2. Check backend logs for connection attempts
3. Restart Ollama and backend

#### Chat responses very slow
**Solution**:
1. This is normal for first run (model loading)
2. Consider using `llama3.2:1b` (fastest) or upgrade hardware
3. Chat requests timeout after 30 seconds (configurable)

### Authentication Issues

#### "Invalid credentials" after login
**Solution**:
1. Verify username/password are correct
2. Create new account if forgotten
3. Check backend logs for authentication errors

#### JWT token expired
**Solution**:
1. Browser clears localStorage after logout automatically
2. Log in again to get new token
3. Tokens expire after 24 hours (configurable)

## Development Workflow

### Project Structure Best Practices

**Backend**: Feature-driven organization
```
services/          # Business logic (reusable)
models.py          # Database schemas
schemas.py         # Request/response validation
main.py            # Routes and initialization
```

**Frontend**: Component-driven
```
components/        # Reusable UI components
services/          # API client logic
App.jsx            # Routing and state
```

### Adding a New Feature

1. **Backend**:
   - Add model in `models.py`
   - Add schema in `schemas.py`
   - Create service logic in `services/`
   - Add routes in `main.py` or `api/`

2. **Frontend**:
   - Create component in `components/`
   - Add API calls in `services/api.js`
   - Integrate into `App.jsx`

3. **Database**:
   - Update SQLAlchemy models for new tables
   - Run migrations if using Alembic (optional)

### Testing Endpoints

Using Swagger UI at `http://127.0.0.1:8000/docs`:
1. Register a new user
2. Login to get JWT token
3. Try API endpoints with "Authorize" button
4. View responses and error messages

Or use curl:
```bat
curl -X POST http://127.0.0.1:8000/auth/register ^
  -H "Content-Type: application/json" ^
  -d "{\"username\":\"testuser\",\"password\":\"testpass\"}"
```

## Performance Considerations

### Database
- SQLite suitable for single-user applications
- For multi-user: Consider PostgreSQL or MySQL
- Indexes on `user_id` and memory timestamps improve query speed

### Embeddings
- First embedding generation slower (model loading)
- Subsequent requests cached in memory
- For large memory databases (>10K): Consider batch processing

### Chat
- Ollama requires ~2GB RAM for llama3.2:1b
- First response slower (model initialization)
- Increase `timeout` in `chat_service.py` for slower hardware

## Scaling & Production

### Current Limitations
- Single SQLite database (not concurrent writer-friendly)
- Ollama runs locally (not distributed)
- No caching layer (every search queries ChromaDB)

### Upgrade Path to Production
1. **Database**: Switch to PostgreSQL with connection pooling
2. **Caching**: Add Redis for frequent queries
3. **LLM**: Deploy Ollama on separate server or use cloud API
4. **Deployment**: Containerize with Docker, deploy to cloud (AWS, Azure, GCP)
5. **Scaling**: Implement load balancing, separate services tier
- The backend API does not use an `/api` prefix; endpoints are mounted at the root.
- Memory export is available at `GET /memories/export/all`.
- Search is available at `POST /search` with `query`, optional `mood`, `tag`, `importance`, and `limit`.
- For local development, start the backend with `--app-dir backend`; omitting it can cause startup/import failures and the frontend may show `Failed to fetch`.
- If AI chat opens but does not save memories, verify all three pieces are running: the FastAPI backend, the Ollama app/service, and the `llama3.2:1b` model.
- Existing shared memories from older versions are assigned to a local legacy account during schema upgrade.
- Keep `.venv/`, `node_modules/`, and local database files out of source control.
- Run backend and frontend separately while developing.

## GitHub Setup & Version Control

### Initialize Repository
1. Initialize a local git repository if you haven't already:
   ```bat
   git init
   git add .
   git commit -m "Initial commit"
   ```

2. Create a new repository on GitHub.

3. Add the GitHub remote and push the code:
   ```bat
   git remote add origin https://github.com/<your-username>/<repo-name>.git
   git branch -M main
   git push -u origin main
   ```

### Using GitHub CLI (Optional)
If you prefer a faster setup with GitHub CLI:
```bat
gh repo create <repo-name> --public --source=. --remote=origin
```

### Recommended .gitignore Entries
```
.venv/
__pycache__/
*.pyc
node_modules/
frontend/dist/
.env
backend/data/
uploads/
.DS_Store
```

## Architecture Diagram

```
┌─────────────────┐
│   Frontend      │
│   (React)       │──┐
│   :5173         │  │
└────────┬────────┘  │
         │           │
         │ HTTP      │
         │           │
┌────────▼────────────┴──┐
│   Backend (FastAPI)    │
│   :8000                │
│  ┌────────────────┐    │
│  │ Auth Service   │    │
│  │ Memory Service │    │
│  │ Embedding Svc  │    │
│  │ Chat Service   │    │
│  │ Insight Service│    │
│  └────────────────┘    │
└──────┬────┬────┬───────┘
       │    │    │
       │    │    └─────────────┐
       │    │                  │
  ┌────▼──┐│      ┌───────────▼────┐
  │SQLite ││      │  ChromaDB       │
  │       ││      │  (Embeddings)   │
  │Memories││     │                │
  └────────┘│     └────────────────┘
       │    │
       │    └──────────────────┐
       │                       │
       ▼                       ▼
  [memories.db]         [chroma.sqlite3]
     [data/]               [data/chroma/]

External (Local Machine):
┌────────────────────┐
│  Ollama            │
│  :11434            │
│  (LLM Model)       │
└────────────────────┘
```

## Contributing

### Code Style
- **Backend**: Follow PEP 8 (Python style guide)
- **Frontend**: Use Prettier for formatting
- **Git Commits**: Use clear, descriptive messages

### Adding Features
1. Create a feature branch: `git checkout -b feature/your-feature-name`
2. Make changes following project structure
3. Test thoroughly on local setup
4. Commit with clear messages
5. Push and create Pull Request

### Reporting Issues
Include:
- What were you trying to do?
- What went wrong?
- Error messages or screenshots
- Your OS and Python/Node versions
- Steps to reproduce

## Future Enhancements

- [ ] Advanced analytics dashboard with charts
- [ ] Memory tagging with AI auto-tagging
- [ ] Integration with calendar/timeline
- [ ] Full-text search with Elasticsearch
- [ ] Mobile app (React Native)
- [ ] Voice input for hands-free memory creation
- [ ] Memory sharing between users (privacy-controlled)
- [ ] Memory suggestion based on context
- [ ] Backup to cloud (Google Drive, OneDrive)
- [ ] Docker containerization for easy deployment
- [ ] Database migration tools (Alembic)
- [ ] Unit and integration tests
- [ ] CI/CD pipeline (GitHub Actions)

## License

This project is open source and available under the MIT License.

## Resources

### Documentation
- [FastAPI Docs](https://fastapi.tiangolo.com/)
- [React Docs](https://react.dev/)
- [SQLAlchemy Docs](https://docs.sqlalchemy.org/)
- [ChromaDB Docs](https://docs.trychroma.com/)
- [Ollama Docs](https://ollama.ai/)

### Related Projects
- [ChromaDB](https://www.trychroma.com/) - Vector database
- [Ollama](https://ollama.ai/) - Local LLM running
- [Sentence Transformers](https://www.sbert.net/) - Embedding models
- [FastAPI](https://fastapi.tiangolo.com/) - Modern API framework

## Support

For questions or issues:
1. Check the Troubleshooting section above
2. Review GitHub Issues
3. Create a new GitHub Issue with detailed description
4. Check related project documentation
