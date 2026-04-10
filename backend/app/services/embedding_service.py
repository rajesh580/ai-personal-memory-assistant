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

    def upsert_memory(self, memory_id: int, title: str, content: str, mood: str | None, tags: list[str]) -> None:
        document = self.build_memory_document(title, content, mood, tags)
        embedding = self.embed_text(document)
        self.collection.upsert(
            ids=[str(memory_id)],
            documents=[document],
            embeddings=[embedding],
            metadatas=[
                {
                    "title": title,
                    "mood": mood or "",
                    "tags": ", ".join(tags),
                }
            ],
        )

    def search(self, query: str, limit: int = 5) -> tuple[list[str], list[float]]:
        embedding = self.embed_text(query)
        results = self.collection.query(
            query_embeddings=[embedding],
            n_results=limit,
        )
        ids = results.get("ids", [[]])[0]
        distances = results.get("distances", [[]])[0]
        return ids, distances