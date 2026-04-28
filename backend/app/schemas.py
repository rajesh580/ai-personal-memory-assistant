from datetime import datetime

from pydantic import BaseModel, EmailStr, Field, field_validator


class UserAuthBase(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=6, max_length=128)

    @field_validator("email", mode="before")
    @classmethod
    def normalize_email(cls, value):
        return str(value).strip().lower()


class UserRegister(UserAuthBase):
    pass


class UserLogin(UserAuthBase):
    pass


class UserResponse(BaseModel):
    id: int
    email: EmailStr
    created_at: datetime

    class Config:
        from_attributes = True


class AuthResponse(BaseModel):
    token: str
    user: UserResponse


class MemoryCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=255)
    content: str = Field(..., min_length=1)
    mood: str | None = None
    tags: list[str] = Field(default_factory=list)
    importance: int = Field(default=3, ge=1, le=5)

    @field_validator("title", "content", "mood", mode="before")
    @classmethod
    def strip_text(cls, value):
        if value is None:
            return value
        return value.strip()

    @field_validator("tags", mode="before")
    @classmethod
    def normalize_tags(cls, value):
        if value is None:
            return []
        if isinstance(value, str):
            return [tag.strip() for tag in value.split(",") if tag.strip()]
        if isinstance(value, list):
            normalized = []
            for item in value:
                text = str(item).strip()
                if text and text not in normalized:
                    normalized.append(text)
            return normalized
        return []

    @field_validator("title", "content")
    @classmethod
    def ensure_required_text(cls, value):
        if not value:
            raise ValueError("Field cannot be empty.")
        return value


class MemoryUpdate(BaseModel):
    title: str | None = None
    content: str | None = None
    mood: str | None = None
    tags: list[str] | None = None
    importance: int | None = Field(default=None, ge=1, le=5)

    @field_validator("title", "content", "mood", mode="before")
    @classmethod
    def strip_text(cls, value):
        if value is None:
            return value
        return value.strip()

    @field_validator("tags", mode="before")
    @classmethod
    def normalize_tags(cls, value):
        if value is None:
            return None
        if isinstance(value, str):
            return [tag.strip() for tag in value.split(",") if tag.strip()]
        if isinstance(value, list):
            normalized = []
            for item in value:
                text = str(item).strip()
                if text and text not in normalized:
                    normalized.append(text)
            return normalized
        return None

    @field_validator("title", "content")
    @classmethod
    def ensure_text_if_present(cls, value):
        if value is None:
            return value
        if not value:
            raise ValueError("Field cannot be empty.")
        return value


class MemoryResponse(BaseModel):
    id: int
    title: str
    content: str
    mood: str | None
    tags: list[str]
    importance: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class CaptureCreate(BaseModel):
    type: str = Field(..., min_length=1, max_length=50)
    content: str | None = None
    date: datetime
    audio_url: str | None = None
    image_url: str | None = None

    @field_validator("type", "content", mode="before")
    @classmethod
    def strip_text(cls, value):
        if value is None:
            return value
        return value.strip()

    @field_validator("type")
    @classmethod
    def ensure_type(cls, value):
        if not value:
            raise ValueError("Type cannot be empty.")
        return value


class CaptureResponse(BaseModel):
    id: int
    type: str
    content: str | None
    date: datetime
    audio_url: str | None
    image_url: str | None
    created_at: datetime

    class Config:
        from_attributes = True


class SearchRequest(BaseModel):
    query: str = Field(..., min_length=1)
    mood: str | None = None
    importance: int | None = Field(default=None, ge=1, le=5)
    tag: str | None = None
    limit: int = Field(default=5, ge=1, le=25)

    @field_validator("query", "mood", "tag", mode="before")
    @classmethod
    def strip_query(cls, value):
        if value is None:
            return value
        value = value.strip()
        if value == "":
            return None
        return value

    @field_validator("query")
    @classmethod
    def ensure_query(cls, value):
        if not value:
            raise ValueError("Query cannot be empty.")
        return value


class SearchResult(BaseModel):
    memory: MemoryResponse
    score: float
    reason: str


class InsightTag(BaseModel):
    tag: str
    count: int


class InsightsResponse(BaseModel):
    total_memories: int
    average_importance: float
    mood_distribution: dict[str, int]
    top_tags: list[InsightTag]
    important_memories: list[MemoryResponse]
    recent_memories: list[MemoryResponse]
    memories_last_7_days: int
    memories_last_30_days: int
    busiest_day: str | None
    mood_highlights: list[str]
    generated_summary: str


class NoteCreate(BaseModel):
    title: str | None = None
    content: str | None = None

    @field_validator("title", "content", mode="before")
    @classmethod
    def strip_note_text(cls, value):
        if value is None:
            return value
        value = str(value).strip()
        return value or None


class NoteUpdate(NoteCreate):
    pass


class NoteResponse(BaseModel):
    id: int
    title: str | None
    content: str | None
    created_at: datetime
    updated_at: datetime


class TodoCreate(BaseModel):
    text: str = Field(..., min_length=1, max_length=255)
    importance: str | None = "medium"
    completed: bool = False

    @field_validator("text", "importance", mode="before")
    @classmethod
    def strip_todo_text(cls, value):
        if value is None:
            return value
        return str(value).strip()


class TodoUpdate(BaseModel):
    text: str | None = None
    importance: str | None = None
    completed: bool | None = None

    @field_validator("text", "importance", mode="before")
    @classmethod
    def strip_todo_update_text(cls, value):
        if value is None:
            return value
        value = str(value).strip()
        return value or None


class TodoResponse(BaseModel):
    id: int
    text: str
    importance: str | None
    completed: bool
    created_at: datetime


class MeetingCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=255)
    date: str | None = None
    time: str | None = None
    withPerson: str | None = None
    location: str | None = None
    type: str | None = "meeting"

    @field_validator("title", "date", "time", "withPerson", "location", "type", mode="before")
    @classmethod
    def strip_meeting_text(cls, value):
        if value is None:
            return value
        value = str(value).strip()
        return value or None


class MeetingResponse(BaseModel):
    id: int
    title: str
    date: str | None
    time: str | None
    withPerson: str | None
    location: str | None
    type: str | None
    created_at: datetime


class DeadlineCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=255)
    date: str | None = None
    priority: str | None = "medium"

    @field_validator("title", "date", "priority", mode="before")
    @classmethod
    def strip_deadline_text(cls, value):
        if value is None:
            return value
        value = str(value).strip()
        return value or None


class DeadlineResponse(BaseModel):
    id: int
    title: str
    date: str | None
    priority: str | None
    created_at: datetime


class HabitCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    streak: int = Field(default=0, ge=0)
    days: list[bool] = Field(default_factory=lambda: [False] * 7)

    @field_validator("name", mode="before")
    @classmethod
    def strip_habit_name(cls, value):
        if value is None:
            return value
        return str(value).strip()

    @field_validator("days")
    @classmethod
    def ensure_days_length(cls, value):
        normalized = [bool(item) for item in value]
        if len(normalized) != 7:
            raise ValueError("Days must have 7 items.")
        return normalized


class HabitUpdate(BaseModel):
    name: str | None = None
    streak: int | None = Field(default=None, ge=0)
    days: list[bool] | None = None

    @field_validator("name", mode="before")
    @classmethod
    def strip_habit_update_name(cls, value):
        if value is None:
            return value
        value = str(value).strip()
        return value or None

    @field_validator("days")
    @classmethod
    def ensure_update_days_length(cls, value):
        if value is None:
            return value
        normalized = [bool(item) for item in value]
        if len(normalized) != 7:
            raise ValueError("Days must have 7 items.")
        return normalized


class HabitResponse(BaseModel):
    id: int
    name: str
    streak: int
    days: list[bool]
    created_at: datetime


class SavedDateCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=255)
    date: str = Field(..., min_length=1, max_length=50)
    note: str | None = None

    @field_validator("title", "date", "note", mode="before")
    @classmethod
    def strip_saved_date_text(cls, value):
        if value is None:
            return value
        value = str(value).strip()
        return value or None


class SavedDateResponse(BaseModel):
    id: int
    title: str
    date: str
    note: str | None
    created_at: datetime
