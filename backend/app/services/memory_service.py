from sqlalchemy import desc, or_
from sqlalchemy.orm import Session

from ..models import Memory, User
from ..schemas import MemoryCreate


class MemoryService:
    def __init__(self, embedding_service=None):
        self.embedding_service = embedding_service

    @staticmethod
    def serialize_tags(tags: list[str]) -> str:
        return ",".join(tags)

    @staticmethod
    def deserialize_tags(tags: str) -> list[str]:
        if not tags:
            return []
        return [tag.strip() for tag in tags.split(",") if tag.strip()]

    def to_response_dict(self, memory: Memory) -> dict:
        return {
            "id": memory.id,
            "title": memory.title,
            "content": memory.content,
            "mood": memory.mood,
            "tags": self.deserialize_tags(memory.tags),
            "importance": memory.importance,
            "created_at": memory.created_at,
            "updated_at": memory.updated_at,
        }

    def list_memories(self, db: Session, user: User) -> list[dict]:
        memories = (
            db.query(Memory)
            .filter(Memory.user_id == user.id)
            .order_by(desc(Memory.created_at))
            .all()
        )
        return [self.to_response_dict(memory) for memory in memories]

    def get_memory(self, db: Session, user: User, memory_id: int) -> dict | None:
        memory = self._get_memory_model(db, user, memory_id)
        if memory is None:
            return None
        return self.to_response_dict(memory)

    def delete_memory(self, db: Session, user: User, memory_id: int) -> bool:
        memory = self._get_memory_model(db, user, memory_id)
        if memory is None:
            return False
        db.delete(memory)
        db.commit()
        self._delete_embedding(user.id, memory_id)
        return True

    def create_memory(self, db: Session, user: User, payload: MemoryCreate) -> dict:
        memory = Memory(
            user_id=user.id,
            title=payload.title,
            content=payload.content,
            mood=payload.mood,
            tags=self.serialize_tags(payload.tags),
            importance=payload.importance,
        )
        db.add(memory)
        db.commit()
        db.refresh(memory)
        self._sync_embedding(memory)
        return self.to_response_dict(memory)

    def update_memory(self, db: Session, user: User, memory_id: int, payload) -> dict | None:
        memory = self._get_memory_model(db, user, memory_id)
        if memory is None:
            return None

        if payload.title is not None:
            memory.title = payload.title
        if payload.content is not None:
            memory.content = payload.content
        if payload.mood is not None:
            memory.mood = payload.mood
        if payload.tags is not None:
            memory.tags = self.serialize_tags(payload.tags)
        if payload.importance is not None:
            memory.importance = payload.importance

        db.add(memory)
        db.commit()
        db.refresh(memory)
        self._sync_embedding(memory)
        return self.to_response_dict(memory)

    def search_memories(
        self,
        db: Session,
        user: User,
        query: str,
        limit: int = 5,
        mood: str | None = None,
        importance: int | None = None,
        tag: str | None = None,
    ) -> list[dict]:
        if self.embedding_service:
            try:
                ids, distances = self.embedding_service.search(query, limit=max(limit * 3, limit))
                if ids:
                    parsed_ids = []
                    for item in ids:
                        parsed = self.embedding_service.parse_document_id(item)
                        if parsed is None:
                            continue
                        parsed_user_id, parsed_memory_id = parsed
                        if parsed_user_id != user.id:
                            continue
                        parsed_ids.append(parsed_memory_id)

                    memory_map = {
                        memory.id: memory
                        for memory in db.query(Memory)
                        .filter(Memory.user_id == user.id, Memory.id.in_(parsed_ids))
                        .all()
                    }

                    results = []
                    for raw_id, distance in zip(ids, distances):
                        parsed = self.embedding_service.parse_document_id(raw_id)
                        if parsed is None:
                            continue
                        parsed_user_id, memory_id = parsed
                        if parsed_user_id != user.id:
                            continue
                        memory = memory_map.get(memory_id)
                        if memory is None:
                            continue
                        if not self._matches_filters(memory, mood=mood, importance=importance, tag=tag):
                            continue
                        results.append({
                            "memory": self.to_response_dict(memory),
                            "score": max(0.0, 1.0 - float(distance)),
                            "reason": "Semantic similarity match",
                        })

                    results.sort(key=lambda x: x["score"], reverse=True)
                    return results[:limit]
            except Exception:
                pass

        query_pattern = f"%{query}%"
        query_builder = db.query(Memory).filter(
            Memory.user_id == user.id,
            or_(
                Memory.title.ilike(query_pattern),
                Memory.content.ilike(query_pattern),
                Memory.mood.ilike(query_pattern),
                Memory.tags.ilike(query_pattern),
            )
        )

        if mood:
            query_builder = query_builder.filter(Memory.mood.ilike(f"%{mood}%"))
        if importance is not None:
            query_builder = query_builder.filter(Memory.importance == importance)
        if tag:
            query_builder = query_builder.filter(Memory.tags.ilike(f"%{tag}%"))

        matches = query_builder.order_by(desc(Memory.created_at)).limit(limit).all()

        return [
            {
                "memory": self.to_response_dict(memory),
                "score": 1.0,
                "reason": "Keyword match",
            }
            for memory in matches
        ]

    def export_memories(self, db: Session, user: User) -> dict:
        memories = self.list_memories(db, user)
        return {
            "user": {
                "id": user.id,
                "email": user.email,
            },
            "count": len(memories),
            "memories": memories,
        }

    def _sync_embedding(self, memory: Memory) -> None:
        if not self.embedding_service:
            return
        try:
            self.embedding_service.upsert_memory(
                user_id=memory.user_id,
                memory_id=memory.id,
                title=memory.title,
                content=memory.content,
                mood=memory.mood,
                tags=self.deserialize_tags(memory.tags),
            )
        except Exception:
            pass

    def _delete_embedding(self, user_id: int, memory_id: int) -> None:
        if not self.embedding_service:
            return
        try:
            self.embedding_service.delete_memory(user_id, memory_id)
        except Exception:
            pass

    def _get_memory_model(self, db: Session, user: User, memory_id: int) -> Memory | None:
        return (
            db.query(Memory)
            .filter(Memory.id == memory_id, Memory.user_id == user.id)
            .first()
        )

    def _matches_filters(
        self,
        memory: Memory,
        mood: str | None = None,
        importance: int | None = None,
        tag: str | None = None,
    ) -> bool:
        tags = self.deserialize_tags(memory.tags)
        if mood and mood.lower() not in (memory.mood or "").lower():
            return False
        if importance is not None and memory.importance != importance:
            return False
        if tag and not any(tag.lower() in item.lower() for item in tags):
            return False
        return True
