# Remote Work Indicators

Reference guide for identifying remote work compatibility in job postings.

## Positive Indicators (Remote-Friendly)

### Explicit Keywords

- "Remote" / "Work from home" / "WFH"
- "Distributed team" / "Remote-first" / "Remote-friendly"
- "Work from anywhere" / "Location-independent"
- "Virtual team" / "Digital nomad friendly"

### Location Indicators

- "Worldwide" / "Global" / "Work from anywhere"
- Lists multiple countries or regions (Europe, Americas, APAC, etc.)
- "EMEA" / "APAC" / "Americas" - regional indicators
- Specific cities with "or remote"

### Time Zone Mentions

- "CET" / "CEST" (Central European Time)
- "GMT" / "BST" (UK time zones)
- "EST" / "PST" (US time zones)
- "Any time zone" / "Flexible working hours"
- "Async-first" / "Asynchronous communication"

### Company Culture

- "Remote-first company"
- "No office" / "Fully distributed"
- "Async communication preferred"
- "Results-oriented work environment"

## Negative Indicators (Not Remote-Friendly)

### Office Requirements

- "In-office" / "On-site"
- "Hybrid" (without remote option)
- "3 days per week in office"
- "Relocation required"
- "Must be local to [specific city]"

### Location Restrictions

- "[Country] citizens only"
- "Must be authorized to work in [specific country]"
- "Local candidates only"
- "No visa sponsorship"

### Time Zone Requirements

- "Must work [specific timezone] hours" with no flexibility
- "Real-time availability during [specific] business hours only"
- Strict overlap requirements incompatible with remote worldwide

## Ambiguous Indicators (Needs Verification)

### Unclear Terminology

- "Remote" without location details
- "Flexible work arrangement"
- Single region listed (e.g., "EMEA only")
- "Global team" without specifying hiring regions

### Hybrid Mentions

- "Hybrid" (check if remote option exists)
- "Office-optional" (verify true remote availability)
- "Quarterly team gatherings" (travel requirements unclear)

### Visa/Legal Unclear

- "Contractor" (might allow worldwide, check details)
- "B2B arrangement" (often more flexible for international)
- "EOR supported" (Employer of Record enables international hiring)

## Classification Guidelines

### Classify as ✅ YES (remote_match) if:

- Explicitly states remote AND open to worldwide/global hiring
- Lists multiple countries or "work from anywhere"
- Company is known remote-first with global employees
- No office requirement AND no restrictive location limitations

### Classify as ⚠️ MAYBE if:

- Says remote but no location details
- Single region listed (could be restrictive)
- Contractor role without location specified
- Hybrid with unclear office locations

### Classify as ❌ NO (remote_nomatch) if:

- Requires office presence
- Restricts to a single country's residents only
- Requires specific work authorization only
- Strict time zone requirements incompatible with remote worldwide
- "Local only" to a specific area

## Examples

### ✅ Clear YES

```
"Remote - work from anywhere worldwide"
"Fully distributed team across 30+ countries"
"We're a remote-first company hiring globally"
```

### ⚠️ Needs Verification

```
"Remote, but must overlap with PST hours"
"EMEA region" (no specifics)
"Remote with occasional travel to HQ"
```

### ❌ Clear NO

```
"Hybrid - 3 days/week in our San Francisco office"
"Must be local to New York"
"Remote US only"
"Must be authorized to work in [specific country] only"
```

## Tips for Agents

1. **Look for multiple signals**: Don't rely on a single keyword
2. **Company research helps**: Known remote-first companies are safer bets
3. **When unclear, flag as MAYBE**: Let users verify with recruiters
4. **Time zones matter**: Strict single-timezone requirements limit remote worldwide viability
5. **Contractor > Employee**: For cross-border, contractor roles more flexible
6. **EOR is good**: "Employer of Record" enables international hiring
