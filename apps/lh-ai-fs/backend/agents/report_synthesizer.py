import json
from typing import Any, Dict, List
from pydantic import BaseModel, Field
from agents.base_agent import BaseAgent
from models.schemas import Finding, ConfidenceScores
from utils.prompts import REPORT_SYNTHESIS_PROMPT


class SynthesisResult(BaseModel):
    top_findings: List[Dict[str, Any]] = Field(default_factory=list)
    confidence_scores: Dict[str, float] = Field(default_factory=dict)
    unknown_issues: List[str] = Field(default_factory=list)


class ReportSynthesizerAgent(BaseAgent):
    def __init__(self, llm_service=None):
        super().__init__("report_synthesizer", llm_service)

    async def execute(self, input_data: Dict[str, Any], context: Dict[str, Any] = None) -> Dict[str, Any]:
        citation_results = input_data.get("citation_results", [])
        fact_results = input_data.get("fact_results", [])

        self.logger.info("Synthesizing verification report")

        prompt = REPORT_SYNTHESIS_PROMPT.format(
            citation_results=json.dumps(citation_results, indent=2, default=str)[:10000],
            fact_results=json.dumps(fact_results, indent=2, default=str)[:10000],
        )

        try:
            result = await self._call_llm(prompt, SynthesisResult)

            findings = []
            for i, f in enumerate(result.top_findings):
                findings.append(Finding(
                    id=f.get("id", f"F-{i+1}"),
                    type=f.get("type", "unknown"),
                    description=f.get("description", ""),
                    severity=f.get("severity", "medium"),
                    confidence=f.get("confidence", 0.5),
                    confidence_reasoning=f.get("confidence_reasoning"),
                    evidence=f.get("evidence", []),
                    recommendation=f.get("recommendation"),
                ).model_dump())

            scores = ConfidenceScores(
                citation_verification=result.confidence_scores.get("citation_verification", 0.5),
                fact_consistency=result.confidence_scores.get("fact_consistency", 0.5),
                overall=result.confidence_scores.get("overall", 0.5),
            )

            return {
                "top_findings": findings,
                "confidence_scores": scores.model_dump(),
                "unknown_issues": result.unknown_issues,
            }
        except Exception as e:
            self.logger.error(f"Synthesis failed: {e}")
            return {
                "top_findings": [],
                "confidence_scores": {"citation_verification": 0, "fact_consistency": 0, "overall": 0},
                "unknown_issues": [f"Synthesis failed: {e}"],
            }
