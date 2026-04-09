# AI Personal Memory Assistant

A full-stack AI Personal Memory Assistant built with FastAPI, React, SQLite, ChromaDB, embeddings-based semantic search, and ML-powered insights.

## Project structure

- `backend/` FastAPI backend, SQLAlchemy models, Pydantic schemas, memory and insight services.
- `frontend/` Vite + React UI for submitting memories, searching, and viewing insights.
- `.venv/` local Python virtual environment (ignored by git).
- `.gitignore` excludes environment, build artifacts, logs, and IDE files.

## Key features

- Add memories with mood, tags, and importance.
- Save memories to SQLite and embed them using ChromaDB.
- Semantic search over memory content.
- Generate insights from stored memories.

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
5. Run the FastAPI backend:
   ```bat
   uvicorn app.main:app --reload --host 127.0.0.1 --port 8000 --app-dir backend
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

- The backend API does not use an `/api` prefix; endpoints are mounted at the root.
- Keep `.venv/`, `node_modules/`, and local database files out of source control.
- Run backend and frontend separately while developing.
