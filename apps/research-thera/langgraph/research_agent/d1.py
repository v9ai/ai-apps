"""Cloudflare D1 HTTP client — port of crates/research/src/d1.rs"""
from __future__ import annotations

import json
import os
from dataclasses import dataclass
from typing import Optional

import httpx


@dataclass
class Issue:
    id: int
    title: str
    description: str
    category: str
    severity: str
    recommendations: Optional[str] = None  # JSON array string


@dataclass
class Characteristic:
    id: int
    family_member_id: int
    category: str
    title: str
    description: Optional[str] = None
    severity: Optional[str] = None
    impairment_domains: Optional[str] = None  # JSON array string


@dataclass
class FamilyMember:
    id: int
    first_name: str
    name: Optional[str] = None
    date_of_birth: Optional[str] = None
    age_years: Optional[int] = None


@dataclass
class ResearchPaper:
    id: int
    title: str
    authors: Optional[str] = None  # JSON array
    year: Optional[int] = None
    key_findings: Optional[str] = None  # JSON array
    therapeutic_techniques: Optional[str] = None  # JSON array
    evidence_level: Optional[str] = None
    relevance_score: Optional[int] = None


@dataclass
class ContactFeedback:
    id: int
    contact_id: int
    family_member_id: int
    subject: str
    content: str
    feedback_date: str
    tags: Optional[str] = None
    source: Optional[str] = None
    extracted_issues: Optional[str] = None


@dataclass
class CharacteristicTarget:
    family_member_id: int
    characteristic_id: int


@dataclass
class FeedbackTarget:
    family_member_id: int
    feedback_id: int


def parse_path(path: str) -> CharacteristicTarget | FeedbackTarget:
    """Parse URL paths into therapy targets.

    /family/{id}/characteristics/{id} -> CharacteristicTarget
    /family/{name}/contacts/{name}/feedback/{id} -> FeedbackTarget
    """
    parts = path.strip("/").split("/")
    if len(parts) == 4 and parts[0] == "family" and parts[2] == "characteristics":
        return CharacteristicTarget(
            family_member_id=int(parts[1]),
            characteristic_id=int(parts[3]),
        )
    if len(parts) == 6 and parts[0] == "family" and parts[2] == "contacts" and parts[4] == "feedback":
        return FeedbackTarget(
            family_member_id=0,  # resolved from feedback row
            feedback_id=int(parts[5]),
        )
    raise ValueError(
        f"Expected /family/{{id}}/characteristics/{{id}} or "
        f"/family/{{name}}/contacts/{{name}}/feedback/{{id}}, got: {path}"
    )


class D1Client:
    def __init__(self, account_id: str, database_id: str, token: str) -> None:
        self.account_id = account_id
        self.database_id = database_id
        self.token = token
        self._http = httpx.AsyncClient(timeout=30.0)

    @classmethod
    def from_env(cls) -> "D1Client":
        return cls(
            account_id=os.environ["CLOUDFLARE_ACCOUNT_ID"],
            database_id=os.environ["CLOUDFLARE_DATABASE_ID"],
            token=os.environ["CLOUDFLARE_D1_TOKEN"],
        )

    @property
    def _url(self) -> str:
        return (
            f"https://api.cloudflare.com/client/v4/accounts/{self.account_id}"
            f"/d1/database/{self.database_id}/query"
        )

    async def execute_sql(self, sql: str, params: list) -> list[dict]:
        resp = await self._http.post(
            self._url,
            headers={"Authorization": f"Bearer {self.token}"},
            json={"sql": sql, "params": params},
        )
        resp.raise_for_status()
        data = resp.json()
        return data["result"][0]["results"]

    async def fetch_first_goal_id(self, family_member_id: int) -> Optional[int]:
        rows = await self.execute_sql(
            "SELECT id FROM goals WHERE family_member_id = ?1 ORDER BY created_at DESC LIMIT 1",
            [family_member_id],
        )
        return rows[0]["id"] if rows else None

    async def fetch_characteristic(self, characteristic_id: int) -> Characteristic:
        rows = await self.execute_sql(
            "SELECT id, family_member_id, category, title, description, severity, impairment_domains "
            "FROM family_member_characteristics WHERE id = ?1",
            [characteristic_id],
        )
        if not rows:
            raise ValueError(f"characteristic {characteristic_id} not found")
        r = rows[0]
        return Characteristic(
            id=r["id"],
            family_member_id=r["family_member_id"],
            category=r["category"],
            title=r["title"],
            description=r.get("description"),
            severity=r.get("severity"),
            impairment_domains=r.get("impairment_domains"),
        )

    async def fetch_contact_feedback(self, feedback_id: int) -> ContactFeedback:
        rows = await self.execute_sql(
            "SELECT id, contact_id, family_member_id, subject, content, "
            "feedback_date, tags, source, extracted_issues "
            "FROM contact_feedbacks WHERE id = ?1",
            [feedback_id],
        )
        if not rows:
            raise ValueError(f"feedback {feedback_id} not found")
        r = rows[0]
        return ContactFeedback(
            id=r["id"],
            contact_id=r["contact_id"],
            family_member_id=r["family_member_id"],
            subject=r["subject"],
            content=r["content"],
            feedback_date=r["feedback_date"],
            tags=r.get("tags"),
            source=r.get("source"),
            extracted_issues=r.get("extracted_issues"),
        )

    async def fetch_family_member(self, family_member_id: int) -> FamilyMember:
        rows = await self.execute_sql(
            "SELECT id, first_name AS firstName, name, "
            "date_of_birth AS dateOfBirth, age_years AS ageYears "
            "FROM family_members WHERE id = ?1",
            [family_member_id],
        )
        if not rows:
            raise ValueError(f"family_member {family_member_id} not found")
        r = rows[0]
        return FamilyMember(
            id=r["id"],
            first_name=r["firstName"],
            name=r.get("name"),
            date_of_birth=r.get("dateOfBirth"),
            age_years=r.get("ageYears"),
        )

    async def fetch_issues_for_feedback(self, feedback_id: int) -> list[Issue]:
        rows = await self.execute_sql(
            "SELECT id, title, description, category, severity, recommendations "
            "FROM issues WHERE feedback_id = ?1 ORDER BY severity DESC",
            [feedback_id],
        )
        return [
            Issue(
                id=r["id"],
                title=r["title"],
                description=r["description"],
                category=r["category"],
                severity=r["severity"],
                recommendations=r.get("recommendations"),
            )
            for r in rows
        ]

    async def fetch_research_papers(
        self,
        feedback_id: Optional[int] = None,
        goal_id: Optional[int] = None,
        characteristic_id: Optional[int] = None,
    ) -> list[ResearchPaper]:
        if feedback_id is not None:
            sql = (
                "SELECT id, title, authors, year, key_findings, therapeutic_techniques, "
                "evidence_level, relevance_score FROM therapy_research WHERE feedback_id = ?1 "
                "ORDER BY relevance_score DESC LIMIT 10"
            )
            params = [feedback_id]
        elif goal_id is not None:
            sql = (
                "SELECT id, title, authors, year, key_findings, therapeutic_techniques, "
                "evidence_level, relevance_score FROM therapy_research WHERE goal_id = ?1 "
                "ORDER BY relevance_score DESC LIMIT 10"
            )
            params = [goal_id]
        elif characteristic_id is not None:
            sql = (
                "SELECT id, title, authors, year, key_findings, therapeutic_techniques, "
                "evidence_level, relevance_score FROM therapy_research WHERE characteristic_id = ?1 "
                "ORDER BY relevance_score DESC LIMIT 10"
            )
            params = [characteristic_id]
        else:
            return []

        rows = await self.execute_sql(sql, params)
        return [
            ResearchPaper(
                id=r["id"],
                title=r["title"],
                authors=r.get("authors"),
                year=r.get("year"),
                key_findings=r.get("key_findings"),
                therapeutic_techniques=r.get("therapeutic_techniques"),
                evidence_level=r.get("evidence_level"),
                relevance_score=r.get("relevance_score"),
            )
            for r in rows
        ]

    async def upsert_research_paper(
        self,
        goal_id: Optional[int],
        feedback_id: Optional[int],
        characteristic_id: int,
        therapeutic_goal_type: str,
        title: str,
        authors_json: str,
        year: Optional[int],
        doi: Optional[str],
        url: Optional[str],
        key_findings_json: str,
        therapeutic_techniques_json: str,
        evidence_level: str,
        relevance_score: float,
    ) -> int:
        # 1. Check by DOI
        if doi:
            rows = await self.execute_sql(
                "SELECT id, characteristic_id, feedback_id FROM therapy_research WHERE doi = ?1 LIMIT 1",
                [doi],
            )
            if rows:
                existing_id = rows[0]["id"]
                if rows[0].get("characteristic_id") is None or (
                    feedback_id is not None and rows[0].get("feedback_id") is None
                ):
                    await self.execute_sql(
                        "UPDATE therapy_research SET "
                        "characteristic_id = COALESCE(characteristic_id, ?1), "
                        "feedback_id = COALESCE(feedback_id, ?2), "
                        "updated_at = datetime('now') WHERE id = ?3",
                        [characteristic_id, feedback_id, existing_id],
                    )
                return existing_id

        # 2. Check by title + goal_id or title + feedback_id
        dup_rows: list[dict] = []
        if goal_id is not None:
            dup_rows = await self.execute_sql(
                "SELECT id FROM therapy_research WHERE title = ?1 AND goal_id = ?2 LIMIT 1",
                [title, goal_id],
            )
        elif feedback_id is not None:
            dup_rows = await self.execute_sql(
                "SELECT id FROM therapy_research WHERE title = ?1 AND feedback_id = ?2 LIMIT 1",
                [title, feedback_id],
            )
        if dup_rows:
            return dup_rows[0]["id"]

        # 3. Insert
        rows = await self.execute_sql(
            "INSERT INTO therapy_research "
            "(goal_id, feedback_id, characteristic_id, therapeutic_goal_type, title, authors, year, doi, url, "
            "key_findings, therapeutic_techniques, evidence_level, relevance_score, "
            "extracted_by, extraction_confidence) "
            "VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11,?12,?13,?14,?15) RETURNING id",
            [
                goal_id, feedback_id, characteristic_id, therapeutic_goal_type,
                title, authors_json, year, doi, url,
                key_findings_json, therapeutic_techniques_json, evidence_level,
                int(relevance_score * 100),
                "python:deepseek-reasoner:v1",
                75,
            ],
        )
        return rows[0]["id"] if rows else 0

    async def insert_goal_story(
        self,
        goal_id: Optional[int],
        characteristic_id: Optional[int],
        feedback_id: Optional[int],
        language: str,
        minutes: int,
        text: str,
    ) -> int:
        rows = await self.execute_sql(
            "INSERT INTO goal_stories "
            "(goal_id, characteristic_id, feedback_id, language, minutes, text, created_at) "
            "VALUES (?1, ?2, ?3, ?4, ?5, ?6, datetime('now')) RETURNING id",
            [goal_id, characteristic_id, feedback_id, language, minutes, text],
        )
        return rows[0]["id"] if rows else 0

    async def aclose(self) -> None:
        await self._http.aclose()
