from fastapi import Body, Depends, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

from .database import SessionLocal, engine, Base
from .models import Memory
from .schemas import MemoryCreate, MemoryResponse
from .services.embedding_service import EmbeddingService
from .services.insight_service import InsightService
from .services.memory_service import MemoryService

# Create database tables
Base.metadata.create_all(bind=engine)

app = FastAPI(title="AI Personal Memory Assistant")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173", "http://localhost:5174", "http://127.0.0.1:5174"],  # Vite dev server
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Dependency injection
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def get_memory_service():
    embedding_service = EmbeddingService()
    return MemoryService(embedding_service)


def get_insight_service(memory_service: MemoryService = Depends(get_memory_service)):
    return InsightService(memory_service)


@app.get("/health")
async def health_check():
    return {"status": "healthy"}

@app.get("/memories")
async def list_memories(
    db: Session = Depends(get_db),
    memory_service: MemoryService = Depends(get_memory_service)
):
    return memory_service.list_memories(db)

@app.get("/memories/{memory_id}")
async def get_memory(
    memory_id: int,
    db: Session = Depends(get_db),
    memory_service: MemoryService = Depends(get_memory_service)
):
    memory = memory_service.get_memory(db, memory_id)
    if memory is None:
        raise HTTPException(status_code=404, detail="Memory not found")
    return memory

@app.post("/memories")
async def create_memory(
    payload: MemoryCreate,
    db: Session = Depends(get_db),
    memory_service: MemoryService = Depends(get_memory_service)
):
    return memory_service.create_memory(db, payload)

@app.post("/search")
async def search_memories(
    query: str = Body(..., embed=True),
    limit: int = 5,
    db: Session = Depends(get_db),
    memory_service: MemoryService = Depends(get_memory_service)
):
    return memory_service.search_memories(db, query, limit)


@app.get("/insights")
async def get_insights(
    db: Session = Depends(get_db),
    insight_service: InsightService = Depends(get_insight_service)
):
    return insight_service.generate_insights(db)