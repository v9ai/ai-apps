"""Ground truth test cases for the BS Detector evaluation harness."""

KNOWN_DISCREPANCIES = [
    {
        "id": "DATE-001",
        "type": "fact",
        "category": "date",
        "description": "MSJ states incident occurred on March 14, 2021; police report, medical records, and witness statement all state March 12, 2021",
        "msj_claim": "workplace incident on March 14, 2021",
        "evidence": {
            "police_report": "Date of Incident: March 12, 2021",
            "medical_records": "DATE OF ADMISSION: March 12, 2021",
            "witness_statement": "incident that occurred on March 12, 2021",
        },
        "severity": "critical",
        "keywords": ["march 14", "march 12", "date"],
        "expected_reasoning": "The MSJ consistently uses March 14 as the incident date, but all three supporting documents (police report, medical records, witness statement) independently confirm March 12, 2021. This two-day discrepancy affects statute of limitations calculations.",
    },
    {
        "id": "PPE-001",
        "type": "fact",
        "category": "ppe",
        "description": "MSJ claims Rivera was not wearing required PPE; police report and witness statement confirm he was wearing hard hat, harness, and high-visibility vest",
        "msj_claim": "Rivera was not wearing required personal protective equipment",
        "evidence": {
            "police_report": "Rivera was wearing a hard hat and harness consistent with site requirements",
            "witness_statement": "Carlos was wearing his hard hat, safety harness, and high-visibility vest",
        },
        "severity": "critical",
        "keywords": ["ppe", "harness", "hard hat", "protective equipment", "not wearing"],
        "expected_reasoning": "The MSJ's claim that Rivera lacked PPE is directly contradicted by both the police report and witness statement, which confirm he was wearing a hard hat, safety harness, and high-visibility vest. This false claim appears designed to shift blame to the worker.",
    },
    {
        "id": "CIT-001",
        "type": "citation",
        "category": "misquotation",
        "description": "MSJ quotes Privette v. Superior Court as saying 'A hirer is never liable' — the word 'never' does not appear in the actual holding. The real holding creates a rebuttable presumption, not absolute immunity",
        "msj_claim": "A hirer is never liable for injuries sustained by an independent contractor's employees",
        "evidence": {
            "legal": "Privette established a presumption, not absolute rule; 'never' is fabricated",
        },
        "severity": "critical",
        "keywords": ["privette", "never", "hirer", "presumption"],
        "expected_reasoning": "The MSJ misquotes Privette by inserting the word 'never' to create absolute immunity where the actual holding only creates a rebuttable presumption. This transforms a nuanced legal standard into an absolute bar, fundamentally misrepresenting the law.",
    },
    {
        "id": "SOL-001",
        "type": "fact",
        "category": "statute_of_limitations",
        "description": "MSJ calculates 'one year and 362 days' using incorrect March 14 date. Using correct March 12 date, the elapsed time is different",
        "msj_claim": "one year and 362 days after the incident",
        "evidence": {
            "calculation": "Using correct date March 12, 2021 to March 10, 2023 = 1 year, 363 days",
        },
        "severity": "medium",
        "keywords": ["362 days", "statute", "limitations", "time-barred"],
        "expected_reasoning": "The statute of limitations calculation in the MSJ is based on the incorrect March 14 date. Using the correct March 12 date changes the elapsed time calculation, potentially affecting whether the claim is time-barred.",
    },
    {
        "id": "CTRL-001",
        "type": "fact",
        "category": "retained_control",
        "description": "MSJ implies Harmon had no control over work; police report and witness statement show Harmon foreman Ray Donner directed the crew and dismissed safety concerns",
        "msj_claim": "the independent contractor — not the hirer — controls the manner and method of work",
        "evidence": {
            "police_report": "Donner stated that he had directed Rivera and his crew to begin work",
            "witness_statement": "Donner told me, 'We don't have time to re-do the base. It's been fine. Just get up there and get it done.'",
        },
        "severity": "critical",
        "keywords": ["control", "directed", "donner", "retained"],
        "expected_reasoning": "The MSJ's claim that the independent contractor controlled the work is contradicted by evidence that Harmon's foreman Ray Donner actively directed the crew, dismissed safety concerns about the scaffolding base, and pressured workers to proceed despite known hazards.",
    },
    {
        "id": "CIT-002",
        "type": "citation",
        "category": "jurisdiction",
        "description": "MSJ cites Dixon v. Lone Star (Texas) and Okafor v. Brightline (Florida) — non-binding authority in California state court",
        "msj_claim": "See also Torres v. Granite Falls...; Dixon v. Lone Star Structural...; Okafor v. Brightline Builders...",
        "evidence": {
            "legal": "Dixon is a Texas case; Okafor is a Florida case; neither is binding in California",
        },
        "severity": "medium",
        "keywords": ["dixon", "okafor", "texas", "florida", "jurisdiction"],
        "expected_reasoning": "The MSJ pads its citation list with out-of-state cases (Dixon from Texas, Okafor from Florida) that have no binding authority in California. While persuasive authority is permissible, presenting these without noting their non-binding status is misleading.",
    },
    {
        "id": "SCAF-001",
        "type": "fact",
        "category": "scaffolding_condition",
        "description": "MSJ is silent on scaffolding condition; police report notes rust and plywood base; witness details rust, bent pins, unstable plywood",
        "msj_claim": "(omitted — MSJ does not mention scaffolding condition)",
        "evidence": {
            "police_report": "portions of the scaffolding showed visible rust and wear; one plate sitting on a loose plywood sheet",
            "witness_statement": "cross-braces had significant surface rust; base plate sitting on plywood that kept shifting; coupling pins looked bent",
        },
        "severity": "medium",
        "keywords": ["rust", "plywood", "scaffolding", "condition"],
        "expected_reasoning": "The MSJ omits all mention of the scaffolding's deteriorated condition, which is extensively documented in both the police report and witness statement. The rust, bent coupling pins, and unstable plywood base are directly relevant to the cause of the incident.",
    },
    {
        "id": "POST-001",
        "type": "fact",
        "category": "post_incident",
        "description": "Witness statement reveals scaffolding was rebuilt from scratch with new components after incident — potential spoliation",
        "msj_claim": "(omitted — MSJ does not mention post-incident actions)",
        "evidence": {
            "witness_statement": "remaining east-side scaffolding was taken down and rebuilt from scratch with new components. The plywood base was replaced with proper concrete footings",
        },
        "severity": "medium",
        "keywords": ["rebuilt", "replaced", "new components", "concrete footings"],
        "expected_reasoning": "The post-incident rebuilding of the scaffolding with new components and proper concrete footings (replacing the plywood base) suggests the original scaffolding was deficient. This rebuild also raises spoliation concerns as physical evidence was destroyed.",
    },
]


# Clean documents: internally consistent, no planted errors.
# Used by both run_evals.py and evals/provider.py for precision testing.
CLEAN_DOCUMENTS = {
    "msj": (
        "MOTION FOR SUMMARY JUDGMENT\n"
        "Case No. 2023-CV-04521\nSmith v. ABC Corp\n\n"
        "STATEMENT OF UNDISPUTED FACTS\n\n"
        "1. On June 15, 2022, plaintiff John Smith was employed by XYZ Contractors "
        "as a licensed electrician at the ABC Corp warehouse renovation project.\n\n"
        "2. Smith reported to the job site at 7:00 AM and signed in with site supervisor "
        "Tom Bradley as required by company policy.\n\n"
        "3. At approximately 2:30 PM, Smith completed the wiring installation in "
        "Building C without incident and submitted his completion report.\n\n"
        "4. The project was completed on schedule and within budget. "
        "No safety violations were reported during the project duration.\n\n"
        "5. All workers on site were provided with and wore required PPE "
        "including hard hats, safety glasses, and steel-toed boots.\n"
    ),
    "police_report": (
        "INCIDENT REPORT — Case #2022-0615-003\n"
        "Date: June 15, 2022\n"
        "Location: ABC Corp Warehouse, 500 Industrial Blvd\n\n"
        "Responding officer arrived at 3:00 PM for a routine site inspection.\n"
        "Site supervisor Tom Bradley confirmed all work completed without incident.\n"
        "All workers observed wearing required PPE. No safety concerns noted.\n"
        "No injuries reported. No further action required.\n"
    ),
    "medical_records": (
        "PATIENT: John Smith\nDATE: June 15, 2022\n\n"
        "Annual workplace physical examination. Patient is a 42-year-old male "
        "employed as an electrician. No workplace injuries reported. "
        "Patient is cleared for full duty. Next examination due June 2023.\n"
    ),
    "witness_statement": (
        "WITNESS STATEMENT — Tom Bradley, Site Supervisor\n"
        "Date: June 16, 2022\n\n"
        "I, Tom Bradley, supervised the ABC Corp warehouse renovation project. "
        "John Smith reported to work at 7:00 AM on June 15, 2022, as scheduled. "
        "All workers wore required PPE throughout the day. "
        "The wiring installation in Building C was completed at approximately 2:30 PM. "
        "No safety incidents or concerns were reported during the shift. "
        "The project proceeded according to plan.\n"
    ),
}
