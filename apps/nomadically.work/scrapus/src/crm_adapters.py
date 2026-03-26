"""
Scrapus CRM Adapters: Local CRM-Ready File Export
===================================================

Produces import-ready CSV files for major CRM systems.
All output is local -- zero cloud API calls.

Supported CRM formats:
  - HubSpot: Contacts, Companies, Deals
  - Salesforce: Leads, Contacts, Accounts, Opportunities
  - Pipedrive: Persons, Organizations, Deals
  - Generic CRM: universal flat format

Features:
  - Field mapping from Scrapus entity types to CRM-native fields
  - Cross-lead contact deduplication via email / name normalization
  - Enrichment: report summaries, confidence scores, source URLs

Author: Scrapus Team
Target: Apple M1 16GB, zero cloud dependency
"""

import csv
import hashlib
import io
import logging
import re
import unicodedata
from dataclasses import dataclass, field
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional, Sequence, Tuple, Union

from export_engine import (
    ExportContact,
    ExportFilter,
    ExportLead,
    ExportReport,
    apply_filters,
)

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Normalization helpers
# ---------------------------------------------------------------------------

def _normalize_name(name: str) -> str:
    """Lowercase, strip accents, collapse whitespace."""
    nfkd = unicodedata.normalize("NFKD", name)
    ascii_only = nfkd.encode("ascii", "ignore").decode("ascii")
    return " ".join(ascii_only.lower().split())


def _normalize_email(email: Optional[str]) -> Optional[str]:
    if not email:
        return None
    return email.strip().lower()


def _normalize_phone(phone: Optional[str]) -> Optional[str]:
    if not phone:
        return None
    digits = re.sub(r"[^\d+]", "", phone)
    return digits if digits else None


def _truncate(text: str, max_len: int = 500) -> str:
    if len(text) <= max_len:
        return text
    return text[: max_len - 3] + "..."


def _report_summary_text(report: Optional[ExportReport], max_len: int = 500) -> str:
    """Build a short enrichment blurb from a lead report."""
    if report is None:
        return ""
    parts: List[str] = []
    if report.summary:
        parts.append(report.summary)
    if report.key_strengths:
        parts.append("Strengths: " + "; ".join(report.key_strengths))
    if report.growth_indicators:
        parts.append("Growth: " + "; ".join(report.growth_indicators))
    if report.risk_factors:
        parts.append("Risks: " + "; ".join(report.risk_factors))
    return _truncate(" | ".join(parts), max_len)


def _source_urls_text(lead: ExportLead, max_len: int = 500) -> str:
    if not lead.source_urls:
        return ""
    return _truncate("; ".join(lead.source_urls), max_len)


# ---------------------------------------------------------------------------
# Deduplication
# ---------------------------------------------------------------------------

@dataclass
class _DeduplicatedContact:
    """Internal merged contact across multiple leads."""
    canonical_name: str
    email: Optional[str]
    phone: Optional[str]
    role: Optional[str]
    company_ids: List[int] = field(default_factory=list)
    company_names: List[str] = field(default_factory=list)
    linkedin_url: Optional[str] = None
    source_urls: List[str] = field(default_factory=list)
    merge_count: int = 1


def deduplicate_contacts(leads: Sequence[ExportLead]) -> List[_DeduplicatedContact]:
    """
    Merge duplicate contacts across leads.

    Dedup key priority:
      1. Normalized email (strongest signal)
      2. Normalized name + company_id (fallback)

    Returns a list of canonical contacts with merged metadata.
    """
    by_email: Dict[str, _DeduplicatedContact] = {}
    by_name_company: Dict[str, _DeduplicatedContact] = {}
    result_order: List[str] = []  # track insertion order by dedup key

    for lead in leads:
        for c in lead.contacts:
            email_key = _normalize_email(c.email)
            name_key = _normalize_name(c.name) + f":{c.company_id or lead.company_id}"

            existing: Optional[_DeduplicatedContact] = None

            if email_key and email_key in by_email:
                existing = by_email[email_key]
            elif name_key in by_name_company:
                existing = by_name_company[name_key]

            if existing is not None:
                # Merge into existing
                existing.merge_count += 1
                if not existing.phone and c.phone:
                    existing.phone = _normalize_phone(c.phone)
                if not existing.role and c.role:
                    existing.role = c.role
                if not existing.linkedin_url and c.linkedin_url:
                    existing.linkedin_url = c.linkedin_url
                cid = c.company_id or lead.company_id
                if cid not in existing.company_ids:
                    existing.company_ids.append(cid)
                    existing.company_names.append(c.company_name or lead.company_name)
                if c.source_url and c.source_url not in existing.source_urls:
                    existing.source_urls.append(c.source_url)
            else:
                dedup = _DeduplicatedContact(
                    canonical_name=c.name,
                    email=_normalize_email(c.email),
                    phone=_normalize_phone(c.phone),
                    role=c.role,
                    company_ids=[c.company_id or lead.company_id],
                    company_names=[c.company_name or lead.company_name],
                    linkedin_url=c.linkedin_url,
                    source_urls=[c.source_url] if c.source_url else [],
                )
                key = email_key or name_key
                if email_key:
                    by_email[email_key] = dedup
                by_name_company[name_key] = dedup
                result_order.append(key)

    # Reconstruct in insertion order, deduped
    seen_ids: set = set()
    result: List[_DeduplicatedContact] = []
    for key in result_order:
        obj = by_email.get(key) or by_name_company.get(key)
        if obj is None:
            continue
        oid = id(obj)
        if oid in seen_ids:
            continue
        seen_ids.add(oid)
        result.append(obj)

    logger.info(
        "Deduplication: %d raw contacts -> %d canonical contacts",
        sum(len(l.contacts) for l in leads),
        len(result),
    )
    return result


# ---------------------------------------------------------------------------
# CRM Field Mapping Registry
# ---------------------------------------------------------------------------

@dataclass
class CRMFieldMapping:
    """Maps a Scrapus field to a CRM-native field."""
    scrapus_field: str
    crm_field: str
    transform: Optional[str] = None  # "bool_yesno", "truncate_255", etc.


def _apply_field_transform(value: Any, transform: Optional[str]) -> Any:
    if transform is None:
        return value
    if transform == "bool_yesno":
        return "Yes" if value else "No"
    if transform == "truncate_255":
        return _truncate(str(value), 255) if value else ""
    if transform == "truncate_500":
        return _truncate(str(value), 500) if value else ""
    if transform == "to_str":
        return str(value) if value is not None else ""
    if transform == "round4":
        return round(float(value), 4) if value is not None else ""
    return value


# ---------------------------------------------------------------------------
# HubSpot CSV Adapter
# ---------------------------------------------------------------------------

class HubSpotAdapter:
    """
    Produces HubSpot-compatible import CSVs.

    HubSpot import format expects:
      - Contacts CSV: Email, First Name, Last Name, Phone, Job Title, ...
      - Companies CSV: Company name, Company domain, Industry, ...
      - Deals CSV: Deal Name, Pipeline, Stage, Amount, ...
    """

    CONTACT_FIELDS: List[CRMFieldMapping] = [
        CRMFieldMapping("email", "Email"),
        CRMFieldMapping("first_name", "First Name"),
        CRMFieldMapping("last_name", "Last Name"),
        CRMFieldMapping("phone", "Phone Number"),
        CRMFieldMapping("role", "Job Title", "truncate_255"),
        CRMFieldMapping("company_name", "Company Name"),
        CRMFieldMapping("linkedin_url", "LinkedIn URL"),
        CRMFieldMapping("lead_score", "Lead Score", "round4"),
        CRMFieldMapping("lead_confidence", "Lead Confidence", "round4"),
        CRMFieldMapping("report_summary", "Notes", "truncate_500"),
        CRMFieldMapping("source_url", "Original Source"),
    ]

    COMPANY_FIELDS: List[CRMFieldMapping] = [
        CRMFieldMapping("company_name", "Name"),
        CRMFieldMapping("domain", "Company Domain Name"),
        CRMFieldMapping("industry", "Industry"),
        CRMFieldMapping("size_tier", "Number of Employees"),
        CRMFieldMapping("location", "City"),
        CRMFieldMapping("funding_amount_usd", "Annual Revenue", "to_str"),
        CRMFieldMapping("lead_score", "Lead Score", "round4"),
        CRMFieldMapping("is_qualified", "Lifecycle Stage"),
        CRMFieldMapping("report_summary", "Description", "truncate_500"),
        CRMFieldMapping("source_urls", "Website URL"),
    ]

    DEAL_FIELDS: List[CRMFieldMapping] = [
        CRMFieldMapping("deal_name", "Deal Name"),
        CRMFieldMapping("pipeline", "Pipeline"),
        CRMFieldMapping("stage", "Deal Stage"),
        CRMFieldMapping("company_name", "Associated Company"),
        CRMFieldMapping("lead_score", "Amount", "round4"),
        CRMFieldMapping("close_date", "Close Date"),
        CRMFieldMapping("report_summary", "Deal Description", "truncate_500"),
    ]

    @staticmethod
    def _split_name(full_name: str) -> Tuple[str, str]:
        parts = full_name.strip().split(None, 1)
        first = parts[0] if parts else ""
        last = parts[1] if len(parts) > 1 else ""
        return first, last

    @classmethod
    def export_contacts(cls,
                        leads: Sequence[ExportLead],
                        dest: Union[str, Path],
                        filt: Optional[ExportFilter] = None,
                        deduplicate: bool = True) -> int:
        """Export contacts in HubSpot import format."""
        filtered = apply_filters(leads, filt)
        if deduplicate:
            contacts = deduplicate_contacts(filtered)
        else:
            contacts = [
                _DeduplicatedContact(
                    canonical_name=c.name, email=_normalize_email(c.email),
                    phone=_normalize_phone(c.phone), role=c.role,
                    company_ids=[c.company_id or lead.company_id],
                    company_names=[c.company_name or lead.company_name],
                    linkedin_url=c.linkedin_url,
                    source_urls=[c.source_url] if c.source_url else [],
                )
                for lead in filtered for c in lead.contacts
            ]

        # Build lookup for lead enrichment
        lead_by_cid: Dict[int, ExportLead] = {l.company_id: l for l in filtered}

        rows: List[Dict[str, Any]] = []
        for dc in contacts:
            first, last = cls._split_name(dc.canonical_name)
            lead = lead_by_cid.get(dc.company_ids[0]) if dc.company_ids else None
            row: Dict[str, Any] = {
                "Email": dc.email or "",
                "First Name": first,
                "Last Name": last,
                "Phone Number": dc.phone or "",
                "Job Title": _truncate(dc.role or "", 255),
                "Company Name": dc.company_names[0] if dc.company_names else "",
                "LinkedIn URL": dc.linkedin_url or "",
                "Lead Score": round(lead.lead_score, 4) if lead else "",
                "Lead Confidence": round(lead.lead_confidence, 4) if lead else "",
                "Notes": _report_summary_text(lead.report if lead else None, 500),
                "Original Source": dc.source_urls[0] if dc.source_urls else "",
            }
            rows.append(row)

        return cls._write_csv(rows, dest, "HubSpot contacts")

    @classmethod
    def export_companies(cls,
                         leads: Sequence[ExportLead],
                         dest: Union[str, Path],
                         filt: Optional[ExportFilter] = None) -> int:
        """Export companies in HubSpot import format."""
        filtered = apply_filters(leads, filt)
        rows: List[Dict[str, Any]] = []
        for lead in filtered:
            lifecycle = "salesqualifiedlead" if lead.is_qualified else "lead"
            rows.append({
                "Name": lead.company_name,
                "Company Domain Name": lead.domain or "",
                "Industry": lead.industry or "",
                "Number of Employees": lead.size_tier or "",
                "City": lead.location or "",
                "Annual Revenue": str(lead.funding_amount_usd or ""),
                "Lead Score": round(lead.lead_score, 4),
                "Lifecycle Stage": lifecycle,
                "Description": _report_summary_text(lead.report, 500),
                "Website URL": lead.source_urls[0] if lead.source_urls else "",
            })
        return cls._write_csv(rows, dest, "HubSpot companies")

    @classmethod
    def export_deals(cls,
                     leads: Sequence[ExportLead],
                     dest: Union[str, Path],
                     filt: Optional[ExportFilter] = None,
                     pipeline: str = "default",
                     close_days: int = 30) -> int:
        """Export deals in HubSpot import format. Only qualified leads get deals."""
        filtered = [l for l in apply_filters(leads, filt) if l.is_qualified]
        rows: List[Dict[str, Any]] = []
        close_date = datetime.now().strftime("%Y-%m-%d")
        for lead in filtered:
            rows.append({
                "Deal Name": f"Scrapus - {lead.company_name}",
                "Pipeline": pipeline,
                "Deal Stage": "qualifiedtobuy",
                "Associated Company": lead.company_name,
                "Amount": round(lead.lead_score * 10000, 2),
                "Close Date": close_date,
                "Deal Description": _report_summary_text(lead.report, 500),
            })
        return cls._write_csv(rows, dest, "HubSpot deals")

    @staticmethod
    def _write_csv(rows: List[Dict[str, Any]], dest: Union[str, Path], label: str) -> int:
        if not rows:
            logger.warning("%s export: zero rows", label)
            return 0
        dest = Path(dest)
        dest.parent.mkdir(parents=True, exist_ok=True)
        with open(dest, "w", newline="", encoding="utf-8") as fh:
            writer = csv.DictWriter(fh, fieldnames=list(rows[0].keys()))
            writer.writeheader()
            writer.writerows(rows)
        logger.info("%s export: %d rows -> %s", label, len(rows), dest)
        return len(rows)


# ---------------------------------------------------------------------------
# Salesforce CSV Adapter
# ---------------------------------------------------------------------------

class SalesforceAdapter:
    """
    Produces Salesforce Data Loader / Import Wizard compatible CSVs.

    Object mapping:
      - Lead: unqualified company+contact combined
      - Contact: qualified contact (paired with Account)
      - Account: company record
      - Opportunity: qualified deal
    """

    @classmethod
    def export_leads(cls,
                     leads: Sequence[ExportLead],
                     dest: Union[str, Path],
                     filt: Optional[ExportFilter] = None) -> int:
        """Export as Salesforce Lead records (unqualified leads with primary contact)."""
        filtered = apply_filters(leads, filt)
        rows: List[Dict[str, Any]] = []
        for lead in filtered:
            first, last = "", ""
            email, phone, title = "", "", ""
            if lead.contacts:
                c = lead.contacts[0]
                parts = c.name.strip().split(None, 1)
                first = parts[0] if parts else ""
                last = parts[1] if len(parts) > 1 else ""
                email = c.email or ""
                phone = c.phone or ""
                title = c.role or ""
            rows.append({
                "FirstName": first,
                "LastName": last or lead.company_name,
                "Email": email,
                "Phone": phone,
                "Title": _truncate(title, 128),
                "Company": lead.company_name,
                "Industry": lead.industry or "",
                "NumberOfEmployees": lead.employee_count or "",
                "AnnualRevenue": lead.funding_amount_usd or "",
                "LeadSource": "Scrapus Pipeline",
                "Status": "Qualified" if lead.is_qualified else "Open - Not Contacted",
                "Rating": "Hot" if lead.lead_score >= 0.7 else (
                    "Warm" if lead.lead_score >= 0.4 else "Cold"
                ),
                "Street": "",
                "City": lead.location or "",
                "State": "",
                "Country": "",
                "Website": lead.domain or "",
                "Description": _report_summary_text(lead.report, 500),
                "Scrapus_Score__c": round(lead.lead_score, 4),
                "Scrapus_Confidence__c": round(lead.lead_confidence, 4),
            })
        return cls._write_csv(rows, dest, "Salesforce leads")

    @classmethod
    def export_accounts(cls,
                        leads: Sequence[ExportLead],
                        dest: Union[str, Path],
                        filt: Optional[ExportFilter] = None) -> int:
        """Export as Salesforce Account records."""
        filtered = apply_filters(leads, filt)
        rows: List[Dict[str, Any]] = []
        for lead in filtered:
            rows.append({
                "Name": lead.company_name,
                "Website": lead.domain or "",
                "Industry": lead.industry or "",
                "NumberOfEmployees": lead.employee_count or "",
                "AnnualRevenue": lead.funding_amount_usd or "",
                "Type": "Prospect",
                "BillingCity": lead.location or "",
                "Description": _report_summary_text(lead.report, 500),
                "Scrapus_Score__c": round(lead.lead_score, 4),
                "Scrapus_Confidence__c": round(lead.lead_confidence, 4),
                "Scrapus_Qualified__c": "true" if lead.is_qualified else "false",
            })
        return cls._write_csv(rows, dest, "Salesforce accounts")

    @classmethod
    def export_contacts(cls,
                        leads: Sequence[ExportLead],
                        dest: Union[str, Path],
                        filt: Optional[ExportFilter] = None,
                        deduplicate: bool = True) -> int:
        """Export as Salesforce Contact records (with Account Name for lookup)."""
        filtered = apply_filters(leads, filt)
        if deduplicate:
            deduped = deduplicate_contacts(filtered)
        else:
            deduped = [
                _DeduplicatedContact(
                    canonical_name=c.name, email=_normalize_email(c.email),
                    phone=_normalize_phone(c.phone), role=c.role,
                    company_ids=[c.company_id or lead.company_id],
                    company_names=[c.company_name or lead.company_name],
                )
                for lead in filtered for c in lead.contacts
            ]

        rows: List[Dict[str, Any]] = []
        for dc in deduped:
            parts = dc.canonical_name.strip().split(None, 1)
            first = parts[0] if parts else ""
            last = parts[1] if len(parts) > 1 else ""
            rows.append({
                "FirstName": first,
                "LastName": last or first,
                "Email": dc.email or "",
                "Phone": dc.phone or "",
                "Title": _truncate(dc.role or "", 128),
                "AccountName": dc.company_names[0] if dc.company_names else "",
                "LeadSource": "Scrapus Pipeline",
                "MailingCity": "",
                "Description": "",
            })
        return cls._write_csv(rows, dest, "Salesforce contacts")

    @classmethod
    def export_opportunities(cls,
                             leads: Sequence[ExportLead],
                             dest: Union[str, Path],
                             filt: Optional[ExportFilter] = None) -> int:
        """Export as Salesforce Opportunity records for qualified leads."""
        filtered = [l for l in apply_filters(leads, filt) if l.is_qualified]
        rows: List[Dict[str, Any]] = []
        close_date = datetime.now().strftime("%Y-%m-%d")
        for lead in filtered:
            rows.append({
                "Name": f"Scrapus - {lead.company_name}",
                "AccountName": lead.company_name,
                "StageName": "Qualification",
                "CloseDate": close_date,
                "Amount": round(lead.lead_score * 10000, 2),
                "Probability": round(lead.lead_confidence * 100, 1),
                "LeadSource": "Scrapus Pipeline",
                "Type": "New Business",
                "Description": _report_summary_text(lead.report, 500),
                "Scrapus_Score__c": round(lead.lead_score, 4),
            })
        return cls._write_csv(rows, dest, "Salesforce opportunities")

    @staticmethod
    def _write_csv(rows: List[Dict[str, Any]], dest: Union[str, Path], label: str) -> int:
        if not rows:
            logger.warning("%s export: zero rows", label)
            return 0
        dest = Path(dest)
        dest.parent.mkdir(parents=True, exist_ok=True)
        with open(dest, "w", newline="", encoding="utf-8") as fh:
            writer = csv.DictWriter(fh, fieldnames=list(rows[0].keys()))
            writer.writeheader()
            writer.writerows(rows)
        logger.info("%s export: %d rows -> %s", label, len(rows), dest)
        return len(rows)


# ---------------------------------------------------------------------------
# Pipedrive CSV Adapter
# ---------------------------------------------------------------------------

class PipedriveAdapter:
    """
    Produces Pipedrive-compatible import CSVs.

    Pipedrive objects:
      - Person: contact record
      - Organization: company record
      - Deal: sales opportunity
    """

    @classmethod
    def export_persons(cls,
                       leads: Sequence[ExportLead],
                       dest: Union[str, Path],
                       filt: Optional[ExportFilter] = None,
                       deduplicate: bool = True) -> int:
        """Export contacts as Pipedrive Person records."""
        filtered = apply_filters(leads, filt)
        if deduplicate:
            deduped = deduplicate_contacts(filtered)
        else:
            deduped = [
                _DeduplicatedContact(
                    canonical_name=c.name, email=_normalize_email(c.email),
                    phone=_normalize_phone(c.phone), role=c.role,
                    company_ids=[c.company_id or lead.company_id],
                    company_names=[c.company_name or lead.company_name],
                )
                for lead in filtered for c in lead.contacts
            ]

        rows: List[Dict[str, Any]] = []
        for dc in deduped:
            rows.append({
                "Name": dc.canonical_name,
                "Email": dc.email or "",
                "Phone": dc.phone or "",
                "Organization": dc.company_names[0] if dc.company_names else "",
                "Label": dc.role or "",
                "Note": "; ".join(dc.source_urls) if dc.source_urls else "",
            })
        return cls._write_csv(rows, dest, "Pipedrive persons")

    @classmethod
    def export_organizations(cls,
                             leads: Sequence[ExportLead],
                             dest: Union[str, Path],
                             filt: Optional[ExportFilter] = None) -> int:
        """Export companies as Pipedrive Organization records."""
        filtered = apply_filters(leads, filt)
        rows: List[Dict[str, Any]] = []
        for lead in filtered:
            rows.append({
                "Name": lead.company_name,
                "Address": lead.location or "",
                "Label": lead.industry or "",
                "People Count": lead.employee_count or "",
                "Note": _report_summary_text(lead.report, 500),
                "Scrapus Score": round(lead.lead_score, 4),
                "Scrapus Confidence": round(lead.lead_confidence, 4),
                "Qualified": "Yes" if lead.is_qualified else "No",
            })
        return cls._write_csv(rows, dest, "Pipedrive organizations")

    @classmethod
    def export_deals(cls,
                     leads: Sequence[ExportLead],
                     dest: Union[str, Path],
                     filt: Optional[ExportFilter] = None,
                     pipeline: str = "Scrapus Pipeline") -> int:
        """Export qualified leads as Pipedrive Deal records."""
        filtered = [l for l in apply_filters(leads, filt) if l.is_qualified]
        rows: List[Dict[str, Any]] = []
        for lead in filtered:
            contact_name = lead.contacts[0].name if lead.contacts else ""
            rows.append({
                "Title": f"Scrapus - {lead.company_name}",
                "Organization": lead.company_name,
                "Contact Person": contact_name,
                "Value": round(lead.lead_score * 10000, 2),
                "Currency": "USD",
                "Pipeline": pipeline,
                "Stage": "Qualified",
                "Probability": round(lead.lead_confidence * 100, 1),
                "Note": _report_summary_text(lead.report, 500),
            })
        return cls._write_csv(rows, dest, "Pipedrive deals")

    @staticmethod
    def _write_csv(rows: List[Dict[str, Any]], dest: Union[str, Path], label: str) -> int:
        if not rows:
            logger.warning("%s export: zero rows", label)
            return 0
        dest = Path(dest)
        dest.parent.mkdir(parents=True, exist_ok=True)
        with open(dest, "w", newline="", encoding="utf-8") as fh:
            writer = csv.DictWriter(fh, fieldnames=list(rows[0].keys()))
            writer.writeheader()
            writer.writerows(rows)
        logger.info("%s export: %d rows -> %s", label, len(rows), dest)
        return len(rows)


# ---------------------------------------------------------------------------
# Generic CRM Adapter
# ---------------------------------------------------------------------------

class GenericCRMAdapter:
    """
    Universal flat CSV format compatible with most CRM import wizards.
    All fields in a single CSV -- contacts joined with company data.
    """

    @classmethod
    def export_all(cls,
                   leads: Sequence[ExportLead],
                   dest: Union[str, Path],
                   filt: Optional[ExportFilter] = None,
                   deduplicate: bool = True) -> int:
        """Export a single universal CSV with companies + contacts + scores."""
        filtered = apply_filters(leads, filt)
        lead_by_cid: Dict[int, ExportLead] = {l.company_id: l for l in filtered}

        if deduplicate:
            deduped = deduplicate_contacts(filtered)
        else:
            deduped = [
                _DeduplicatedContact(
                    canonical_name=c.name, email=_normalize_email(c.email),
                    phone=_normalize_phone(c.phone), role=c.role,
                    company_ids=[c.company_id or lead.company_id],
                    company_names=[c.company_name or lead.company_name],
                    linkedin_url=c.linkedin_url,
                    source_urls=[c.source_url] if c.source_url else [],
                )
                for lead in filtered for c in lead.contacts
            ]

        rows: List[Dict[str, Any]] = []
        for dc in deduped:
            lead = lead_by_cid.get(dc.company_ids[0]) if dc.company_ids else None
            rows.append({
                "Contact Name": dc.canonical_name,
                "Contact Email": dc.email or "",
                "Contact Phone": dc.phone or "",
                "Contact Role": dc.role or "",
                "Contact LinkedIn": dc.linkedin_url or "",
                "Company Name": dc.company_names[0] if dc.company_names else "",
                "Company Domain": lead.domain if lead else "",
                "Company Industry": lead.industry if lead else "",
                "Company Size": lead.size_tier if lead else "",
                "Company Location": lead.location if lead else "",
                "Company Employees": lead.employee_count if lead else "",
                "Funding Amount (USD)": lead.funding_amount_usd if lead else "",
                "Lead Score": round(lead.lead_score, 4) if lead else "",
                "Lead Confidence": round(lead.lead_confidence, 4) if lead else "",
                "Qualified": ("Yes" if lead.is_qualified else "No") if lead else "",
                "Qualification Reason": lead.qualification_reason if lead else "",
                "Report Summary": _report_summary_text(lead.report if lead else None, 500),
                "Source URLs": _source_urls_text(lead) if lead else "",
                "Export Date": datetime.now().strftime("%Y-%m-%d"),
            })

        # Also include leads that have no contacts as company-only rows
        company_ids_with_contacts = set()
        for dc in deduped:
            company_ids_with_contacts.update(dc.company_ids)

        for lead in filtered:
            if lead.company_id not in company_ids_with_contacts:
                rows.append({
                    "Contact Name": "",
                    "Contact Email": "",
                    "Contact Phone": "",
                    "Contact Role": "",
                    "Contact LinkedIn": "",
                    "Company Name": lead.company_name,
                    "Company Domain": lead.domain or "",
                    "Company Industry": lead.industry or "",
                    "Company Size": lead.size_tier or "",
                    "Company Location": lead.location or "",
                    "Company Employees": lead.employee_count or "",
                    "Funding Amount (USD)": lead.funding_amount_usd or "",
                    "Lead Score": round(lead.lead_score, 4),
                    "Lead Confidence": round(lead.lead_confidence, 4),
                    "Qualified": "Yes" if lead.is_qualified else "No",
                    "Qualification Reason": lead.qualification_reason or "",
                    "Report Summary": _report_summary_text(lead.report, 500),
                    "Source URLs": _source_urls_text(lead),
                    "Export Date": datetime.now().strftime("%Y-%m-%d"),
                })

        return cls._write_csv(rows, dest, "Generic CRM")

    @staticmethod
    def _write_csv(rows: List[Dict[str, Any]], dest: Union[str, Path], label: str) -> int:
        if not rows:
            logger.warning("%s export: zero rows", label)
            return 0
        dest = Path(dest)
        dest.parent.mkdir(parents=True, exist_ok=True)
        with open(dest, "w", newline="", encoding="utf-8") as fh:
            writer = csv.DictWriter(fh, fieldnames=list(rows[0].keys()))
            writer.writeheader()
            writer.writerows(rows)
        logger.info("%s export: %d rows -> %s", label, len(rows), dest)
        return len(rows)


# ---------------------------------------------------------------------------
# Unified CRM Export Dispatcher
# ---------------------------------------------------------------------------

CRMTarget = str  # "hubspot", "salesforce", "pipedrive", "generic"


def export_for_crm(leads: Sequence[ExportLead],
                   crm: CRMTarget,
                   output_dir: Union[str, Path],
                   filt: Optional[ExportFilter] = None,
                   deduplicate: bool = True,
                   prefix: Optional[str] = None) -> Dict[str, int]:
    """
    Export all relevant CRM objects for the specified CRM system.

    Creates multiple CSV files in output_dir with appropriate naming.
    Returns a dict mapping filename -> row count.
    """
    output_dir = Path(output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)
    ts = datetime.now().strftime("%Y%m%d_%H%M%S")
    pfx = f"{prefix}_" if prefix else ""

    results: Dict[str, int] = {}

    if crm == "hubspot":
        name_contacts = f"{pfx}hubspot_contacts_{ts}.csv"
        name_companies = f"{pfx}hubspot_companies_{ts}.csv"
        name_deals = f"{pfx}hubspot_deals_{ts}.csv"
        results[name_contacts] = HubSpotAdapter.export_contacts(
            leads, output_dir / name_contacts, filt, deduplicate
        )
        results[name_companies] = HubSpotAdapter.export_companies(
            leads, output_dir / name_companies, filt
        )
        results[name_deals] = HubSpotAdapter.export_deals(
            leads, output_dir / name_deals, filt
        )

    elif crm == "salesforce":
        name_leads = f"{pfx}sf_leads_{ts}.csv"
        name_accounts = f"{pfx}sf_accounts_{ts}.csv"
        name_contacts = f"{pfx}sf_contacts_{ts}.csv"
        name_opps = f"{pfx}sf_opportunities_{ts}.csv"
        results[name_leads] = SalesforceAdapter.export_leads(
            leads, output_dir / name_leads, filt
        )
        results[name_accounts] = SalesforceAdapter.export_accounts(
            leads, output_dir / name_accounts, filt
        )
        results[name_contacts] = SalesforceAdapter.export_contacts(
            leads, output_dir / name_contacts, filt, deduplicate
        )
        results[name_opps] = SalesforceAdapter.export_opportunities(
            leads, output_dir / name_opps, filt
        )

    elif crm == "pipedrive":
        name_persons = f"{pfx}pipedrive_persons_{ts}.csv"
        name_orgs = f"{pfx}pipedrive_organizations_{ts}.csv"
        name_deals = f"{pfx}pipedrive_deals_{ts}.csv"
        results[name_persons] = PipedriveAdapter.export_persons(
            leads, output_dir / name_persons, filt, deduplicate
        )
        results[name_orgs] = PipedriveAdapter.export_organizations(
            leads, output_dir / name_orgs, filt
        )
        results[name_deals] = PipedriveAdapter.export_deals(
            leads, output_dir / name_deals, filt
        )

    elif crm == "generic":
        name_all = f"{pfx}crm_export_{ts}.csv"
        results[name_all] = GenericCRMAdapter.export_all(
            leads, output_dir / name_all, filt, deduplicate
        )

    else:
        raise ValueError(
            f"Unknown CRM target: {crm}. "
            f"Choose from: hubspot, salesforce, pipedrive, generic"
        )

    total_rows = sum(results.values())
    logger.info(
        "CRM export complete: crm=%s, files=%d, total_rows=%d, dir=%s",
        crm, len(results), total_rows, output_dir,
    )
    return results
