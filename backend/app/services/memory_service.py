from sqlalchemy import desc
from sqlalchemy.orm import Session

from ..models import Memory
from ..schemas import MemoryCreate
from .embedding_service import EmbeddingService


class MemoryService:
    def __init__(self, embedding_service: EmbeddingService):
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

        self.embedding_service.upsert_memory(
            memory_id=memory.id,
            title=memory.title,
            content=memory.content,
            mood=memory.mood,
            tags=payload.tags,
        )
        return self.to_response_dict(memory)

    def search_memories(self, db: Session, query: str, limit: int = 5) -> list[dict]:
        ids, distances = self.embedding_service.search(query, limit=limit)
        if not ids:
            return []

        memory_map = {
            memory.id: memory
            for memory in db.query(Memory).filter(Memory.id.in_([int(item) for item in ids if item.isdigit()])).all()
        }

        results = []
        lowered_query = query.lower()

        for raw_id, distance in zip(ids, distances):
            if not raw_id.isdigit():
                continue

            memory = memory_map.get(int(raw_id))
            if memory is None:
                continue

            score = round(1 / (1 + float(distance)), 4)
            tags = self.deserialize_tags(memory.tags)

            reason_parts = []
            if lowered_query in memory.title.lower():
                reason_parts.append("title closely matches the query")
            if memory.mood and lowered_query in memory.mood.lower():
                reason_parts.append("mood matches the search terms")
            matching_tags = [tag for tag in tags if lowered_query in tag.lower()]
            if matching_tags:
                reason_parts.append(f"matching tags: {', '.join(matching_tags)}")
            if not reason_parts:
                reason_parts.append("semantic similarity found in the memory content")

            results.append(
                {
                    "memory": self.to_response_dict(memory),
                    "score": score,
                    "reason": "; ".join(reason_parts),
                }
            )

        return results