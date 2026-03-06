from typing import Any, Dict, List
from pydantic import BaseModel, Field
from agents.base_agent import BaseAgent
from models.schemas import Citation, Fact
from utils.prompts import CITATION_EXTRACTION_PROMPT


class ExtractionResult(BaseModel):
    citations: List[Citation] = Field(default_factory=list)
    facts: List[Fact] = Field(default_factory=list)


class DocumentParserAgent(BaseAgent):
    def __init__(self, llm_service=None):
        super().__init__("document_parser", llm_service)

    async def execute(self, input_data: Dict[str, str], context: Dict[str, Any] = None) -> Dict[str, Any]:
        msj_text = input_data.get("msj", "")
        if not msj_text:
            return {"citations": [], "facts": [], "error": "No MSJ text provided"}

        self.logger.info("Extracting citations and facts from MSJ")
        prompt = CITATION_EXTRACTION_PROMPT.format(msj_text=msj_text)

        try:
            result = await self._call_llm(prompt, ExtractionResult)
            return {
                "citations": [c.model_dump() for c in result.citations],
                "facts": [f.model_dump() for f in result.facts],
            }
        except Exception as e:
            self.logger.error(f"Extraction failed: {e}")
            return {"citations": [], "facts": [], "error": str(e)}
