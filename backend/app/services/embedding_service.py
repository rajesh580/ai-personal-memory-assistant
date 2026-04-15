from pathlib import Path
import warnings

import chromadb
from sentence_transformers import SentenceTransformer

# Suppress FutureWarning from huggingface_hub
warnings.filterwarnings("ignore", category=FutureWarning, module="huggingface_hub")


class EmbeddingService:
    def __init__(self):
        base_dir = Path(__file__).resolve().parent.parent.parent
        data_dir = base_dir / "data" / "chroma"
        data_dir.mkdir(parents=True, exist_ok=True)

        self.model = None
        self.client = chromadb.PersistentClient(path=str(data_dir))
        self.collection = self.client.get_or_create_collection(name="memories")

    def _get_model(self):
        if self.model is None:
            self.model = SentenceTransformer("all-MiniLM-L6-v2")
        return self.model

    def build_memory_document(self, title: str, content: str, mood: str | None, tags: list[str]) -> str:
        mood_text = mood or "neutral"
        tag_text = ", ".join(tags) if tags else "no tags"
        return f"Title: {title}\nContent: {content}\nMood: {mood_text}\nTags: {tag_text}"

    def embed_text(self, text: str) -> list[float]:
        model = self._get_model()
        embedding = model.encode(text)
        return embedding.tolist()

    def build_document_id(self, user_id: int, memory_id: int) -> str:
        return f"{user_id}:{memory_id}"

    def parse_document_id(self, value: str) -> tuple[int, int] | None:
        if ":" not in value:
            return None
        left, right = value.split(":", 1)
        if not left.isdigit() or not right.isdigit():
            return None
        return int(left), int(right)

    def upsert_memory(self, user_id: int, memory_id: int, title: str, content: str, mood: str | None, tags: list[str]) -> None:
        document = self.build_memory_document(title, content, mood, tags)
        embedding = self.embed_text(document)
        self.collection.upsert(
            ids=[self.build_document_id(user_id, memory_id)],
            documents=[document],
            embeddings=[embedding],
            metadatas=[
                {
                    "user_id": str(user_id),
                    "title": title,
                    "mood": mood or "",
                    "tags": ", ".join(tags),
                }
            ],
        )

    def delete_memory(self, user_id: int, memory_id: int) -> None:
        self.collection.delete(ids=[self.build_document_id(user_id, memory_id)])

    def search(self, query: str, limit: int = 5) -> tuple[list[str], list[float]]:
        count = self.collection.count()
        if count == 0:
            return [], []
            
        embedding = self.embed_text(query)
        results = self.collection.query(
            query_embeddings=[embedding],
            n_results=min(limit, count),
        )
        ids = results.get("ids", [[]])[0]
        distances = results.get("distances", [[]])[0]
        return ids, distances
