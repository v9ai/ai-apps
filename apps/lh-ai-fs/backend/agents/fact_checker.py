from typing import Any, Dict, List
from pydantic import BaseModel, Field
from agents.base_agent import BaseAgent
from models.schemas import VerifiedFact, Fact, ConsistencyStatus
from utils.prompts import FACT_CHECKING_PROMPT


class FactCheckResult(BaseModel):
    verified_facts: List[Dict[str, Any]] = Field(default_factory=list)


class FactCheckerAgent(BaseAgent):
    def __init__(self, llm_service=None):
        super().__init__("fact_checker", llm_service)

    async def execute(self, input_data: Dict[str, str], context: Dict[str, Any] = None) -> List[Dict]:
        msj_text = input_data.get("msj", "")
        police_text = input_data.get("police_report", "")
        medical_text = input_data.get("medical_records", "")
        witness_text = input_data.get("witness_statement", "")
        case_context = input_data.get("case_context", "")

        self.logger.info("Cross-referencing facts across documents")

        max_chars = 6000
        truncated = []
        for name, text in [("msj", msj_text), ("police_report", police_text),
                           ("medical_records", medical_text), ("witness_statement", witness_text)]:
            if len(text) > max_chars:
                truncated.append(f"{name} ({len(text)} -> {max_chars} chars)")
                self.logger.warning(f"{name} truncated from {len(text)} to {max_chars} chars")

        truncation_notice = ""
        if truncated:
            truncation_notice = (
                "\n\nNOTE: The following documents were truncated to fit processing limits: "
                + ", ".join(truncated)
                + ". Analysis may be incomplete for these documents."
            )

        prompt = FACT_CHECKING_PROMPT.format(
            msj_facts=msj_text[:max_chars],
            police_text=police_text[:max_chars],
            medical_text=medical_text[:max_chars],
            witness_text=witness_text[:max_chars],
            case_context=case_context,
        ) + truncation_notice

        try:
            result = await self._call_llm(prompt, FactCheckResult)
            verified = []
            status_map = {
                "consistent": ConsistencyStatus.CONSISTENT,
                "contradictory": ConsistencyStatus.CONTRADICTORY,
                "partial": ConsistencyStatus.PARTIAL,
            }
            for item in result.verified_facts:
                try:
                    raw_consistent = item.get("is_consistent")
                    status_str = item.get("status", "")
                    # Derive is_consistent from status when LLM returns null
                    if raw_consistent is None:
                        raw_consistent = status_str == "consistent"
                    vf = VerifiedFact(
                        fact=Fact(
                            fact_text=item.get("fact_text", ""),
                            source_document=item.get("source_document", "MSJ"),
                            location=item.get("location", ""),
                            category=item.get("category"),
                        ),
                        is_consistent=bool(raw_consistent),
                        confidence=item.get("confidence") or 0.5,
                        confidence_reasoning=item.get("confidence_reasoning"),
                        contradictory_sources=item.get("contradictory_sources") or [],
                        supporting_sources=item.get("supporting_sources") or [],
                        status=status_map.get(status_str, ConsistencyStatus.COULD_NOT_VERIFY),
                        summary=item.get("summary"),
                    )
                    verified.append(vf.model_dump())
                except Exception as item_err:
                    self.logger.warning(f"Skipping malformed fact: {item_err}")
            return verified
        except Exception as e:
            self.logger.error(f"Fact checking failed: {e}")
            return []
