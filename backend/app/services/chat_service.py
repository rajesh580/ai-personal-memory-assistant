import json
import os
import re
from datetime import datetime, timezone, timedelta
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
        if AsyncClient:
            self.client = AsyncClient()
        else:
            self.client = None

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
            "type": "greeting"
        }))

        chat_history = [
            {"role": "assistant", "content": greeting}
        ]

        try:
            while True:
                data = await websocket.receive_text()
                payload = json.loads(data)
                user_message = payload.get("content", "")

                if not user_message.strip():
                    continue

                chat_history.append({"role": "user", "content": user_message})

                # Fetch contextual memories related to the user's message (RAG)
                results = self.memory_service.search_memories(
                    db=db, user=user, query=user_message, limit=3
                )

                context = "\n".join([f"• ID {r['memory']['id']} - {r['memory']['title']}: {r['memory']['content']}" for r in results]) if results else "No relevant past memories found."

                if self.client:
                    ist = timezone(timedelta(hours=5, minutes=30))
                    current_datetime = datetime.now(ist).strftime("%A, %B %d, %Y at %I:%M:%S %p IST")
                    system_prompt = (
                        f"You are a helpful and empathetic personal memory assistant for {first_name}.\n"
                        f"The current date and time is {current_datetime}. Use this exact current date to correctly determine if events in the memories are in the past or the future.\n"
                        f"Here is the relevant context from their saved memories:\n{context}\n\n"
                        "Answer the user naturally and concisely based on this context and the conversation history.\n\n"
                    "IMPORTANT: ONLY if the user explicitly shares a new personal memory, a fact about themselves, or explicitly asks you to remember something, "
                    "you MUST extract it and append a JSON block at the very end of your response to save it to the database. "
                    "DO NOT save a memory for general questions (like 'what time is it?'), small talk, or simple requests.\n"
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
                    messages = [{"role": "system", "content": system_prompt}] + chat_history
                    try:
                        response = await self.client.chat(
                            model='llama3.2',
                            messages=messages
                        )
                        response_text = response['message']['content']
                        
                        # Check if the AI decided to save a memory
                        match = re.search(r'\[SAVE_MEMORY\](.*?)\[/SAVE_MEMORY\]', response_text, re.DOTALL | re.IGNORECASE)
                        if match:
                            try:
                                memory_data = json.loads(match.group(1).strip())
                                payload = MemoryCreate(**memory_data)
                                self.memory_service.create_memory(db, user, payload)
                                
                                response_text = response_text[:match.start()].strip()
                                if not response_text:
                                    response_text = "I've saved that to your memories!"
                                else:
                                    response_text += "\n\n*(Memory saved successfully! Refresh the page to see it in your vault.)*"
                            except Exception as e:
                                print(f"Failed to parse AI memory extraction: {e}")

                        # Check if the AI decided to edit a memory
                        match_edit = re.search(r'\[EDIT_MEMORY\](.*?)\[/EDIT_MEMORY\]', response_text, re.DOTALL | re.IGNORECASE)
                        if match_edit:
                            try:
                                memory_data = json.loads(match_edit.group(1).strip())
                                memory_id = memory_data.pop("id")
                                payload = MemoryUpdate(**memory_data)
                                self.memory_service.update_memory(db, user, memory_id, payload)
                                
                                response_text = response_text[:match_edit.start()].strip()
                                if not response_text:
                                    response_text = "I've updated that memory for you!"
                                else:
                                    response_text += "\n\n*(Memory updated successfully! Refresh the page to see changes.)*"
                            except Exception as e:
                                print(f"Failed to parse AI memory edit: {e}")

                        # Check if the AI decided to delete a memory
                        match_delete = re.search(r'\[DELETE_MEMORY\](.*?)\[/DELETE_MEMORY\]', response_text, re.DOTALL | re.IGNORECASE)
                        if match_delete:
                            try:
                                memory_data = json.loads(match_delete.group(1).strip())
                                memory_id = memory_data["id"]
                                self.memory_service.delete_memory(db, user, memory_id)
                                
                                response_text = response_text[:match_delete.start()].strip()
                                if not response_text:
                                    response_text = "I've deleted that memory for you."
                                else:
                                    response_text += "\n\n*(Memory deleted successfully! Refresh the page to see changes.)*"
                            except Exception as e:
                                print(f"Failed to parse AI memory deletion: {e}")
                    except Exception as e:
                        response_text = f"I ran into an error generating a response: {str(e)}"
                else:
                    if results:
                        response_text = f"Based on your memories, I found this context:\n{context}\n\n(Tip: Install the `ollama` Python package to enable natural conversational responses!)"
                    else:
                        response_text = "I couldn't find any specific memories matching that description. Is there something else you'd like to look for?"

                chat_history.append({"role": "assistant", "content": response_text})
                
                # Keep the history from growing infinitely long (remember the last 10 messages)
                if len(chat_history) > 10:
                    chat_history = chat_history[-10:]

                await websocket.send_text(json.dumps({
                    "role": "agent",
                    "content": response_text
                }))
        except Exception:
            pass # Handle disconnects gracefully