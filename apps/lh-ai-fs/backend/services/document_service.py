from pathlib import Path
from typing import Dict, Optional


class DocumentService:
    def __init__(self, documents_dir: str = None):
        self.documents_dir = Path(documents_dir or Path(__file__).parent.parent / "documents")
        self._cache: Dict[str, str] = {}

    FILENAMES = {
        "msj": "motion_for_summary_judgment.txt",
        "police_report": "police_report.txt",
        "medical_records": "medical_records_excerpt.txt",
        "witness_statement": "witness_statement.txt",
    }

    def load_all(self) -> Dict[str, str]:
        docs = {}
        for key, filename in self.FILENAMES.items():
            path = self.documents_dir / filename
            if path.exists():
                docs[key] = path.read_text()
        return docs

    @staticmethod
    def load_from_dict(docs: dict) -> dict:
        """Accept documents as a dict of {key: text_content}.

        Returns the dict as-is after basic validation.
        This supports the generic upload flow where documents
        are passed directly via the API.
        """
        return {k: v for k, v in docs.items() if isinstance(v, str) and v.strip()}
