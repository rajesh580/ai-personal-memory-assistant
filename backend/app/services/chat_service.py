import json
import re
from datetime import datetime, timedelta, timezone

from fastapi import WebSocket
from sqlalchemy.orm import Session

try:
    from ollama import AsyncClient
except ImportError:
    AsyncClient = None

from ..models import User
from ..schemas import MemoryCreate, MemoryUpdate
from .memory_service import MemoryService


class ChatService:
    def __init__(self, memory_service: MemoryService):
        self.memory_service = memory_service
        self.client = AsyncClient() if AsyncClient else None

    @staticmethod
    def _summarize_memory_title(text: str) -> str:
        cleaned = " ".join(text.strip().split())
        if not cleaned:
            return "Untitled memory"
        first_sentence = re.split(r"[.!?]\s+", cleaned, maxsplit=1)[0].strip(" .!?")
        title = first_sentence[:60].strip() or cleaned[:60].strip()
        return title or "Untitled memory"

    def _build_fallback_memory_payload(self, text: str) -> MemoryCreate | None:
        cleaned = self._normalize_memory_text(text)
        if len(cleaned) < 6:
            return None
        return MemoryCreate(
            title=self._summarize_memory_title(cleaned),
            content=cleaned,
            mood="neutral",
            tags=[],
            importance=3,
        )

    @staticmethod
    def _extract_tagged_json(response_text: str, tag_name: str) -> tuple[dict | None, str]:
        pattern = rf"\[{tag_name}\](.*?)\[/{tag_name}\]"
        match = re.search(pattern, response_text, re.DOTALL | re.IGNORECASE)
        if not match:
            return None, response_text
        payload = json.loads(match.group(1).strip())
        cleaned_text = response_text[:match.start()].strip()
        return payload, cleaned_text

    @staticmethod
    def _current_ist_datetime() -> datetime:
        ist = timezone(timedelta(hours=5, minutes=30))
        return datetime.now(ist)

    @staticmethod
    def _format_calendar_date(value: datetime) -> str:
        return f"{value.strftime('%B')} {value.day}, {value.year}"

    def _normalize_memory_text(self, text: str, current_datetime: datetime | None = None) -> str:
        cleaned = " ".join(text.strip().split())
        if not cleaned:
            return cleaned

        now = current_datetime or self._current_ist_datetime()
        replacements = {
            "today": self._format_calendar_date(now),
            "tomorrow": self._format_calendar_date(now + timedelta(days=1)),
            "yesterday": self._format_calendar_date(now - timedelta(days=1)),
            "tonight": f"tonight ({self._format_calendar_date(now)})",
        }

        normalized = cleaned
        for word, replacement in replacements.items():
            normalized = re.sub(rf"\b{word}\b", replacement, normalized, flags=re.IGNORECASE)
        return normalized

    def _build_saved_memory_payload(
        self,
        ai_payload: dict,
        user_message: str,
        mode: str,
        current_datetime: datetime,
    ) -> MemoryCreate:
        normalized_user_message = self._normalize_memory_text(user_message, current_datetime)
        content = ai_payload.get("content") or normalized_user_message
        if mode == "add_memory":
            content = normalized_user_message

        title = ai_payload.get("title") or self._summarize_memory_title(content)
        if mode == "add_memory" and re.search(r"\b(today|tomorrow|yesterday|tonight)\b", user_message, re.IGNORECASE):
            title = self._summarize_memory_title(normalized_user_message)

        return MemoryCreate(
            title=title,
            content=content,
            mood=ai_payload.get("mood"),
            tags=ai_payload.get("tags", []),
            importance=ai_payload.get("importance", 3),
        )

    @staticmethod
    def _format_ai_setup_message(error_detail: str | None = None) -> str:
        base = (
            "AI memory saving is unavailable right now. Make sure the backend has the `ollama` Python package "
            "installed, the Ollama app/service is running, and the `llama3.2:1b` model is available."
        )
        return f"{base}\n\nTechnical detail: {error_detail}" if error_detail else base

    @staticmethod
    def _build_context(results: list[dict]) -> str:
        if not results:
            return "No relevant past memories found."
        lines = [
            f"- ID {item['memory']['id']} - {item['memory']['title']}: {item['memory']['content']}"
            for item in results
        ]
        return "\n".join(lines)

    def _build_system_prompt(self, first_name: str, current_datetime: str, context: str, mode: str) -> str:
        if mode == "add_memory":
            task_rules = (
                "The user is in the dedicated add-memory flow. Treat every substantive user message as content to save.\n"
                "You MUST append exactly one [SAVE_MEMORY] JSON block at the very end of your response for each new memory.\n"
                "Keep your natural-language reply short and confirm what you saved.\n"
            )
        else:
            task_rules = (
                "IMPORTANT: ONLY if the user explicitly shares a new personal memory, a fact about themselves, or explicitly asks you to remember something, "
                "you MUST extract it and append a JSON block at the very end of your response to save it to the database. "
                "DO NOT save a memory for general questions, small talk, or simple requests.\n"
            )

        return (
            f"You are a helpful and empathetic personal memory assistant for {first_name}.\n"
            f"The current date and time is {current_datetime}. Use this exact current date to correctly determine if events in the memories are in the past or the future.\n"
            f"Here is the relevant context from their saved memories:\n{context}\n\n"
            "Answer the user naturally and concisely based on this context and the conversation history.\n\n"
            f"{task_rules}"
            "Use this exact format:\n"
            "[SAVE_MEMORY]\n"
            '{"title": "A short title", "content": "Full detail of the memory", "mood": "neutral", "tags": ["tag1", "tag2"], "importance": 3}\n'
            "[/SAVE_MEMORY]\n\n"
            "If the user asks you to edit or update an existing memory from the context, append a JSON block at the very end of your response using this exact format:\n"
            "[EDIT_MEMORY]\n"
            '{"id": <memory_id>, "title": "Updated title", "content": "Updated content", "mood": "neutral", "tags": ["tag1"], "importance": 3}\n'
            "[/EDIT_MEMORY]\n\n"
            "If the user asks you to delete or remove an existing memory from the context, append a JSON block at the very end of your response using this exact format:\n"
            "[DELETE_MEMORY]\n"
            '{"id": <memory_id>}\n'
            "[/DELETE_MEMORY]"
        )

    async def handle_websocket(self, websocket: WebSocket, db: Session, user: User, mode: str = "general"):
        await websocket.accept()

        first_name = user.email.split("@")[0]
        if mode == "add_memory":
            greeting = f"Hi {first_name}! Which memory do you need to add today?"
        else:
            greeting = f"Hi {first_name}! I am your personal memory agent. What would you like to recall today?"

        await websocket.send_text(json.dumps({
            "role": "agent",
            "content": greeting,
            "type": "greeting",
        }))

        chat_history = [{"role": "assistant", "content": greeting}]

        try:
            while True:
                data = await websocket.receive_text()
                payload = json.loads(data)
                user_message = payload.get("content", "")

                if not user_message.strip():
                    continue

                chat_history.append({"role": "user", "content": user_message})
                results = self.memory_service.search_memories(
                    db=db,
                    user=user,
                    query=user_message,
                    limit=3,
                )
                context = self._build_context(results)
                event_type = "message"
                memory_action = None

                if self.client:
                    current_dt = self._current_ist_datetime()
                    current_datetime = current_dt.strftime("%A, %B %d, %Y at %I:%M:%S %p IST")
                    system_prompt = self._build_system_prompt(first_name, current_datetime, context, mode)
                    messages = [{"role": "system", "content": system_prompt}] + chat_history
                    try:
                        response = await self.client.chat(
                            model="llama3.2:1b",
                            messages=messages,
                        )
                        response_text = response["message"]["content"]

                        saved_memory_payload, cleaned_save_text = self._extract_tagged_json(response_text, "SAVE_MEMORY")
                        if saved_memory_payload is not None:
                            try:
                                create_payload = self._build_saved_memory_payload(
                                    saved_memory_payload,
                                    user_message,
                                    mode,
                                    current_dt,
                                )
                                self.memory_service.create_memory(db, user, create_payload)
                                event_type = "memory_saved"
                                memory_action = "created"
                                response_text = cleaned_save_text or "I've saved that to your memories!"
                                if cleaned_save_text:
                                    response_text += "\n\nSaved to your memories."
                            except Exception as exc:
                                print(f"Failed to parse AI memory extraction: {exc}")
                        elif mode == "add_memory":
                            fallback_payload = self._build_fallback_memory_payload(user_message)
                            if fallback_payload is not None:
                                self.memory_service.create_memory(db, user, fallback_payload)
                                event_type = "memory_saved"
                                memory_action = "created"
                                response_text = (
                                    f"{response_text.strip()}\n\nSaved to your memories."
                                    if response_text.strip()
                                    else "I've saved that to your memories!"
                                )

                        edited_memory_payload, cleaned_edit_text = self._extract_tagged_json(response_text, "EDIT_MEMORY")
                        if edited_memory_payload is not None:
                            try:
                                memory_data = dict(edited_memory_payload)
                                memory_id = memory_data.pop("id")
                                update_payload = MemoryUpdate(**memory_data)
                                self.memory_service.update_memory(db, user, memory_id, update_payload)
                                event_type = "memory_updated"
                                memory_action = "updated"
                                response_text = cleaned_edit_text or "I've updated that memory for you!"
                                if cleaned_edit_text:
                                    response_text += "\n\nUpdated in your memories."
                            except Exception as exc:
                                print(f"Failed to parse AI memory edit: {exc}")

                        deleted_memory_payload, cleaned_delete_text = self._extract_tagged_json(response_text, "DELETE_MEMORY")
                        if deleted_memory_payload is not None:
                            try:
                                memory_id = deleted_memory_payload["id"]
                                self.memory_service.delete_memory(db, user, memory_id)
                                event_type = "memory_deleted"
                                memory_action = "deleted"
                                response_text = cleaned_delete_text or "I've deleted that memory for you."
                                if cleaned_delete_text:
                                    response_text += "\n\nRemoved from your memories."
                            except Exception as exc:
                                print(f"Failed to parse AI memory deletion: {exc}")
                    except Exception as exc:
                        fallback_payload = self._build_fallback_memory_payload(user_message) if mode == "add_memory" else None
                        if fallback_payload is not None:
                            self.memory_service.create_memory(db, user, fallback_payload)
                            event_type = "memory_saved"
                            memory_action = "created"
                            response_text = (
                                "I couldn't reach the local AI model, but I still saved your memory directly.\n\n"
                                f"{self._format_ai_setup_message(str(exc))}"
                            )
                        else:
                            response_text = self._format_ai_setup_message(str(exc))
                else:
                    fallback_payload = self._build_fallback_memory_payload(user_message) if mode == "add_memory" else None
                    if fallback_payload is not None:
                        self.memory_service.create_memory(db, user, fallback_payload)
                        event_type = "memory_saved"
                        memory_action = "created"
                        response_text = (
                            "I saved that memory directly, but the full AI assistant is not configured yet.\n\n"
                            f"{self._format_ai_setup_message()}"
                        )
                    elif results:
                        response_text = (
                            f"Based on your memories, I found this context:\n{context}\n\n"
                            f"{self._format_ai_setup_message()}"
                        )
                    else:
                        response_text = self._format_ai_setup_message()

                chat_history.append({"role": "assistant", "content": response_text})
                if len(chat_history) > 10:
                    chat_history = chat_history[-10:]

                await websocket.send_text(json.dumps({
                    "role": "agent",
                    "content": response_text,
                    "type": event_type,
                    "memory_action": memory_action,
                }))
        except Exception:
            pass
