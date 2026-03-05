"use server";

import {
  querySocrata,
  sanitizeSoql,
  NYPD_COMPLAINTS_URL,
  CIVIL_LITIGATION_URL,
  type NypdComplaint,
  type CivilLitigation,
} from "@/lib/socrata";

const PAGE_SIZE = 25;

export async function searchComplaints(filters: {
  offense?: string;
  borough?: string;
  lawCategory?: string;
  page?: number;
}) {
  const whereClauses: string[] = [];

  if (filters.offense) {
    whereClauses.push(
      `upper(ofns_desc) like '%${sanitizeSoql(filters.offense).toUpperCase()}%'`,
    );
  }
  if (filters.borough) {
    whereClauses.push(`boro_nm='${sanitizeSoql(filters.borough)}'`);
  }
  if (filters.lawCategory) {
    whereClauses.push(`law_cat_cd='${sanitizeSoql(filters.lawCategory)}'`);
  }

  const offset = ((filters.page ?? 1) - 1) * PAGE_SIZE;

  const params: Record<string, string> = {
    $limit: String(PAGE_SIZE),
    $offset: String(offset),
    $order: "cmplnt_fr_dt DESC",
  };

  if (whereClauses.length > 0) {
    params.$where = whereClauses.join(" AND ");
  }

  return querySocrata<NypdComplaint>(NYPD_COMPLAINTS_URL, params);
}

export async function searchLitigation(filters: {
  query?: string;
  caseCategory?: string;
  page?: number;
}) {
  const offset = ((filters.page ?? 1) - 1) * PAGE_SIZE;

  const params: Record<string, string> = {
    $limit: String(PAGE_SIZE),
    $offset: String(offset),
    $order: "filing_date DESC",
  };

  if (filters.query) {
    params.$q = sanitizeSoql(filters.query);
  }
  if (filters.caseCategory) {
    params.$where = `case_category='${sanitizeSoql(filters.caseCategory)}'`;
  }

  return querySocrata<CivilLitigation>(CIVIL_LITIGATION_URL, params);
}
