from collections import Counter

from sqlalchemy import desc
from sqlalchemy.orm import Session

from ..models import Memory
from .memory_service import MemoryService


class InsightService:
    def __init__(self, memory_service: MemoryService):
        self.memory_service = memory_service

    def generate_insights(self, db: Session) -> dict:
        memories = db.query(Memory).order_by(desc(Memory.created_at)).all()
        total_memories = len(memories)

        mood_distribution = Counter()
        tag_counter = Counter()

        for memory in memories:
            mood_distribution[(memory.mood or "unspecified").strip() or "unspecified"] += 1
            for tag in self.memory_service.deserialize_tags(memory.tags):
                tag_counter[tag] += 1

        important_memories = sorted(
            memories,
            key=lambda item: (item.importance, item.updated_at),
            reverse=True,
        )[:5]
        recent_memories = memories[:5]

        summary = self.build_summary(
            total_memories=total_memories,
            mood_distribution=mood_distribution,
            tag_counter=tag_counter,
            important_memories=important_memories,
        )

        return {
            "total_memories": total_memories,
            "mood_distribution": dict(mood_distribution),
            "top_tags": [{"tag": tag, "count": count} for tag, count in tag_counter.most_common(5)],
            "important_memories": [self.memory_service.to_response_dict(memory) for memory in important_memories],
            "recent_memories": [self.memory_service.to_response_dict(memory) for memory in recent_memories],
            "generated_summary": summary,
        }

    def build_summary(self, total_memories: int, mood_distribution: Counter, tag_counter: Counter, important_memories: list[Memory]) -> str:
        if total_memories == 0:
            return "No memories have been added yet. Start by saving a few moments to unlock trends and insights."

        most_common_mood = mood_distribution.most_common(1)[0][0] if mood_distribution else "unspecified"
        common_tags = [tag for tag, _ in tag_counter.most_common(3)]
        top_titles = [memory.title for memory in important_memories[:3]]

        parts = [
            f"You have stored {total_memories} memories so far.",
            f"The most common mood is '{most_common_mood}'.",
        ]

        if common_tags:
            parts.append(f"Frequently recurring themes include {', '.join(common_tags)}.")
        if top_titles:
            parts.append(f"High-importance memories currently include {', '.join(top_titles)}.")

        parts.append("This summary is generated using lightweight heuristics from your saved memories and search metadata.")
        return " ".join(parts)