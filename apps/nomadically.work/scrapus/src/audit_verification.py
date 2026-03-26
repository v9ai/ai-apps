"""
Audit Chain Verification and Compliance Reporting
for Scrapus M1 Local Deployment

Provides:
1. Full chain verification: validate every hash from genesis to tip
2. Partial verification: validate a range of entries
3. Tamper detection: identify broken links, report the exact break point
4. Verification report: summary with chain length, time span, integrity status
5. Export: JSON and CSV for compliance auditing
6. Statistical summary: events per stage, error rates, decision distributions
7. Provenance queries: trace a lead's full decision path from crawl to report

Dependencies: hashlib (stdlib), sqlite3 (stdlib), csv (stdlib), json (stdlib)
"""

import csv
import io
import json
import logging
import sqlite3
import time
from collections import Counter, defaultdict
from dataclasses import asdict, dataclass, field
from datetime import datetime, timedelta
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

from audit_trail import (
    GENESIS_HASH,
    AuditAction,
    AuditEntry,
    AuditStage,
    AuditTrail,
    compute_entry_hash,
    verify_entry_hash,
)

logger = logging.getLogger(__name__)


# ============================================================================
# Verification report data structures
# ============================================================================

@dataclass
class ChainBreak:
    """Describes a single broken link in the hash chain."""
    seq_id: int
    expected_prev_hash: str
    actual_prev_hash: str
    stored_hash: str
    computed_hash: str
    timestamp: str
    break_type: str  # "prev_hash_mismatch" | "entry_hash_mismatch"

    def to_dict(self) -> Dict[str, Any]:
        return {
            "seq_id": self.seq_id,
            "expected_prev_hash": self.expected_prev_hash,
            "actual_prev_hash": self.actual_prev_hash,
            "stored_hash": self.stored_hash,
            "computed_hash": self.computed_hash,
            "timestamp": self.timestamp,
            "break_type": self.break_type,
        }


@dataclass
class VerificationReport:
    """Complete chain verification report for compliance."""
    verified_at: str
    chain_length: int
    verified_range: Tuple[int, int]
    is_valid: bool
    entries_checked: int
    time_span_start: Optional[str]
    time_span_end: Optional[str]
    breaks: List[ChainBreak]
    verification_time_s: float
    genesis_hash: str
    tip_hash: str
    tip_seq_id: int

    def to_dict(self) -> Dict[str, Any]:
        return {
            "verified_at": self.verified_at,
            "chain_length": self.chain_length,
            "verified_range": list(self.verified_range),
            "is_valid": self.is_valid,
            "entries_checked": self.entries_checked,
            "time_span_start": self.time_span_start,
            "time_span_end": self.time_span_end,
            "breaks": [b.to_dict() for b in self.breaks],
            "break_count": len(self.breaks),
            "verification_time_s": round(self.verification_time_s, 3),
            "genesis_hash": self.genesis_hash,
            "tip_hash": self.tip_hash,
            "tip_seq_id": self.tip_seq_id,
        }

    def summary(self) -> str:
        """Human-readable summary for dashboards and logs."""
        status = "INTACT" if self.is_valid else f"BROKEN ({len(self.breaks)} break(s))"
        lines = [
            f"Chain Verification Report ({self.verified_at})",
            f"  Status:          {status}",
            f"  Chain length:    {self.chain_length}",
            f"  Verified range:  seq {self.verified_range[0]}..{self.verified_range[1]}",
            f"  Entries checked: {self.entries_checked}",
            f"  Time span:       {self.time_span_start or 'N/A'} to {self.time_span_end or 'N/A'}",
            f"  Verification:    {self.verification_time_s:.3f}s",
            f"  Tip:             seq={self.tip_seq_id}, hash={self.tip_hash[:16]}...",
        ]
        if self.breaks:
            lines.append(f"  First break at:  seq={self.breaks[0].seq_id}")
        return "\n".join(lines)


@dataclass
class StatisticalSummary:
    """Aggregate statistics over the audit log."""
    total_entries: int
    time_span_start: Optional[str]
    time_span_end: Optional[str]
    events_by_stage: Dict[str, int]
    events_by_action: Dict[str, int]
    error_count: int
    error_rate: float
    entities_extracted: int
    entities_merged: int
    leads_scored: int
    leads_qualified: int
    leads_rejected: int
    qualification_rate: float
    reports_generated: int
    reports_verified: int
    drift_events: int
    pages_crawled: int
    models_loaded: int
    stages_completed: int

    def to_dict(self) -> Dict[str, Any]:
        return {
            "total_entries": self.total_entries,
            "time_span_start": self.time_span_start,
            "time_span_end": self.time_span_end,
            "events_by_stage": self.events_by_stage,
            "events_by_action": self.events_by_action,
            "error_count": self.error_count,
            "error_rate": round(self.error_rate, 6),
            "entities_extracted": self.entities_extracted,
            "entities_merged": self.entities_merged,
            "leads_scored": self.leads_scored,
            "leads_qualified": self.leads_qualified,
            "leads_rejected": self.leads_rejected,
            "qualification_rate": round(self.qualification_rate, 4),
            "reports_generated": self.reports_generated,
            "reports_verified": self.reports_verified,
            "drift_events": self.drift_events,
            "pages_crawled": self.pages_crawled,
            "models_loaded": self.models_loaded,
            "stages_completed": self.stages_completed,
        }


@dataclass
class ProvenanceTrace:
    """
    Full provenance trace for a single entity/lead: every audit event
    that contributed to its lifecycle, from crawl to report.
    """
    entity_id: str
    trace_entries: List[AuditEntry]
    related_entities: List[str]
    decision_summary: Dict[str, Any]

    def to_dict(self) -> Dict[str, Any]:
        return {
            "entity_id": self.entity_id,
            "trace_length": len(self.trace_entries),
            "stages_involved": list({e.stage for e in self.trace_entries}),
            "actions_involved": list({e.action for e in self.trace_entries}),
            "related_entities": self.related_entities,
            "decision_summary": self.decision_summary,
            "entries": [e.to_dict() for e in self.trace_entries],
        }


# ============================================================================
# AuditVerifier: chain verification engine
# ============================================================================

class AuditVerifier:
    """
    Chain verification and compliance reporting engine.

    Operates on an AuditTrail instance or directly on the audit database.
    All read operations use WAL-mode concurrent reads and do not block writes.
    """

    def __init__(self, audit_trail: AuditTrail):
        self._trail = audit_trail

    # ------------------------------------------------------------------
    # Chain verification
    # ------------------------------------------------------------------

    def full_verification(self) -> VerificationReport:
        """
        Verify the entire hash chain from genesis to tip.
        Returns a detailed verification report.
        """
        t0 = time.perf_counter()
        chain_len = self._trail.chain_length()
        tip_seq, tip_hash = self._trail.get_tip()

        if chain_len == 0:
            return VerificationReport(
                verified_at=datetime.utcnow().isoformat(),
                chain_length=0,
                verified_range=(0, 0),
                is_valid=True,
                entries_checked=0,
                time_span_start=None,
                time_span_end=None,
                breaks=[],
                verification_time_s=time.perf_counter() - t0,
                genesis_hash=GENESIS_HASH,
                tip_hash=GENESIS_HASH,
                tip_seq_id=0,
            )

        breaks = self._walk_chain(start_seq=1, end_seq=tip_seq)
        elapsed = time.perf_counter() - t0

        # Get time span
        time_span = self._get_time_span()

        return VerificationReport(
            verified_at=datetime.utcnow().isoformat(),
            chain_length=chain_len,
            verified_range=(1, tip_seq),
            is_valid=len(breaks) == 0,
            entries_checked=chain_len,
            time_span_start=time_span[0],
            time_span_end=time_span[1],
            breaks=breaks,
            verification_time_s=elapsed,
            genesis_hash=GENESIS_HASH,
            tip_hash=tip_hash,
            tip_seq_id=tip_seq,
        )

    def partial_verification(
        self,
        start_seq: int,
        end_seq: int,
    ) -> VerificationReport:
        """
        Verify a range of entries in the chain.
        Useful for verifying only recent entries after a known-good checkpoint.
        """
        t0 = time.perf_counter()
        chain_len = self._trail.chain_length()
        tip_seq, tip_hash = self._trail.get_tip()

        breaks = self._walk_chain(start_seq=start_seq, end_seq=end_seq)
        elapsed = time.perf_counter() - t0

        # Time span for the verified range only
        entries = self._trail.query_entries(limit=1)
        first_ts = None
        last_ts = None
        if entries:
            range_entries = self._trail.query_entries(limit=1)
            first_entry = self._trail.get_entry(start_seq)
            last_entry = self._trail.get_entry(end_seq)
            first_ts = first_entry.timestamp if first_entry else None
            last_ts = last_entry.timestamp if last_entry else None

        return VerificationReport(
            verified_at=datetime.utcnow().isoformat(),
            chain_length=chain_len,
            verified_range=(start_seq, end_seq),
            is_valid=len(breaks) == 0,
            entries_checked=end_seq - start_seq + 1,
            time_span_start=first_ts,
            time_span_end=last_ts,
            breaks=breaks,
            verification_time_s=elapsed,
            genesis_hash=GENESIS_HASH,
            tip_hash=tip_hash,
            tip_seq_id=tip_seq,
        )

    def _walk_chain(
        self,
        start_seq: int,
        end_seq: int,
        batch_size: int = 5000,
    ) -> List[ChainBreak]:
        """
        Walk the chain from start_seq to end_seq, collecting all breaks.
        Unlike AuditTrail.verify_chain which stops at first break,
        this collects ALL breaks for a complete tamper report.
        """
        breaks: List[ChainBreak] = []
        conn = self._trail._read_conn()

        # Determine expected prev_hash for start_seq
        if start_seq <= 1:
            expected_prev_hash = GENESIS_HASH
            start_seq = 1
        else:
            prev_row = conn.execute(
                "SELECT entry_hash FROM audit_chain WHERE seq_id = ?",
                (start_seq - 1,),
            ).fetchone()
            if not prev_row:
                breaks.append(ChainBreak(
                    seq_id=start_seq,
                    expected_prev_hash="<missing predecessor>",
                    actual_prev_hash="<unknown>",
                    stored_hash="<unknown>",
                    computed_hash="<unknown>",
                    timestamp="<unknown>",
                    break_type="missing_predecessor",
                ))
                return breaks
            expected_prev_hash = prev_row[0]

        current_offset = start_seq
        while current_offset <= end_seq:
            rows = conn.execute(
                "SELECT seq_id, timestamp, stage, action, entity_id, "
                "details_json, prev_hash, entry_hash "
                "FROM audit_chain "
                "WHERE seq_id >= ? AND seq_id <= ? "
                "ORDER BY seq_id ASC LIMIT ?",
                (current_offset, end_seq, batch_size),
            ).fetchall()

            if not rows:
                break

            for row in rows:
                entry = AuditEntry.from_row(row)

                # Check prev_hash linkage
                if entry.prev_hash != expected_prev_hash:
                    breaks.append(ChainBreak(
                        seq_id=entry.seq_id,
                        expected_prev_hash=expected_prev_hash,
                        actual_prev_hash=entry.prev_hash,
                        stored_hash=entry.entry_hash,
                        computed_hash=compute_entry_hash(
                            entry.prev_hash, entry.timestamp,
                            entry.stage, entry.action, entry.details_json,
                        ),
                        timestamp=entry.timestamp,
                        break_type="prev_hash_mismatch",
                    ))

                # Check entry_hash integrity
                computed = compute_entry_hash(
                    entry.prev_hash, entry.timestamp,
                    entry.stage, entry.action, entry.details_json,
                )
                if computed != entry.entry_hash:
                    breaks.append(ChainBreak(
                        seq_id=entry.seq_id,
                        expected_prev_hash=expected_prev_hash,
                        actual_prev_hash=entry.prev_hash,
                        stored_hash=entry.entry_hash,
                        computed_hash=computed,
                        timestamp=entry.timestamp,
                        break_type="entry_hash_mismatch",
                    ))

                expected_prev_hash = entry.entry_hash

            current_offset = rows[-1][0] + 1

        return breaks

    def _get_time_span(self) -> Tuple[Optional[str], Optional[str]]:
        """Get the timestamp of the first and last entry."""
        conn = self._trail._read_conn()
        first = conn.execute(
            "SELECT timestamp FROM audit_chain ORDER BY seq_id ASC LIMIT 1"
        ).fetchone()
        last = conn.execute(
            "SELECT timestamp FROM audit_chain ORDER BY seq_id DESC LIMIT 1"
        ).fetchone()
        return (
            first[0] if first else None,
            last[0] if last else None,
        )

    # ------------------------------------------------------------------
    # Statistical summary
    # ------------------------------------------------------------------

    def statistical_summary(
        self,
        start: Optional[datetime] = None,
        end: Optional[datetime] = None,
    ) -> StatisticalSummary:
        """
        Compute aggregate statistics over the audit log.
        Optionally filtered to a time range.
        """
        conn = self._trail._read_conn()

        # Build time filter
        time_clause = ""
        params: List[Any] = []
        if start:
            time_clause += " AND timestamp >= ?"
            params.append(start.isoformat())
        if end:
            time_clause += " AND timestamp <= ?"
            params.append(end.isoformat())

        where = f"WHERE 1=1 {time_clause}" if time_clause else ""

        # Total count
        total = conn.execute(
            f"SELECT COUNT(*) FROM audit_chain {where}", params
        ).fetchone()[0]

        # Events by stage
        stage_rows = conn.execute(
            f"SELECT stage, COUNT(*) FROM audit_chain {where} GROUP BY stage",
            params,
        ).fetchall()
        events_by_stage = {row[0]: row[1] for row in stage_rows}

        # Events by action
        action_rows = conn.execute(
            f"SELECT action, COUNT(*) FROM audit_chain {where} GROUP BY action",
            params,
        ).fetchall()
        events_by_action = {row[0]: row[1] for row in action_rows}

        # Time span
        time_span = self._get_time_span()

        # Derived metrics
        error_count = events_by_action.get(AuditAction.ERROR_OCCURRED.value, 0)
        entities_extracted = events_by_action.get(AuditAction.ENTITY_EXTRACTED.value, 0)
        entities_merged = events_by_action.get(AuditAction.ENTITY_MERGED.value, 0)
        leads_scored = events_by_action.get(AuditAction.LEAD_SCORED.value, 0)
        leads_qualified = events_by_action.get(AuditAction.LEAD_QUALIFIED.value, 0)
        leads_rejected = events_by_action.get(AuditAction.LEAD_REJECTED.value, 0)
        total_lead_decisions = leads_qualified + leads_rejected

        return StatisticalSummary(
            total_entries=total,
            time_span_start=time_span[0],
            time_span_end=time_span[1],
            events_by_stage=events_by_stage,
            events_by_action=events_by_action,
            error_count=error_count,
            error_rate=error_count / max(total, 1),
            entities_extracted=entities_extracted,
            entities_merged=entities_merged,
            leads_scored=leads_scored,
            leads_qualified=leads_qualified,
            leads_rejected=leads_rejected,
            qualification_rate=leads_qualified / max(total_lead_decisions, 1),
            reports_generated=events_by_action.get(AuditAction.REPORT_GENERATED.value, 0),
            reports_verified=events_by_action.get(AuditAction.REPORT_VERIFIED.value, 0),
            drift_events=events_by_action.get(AuditAction.DRIFT_DETECTED.value, 0),
            pages_crawled=events_by_action.get(AuditAction.PAGE_CRAWLED.value, 0),
            models_loaded=events_by_action.get(AuditAction.MODEL_LOADED.value, 0),
            stages_completed=events_by_action.get(AuditAction.STAGE_COMPLETED.value, 0),
        )

    # ------------------------------------------------------------------
    # Provenance tracing
    # ------------------------------------------------------------------

    def trace_entity_provenance(self, entity_id: str) -> ProvenanceTrace:
        """
        Trace the full provenance of an entity/lead through the pipeline.

        Answers: "Why was this lead qualified?" by collecting every audit
        event that touched this entity, including events from related
        entities (e.g., merged entities, source pages).

        Returns a ProvenanceTrace with the complete decision chain.
        """
        # Get all direct events for this entity
        direct_entries = self._trail.query_by_entity(entity_id, limit=2000)

        # Collect related entity IDs from merge/cluster events
        related_ids: set = set()
        for entry in direct_entries:
            if entry.action in (
                AuditAction.ENTITY_MERGED.value,
                AuditAction.CLUSTER_CREATED.value,
            ):
                try:
                    details = json.loads(entry.details_json)
                    for key in ("merged_ids", "member_ids"):
                        if key in details and isinstance(details[key], list):
                            related_ids.update(details[key])
                except (json.JSONDecodeError, TypeError):
                    pass

            # Also trace back to source URLs
            if entry.action == AuditAction.ENTITY_EXTRACTED.value:
                try:
                    details = json.loads(entry.details_json)
                    source_url = details.get("source_url")
                    if source_url:
                        related_ids.add(source_url)
                except (json.JSONDecodeError, TypeError):
                    pass

        # Fetch events for related entities (1 hop)
        related_entries: List[AuditEntry] = []
        for rid in related_ids:
            if rid != entity_id:
                related_entries.extend(
                    self._trail.query_by_entity(rid, limit=100)
                )

        # Combine and deduplicate by seq_id
        all_entries_map: Dict[int, AuditEntry] = {}
        for entry in direct_entries + related_entries:
            all_entries_map[entry.seq_id] = entry

        # Sort chronologically
        sorted_entries = sorted(all_entries_map.values(), key=lambda e: e.seq_id)

        # Build decision summary
        decision_summary = self._build_decision_summary(entity_id, sorted_entries)

        return ProvenanceTrace(
            entity_id=entity_id,
            trace_entries=sorted_entries,
            related_entities=sorted(related_ids - {entity_id}),
            decision_summary=decision_summary,
        )

    def _build_decision_summary(
        self,
        entity_id: str,
        entries: List[AuditEntry],
    ) -> Dict[str, Any]:
        """Build a human-readable decision summary from trace entries."""
        summary: Dict[str, Any] = {
            "entity_id": entity_id,
            "total_events": len(entries),
            "stages_involved": [],
            "timeline": [],
            "final_outcome": None,
            "qualification_reason": None,
            "score": None,
            "source_urls": [],
            "merge_history": [],
        }

        stages_seen: set = set()
        for entry in entries:
            stages_seen.add(entry.stage)

            try:
                details = json.loads(entry.details_json)
            except (json.JSONDecodeError, TypeError):
                details = {}

            event_desc = {
                "seq_id": entry.seq_id,
                "timestamp": entry.timestamp,
                "action": entry.action,
            }

            if entry.action == AuditAction.PAGE_CRAWLED.value:
                url = details.get("url", entry.entity_id)
                summary["source_urls"].append(url)
                event_desc["description"] = f"Crawled {url}"

            elif entry.action == AuditAction.ENTITY_EXTRACTED.value:
                etype = details.get("entity_type", "unknown")
                conf = details.get("confidence", 0)
                event_desc["description"] = (
                    f"Extracted {etype} (confidence={conf:.2%})"
                )

            elif entry.action == AuditAction.ENTITY_MERGED.value:
                merged = details.get("merged_ids", [])
                sim = details.get("similarity_score", 0)
                summary["merge_history"].append({
                    "merged_ids": merged,
                    "similarity": sim,
                })
                event_desc["description"] = (
                    f"Merged {len(merged)} entities (similarity={sim:.4f})"
                )

            elif entry.action == AuditAction.LEAD_SCORED.value:
                score = details.get("score", 0)
                summary["score"] = score
                event_desc["description"] = f"Scored {score:.4f}"

            elif entry.action == AuditAction.LEAD_QUALIFIED.value:
                reason = details.get("reason", "")
                summary["final_outcome"] = "QUALIFIED"
                summary["qualification_reason"] = reason
                event_desc["description"] = f"Qualified: {reason}"

            elif entry.action == AuditAction.LEAD_REJECTED.value:
                reason = details.get("reason", "")
                summary["final_outcome"] = "REJECTED"
                summary["qualification_reason"] = reason
                event_desc["description"] = f"Rejected: {reason}"

            elif entry.action == AuditAction.REPORT_GENERATED.value:
                model = details.get("model_name", "unknown")
                event_desc["description"] = f"Report generated by {model}"

            elif entry.action == AuditAction.REPORT_VERIFIED.value:
                factuality = details.get("factuality_score", 0)
                event_desc["description"] = (
                    f"Report verified (factuality={factuality:.2%})"
                )

            else:
                event_desc["description"] = entry.action

            summary["timeline"].append(event_desc)

        summary["stages_involved"] = sorted(stages_seen)
        return summary

    # ------------------------------------------------------------------
    # Export: JSON and CSV
    # ------------------------------------------------------------------

    def export_json(
        self,
        output_path: Path,
        start: Optional[datetime] = None,
        end: Optional[datetime] = None,
        include_verification: bool = True,
    ) -> int:
        """
        Export audit log to JSON for compliance reporting.

        Args:
            output_path: File path for the JSON output.
            start: Optional start time filter.
            end: Optional end time filter.
            include_verification: Include chain verification result.

        Returns:
            Number of entries exported.
        """
        entries = self._trail.query_entries(start=start, end=end, limit=100_000)

        export_data: Dict[str, Any] = {
            "export_timestamp": datetime.utcnow().isoformat(),
            "entry_count": len(entries),
            "entries": [e.to_dict() for e in entries],
        }

        if include_verification:
            report = self.full_verification()
            export_data["verification"] = report.to_dict()

        stats = self.statistical_summary(start=start, end=end)
        export_data["statistics"] = stats.to_dict()

        output_path.parent.mkdir(parents=True, exist_ok=True)
        with open(output_path, "w", encoding="utf-8") as f:
            json.dump(export_data, f, indent=2, ensure_ascii=False)

        logger.info("Exported %d audit entries to %s", len(entries), output_path)
        return len(entries)

    def export_csv(
        self,
        output_path: Path,
        start: Optional[datetime] = None,
        end: Optional[datetime] = None,
    ) -> int:
        """
        Export audit log to CSV for spreadsheet-based compliance review.

        Args:
            output_path: File path for the CSV output.
            start: Optional start time filter.
            end: Optional end time filter.

        Returns:
            Number of entries exported.
        """
        entries = self._trail.query_entries(start=start, end=end, limit=100_000)

        output_path.parent.mkdir(parents=True, exist_ok=True)
        with open(output_path, "w", newline="", encoding="utf-8") as f:
            writer = csv.writer(f)
            writer.writerow([
                "seq_id", "timestamp", "stage", "action",
                "entity_id", "details_json", "prev_hash", "entry_hash",
            ])
            for entry in entries:
                writer.writerow([
                    entry.seq_id,
                    entry.timestamp,
                    entry.stage,
                    entry.action,
                    entry.entity_id or "",
                    entry.details_json,
                    entry.prev_hash,
                    entry.entry_hash,
                ])

        logger.info("Exported %d audit entries to %s", len(entries), output_path)
        return len(entries)

    def export_csv_string(
        self,
        start: Optional[datetime] = None,
        end: Optional[datetime] = None,
    ) -> str:
        """Export to CSV as a string (for Streamlit download buttons)."""
        entries = self._trail.query_entries(start=start, end=end, limit=100_000)
        output = io.StringIO()
        writer = csv.writer(output)
        writer.writerow([
            "seq_id", "timestamp", "stage", "action",
            "entity_id", "details_json", "prev_hash", "entry_hash",
        ])
        for entry in entries:
            writer.writerow([
                entry.seq_id,
                entry.timestamp,
                entry.stage,
                entry.action,
                entry.entity_id or "",
                entry.details_json,
                entry.prev_hash,
                entry.entry_hash,
            ])
        return output.getvalue()

    # ------------------------------------------------------------------
    # Compliance helpers
    # ------------------------------------------------------------------

    def generate_compliance_report(
        self,
        output_dir: Path,
        report_name: Optional[str] = None,
    ) -> Dict[str, Path]:
        """
        Generate a complete compliance package: verification report,
        statistical summary, and full audit log in both JSON and CSV.

        Args:
            output_dir: Directory for output files.
            report_name: Optional name prefix (default: timestamp-based).

        Returns:
            Dict mapping report type to file path.
        """
        output_dir.mkdir(parents=True, exist_ok=True)
        prefix = report_name or datetime.utcnow().strftime("audit_%Y%m%d_%H%M%S")

        files: Dict[str, Path] = {}

        # Verification report
        verification = self.full_verification()
        verification_path = output_dir / f"{prefix}_verification.json"
        with open(verification_path, "w", encoding="utf-8") as f:
            json.dump(verification.to_dict(), f, indent=2)
        files["verification"] = verification_path

        # Statistical summary
        stats = self.statistical_summary()
        stats_path = output_dir / f"{prefix}_statistics.json"
        with open(stats_path, "w", encoding="utf-8") as f:
            json.dump(stats.to_dict(), f, indent=2)
        files["statistics"] = stats_path

        # Full log JSON
        json_path = output_dir / f"{prefix}_full_log.json"
        self.export_json(json_path, include_verification=False)
        files["json_log"] = json_path

        # Full log CSV
        csv_path = output_dir / f"{prefix}_full_log.csv"
        self.export_csv(csv_path)
        files["csv_log"] = csv_path

        logger.info(
            "Compliance package generated in %s: %d files",
            output_dir,
            len(files),
        )
        return files

    def lead_decision_report(self, lead_id: str) -> Dict[str, Any]:
        """
        Generate a compliance-ready decision report for a single lead.
        Answers: "Why was this lead qualified/rejected?"

        Returns a dict suitable for JSON serialization and human review.
        """
        trace = self.trace_entity_provenance(lead_id)
        verification_status = "chain_verified"

        # Verify the hash chain for just the entries in this trace
        if trace.trace_entries:
            first_seq = trace.trace_entries[0].seq_id
            last_seq = trace.trace_entries[-1].seq_id
            for entry in trace.trace_entries:
                if not verify_entry_hash(entry):
                    verification_status = "tampered"
                    break

        return {
            "lead_id": lead_id,
            "generated_at": datetime.utcnow().isoformat(),
            "verification_status": verification_status,
            "provenance": trace.to_dict(),
        }
