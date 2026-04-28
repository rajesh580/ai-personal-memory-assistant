from fastapi import Depends, FastAPI, File, Header, HTTPException, Query, Request, UploadFile, WebSocket
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
import json
import mimetypes
import os
import shutil
from pathlib import Path
from sqlalchemy.orm import Session

from .database import SessionLocal, engine, Base, ensure_schema
from .models import User
from .models import Deadline, Habit, Meeting, Note, SavedDate, Todo
from .schemas import (
    AuthResponse,
    CaptureCreate,
    CaptureResponse,
    DeadlineCreate,
    DeadlineResponse,
    HabitCreate,
    HabitResponse,
    HabitUpdate,
    MemoryCreate,
    MemoryUpdate,
    MeetingCreate,
    MeetingResponse,
    NoteCreate,
    NoteResponse,
    NoteUpdate,
    SavedDateCreate,
    SavedDateResponse,
    SearchRequest,
    TodoCreate,
    TodoResponse,
    TodoUpdate,
    UserLogin,
    UserRegister,
    UserResponse,
)
from .services.auth_service import AuthService
from .services.insight_service import InsightService
from .services.chat_service import ChatService
from .services.memory_service import MemoryService

try:
    from .services.embedding_service import EmbeddingService
except Exception:
    EmbeddingService = None

# Create database tables
Base.metadata.create_all(bind=engine)
ensure_schema()

# Create uploads directory
UPLOAD_DIR = Path("uploads")
UPLOAD_DIR.mkdir(exist_ok=True)

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


def build_public_file_url(request: Request, file_url: str | None) -> str | None:
    if not file_url:
        return None
    if file_url.startswith(("http://", "https://")):
        return file_url
    return str(request.base_url).rstrip("/") + "/" + file_url.lstrip("/")


def serialize_capture(capture, request: Request) -> dict:
    return {
        "id": capture.id,
        "type": capture.type,
        "content": capture.content,
        "date": capture.date,
        "audio_url": build_public_file_url(request, capture.audio_url),
        "image_url": build_public_file_url(request, capture.image_url),
        "created_at": capture.created_at,
    }


def get_upload_media_type(file_path: Path) -> str:
    suffix = file_path.suffix.lower()
    if suffix in {".webm", ".weba"}:
        return "audio/webm"
    if suffix == ".mp3":
        return "audio/mpeg"
    if suffix in {".m4a", ".mp4"}:
        return "audio/mp4"
    if suffix == ".wav":
        return "audio/wav"
    if suffix == ".ogg":
        return "audio/ogg"
    guessed_type, _ = mimetypes.guess_type(str(file_path))
    return guessed_type or "application/octet-stream"


def parse_habit_days(days: str | None) -> list[bool]:
    if not days:
        return [False] * 7
    try:
        parsed = json.loads(days)
        normalized = [bool(item) for item in parsed]
        if len(normalized) == 7:
            return normalized
    except Exception:
        pass
    return [False] * 7


def serialize_note(note: Note) -> dict:
    return {
        "id": note.id,
        "title": note.title,
        "content": note.content,
        "created_at": note.created_at,
        "updated_at": note.updated_at,
        "createdAt": note.created_at,
        "updatedAt": note.updated_at,
    }


def serialize_todo(todo: Todo) -> dict:
    return {
        "id": todo.id,
        "text": todo.text,
        "importance": todo.importance,
        "completed": todo.completed,
        "created_at": todo.created_at,
    }


def serialize_meeting(meeting: Meeting) -> dict:
    return {
        "id": meeting.id,
        "title": meeting.title,
        "date": meeting.date,
        "time": meeting.time,
        "withPerson": meeting.with_person,
        "location": meeting.location,
        "type": meeting.type,
        "created_at": meeting.created_at,
    }


def serialize_deadline(deadline: Deadline) -> dict:
    return {
        "id": deadline.id,
        "title": deadline.title,
        "date": deadline.date,
        "priority": deadline.priority,
        "created_at": deadline.created_at,
    }


def serialize_habit(habit: Habit) -> dict:
    return {
        "id": habit.id,
        "name": habit.name,
        "streak": habit.streak,
        "days": parse_habit_days(habit.days),
        "created_at": habit.created_at,
    }


def serialize_saved_date(saved_date: SavedDate) -> dict:
    return {
        "id": saved_date.id,
        "title": saved_date.title,
        "date": saved_date.date,
        "note": saved_date.note,
        "created_at": saved_date.created_at,
    }


def get_chat_service(memory_service: MemoryService = Depends(get_memory_service)):
    return ChatService(memory_service)


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


@app.get("/uploads/{user_id}/{filename:path}")
async def serve_upload(user_id: int, filename: str):
    user_dir = (UPLOAD_DIR / str(user_id)).resolve()
    file_path = (user_dir / filename).resolve()

    if not str(file_path).startswith(str(user_dir)) or not file_path.exists():
        raise HTTPException(status_code=404, detail="File not found")

    return FileResponse(file_path, media_type=get_upload_media_type(file_path))


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


@app.get("/captures", response_model=list[CaptureResponse])
async def get_captures(
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    from .models import Capture
    captures = db.query(Capture).filter(Capture.user_id == current_user.id).all()
    return [serialize_capture(capture, request) for capture in captures]


@app.get("/notes", response_model=list[NoteResponse])
async def get_notes(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    notes = db.query(Note).filter(Note.user_id == current_user.id).order_by(Note.updated_at.desc()).all()
    return [serialize_note(note) for note in notes]


@app.post("/notes", response_model=NoteResponse)
async def create_note(
    payload: NoteCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not payload.title and not payload.content:
        raise HTTPException(status_code=400, detail="A note needs a title or content.")
    note = Note(user_id=current_user.id, title=payload.title, content=payload.content)
    db.add(note)
    db.commit()
    db.refresh(note)
    return serialize_note(note)


@app.put("/notes/{note_id}", response_model=NoteResponse)
async def update_note(
    note_id: int,
    payload: NoteUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    note = db.query(Note).filter(Note.id == note_id, Note.user_id == current_user.id).first()
    if note is None:
        raise HTTPException(status_code=404, detail="Note not found")
    note.title = payload.title
    note.content = payload.content
    db.add(note)
    db.commit()
    db.refresh(note)
    return serialize_note(note)


@app.delete("/notes/{note_id}")
async def delete_note(
    note_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    note = db.query(Note).filter(Note.id == note_id, Note.user_id == current_user.id).first()
    if note is None:
        raise HTTPException(status_code=404, detail="Note not found")
    db.delete(note)
    db.commit()
    return {"detail": "Note deleted"}


@app.get("/todos", response_model=list[TodoResponse])
async def get_todos(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    todos = db.query(Todo).filter(Todo.user_id == current_user.id).order_by(Todo.created_at.desc()).all()
    return [serialize_todo(todo) for todo in todos]


@app.post("/todos", response_model=TodoResponse)
async def create_todo(
    payload: TodoCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    todo = Todo(
        user_id=current_user.id,
        text=payload.text,
        importance=payload.importance,
        completed=payload.completed,
    )
    db.add(todo)
    db.commit()
    db.refresh(todo)
    return serialize_todo(todo)


@app.put("/todos/{todo_id}", response_model=TodoResponse)
async def update_todo(
    todo_id: int,
    payload: TodoUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    todo = db.query(Todo).filter(Todo.id == todo_id, Todo.user_id == current_user.id).first()
    if todo is None:
        raise HTTPException(status_code=404, detail="Todo not found")
    if payload.text is not None:
        todo.text = payload.text
    if payload.importance is not None:
        todo.importance = payload.importance
    if payload.completed is not None:
        todo.completed = payload.completed
    db.add(todo)
    db.commit()
    db.refresh(todo)
    return serialize_todo(todo)


@app.delete("/todos/{todo_id}")
async def delete_todo(
    todo_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    todo = db.query(Todo).filter(Todo.id == todo_id, Todo.user_id == current_user.id).first()
    if todo is None:
        raise HTTPException(status_code=404, detail="Todo not found")
    db.delete(todo)
    db.commit()
    return {"detail": "Todo deleted"}


@app.get("/meetings", response_model=list[MeetingResponse])
async def get_meetings(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    meetings = db.query(Meeting).filter(Meeting.user_id == current_user.id).order_by(Meeting.created_at.desc()).all()
    return [serialize_meeting(meeting) for meeting in meetings]


@app.post("/meetings", response_model=MeetingResponse)
async def create_meeting(
    payload: MeetingCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    meeting = Meeting(
        user_id=current_user.id,
        title=payload.title,
        date=payload.date,
        time=payload.time,
        with_person=payload.withPerson,
        location=payload.location,
        type=payload.type,
    )
    db.add(meeting)
    db.commit()
    db.refresh(meeting)
    return serialize_meeting(meeting)


@app.delete("/meetings/{meeting_id}")
async def delete_meeting(
    meeting_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    meeting = db.query(Meeting).filter(Meeting.id == meeting_id, Meeting.user_id == current_user.id).first()
    if meeting is None:
        raise HTTPException(status_code=404, detail="Meeting not found")
    db.delete(meeting)
    db.commit()
    return {"detail": "Meeting deleted"}


@app.get("/deadlines", response_model=list[DeadlineResponse])
async def get_deadlines(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    deadlines = db.query(Deadline).filter(Deadline.user_id == current_user.id).order_by(Deadline.created_at.desc()).all()
    return [serialize_deadline(deadline) for deadline in deadlines]


@app.post("/deadlines", response_model=DeadlineResponse)
async def create_deadline(
    payload: DeadlineCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    deadline = Deadline(
        user_id=current_user.id,
        title=payload.title,
        date=payload.date,
        priority=payload.priority,
    )
    db.add(deadline)
    db.commit()
    db.refresh(deadline)
    return serialize_deadline(deadline)


@app.delete("/deadlines/{deadline_id}")
async def delete_deadline(
    deadline_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    deadline = db.query(Deadline).filter(Deadline.id == deadline_id, Deadline.user_id == current_user.id).first()
    if deadline is None:
        raise HTTPException(status_code=404, detail="Deadline not found")
    db.delete(deadline)
    db.commit()
    return {"detail": "Deadline deleted"}


@app.get("/habits", response_model=list[HabitResponse])
async def get_habits(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    habits = db.query(Habit).filter(Habit.user_id == current_user.id).order_by(Habit.created_at.desc()).all()
    return [serialize_habit(habit) for habit in habits]


@app.post("/habits", response_model=HabitResponse)
async def create_habit(
    payload: HabitCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    habit = Habit(
        user_id=current_user.id,
        name=payload.name,
        streak=payload.streak,
        days=json.dumps(payload.days),
    )
    db.add(habit)
    db.commit()
    db.refresh(habit)
    return serialize_habit(habit)


@app.put("/habits/{habit_id}", response_model=HabitResponse)
async def update_habit(
    habit_id: int,
    payload: HabitUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    habit = db.query(Habit).filter(Habit.id == habit_id, Habit.user_id == current_user.id).first()
    if habit is None:
        raise HTTPException(status_code=404, detail="Habit not found")
    if payload.name is not None:
        habit.name = payload.name
    if payload.streak is not None:
        habit.streak = payload.streak
    if payload.days is not None:
        habit.days = json.dumps(payload.days)
    db.add(habit)
    db.commit()
    db.refresh(habit)
    return serialize_habit(habit)


@app.delete("/habits/{habit_id}")
async def delete_habit(
    habit_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    habit = db.query(Habit).filter(Habit.id == habit_id, Habit.user_id == current_user.id).first()
    if habit is None:
        raise HTTPException(status_code=404, detail="Habit not found")
    db.delete(habit)
    db.commit()
    return {"detail": "Habit deleted"}


@app.get("/saved-dates", response_model=list[SavedDateResponse])
async def get_saved_dates(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    saved_dates = db.query(SavedDate).filter(SavedDate.user_id == current_user.id).order_by(SavedDate.date.asc()).all()
    return [serialize_saved_date(item) for item in saved_dates]


@app.post("/saved-dates", response_model=SavedDateResponse)
async def create_saved_date(
    payload: SavedDateCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    saved_date = SavedDate(
        user_id=current_user.id,
        title=payload.title,
        date=payload.date,
        note=payload.note,
    )
    db.add(saved_date)
    db.commit()
    db.refresh(saved_date)
    return serialize_saved_date(saved_date)


@app.delete("/saved-dates/{saved_date_id}")
async def delete_saved_date(
    saved_date_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    saved_date = db.query(SavedDate).filter(SavedDate.id == saved_date_id, SavedDate.user_id == current_user.id).first()
    if saved_date is None:
        raise HTTPException(status_code=404, detail="Saved date not found")
    db.delete(saved_date)
    db.commit()
    return {"detail": "Saved date deleted"}


@app.post("/captures", response_model=CaptureResponse)
async def create_capture(
    payload: CaptureCreate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    from .models import Capture
    capture = Capture(
        user_id=current_user.id,
        type=payload.type,
        content=payload.content,
        date=payload.date,
        audio_url=build_public_file_url(request, payload.audio_url),
        image_url=build_public_file_url(request, payload.image_url),
    )
    db.add(capture)
    db.commit()
    db.refresh(capture)
    return serialize_capture(capture, request)


@app.delete("/captures/{capture_id}")
async def delete_capture(
    capture_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    from .models import Capture
    capture = db.query(Capture).filter(
        Capture.id == capture_id,
        Capture.user_id == current_user.id
    ).first()
    if not capture:
        raise HTTPException(status_code=404, detail="Capture not found")
    db.delete(capture)
    db.commit()
    return {"message": "Capture deleted"}


@app.post("/upload")
async def upload_file(
    request: Request,
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
):
    # Create user-specific directory
    user_dir = UPLOAD_DIR / str(current_user.id)
    user_dir.mkdir(exist_ok=True)
    
    # Generate unique filename
    import uuid
    file_extension = Path(file.filename).suffix
    unique_filename = f"{uuid.uuid4()}{file_extension}"
    file_path = user_dir / unique_filename
    
    # Save file
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    
    # Return the URL
    relative_url = f"/uploads/{current_user.id}/{unique_filename}"
    return {"url": build_public_file_url(request, relative_url)}


@app.get("/insights")
async def get_insights(
    db: Session = Depends(get_db),
    insight_service: InsightService = Depends(get_insight_service),
    current_user: User = Depends(get_current_user),
):
    return await insight_service.generate_insights(db, current_user)


@app.websocket("/chat/ws")
async def chat_websocket_endpoint(
    websocket: WebSocket,
    token: str = Query(...),
    mode: str = Query("general"),
    db: Session = Depends(get_db),
    auth_service: AuthService = Depends(get_auth_service),
    chat_service: ChatService = Depends(get_chat_service),
):
    user = auth_service.get_user_by_token(db, token)
    if not user:
        await websocket.close(code=1008)
        return
    await chat_service.handle_websocket(websocket, db, user, mode)
