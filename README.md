# AI Personal Memory Assistant

A full-stack AI Personal Memory Assistant built with FastAPI, React, SQLite, ChromaDB, embeddings-based semantic search, and ML-powered insights.

## Project structure

- `backend/` FastAPI backend, SQLAlchemy models, Pydantic schemas, memory and insight services.
- `frontend/` Vite + React UI for submitting memories, searching, and viewing insights.
- `.venv/` local Python virtual environment (ignored by git).
- `.gitignore` excludes environment, build artifacts, logs, and IDE files.

## Key features

- Register and sign in to a private account.
- Keep memories scoped to the currently logged-in user only.
- Add, edit, delete, and organize memories with mood, tags, and importance.
- Save memories to SQLite and keep semantic embeddings in sync with ChromaDB.
- Semantic search with server-side filters for mood, tag, importance, and result limits.
- Generate richer insights with average priority, recent activity, mood highlights, and top themes.
- Export all memories as JSON for backup or portability.

## Local LLM setup (Windows)

To enable the local, fully private Chat Agent, install Ollama and run a lightweight model:

1. Open PowerShell and run the install command:
   ```powershell
   irm https://ollama.com/install.ps1 | iex
   ```
2. Once installed, download and start the Llama 3.2 model (leave this terminal running in the background):
   ```bat
       ollama run llama3.2:1b
   ```

## Backend setup (Windows)

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
5. The AI chat and AI memory-saving flow require the `ollama` Python package from `backend/requirements.txt` and a running local Ollama model.
6. Run the FastAPI backend:
   ```bat
   python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000 --app-dir backend
   ```

Backend server:
`http://127.0.0.1:8000`

## Frontend setup (Windows)

1. Open a terminal in the `frontend` folder:
   ```bat
   cd frontend
   ```
2. Install frontend dependencies:
   ```bat
   npm install
   ```
3. Start the Vite development server:
   ```bat
   npm run dev
   ```

Frontend dev server:
`http://127.0.0.1:5173`

## GitHub setup

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

If you want to use the GitHub CLI later, the equivalent command is:
```bat
gh repo create <repo-name> --public --source=. --remote=origin
```

## Notes

- Authentication endpoints are available at `POST /auth/register`, `POST /auth/login`, `GET /auth/me`, and `POST /auth/logout`.
- The backend API does not use an `/api` prefix; endpoints are mounted at the root.
- Memory export is available at `GET /memories/export/all`.
- Search is available at `POST /search` with `query`, optional `mood`, `tag`, `importance`, and `limit`.
- For local development, start the backend with `--app-dir backend`; omitting it can cause startup/import failures and the frontend may show `Failed to fetch`.
- If AI chat opens but does not save memories, verify all three pieces are running: the FastAPI backend, the Ollama app/service, and the `llama3.2:1b` model.
- Existing shared memories from older versions are assigned to a local legacy account during schema upgrade.
- Keep `.venv/`, `node_modules/`, and local database files out of source control.
- Run backend and frontend separately while developing.
