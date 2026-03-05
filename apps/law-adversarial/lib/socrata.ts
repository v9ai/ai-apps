const NYPD_COMPLAINTS_URL =
  "https://data.cityofnewyork.us/resource/5uac-w243.json";
const CIVIL_LITIGATION_URL =
  "https://data.cityofnewyork.us/resource/pjgc-h7uv.json";

export { NYPD_COMPLAINTS_URL, CIVIL_LITIGATION_URL };

export interface NypdComplaint {
  cmplnt_num: string;
  cmplnt_fr_dt: string;
  ofns_desc: string;
  law_cat_cd: string;
  boro_nm: string;
  prem_typ_desc: string;
  pd_desc: string;
  crm_atpt_cptd_cd: string;
  loc_of_occur_desc: string;
  susp_age_group: string;
  susp_race: string;
  susp_sex: string;
  vic_age_group: string;
  vic_race: string;
  vic_sex: string;
}

export interface CivilLitigation {
  matter_name: string;
  cause_of_action: string;
  case_category: string;
  filing_date: string;
  disposition: string;
  tort_claim_action: string;
  section: string;
  court: string;
  demand_amount: string;
}

function sanitizeSoql(value: string): string {
  return value.replace(/['";\-\-]/g, "").trim();
}

export async function querySocrata<T>(
  endpoint: string,
  params: Record<string, string>,
): Promise<T[]> {
  const url = new URL(endpoint);
  for (const [key, value] of Object.entries(params)) {
    if (value) url.searchParams.set(key, value);
  }

  const res = await fetch(url.toString(), {
    next: { revalidate: 300 },
  });

  if (!res.ok) {
    throw new Error(`Socrata API error: ${res.status} ${res.statusText}`);
  }

  return res.json();
}

export { sanitizeSoql };
