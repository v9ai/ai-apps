import asyncio
import logging
import json
import time
from datetime import datetime
from typing import Dict, Any, Optional, List

from services.llm_service import LLMService
from services.document_service import DocumentService
from agents.document_parser import DocumentParserAgent
from agents.citation_verifier import CitationVerifierAgent
from agents.fact_checker import FactCheckerAgent
from agents.report_synthesizer import ReportSynthesizerAgent
from agents.judicial_memo import JudicialMemoAgent
from models.schemas import (
    VerificationReport, ConfidenceScores, JudicialMemo, AgentStatus,
)

logger = logging.getLogger(__name__)


def _track(statuses: List[AgentStatus], name: str) -> AgentStatus:
    """Create and register an AgentStatus entry."""
    entry = AgentStatus(agent_name=name, status="pending")
    statuses.append(entry)
    return entry


def _start(entry: AgentStatus) -> float:
    entry.status = "running"
    return time.time()


def _succeed(entry: AgentStatus, t0: float):
    entry.status = "success"
    entry.duration_ms = int((time.time() - t0) * 1000)


def _fail(entry: AgentStatus, t0: float, err: Exception):
    entry.status = "failed"
    entry.error = str(err)
    entry.duration_ms = int((time.time() - t0) * 1000)


class PipelineOrchestrator:
    def __init__(self, llm_service: LLMService = None):
        self.llm = llm_service or LLMService()
        self.doc_service = DocumentService()
        self.parser = DocumentParserAgent(self.llm)
        self.citation_verifier = CitationVerifierAgent(self.llm)
        self.fact_checker = FactCheckerAgent(self.llm)
        self.synthesizer = ReportSynthesizerAgent(self.llm)
        self.memo_agent = JudicialMemoAgent(self.llm)

    async def analyze(
        self,
        documents: Optional[Dict[str, str]] = None,
        case_id: Optional[str] = None,
    ) -> Dict[str, Any]:
        logger.info("Starting BS Detector pipeline")

        motion_id = case_id or "unknown"
        pipeline_status: List[AgentStatus] = []

        # Step 1: Load documents (from upload or disk)
        if documents:
            docs = DocumentService.load_from_dict(documents)
        else:
            docs = self.doc_service.load_all()
            if not case_id:
                motion_id = "Rivera_v_Harmon_MSJ"
        logger.info(f"Loaded {len(docs)} documents")

        # Step 2: Parse MSJ to extract citations
        parser_st = _track(pipeline_status, "document_parser")
        t0 = _start(parser_st)
        try:
            parse_result = await self.parser.execute(docs)
            citations = parse_result.get("citations", [])
            _succeed(parser_st, t0)
            logger.info(f"Extracted {len(citations)} citations")
        except Exception as e:
            _fail(parser_st, t0, e)
            logger.error(f"Parser failed: {e}")
            # Can't continue without citations — return error report
            return json.loads(VerificationReport(
                motion_id=motion_id,
                timestamp=datetime.now(),
                confidence_scores=ConfidenceScores(),
                unknown_issues=[f"Parser failed: {e}"],
                pipeline_status=pipeline_status,
                metadata={"documents_analyzed": list(docs.keys()), "error": str(e)},
            ).model_dump_json())

        # Step 3: Run citation verification and fact checking IN PARALLEL
        from utils.case_context import get_case_context
        case_context = get_case_context(motion_id)

        cit_st = _track(pipeline_status, "citation_verifier")
        fact_st = _track(pipeline_status, "fact_checker")

        cit_t0 = _start(cit_st)
        fact_t0 = _start(fact_st)

        citation_task = self.citation_verifier.execute(
            {"citations": citations, "case_context": case_context}
        )
        fact_task = self.fact_checker.execute({**docs, "case_context": case_context})

        citation_results, fact_results = await asyncio.gather(
            citation_task, fact_task, return_exceptions=True
        )

        # Handle exceptions from parallel tasks
        if isinstance(citation_results, Exception):
            _fail(cit_st, cit_t0, citation_results)
            logger.error(f"Citation verification failed: {citation_results}")
            citation_results = []
        else:
            _succeed(cit_st, cit_t0)

        if isinstance(fact_results, Exception):
            _fail(fact_st, fact_t0, fact_results)
            logger.error(f"Fact checking failed: {fact_results}")
            fact_results = []
        else:
            _succeed(fact_st, fact_t0)

        logger.info(f"Verified {len(citation_results)} citations, {len(fact_results)} facts")

        # Step 4: Synthesize report
        synth_st = _track(pipeline_status, "report_synthesizer")
        t0 = _start(synth_st)
        try:
            synthesis = await self.synthesizer.execute({
                "citation_results": citation_results,
                "fact_results": fact_results,
            })
            _succeed(synth_st, t0)
        except Exception as e:
            _fail(synth_st, t0, e)
            logger.error(f"Synthesis failed: {e}")
            # Build minimal report from raw verified data
            synthesis = {
                "top_findings": [],
                "confidence_scores": {"citation_verification": 0, "fact_consistency": 0, "overall": 0},
                "unknown_issues": [f"Synthesis failed: {e}"],
            }

        top_findings = synthesis.get("top_findings", [])
        confidence_scores = synthesis.get("confidence_scores", {
            "citation_verification": 0, "fact_consistency": 0, "overall": 0
        })

        # Step 5: Generate judicial memo
        memo_st = _track(pipeline_status, "judicial_memo")
        t0 = _start(memo_st)
        memo_data = None
        try:
            memo_data = await self.memo_agent.execute({
                "top_findings": top_findings,
                "confidence_scores": confidence_scores,
                "case_context": case_context,
            })
            _succeed(memo_st, t0)
        except Exception as e:
            _fail(memo_st, t0, e)
            logger.error(f"Judicial memo failed: {e}")

        # Build final report
        report = VerificationReport(
            motion_id=motion_id,
            timestamp=datetime.now(),
            verified_citations=citation_results,
            verified_facts=fact_results,
            confidence_scores=ConfidenceScores(**confidence_scores),
            top_findings=top_findings,
            unknown_issues=synthesis.get("unknown_issues", []),
            judicial_memo=JudicialMemo(**memo_data) if memo_data else None,
            pipeline_status=pipeline_status,
            metadata={
                "documents_analyzed": list(docs.keys()),
                "citations_extracted": len(citations),
                "pipeline": "document_parser → [citation_verifier ∥ fact_checker] → report_synthesizer → judicial_memo",
            },
        )

        return json.loads(report.model_dump_json())
