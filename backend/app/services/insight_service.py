from collections import Counter
from datetime import datetime, timedelta

try:
    from ollama import AsyncClient
except ImportError:
    AsyncClient = None

from sqlalchemy import desc
from sqlalchemy.orm import Session

from ..models import Memory, User
from .memory_service import MemoryService


class InsightService:
    def __init__(self, memory_service: MemoryService):
        self.memory_service = memory_service

    async def generate_insights(self, db: Session, user: User) -> dict:
        memories = (
            db.query(Memory)
            .filter(Memory.user_id == user.id)
            .order_by(desc(Memory.created_at))
            .all()
        )
        total_memories = len(memories)

        mood_distribution = Counter()
        tag_counter = Counter()
        day_counter = Counter()
        now = datetime.utcnow()
        last_7_days = 0
        last_30_days = 0
        total_importance = 0

        for memory in memories:
            mood_distribution[(memory.mood or "unspecified").strip() or "unspecified"] += 1
            for tag in self.memory_service.deserialize_tags(memory.tags):
                tag_counter[tag] += 1
            day_counter[memory.created_at.date().isoformat()] += 1
            total_importance += memory.importance or 0

            if memory.created_at >= now - timedelta(days=7):
                last_7_days += 1
            if memory.created_at >= now - timedelta(days=30):
                last_30_days += 1

        important_memories = sorted(
            memories,
            key=lambda item: (item.importance, item.updated_at),
            reverse=True,
        )[:5]
        recent_memories = memories[:5]
        average_importance = round(total_importance / total_memories, 2) if total_memories else 0.0
        busiest_day = day_counter.most_common(1)[0][0] if day_counter else None
        mood_highlights = self.build_mood_highlights(mood_distribution, total_memories)

        summary = await self.build_summary(
            total_memories=total_memories,
            mood_distribution=mood_distribution,
            tag_counter=tag_counter,
            important_memories=important_memories,
            average_importance=average_importance,
            last_7_days=last_7_days,
        )

        return {
            "total_memories": total_memories,
            "average_importance": average_importance,
            "mood_distribution": dict(mood_distribution),
            "top_tags": [{"tag": tag, "count": count} for tag, count in tag_counter.most_common(5)],
            "important_memories": [self.memory_service.to_response_dict(memory) for memory in important_memories],
            "recent_memories": [self.memory_service.to_response_dict(memory) for memory in recent_memories],
            "memories_last_7_days": last_7_days,
            "memories_last_30_days": last_30_days,
            "busiest_day": busiest_day,
            "mood_highlights": mood_highlights,
            "generated_summary": summary,
        }

    async def build_summary(
        self,
        total_memories: int,
        mood_distribution: Counter,
        tag_counter: Counter,
        important_memories: list[Memory],
        average_importance: float,
        last_7_days: int,
    ) -> str:
        if total_memories == 0:
            return "No memories have been added yet. Start by saving a few moments to unlock trends and insights."

        most_common_mood = mood_distribution.most_common(1)[0][0] if mood_distribution else "unspecified"
        common_tags = [tag for tag, _ in tag_counter.most_common(3)]
        top_titles = [memory.title for memory in important_memories[:3]]

        parts = [
            f"You have stored {total_memories} memories so far.",
            f"The most common mood is '{most_common_mood}'.",
            f"Your average priority level is {average_importance:.2f} out of 5.",
        ]

        if common_tags:
            parts.append(f"Frequently recurring themes include {', '.join(common_tags)}.")
        if top_titles:
            parts.append(f"High-importance memories currently include {', '.join(top_titles)}.")
        if last_7_days:
            parts.append(f"You captured {last_7_days} memories in the last 7 days.")

        heuristic_summary = " ".join(parts)

        if AsyncClient:
            prompt = (
                "You are an empathetic personal memory assistant analyzing a user's memory journal.\n"
                f"Here are the user's current memory statistics:\n"
                f"- Total memories: {total_memories}\n"
                f"- Memories in last 7 days: {last_7_days}\n"
                f"- Average importance (1-5): {average_importance:.2f}\n"
                f"- Most common mood: {most_common_mood}\n"
                f"- Top themes/tags: {', '.join(common_tags) if common_tags else 'None'}\n"
                f"- Recent important memories: {', '.join(top_titles) if top_titles else 'None'}\n\n"
                "Write a brief, warm, and insightful 2-3 sentence summary of their journaling activity. "
                "Speak directly to the user (e.g., 'You have been focusing on...'). Do not use formatting like bold or lists, just a plain text paragraph."
            )
            try:
                response = await AsyncClient().generate(model='llama3.2', prompt=prompt)
                return response['response'].strip()
            except Exception as e:
                print(f"Failed to generate AI summary: {e}")
                return heuristic_summary + " (AI generation temporarily unavailable)"

        return heuristic_summary + " This summary is generated using lightweight heuristics from your saved memories and search metadata."

    def build_mood_highlights(self, mood_distribution: Counter, total_memories: int) -> list[str]:
        if total_memories == 0 or not mood_distribution:
            return []

        highlights = []
        top_moods = mood_distribution.most_common(3)
        for mood, count in top_moods:
            percentage = round((count / total_memories) * 100)
            highlights.append(f"{mood.title()} appears in {percentage}% of your memories.")
        return highlights
