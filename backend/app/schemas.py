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
