import json
from typing import Any, Dict, List
from pydantic import BaseModel, Field
from agents.base_agent import BaseAgent
from models.schemas import JudicialMemo
from utils.prompts import JUDICIAL_MEMO_PROMPT


class JudicialMemoResult(BaseModel):
    memo: str = ""
    key_issues: List[str] = Field(default_factory=list)
    recommended_actions: List[str] = Field(default_factory=list)
    overall_assessment: str = ""


class JudicialMemoAgent(BaseAgent):
    def __init__(self, llm_service=None):
        super().__init__("judicial_memo", llm_service)

    async def execute(self, input_data: Dict[str, Any], context: Dict[str, Any] = None) -> Dict[str, Any]:
        top_findings = input_data.get("top_findings", [])
        confidence_scores = input_data.get("confidence_scores", {})
        case_context = input_data.get("case_context", "")

        self.logger.info("Generating judicial memo")

        prompt = JUDICIAL_MEMO_PROMPT.format(
            findings=json.dumps(top_findings, indent=2, default=str)[:6000],
            confidence_scores=json.dumps(confidence_scores, indent=2, default=str),
            case_context=case_context,
        )

        try:
            result = await self._call_llm(prompt, JudicialMemoResult)
            memo = JudicialMemo(
                memo=result.memo,
                key_issues=result.key_issues,
                recommended_actions=result.recommended_actions,
                overall_assessment=result.overall_assessment,
            )
            return memo.model_dump()
        except Exception as e:
            self.logger.error(f"Judicial memo generation failed: {e}")
            return JudicialMemo(
                memo=f"Memo generation failed: {e}",
                key_issues=[],
                recommended_actions=[],
                overall_assessment="Unable to assess",
            ).model_dump()
