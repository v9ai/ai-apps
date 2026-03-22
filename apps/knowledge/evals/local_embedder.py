"""Local embedding model for DeepEval synthesis (no OpenAI key needed).

Uses sentence-transformers with all-MiniLM-L6-v2 (22MB, 384-dim).
Required by ContextConstructionConfig.embedder for synthetic data generation.
"""

from sentence_transformers import SentenceTransformer

from deepeval.models import DeepEvalBaseEmbeddingModel

_DEFAULT_MODEL = "all-MiniLM-L6-v2"


class LocalEmbedder(DeepEvalBaseEmbeddingModel):

    def __init__(self, model_name: str = _DEFAULT_MODEL):
        self._model_name = model_name
        self._st = SentenceTransformer(model_name)

    def load_model(self):
        return self._st

    def embed_text(self, text: str) -> list[float]:
        return self._st.encode(text).tolist()

    async def a_embed_text(self, text: str) -> list[float]:
        return self.embed_text(text)

    def embed_texts(self, texts: list[str]) -> list[list[float]]:
        return self._st.encode(texts).tolist()

    async def a_embed_texts(self, texts: list[str]) -> list[list[float]]:
        return self.embed_texts(texts)

    def get_model_name(self) -> str:
        return self._model_name
