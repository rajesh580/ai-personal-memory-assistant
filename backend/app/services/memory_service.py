from sqlalchemy import desc, or_
from sqlalchemy.orm import Session

from ..models import Memory
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

    def list_memories(self, db: Session) -> list[dict]:
        memories = db.query(Memory).order_by(desc(Memory.created_at)).all()
        return [self.to_response_dict(memory) for memory in memories]

    def get_memory(self, db: Session, memory_id: int) -> dict | None:
        memory = db.query(Memory).filter(Memory.id == memory_id).first()
        if memory is None:
            return None
        return self.to_response_dict(memory)

    def delete_memory(self, db: Session, memory_id: int) -> bool:
        memory = db.query(Memory).filter(Memory.id == memory_id).first()
        if memory is None:
            return False
        db.delete(memory)
        db.commit()
        return True

    def create_memory(self, db: Session, payload: MemoryCreate) -> dict:
        memory = Memory(
            title=payload.title,
            content=payload.content,
            mood=payload.mood,
            tags=self.serialize_tags(payload.tags),
            importance=payload.importance,
        )
        db.add(memory)
        db.commit()
        db.refresh(memory)
        return self.to_response_dict(memory)

    def update_memory(self, db: Session, memory_id: int, payload) -> dict | None:
        memory = db.query(Memory).filter(Memory.id == memory_id).first()
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
        return self.to_response_dict(memory)

    def search_memories(self, db: Session, query: str, limit: int = 5) -> list[dict]:
        if self.embedding_service:
            try:
                ids, distances = self.embedding_service.search(query, limit=limit)
                if ids:
                    memory_map = {
                        memory.id: memory
                        for memory in db.query(Memory).filter(Memory.id.in_([int(item) for item in ids if item.isdigit()])).all()
                    }

                    results = []
                    for raw_id, distance in zip(ids, distances):
                        if not raw_id.isdigit():
                            continue
                        memory_id = int(raw_id)
                        memory = memory_map.get(memory_id)
                        if memory is None:
                            continue
                        results.append({
                            "memory": self.to_response_dict(memory),
                            "score": 1.0 - distance,
                            "reason": "Semantic similarity match",
                        })

                    results.sort(key=lambda x: x["score"], reverse=True)
                    return results[:limit]
            except Exception:
                pass

        query_pattern = f"%{query}%"
        matches = db.query(Memory).filter(
            or_(
                Memory.title.ilike(query_pattern),
                Memory.content.ilike(query_pattern),
                Memory.mood.ilike(query_pattern),
                Memory.tags.ilike(query_pattern),
            )
        ).order_by(desc(Memory.created_at)).limit(limit).all()

        return [
            {
                "memory": self.to_response_dict(memory),
                "score": 1.0,
                "reason": "Keyword match",
            }
            for memory in matches
        ]
