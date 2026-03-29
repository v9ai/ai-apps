---
name: data-validation
description: Validate data quality and integrity for job postings, user inputs, and system data
version: 1.0.0
tags:
  - validation
  - data-quality
  - debugging
  - quality-assurance
---

# Data Validation

You are a data quality expert responsible for validating data integrity across the platform. This skill helps you identify data issues, validate inputs, and ensure system data meets quality standards.

## When to Use This Skill

Activate this skill when:

- Validating user input before storing preferences
- Checking job posting data quality
- Debugging data inconsistencies
- Investigating user-reported errors
- Running data quality audits
- Preparing data for classification or analysis

## Validation Categories

### 1. Job Posting Validation

**Required Fields:**

- Title (non-empty string, 5-200 characters)
- Company name (non-empty string)
- Description (minimum 50 characters)
- Location or remote indicator
- Posted date (valid date, not future)

**Optional but Recommended:**

- Salary range (if present, min < max)
- Required skills (at least 1)
- Employment type (full-time, contract, etc.)
- Seniority level

**Data Quality Checks:**

```typescript
✅ Title is descriptive (not just "Job Posting")
✅ Company name is not "Confidential" or "Stealth"
✅ Description contains substantive content (not placeholder text)
✅ Salary range is realistic for role/location
✅ Skills are from known taxonomy (not gibberish)
✅ Location is valid country/region
✅ No duplicate postings (same title + company + date)
```

**Red Flags:**

- 🚩 Salary below minimum wage
- 🚩 Excessive requirements for junior roles
- 🚩 Vague or missing company information
- 🚩 Suspicious contact information
- 🚩 Too-good-to-be-true combinations

See `references/validation-rules.md` for complete ruleset.

### 2. User Preferences Validation

Follow schema in `preference-gathering` skill.

**Critical Validations:**

- Location countries are valid ISO codes or names
- Salary minimum < target < maximum
- Required skills exist in skill taxonomy
- Time zone preferences are valid
- Role seniority matches experience level

**Consistency Checks:**

- Junior role + high salary → flag for review
- Senior role + junior salary → flag for review
- Exclude agencies + prefer staffing industry → contradiction
- Incompatible time zone + preferred location → potential conflict

### 3. Classification Results Validation

When validating job classifications (remote worldwide, skills, etc.):

**Remote Work Classification:**

```
✅ Classification has confidence score
✅ Evidence provided for decision
✅ Consistent with job description content
⚠️ Low confidence scores need human review
❌ Contradictory signals (both YES/NO evidence)
```

**Skill Extraction:**

```
✅ All extracted skills exist in taxonomy
✅ Skill categories are correct (language vs framework vs tool)
✅ Seniority inferred matches skill requirements
⚠️ Generic skills like "teamwork" should be excluded
❌ Skills mentioned in company name but not job content
```

### 4. Company Data Validation

**Required Fields:**

- Company name
- Industry or domain
- Size or stage

**Quality Checks:**

```
✅ Website URL is valid and accessible
✅ Company description is substantive
✅ Logo URL returns an image
✅ Social links (LinkedIn, Twitter) are valid
⚠️ Missing website → possible agency or incomplete data
❌ Broken links or 404s
```

## Validation Workflow

### Step 1: Schema Validation

```
1. Check all required fields are present
2. Verify data types match schema
3. Ensure string lengths within bounds
4. Validate enums match allowed values
```

### Step 2: Business Rule Validation

```
1. Apply domain-specific rules
2. Check cross-field consistency
3. Validate ranges and relationships
4. Flag suspicious patterns
```

### Step 3: Reference Data Validation

```
1. Verify against taxonomy (skills, industries)
2. Check geographic data (countries, cities)
3. Validate against known companies
4. Cross-reference with external data
```

### Step 4: Quality Scoring

```
Give data a quality score:
- ✅ Excellent (100%): All fields present and valid
- ✅ Good (75-99%): Minor optional fields missing
- ⚠️ Fair (50-74%): Some required fields missing or questionable
- ❌ Poor (<50%): Major data quality issues
```

## Output Format

Structure validation results:

```
**Validation Result: [PASS/FAIL/WARNING]**

**Score:** [X/100]

**Required Fields:**
✅ Title: "Senior Backend Engineer"
✅ Company: "Acme Corp"
✅ Description: 450 characters
⚠️ Salary: Missing

**Quality Checks:**
✅ Title is descriptive
✅ Company is known entity
✅ Location is valid (Germany)
❌ Salary range missing (recommended)

**Consistency Checks:**
✅ Seniority matches requirements
⚠️ Remote claim needs verification

**Red Flags:**
🚩 No salary information provided

**Recommendation:**
Data is valid but incomplete. Consider requesting salary information from source.
```

## Common Validation Rules

### String Validations

```typescript
// Title
- Not empty
- 5-200 characters
- No excessive punctuation (!!!, ???)
- No ALL CAPS (unless acronym)

// Email
- Valid email format
- Not disposable email domain

// URL
- Valid URL format
- HTTPS preferred
- No broken links (check if critical)
```

### Numeric Validations

```typescript
// Salary
- Positive number
- Minimum < Maximum
- Within realistic range for location/seniority
- Currency specified

// Experience Years
- 0-50 (realistic range)
- Matches seniority level

// Confidence Scores
- 0.0 to 1.0
- Not NaN or Infinity
```

### Date Validations

```typescript
// Posted Date
- Valid date format
- Not in future
- Not too old (> 6 months may be stale)

// Application Deadline
- Valid date format
- In future
- After posted date
```

### Array Validations

```typescript
// Skills
- At least 1 item for technical roles
- All items exist in taxonomy
- No duplicates
- Max 20 items (excessive = red flag)

// Locations
- Valid countries/regions
- No contradictions (conflicting location restrictions)
```

## Error Messages

Provide helpful, actionable error messages:

❌ Bad: "Invalid data"
✅ Good: "Salary minimum (€150k) exceeds maximum (€100k)"

❌ Bad: "Wrong format"
✅ Good: "Posted date '2026-13-45' is not a valid date format (expected YYYY-MM-DD)"

❌ Bad: "Field missing"
✅ Good: "Required field 'company' is missing. Please provide company name."

## Best Practices

1. **Fail Fast**: Return early on critical validation failures
2. **Collect All Errors**: Don't stop at first error, gather all issues
3. **Provide Context**: Show what was expected vs what was received
4. **Suggest Fixes**: When possible, suggest how to correct the issue
5. **Log Issues**: Track validation failures for analysis
6. **Be Lenient on Input**: Strict on output, flexible on input (clean/normalize)

## Related Skills

- `job-analysis`: Uses validated job data
- `preference-gathering`: Validates gathered preferences
- `report-generation`: Reports on data quality issues

## Scripts

- `scripts/validate-job.ts`: Validate single job posting
- `scripts/batch-validate.ts`: Validate multiple records
- `scripts/data-quality-report.ts`: Generate quality metrics report

## References

- `references/validation-rules.md`: Complete validation rule catalog
- `references/skill-taxonomy.md`: Valid skills and categories
- `references/country-codes.md`: Valid location codes
