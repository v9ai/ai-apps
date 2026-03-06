import asyncio
from typing import Any, Dict, List
from pydantic import BaseModel, Field
from agents.base_agent import BaseAgent
from models.schemas import Citation, VerifiedCitation, VerificationStatus
from utils.prompts import CITATION_VERIFICATION_PROMPT


class VerificationResult(BaseModel):
    is_supported: bool
    confidence: float = Field(ge=0, le=1)
    confidence_reasoning: str = ""
    discrepancies: List[str] = Field(default_factory=list)
    status: str = "could_not_verify"
    notes: str = ""


STATUS_MAP = {
    "supported": VerificationStatus.SUPPORTED,
    "not_supported": VerificationStatus.NOT_SUPPORTED,
    "misleading": VerificationStatus.MISLEADING,
}


class CitationVerifierAgent(BaseAgent):
    def __init__(self, llm_service=None):
        super().__init__("citation_verifier", llm_service)

    async def _verify_one(self, citation: Citation, case_context: str) -> Dict:
        try:
            prompt = CITATION_VERIFICATION_PROMPT.format(
                citation_text=citation.citation_text,
                claimed_proposition=citation.claimed_proposition,
                context=citation.context or "",
                case_context=case_context,
            )
            vr = await self._call_llm(prompt, VerificationResult)
            verified = VerifiedCitation(
                citation=citation,
                is_supported=vr.is_supported,
                confidence=vr.confidence,
                confidence_reasoning=vr.confidence_reasoning or None,
                discrepancies=vr.discrepancies,
                status=STATUS_MAP.get(vr.status, VerificationStatus.COULD_NOT_VERIFY),
                notes=vr.notes,
            )
            return verified.model_dump()
        except Exception as e:
            self.logger.warning(f"Failed to verify citation: {e}")
            verified = VerifiedCitation(
                citation=citation,
                is_supported=False,
                confidence=0.0,
                discrepancies=[],
                status=VerificationStatus.COULD_NOT_VERIFY,
                notes=f"Verification failed: {e}",
            )
            return verified.model_dump()

    async def execute(self, input_data: Dict[str, Any], context: Dict[str, Any] = None) -> List[Dict]:
        citations_data = input_data.get("citations", [])
        case_context = input_data.get("case_context", "")
        if not citations_data:
            return []

        self.logger.info(f"Verifying {len(citations_data)} citations")

        citations = [
            Citation(**c) if isinstance(c, dict) else c
            for c in citations_data
        ]
        results = await asyncio.gather(
            *(self._verify_one(cit, case_context) for cit in citations),
            return_exceptions=True,
        )
        # Replace any unexpected exceptions with error entries
        final = []
        for i, r in enumerate(results):
            if isinstance(r, Exception):
                self.logger.warning(f"Citation {i} verification raised: {r}")
                final.append(VerifiedCitation(
                    citation=citations[i],
                    is_supported=False,
                    confidence=0.0,
                    status=VerificationStatus.COULD_NOT_VERIFY,
                    notes=f"Verification failed: {r}",
                ).model_dump())
            else:
                final.append(r)
        return final
