# AI Personal Memory Assistant

A full-stack AI Personal Memory Assistant built with FastAPI, React, SQLite, ChromaDB, embeddings-based semantic search, and ML-powered insights.

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
   uvicorn app.main:app --app-dir backend --reload
   ```

Backend API base URL:
`http://127.0.0.1:8000/api`

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

## Notes

- The assistant stores memories with metadata such as mood, tags, and importance.
- Semantic search is powered by embeddings and vector similarity.
- Insights are generated from stored memories using practical ML-powered analysis heuristics.