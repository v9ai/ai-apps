"""FastEmbed embedding model for pgvector-compatible 1024-dim vectors.

Uses BAAI/bge-large-en-v1.5 via FastEmbed (no API key needed).
Matches the database schema's vector(1024) dimension.
"""

from deepeval.models import DeepEvalBaseEmbeddingModel
from fastembed import TextEmbedding

_DEFAULT_MODEL = "BAAI/bge-large-en-v1.5"


class FastEmbedEmbedder(DeepEvalBaseEmbeddingModel):

    def __init__(self, model_name: str = _DEFAULT_MODEL):
        self._model_name = model_name
        self._model = TextEmbedding(model_name=model_name)

    def load_model(self):
        return self._model

    def embed_text(self, text: str) -> list[float]:
        embeddings = list(self._model.embed([text]))
        return embeddings[0].tolist()

    async def a_embed_text(self, text: str) -> list[float]:
        return self.embed_text(text)

    def embed_texts(self, texts: list[str]) -> list[list[float]]:
        return [e.tolist() for e in self._model.embed(texts)]

    async def a_embed_texts(self, texts: list[str]) -> list[list[float]]:
        return self.embed_texts(texts)

    def get_model_name(self) -> str:
        return self._model_name
