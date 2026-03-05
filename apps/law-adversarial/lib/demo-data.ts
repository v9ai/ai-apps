export interface DemoSession {
  id: string;
  brief_title: string;
  jurisdiction: string;
  status: "completed";
  overall_score: number;
  created_at: string;
  completed_at: string;
}

export interface DemoFinding {
  id: string;
  session_id: string;
  type: "logical" | "factual" | "legal" | "citation";
  severity: "critical" | "high" | "medium" | "low";
  confidence: number;
  description: string;
  suggested_fix: string;
  round: number;
}

export interface DemoAuditEntry {
  id: string;
  session_id: string;
  agent: "attacker" | "defender" | "judge";
  action: string;
  round: number;
  output_summary: string;
  created_at: string;
}

const sessions: DemoSession[] = [
  {
    id: "floyd-v-nyc",
    brief_title: "Floyd v. City of New York -- Stop-and-Frisk Class Action",
    jurisdiction: "S.D.N.Y.",
    status: "completed",
    overall_score: 62,
    created_at: "2026-02-15T09:30:00Z",
    completed_at: "2026-02-15T09:31:42Z",
  },
  {
    id: "smith-v-jones",
    brief_title: "Smith v. Jones Construction LLC -- Breach of Contract / Specific Performance",
    jurisdiction: "NY Supreme Court, New York County",
    status: "completed",
    overall_score: 78,
    created_at: "2026-02-20T14:00:00Z",
    completed_at: "2026-02-20T14:01:18Z",
  },
  {
    id: "people-v-weinstein",
    brief_title: "People v. Weinstein -- Criminal Prosecution Motion in Limine",
    jurisdiction: "NY County Supreme Court, Criminal Term",
    status: "completed",
    overall_score: 45,
    created_at: "2026-03-01T10:15:00Z",
    completed_at: "2026-03-01T10:17:05Z",
  },
  {
    id: "gonzalez-v-nypd",
    brief_title: "Gonzalez v. NYPD 47th Precinct -- Excessive Force / Section 1983",
    jurisdiction: "S.D.N.Y.",
    status: "completed",
    overall_score: 71,
    created_at: "2026-03-03T16:45:00Z",
    completed_at: "2026-03-03T16:46:53Z",
  },
];

const findings: DemoFinding[] = [
  // Floyd v. City of New York
  {
    id: "f1",
    session_id: "floyd-v-nyc",
    type: "factual",
    severity: "critical",
    confidence: 0.92,
    round: 1,
    description:
      "Brief claims 88% of stops resulted in no further action, but the cited dataset (2004-2012) includes years after policy changes. Opposing counsel can argue the aggregate figure is misleading for the class period at issue.",
    suggested_fix:
      "Narrow the statistical claim to the specific class period (Jan 2004 - Jun 2012) and cite the UF-250 database directly with date-bounded queries.",
  },
  {
    id: "f2",
    session_id: "floyd-v-nyc",
    type: "legal",
    severity: "high",
    confidence: 0.87,
    round: 1,
    description:
      "The brief applies strict scrutiny to the equal protection claim without establishing that the stop-and-frisk policy constitutes a racial classification on its face. Under Arlington Heights, a facially neutral policy requires showing discriminatory intent, not just disparate impact.",
    suggested_fix:
      "Add a section establishing discriminatory intent through the Arlington Heights factors: (1) historical background, (2) sequence of events, (3) departures from normal procedures, and (4) legislative history of the policy directives.",
  },
  {
    id: "f3",
    session_id: "floyd-v-nyc",
    type: "citation",
    severity: "high",
    confidence: 0.95,
    round: 2,
    description:
      "Brief cites Terry v. Ohio (1968) for the reasonable suspicion standard but omits Illinois v. Wardlow (2000), which established that presence in a high-crime area is a relevant factor. Opposing counsel will use Wardlow to justify many of the challenged stops.",
    suggested_fix:
      "Preemptively address Wardlow by arguing that high-crime area alone is insufficient without individualized articulable suspicion, citing United States v. Sokolow and Floyd's own UF-250 data showing officers rarely documented specific suspicious behavior.",
  },
  {
    id: "f4",
    session_id: "floyd-v-nyc",
    type: "logical",
    severity: "medium",
    confidence: 0.78,
    round: 2,
    description:
      "The brief's causation argument is circular: it uses the high volume of stops as evidence of a policy, then uses the policy as evidence that individual stops lacked reasonable suspicion. This conflates systemic and individual analysis.",
    suggested_fix:
      "Separate the Monell municipal liability argument (policy/custom) from the individual Fourth Amendment analysis. Use statistical evidence for Monell and specific stop narratives for individual violations.",
  },
  {
    id: "f5",
    session_id: "floyd-v-nyc",
    type: "factual",
    severity: "low",
    confidence: 0.65,
    round: 3,
    description:
      "Footnote 23 references a precinct-level analysis but does not specify which precincts were included in the sample. Defense can challenge the representativeness of the sample.",
    suggested_fix:
      "Specify the precincts analyzed and explain the sampling methodology, or cite the Fagan expert report which covers all 76 precincts.",
  },

  // Smith v. Jones Construction
  {
    id: "f6",
    session_id: "smith-v-jones",
    type: "legal",
    severity: "high",
    confidence: 0.89,
    round: 1,
    description:
      "Brief seeks specific performance of a construction contract but fails to establish that money damages are inadequate -- a prerequisite under NY law. The property is a standard commercial build, not unique.",
    suggested_fix:
      "Add argument that the contractor's specialized expertise in green-building certification makes the services unique, or pivot primary relief to damages with specific performance as alternative.",
  },
  {
    id: "f7",
    session_id: "smith-v-jones",
    type: "citation",
    severity: "medium",
    confidence: 0.82,
    round: 1,
    description:
      "Brief cites Van Wagner Advertising Corp. v. S & M Enterprises (1986) for uniqueness but that case actually held the interest was NOT unique enough for specific performance. The citation undermines the argument.",
    suggested_fix:
      "Replace with Sokoloff v. Harriman Estates Development Corp. or other NY cases where specific performance was granted for construction contracts involving specialized work.",
  },
  {
    id: "f8",
    session_id: "smith-v-jones",
    type: "logical",
    severity: "medium",
    confidence: 0.76,
    round: 2,
    description:
      "The damages calculation includes lost profits from delayed occupancy but the brief simultaneously argues the building is unique and irreplaceable. If truly irreplaceable, market-rate damages would be speculative; if calculable, specific performance is unnecessary.",
    suggested_fix:
      "Frame damages and specific performance as alternative remedies. Present lost-profit damages as the floor, with specific performance sought because full consequential damages are difficult to quantify.",
  },
  {
    id: "f9",
    session_id: "smith-v-jones",
    type: "factual",
    severity: "low",
    confidence: 0.71,
    round: 3,
    description:
      "Brief states the contract was signed on March 15, but Exhibit C shows a March 17 execution date. Minor but creates credibility issues.",
    suggested_fix:
      "Correct the date to March 17 to match Exhibit C, and verify all other dates against the attached exhibits.",
  },

  // People v. Weinstein
  {
    id: "f10",
    session_id: "people-v-weinstein",
    type: "legal",
    severity: "critical",
    confidence: 0.94,
    round: 1,
    description:
      "The motion in limine seeks to exclude all prior-bad-act testimony under Molineux, but fails to address the People's likely argument under the doctrine of chances. With multiple complainants alleging similar conduct, the pattern itself is probative of intent and absence of consent.",
    suggested_fix:
      "Preemptively argue that the doctrine of chances requires genuinely independent allegations, and challenge independence by showing media exposure and complainant communications prior to reporting.",
  },
  {
    id: "f11",
    session_id: "people-v-weinstein",
    type: "factual",
    severity: "critical",
    confidence: 0.88,
    round: 1,
    description:
      "Brief asserts complainant continued a professional relationship post-incident as evidence of consent, but omits documented power dynamics (employment dependency, NDA obligations). Prosecution will use the omission to argue consciousness of the coercive dynamic.",
    suggested_fix:
      "Address the continued relationship through expert testimony on trauma responses and acquaintance assault dynamics rather than as affirmative evidence of consent.",
  },
  {
    id: "f12",
    session_id: "people-v-weinstein",
    type: "logical",
    severity: "high",
    confidence: 0.91,
    round: 2,
    description:
      "The brief argues both that complainants' delayed reporting undermines credibility AND that their eventual reports were motivated by the #MeToo movement rather than genuine grievance. These arguments are contradictory -- delay is used against credibility, while reporting is also used against credibility.",
    suggested_fix:
      "Choose one theory: either focus on specific inconsistencies in individual complainants' accounts, or argue social influence, but do not deploy both simultaneously as the contradiction weakens overall credibility.",
  },
  {
    id: "f13",
    session_id: "people-v-weinstein",
    type: "citation",
    severity: "high",
    confidence: 0.86,
    round: 2,
    description:
      "Brief cites People v. Molineux (1901) but does not engage with People v. Ventimiglia (1981), which is the controlling modern framework for prior-bad-act evidence in NY. The court will apply Ventimiglia, not the original Molineux test.",
    suggested_fix:
      "Reframe the entire motion under the Ventimiglia framework, addressing each of the recognized exceptions (motive, intent, absence of mistake, common scheme, identity) and arguing none apply.",
  },
  {
    id: "f14",
    session_id: "people-v-weinstein",
    type: "logical",
    severity: "medium",
    confidence: 0.73,
    round: 3,
    description:
      "Section IV assumes the jury will view email evidence as exculpatory, but several emails contain language that could be read as apologetic or acknowledgment of wrongdoing depending on context.",
    suggested_fix:
      "Pre-screen each email exhibit and address ambiguous language proactively, providing the defense's interpretation before prosecution can frame them unfavorably.",
  },

  // Gonzalez v. NYPD
  {
    id: "f15",
    session_id: "gonzalez-v-nypd",
    type: "legal",
    severity: "high",
    confidence: 0.88,
    round: 1,
    description:
      "Brief does not adequately address qualified immunity. Under Saucier v. Katz, the officers will argue no clearly established right was violated because the specific factual scenario (foot chase ending in a vestibule) has not been addressed by Second Circuit precedent.",
    suggested_fix:
      "Cite Graham v. Connor's objective reasonableness standard and argue that the right to be free from excessive force during a seizure was clearly established, without requiring factual identity. Support with Cowan v. Breen and Tracy v. Freshwater from the Second Circuit.",
  },
  {
    id: "f16",
    session_id: "gonzalez-v-nypd",
    type: "factual",
    severity: "high",
    confidence: 0.85,
    round: 1,
    description:
      "Brief relies on plaintiff's account of the incident but does not address the body-camera footage gap (camera was activated 47 seconds after initial contact). Defense will argue the missing footage undermines plaintiff's version of initial contact.",
    suggested_fix:
      "Address the footage gap head-on: argue the late activation itself evidences a departure from NYPD policy (requiring activation at the start of enforcement encounters) and draw an adverse inference from the officer's failure to record.",
  },
  {
    id: "f17",
    session_id: "gonzalez-v-nypd",
    type: "citation",
    severity: "medium",
    confidence: 0.79,
    round: 2,
    description:
      "Brief cites Monell v. Department of Social Services for municipal liability but does not connect the specific officers' conduct to an official NYPD policy, custom, or training failure as required.",
    suggested_fix:
      "Add evidence of the 47th Precinct's complaint history (CCRB data) and cite NYPD training materials on force continuum to establish a pattern of inadequate training or supervision under City of Canton v. Harris.",
  },
  {
    id: "f18",
    session_id: "gonzalez-v-nypd",
    type: "logical",
    severity: "medium",
    confidence: 0.74,
    round: 2,
    description:
      "The damages section claims both physical injury requiring surgery and that plaintiff returned to work within two weeks. These facts create tension -- defense will argue injuries were minor if plaintiff resumed normal activities quickly.",
    suggested_fix:
      "Clarify the timeline: specify that plaintiff returned to a desk role with restrictions, not full duties, and include medical records showing ongoing treatment concurrent with partial return to work.",
  },
  {
    id: "f19",
    session_id: "gonzalez-v-nypd",
    type: "factual",
    severity: "low",
    confidence: 0.68,
    round: 3,
    description:
      "Brief states the incident occurred at '2:30 AM' but the NYPD complaint report (Exhibit B) lists the time as 2:15 AM. Minor discrepancy but defense will use it to attack attention to detail.",
    suggested_fix:
      "Correct the time to match the official complaint report, and audit all other factual claims against the documentary exhibits.",
  },
];

const auditTrail: DemoAuditEntry[] = [
  // Floyd v. City of New York
  { id: "a1", session_id: "floyd-v-nyc", agent: "attacker", action: "initial_attack", round: 1, output_summary: "Identified statistical methodology issues with the 88% no-further-action claim and challenged the equal protection standard of review.", created_at: "2026-02-15T09:30:15Z" },
  { id: "a2", session_id: "floyd-v-nyc", agent: "defender", action: "counter_argument", round: 1, output_summary: "Defended aggregate statistics as standard in class actions; argued discriminatory intent is inferable from magnitude of disparity.", created_at: "2026-02-15T09:30:35Z" },
  { id: "a3", session_id: "floyd-v-nyc", agent: "judge", action: "evaluate_round", round: 1, output_summary: "Attacker's statistical challenge is well-taken; defender's intent argument needs Arlington Heights factors. Two findings recorded.", created_at: "2026-02-15T09:30:55Z" },
  { id: "a4", session_id: "floyd-v-nyc", agent: "attacker", action: "deep_attack", round: 2, output_summary: "Found missing Wardlow citation and exposed circular causation in the policy-to-individual-stop reasoning.", created_at: "2026-02-15T09:31:10Z" },
  { id: "a5", session_id: "floyd-v-nyc", agent: "defender", action: "counter_argument", round: 2, output_summary: "Argued Wardlow is distinguishable on facts and that Monell analysis necessarily connects systemic and individual claims.", created_at: "2026-02-15T09:31:25Z" },
  { id: "a6", session_id: "floyd-v-nyc", agent: "judge", action: "evaluate_round", round: 2, output_summary: "Citation gap is a real vulnerability; logical circularity partially defended but separation of analyses recommended. Two findings recorded.", created_at: "2026-02-15T09:31:35Z" },
  { id: "a7", session_id: "floyd-v-nyc", agent: "judge", action: "final_scoring", round: 3, output_summary: "Overall score: 62. Brief has strong factual foundation but significant legal standard and structural issues. 5 findings total.", created_at: "2026-02-15T09:31:42Z" },

  // Smith v. Jones
  { id: "a8", session_id: "smith-v-jones", agent: "attacker", action: "initial_attack", round: 1, output_summary: "Challenged specific performance remedy -- no showing money damages are inadequate; identified harmful Van Wagner citation.", created_at: "2026-02-20T14:00:12Z" },
  { id: "a9", session_id: "smith-v-jones", agent: "defender", action: "counter_argument", round: 1, output_summary: "Argued contractor's green-building expertise creates uniqueness; Van Wagner is distinguishable on facts.", created_at: "2026-02-20T14:00:30Z" },
  { id: "a10", session_id: "smith-v-jones", agent: "judge", action: "evaluate_round", round: 1, output_summary: "Specific performance argument needs strengthening. Van Wagner citation is actively harmful -- must be replaced. Two findings.", created_at: "2026-02-20T14:00:48Z" },
  { id: "a11", session_id: "smith-v-jones", agent: "attacker", action: "deep_attack", round: 2, output_summary: "Exposed logical tension between uniqueness claim and calculable damages; found date discrepancy in contract execution.", created_at: "2026-02-20T14:01:00Z" },
  { id: "a12", session_id: "smith-v-jones", agent: "judge", action: "final_scoring", round: 3, output_summary: "Overall score: 78. Solid contract claim but remedy theory needs work. 4 findings total.", created_at: "2026-02-20T14:01:18Z" },

  // People v. Weinstein
  { id: "a13", session_id: "people-v-weinstein", agent: "attacker", action: "initial_attack", round: 1, output_summary: "Identified failure to address doctrine of chances; found critical omission of power-dynamic evidence that prosecution will exploit.", created_at: "2026-03-01T10:15:18Z" },
  { id: "a14", session_id: "people-v-weinstein", agent: "defender", action: "counter_argument", round: 1, output_summary: "Argued doctrine of chances requires independence and Molineux framework is sufficient for the motion.", created_at: "2026-03-01T10:15:40Z" },
  { id: "a15", session_id: "people-v-weinstein", agent: "judge", action: "evaluate_round", round: 1, output_summary: "Both findings are critical vulnerabilities. The motion will likely fail without addressing these. Two findings recorded.", created_at: "2026-03-01T10:16:00Z" },
  { id: "a16", session_id: "people-v-weinstein", agent: "attacker", action: "deep_attack", round: 2, output_summary: "Found contradictory credibility arguments and missing Ventimiglia framework -- the actual controlling authority in NY.", created_at: "2026-03-01T10:16:20Z" },
  { id: "a17", session_id: "people-v-weinstein", agent: "defender", action: "counter_argument", round: 2, output_summary: "Conceded Ventimiglia should be cited; defended delayed-reporting argument as going to weight, not admissibility.", created_at: "2026-03-01T10:16:40Z" },
  { id: "a18", session_id: "people-v-weinstein", agent: "judge", action: "final_scoring", round: 3, output_summary: "Overall score: 45. Motion has fundamental structural problems. Contradictory arguments and missing controlling authority make denial likely. 5 findings.", created_at: "2026-03-01T10:17:05Z" },

  // Gonzalez v. NYPD
  { id: "a19", session_id: "gonzalez-v-nypd", agent: "attacker", action: "initial_attack", round: 1, output_summary: "Attacked qualified immunity analysis as insufficient; identified body-camera footage gap as major factual vulnerability.", created_at: "2026-03-03T16:45:14Z" },
  { id: "a20", session_id: "gonzalez-v-nypd", agent: "defender", action: "counter_argument", round: 1, output_summary: "Argued Graham v. Connor clearly establishes the right; body-cam gap supports plaintiff via adverse inference.", created_at: "2026-03-03T16:45:32Z" },
  { id: "a21", session_id: "gonzalez-v-nypd", agent: "judge", action: "evaluate_round", round: 1, output_summary: "Qualified immunity must be addressed more thoroughly. Body-cam argument has potential but needs NYPD policy citation. Two findings.", created_at: "2026-03-03T16:45:50Z" },
  { id: "a22", session_id: "gonzalez-v-nypd", agent: "attacker", action: "deep_attack", round: 2, output_summary: "Found Monell gap -- no connection to official policy; identified tension between surgery claim and quick return to work.", created_at: "2026-03-03T16:46:10Z" },
  { id: "a23", session_id: "gonzalez-v-nypd", agent: "judge", action: "final_scoring", round: 3, output_summary: "Overall score: 71. Strong factual case but legal framework needs tightening on qualified immunity and Monell. 5 findings.", created_at: "2026-03-03T16:46:53Z" },
];

export function getDemoSessions(): DemoSession[] {
  return sessions;
}

export function getDemoSession(id: string): DemoSession | undefined {
  return sessions.find((s) => s.id === id);
}

export function getDemoFindings(sessionId?: string): DemoFinding[] {
  if (sessionId) return findings.filter((f) => f.session_id === sessionId);
  return findings;
}

export function getDemoAuditTrail(sessionId: string): DemoAuditEntry[] {
  return auditTrail.filter((a) => a.session_id === sessionId);
}
