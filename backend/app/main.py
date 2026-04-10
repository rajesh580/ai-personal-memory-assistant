from fastapi import Depends, FastAPI, Header, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

from .database import SessionLocal, engine, Base, ensure_schema
from .models import User
from .schemas import (
    AuthResponse,
    MemoryCreate,
    MemoryUpdate,
    SearchRequest,
    UserLogin,
    UserRegister,
    UserResponse,
)
from .services.auth_service import AuthService
from .services.insight_service import InsightService
from .services.memory_service import MemoryService

try:
    from .services.embedding_service import EmbeddingService
except Exception:
    EmbeddingService = None

# Create database tables
Base.metadata.create_all(bind=engine)
ensure_schema()

app = FastAPI(title="AI Personal Memory Assistant")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:5174",
        "http://127.0.0.1:5174",
    ],
    allow_origin_regex=r"https?://(localhost|127\.0\.0\.1)(:\d+)?$",
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
    if EmbeddingService is not None:
        return MemoryService(EmbeddingService())
    return MemoryService()


def get_auth_service():
    return AuthService()


def get_insight_service(memory_service: MemoryService = Depends(get_memory_service)):
    return InsightService(memory_service)


def get_current_user(
    authorization: str | None = Header(default=None),
    db: Session = Depends(get_db),
    auth_service: AuthService = Depends(get_auth_service),
) -> User:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Authentication required")

    token = authorization.removeprefix("Bearer ").strip()
    user = auth_service.get_user_by_token(db, token)
    if user is None:
        raise HTTPException(status_code=401, detail="Invalid or expired session")
    return user


@app.get("/health")
async def health_check():
    return {"status": "healthy"}


@app.post("/auth/register", response_model=AuthResponse)
async def register(
    payload: UserRegister,
    db: Session = Depends(get_db),
    auth_service: AuthService = Depends(get_auth_service),
):
    existing_user = db.query(User).filter(User.email == payload.email).first()
    if existing_user is not None:
        raise HTTPException(status_code=400, detail="An account with that email already exists")

    user = auth_service.create_user(db, payload.email, payload.password)
    token = auth_service.create_session(db, user)
    return {"token": token, "user": user}


@app.post("/auth/login", response_model=AuthResponse)
async def login(
    payload: UserLogin,
    db: Session = Depends(get_db),
    auth_service: AuthService = Depends(get_auth_service),
):
    user = auth_service.authenticate_user(db, payload.email, payload.password)
    if user is None:
        raise HTTPException(status_code=401, detail="Invalid email or password")

    token = auth_service.create_session(db, user)
    return {"token": token, "user": user}


@app.get("/auth/me", response_model=UserResponse)
async def get_me(current_user: User = Depends(get_current_user)):
    return current_user


@app.post("/auth/logout")
async def logout(
    authorization: str | None = Header(default=None),
    db: Session = Depends(get_db),
    auth_service: AuthService = Depends(get_auth_service),
    current_user: User = Depends(get_current_user),
):
    token = authorization.removeprefix("Bearer ").strip()
    auth_service.delete_session(db, token)
    return {"detail": f"Signed out {current_user.email}"}


@app.get("/memories")
async def list_memories(
    db: Session = Depends(get_db),
    memory_service: MemoryService = Depends(get_memory_service),
    current_user: User = Depends(get_current_user),
):
    return memory_service.list_memories(db, current_user)

@app.get("/memories/{memory_id}")
async def get_memory(
    memory_id: int,
    db: Session = Depends(get_db),
    memory_service: MemoryService = Depends(get_memory_service),
    current_user: User = Depends(get_current_user),
):
    memory = memory_service.get_memory(db, current_user, memory_id)
    if memory is None:
        raise HTTPException(status_code=404, detail="Memory not found")
    return memory

@app.post("/memories")
async def create_memory(
    payload: MemoryCreate,
    db: Session = Depends(get_db),
    memory_service: MemoryService = Depends(get_memory_service),
    current_user: User = Depends(get_current_user),
):
    return memory_service.create_memory(db, current_user, payload)

@app.delete("/memories/{memory_id}")
async def delete_memory(
    memory_id: int,
    db: Session = Depends(get_db),
    memory_service: MemoryService = Depends(get_memory_service),
    current_user: User = Depends(get_current_user),
):
    success = memory_service.delete_memory(db, current_user, memory_id)
    if not success:
        raise HTTPException(status_code=404, detail="Memory not found")
    return {"detail": "Memory deleted"}

@app.patch("/memories/{memory_id}")
async def update_memory(
    memory_id: int,
    payload: MemoryUpdate,
    db: Session = Depends(get_db),
    memory_service: MemoryService = Depends(get_memory_service),
    current_user: User = Depends(get_current_user),
):
    updated = memory_service.update_memory(db, current_user, memory_id, payload)
    if updated is None:
        raise HTTPException(status_code=404, detail="Memory not found")
    return updated

@app.post("/search")
async def search_memories(
    payload: SearchRequest,
    db: Session = Depends(get_db),
    memory_service: MemoryService = Depends(get_memory_service),
    current_user: User = Depends(get_current_user),
):
    return memory_service.search_memories(
        db,
        current_user,
        payload.query,
        payload.limit,
        mood=payload.mood,
        importance=payload.importance,
        tag=payload.tag,
    )


@app.get("/memories/export/all")
async def export_memories(
    db: Session = Depends(get_db),
    memory_service: MemoryService = Depends(get_memory_service),
    current_user: User = Depends(get_current_user),
):
    return memory_service.export_memories(db, current_user)


@app.get("/insights")
async def get_insights(
    db: Session = Depends(get_db),
    insight_service: InsightService = Depends(get_insight_service),
    current_user: User = Depends(get_current_user),
):
    return insight_service.generate_insights(db, current_user)
