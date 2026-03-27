# Common Validation Rules

Comprehensive validation rules for job platform data.

## Job Posting Validations

### Required Fields

| Field         | Type     | Validation             |
| ------------- | -------- | ---------------------- |
| `id`          | string   | UUID format            |
| `title`       | string   | 5-200 chars, not empty |
| `company`     | string   | 2-100 chars, not empty |
| `description` | string   | Min 50 chars           |
| `posted_date` | datetime | Valid date, not future |
| `source_url`  | string   | Valid URL              |

### Optional Fields

| Field             | Type   | Validation                                              |
| ----------------- | ------ | ------------------------------------------------------- |
| `salary_min`      | number | Positive, < salary_max                                  |
| `salary_max`      | number | Positive, > salary_min                                  |
| `salary_currency` | string | Valid ISO currency code                                 |
| `location`        | string | Valid country/region                                    |
| `remote_policy`   | enum   | 'remote', 'hybrid', 'onsite'                            |
| `employment_type` | enum   | 'full-time', 'contract', 'part-time'                    |
| `seniority`       | enum   | 'junior', 'mid', 'senior', 'lead', 'staff', 'principal' |

### Complex Validations

#### Salary Consistency

```typescript
if (salary_min && salary_max) {
  assert(salary_min < salary_max, "Min salary must be less than max");
  assert(salary_min > 0, "Salary must be positive");

  // Realistic upper bound (adjust per market)
  const MAX_REASONABLE =
    salary_currency === "EUR"
      ? 500000
      : salary_currency === "USD"
        ? 600000
        : 1000000;
  assert(salary_max < MAX_REASONABLE, "Salary unrealistically high");
}

if (salary_min || salary_max) {
  assert(salary_currency, "Currency required when salary provided");
}
```

#### Title Quality

```typescript
// Length check
assert(title.length >= 5, "Title too short");
assert(title.length <= 200, "Title too long");

// Content check
const suspiciousPatterns = [
  /^job$/i,
  /^position$/i,
  /^opening$/i,
  /untitled/i,
  /test/i,
];
assert(!suspiciousPatterns.some((p) => p.test(title)), "Generic title");

// No excessive punctuation
assert(!/[!?]{3,}/.test(title), "Excessive punctuation");
assert(!/[A-Z]{10,}/.test(title), "Too much capitalization");
```

#### Description Quality

```typescript
const MIN_DESCRIPTION_LENGTH = 50;
const MAX_DESCRIPTION_LENGTH = 50000;

assert(description.length >= MIN_DESCRIPTION_LENGTH, "Description too short");
assert(description.length <= MAX_DESCRIPTION_LENGTH, "Description too long");

// Check for placeholder text
const placeholders = ["lorem ipsum", "todo", "tbd", "coming soon"];
assert(
  !placeholders.some((p) => description.toLowerCase().includes(p)),
  "Placeholder text in description",
);
```

#### Date Validations

```typescript
const now = new Date();
const sixMonthsAgo = new Date(now);
sixMonthsAgo.setMonth(now.getMonth() - 6);

assert(posted_date <= now, "Posted date cannot be in future");

// Warning for old postings (not an error)
if (posted_date < sixMonthsAgo) {
  warn("Job posting is over 6 months old - may be filled");
}

if (application_deadline) {
  assert(
    application_deadline > posted_date,
    "Deadline must be after posted date",
  );
  assert(application_deadline > now, "Application deadline has passed");
}
```

## User Preference Validations

### Location Preferences

```typescript
// Countries must be valid ISO codes or recognized names
const validCountries = ['DE', 'FR', 'ES', 'NL', 'Germany', 'France', ...];
preferences.location.countries.forEach(country => {
  assert(validCountries.includes(country),
    `Invalid country: ${country}`);
});

// Time zones must be valid
const validTimeZones = ['CET', 'CEST', 'GMT', 'BST', 'EST', 'PST', ...];
if (preferences.location.timeZones) {
  preferences.location.timeZones.forEach(tz => {
    assert(validTimeZones.includes(tz),
      `Invalid time zone: ${tz}`);
  });
}
```

### Salary Preferences

```typescript
if (preferences.compensation.minimum) {
  assert(
    preferences.compensation.minimum > 0,
    "Minimum salary must be positive",
  );
}

if (preferences.compensation.minimum && preferences.compensation.target) {
  assert(
    preferences.compensation.minimum <= preferences.compensation.target,
    "Minimum salary cannot exceed target",
  );
}

// Realistic bounds per seniority
const salaryBounds = {
  junior: { min: 25000, max: 80000 },
  mid: { min: 40000, max: 120000 },
  senior: { min: 60000, max: 200000 },
  staff: { min: 100000, max: 300000 },
};

const bounds = salaryBounds[preferences.role.seniority];
if (
  preferences.compensation.minimum < bounds.min ||
  preferences.compensation.target > bounds.max
) {
  warn(`Salary expectations unusual for ${preferences.role.seniority} level`);
}
```

### Skills Validation

```typescript
// All skills must exist in taxonomy
const skillTaxonomy = loadSkillTaxonomy();
const allSkills = [
  ...preferences.skills.required,
  ...preferences.skills.preferred,
  ...preferences.skills.exclude,
];

allSkills.forEach((skill) => {
  assert(
    skillTaxonomy.includes(skill),
    `Unknown skill: ${skill}. Did you mean: ${suggestSimilar(skill)}?`,
  );
});

// Check for contradictions
const requiredSet = new Set(preferences.skills.required);
const excludeSet = new Set(preferences.skills.exclude);
const conflicts = [...requiredSet].filter((s) => excludeSet.has(s));
assert(
  conflicts.length === 0,
  `Skill both required and excluded: ${conflicts.join(", ")}`,
);
```

## Classification Result Validations

### Remote EU Classification

```typescript
interface ClassificationResult {
  classification: "yes" | "maybe" | "no";
  confidence: number;
  evidence: string[];
  reasoning: string;
}

function validateClassification(result: ClassificationResult) {
  // Must have classification
  assert(
    ["yes", "maybe", "no"].includes(result.classification),
    "Invalid classification value",
  );

  // Confidence must be 0-1
  assert(
    result.confidence >= 0 && result.confidence <= 1,
    "Confidence must be between 0 and 1",
  );

  // Must have evidence
  assert(result.evidence.length > 0, "Classification must include evidence");

  // Must have reasoning
  assert(
    result.reasoning && result.reasoning.length > 10,
    "Classification must include reasoning",
  );

  // Low confidence should be flagged
  if (result.confidence < 0.6) {
    warn("Low confidence classification - should be reviewed");
  }

  // Check for contradictory evidence
  const hasYesEvidence = result.evidence.some(
    (e) => e.toLowerCase().includes("remote") || e.toLowerCase().includes("eu"),
  );
  const hasNoEvidence = result.evidence.some(
    (e) =>
      e.toLowerCase().includes("office") || e.toLowerCase().includes("on-site"),
  );

  if (hasYesEvidence && hasNoEvidence && result.classification !== "maybe") {
    warn("Contradictory evidence but classification is not 'maybe'");
  }
}
```

### Skill Extraction Validation

```typescript
interface ExtractedSkill {
  name: string;
  category: string;
  priority: "required" | "preferred";
  context?: string;
}

function validateSkillExtraction(skills: ExtractedSkill[]) {
  const taxonomy = loadSkillTaxonomy();

  skills.forEach((skill, idx) => {
    // Skill must exist in taxonomy
    assert(
      taxonomy.skills.some((s) => s.name === skill.name),
      `Extracted skill not in taxonomy: ${skill.name}`,
    );

    // Category must match taxonomy
    const taxonomySkill = taxonomy.skills.find((s) => s.name === skill.name);
    assert(
      skill.category === taxonomySkill.category,
      `Category mismatch for ${skill.name}: ${skill.category} vs ${taxonomySkill.category}`,
    );

    // Priority must be valid
    assert(
      ["required", "preferred"].includes(skill.priority),
      `Invalid priority for ${skill.name}: ${skill.priority}`,
    );
  });

  // At least some skills should be required
  const requiredCount = skills.filter((s) => s.priority === "required").length;
  if (requiredCount === 0) {
    warn("No required skills extracted - unusual for technical role");
  }

  // Too many skills is suspicious
  if (skills.length > 20) {
    warn(
      `Excessive skills extracted: ${skills.length}. Job may be 'kitchen sink' posting.`,
    );
  }
}
```

## Company Data Validations

```typescript
interface Company {
  name: string;
  website?: string;
  industry: string;
  size?: string;
  stage?: string;
  logo_url?: string;
}

function validateCompany(company: Company) {
  // Name required
  assert(
    company.name && company.name.length >= 2,
    "Company name required (min 2 chars)",
  );

  // Industry required
  assert(company.industry, "Company industry required");

  // Website format
  if (company.website) {
    assert(
      /^https?:\/\/.+\..+/.test(company.website),
      "Invalid website URL format",
    );

    // Check if actually reachable (optional)
    // const response = await fetch(company.website);
    // if (!response.ok) warn("Company website unreachable");
  }

  // Logo URL format
  if (company.logo_url) {
    assert(
      /\.(jpg|jpeg|png|svg|webp)$/i.test(company.logo_url),
      "Logo URL must point to image file",
    );
  }

  // Size validation
  const validSizes = [
    "startup",
    "scale-up",
    "enterprise",
    "1-10",
    "11-50",
    "51-200",
    "201-500",
    "500+",
  ];
  if (company.size) {
    assert(
      validSizes.includes(company.size),
      `Invalid company size: ${company.size}`,
    );
  }

  // Stage validation
  const validStages = [
    "pre-seed",
    "seed",
    "series-a",
    "series-b",
    "series-c",
    "series-d+",
    "public",
    "private",
  ];
  if (company.stage) {
    assert(
      validStages.includes(company.stage),
      `Invalid company stage: ${company.stage}`,
    );
  }
}
```

## Error Severity Levels

### Critical (Block Operation)

- Required field missing
- Data type mismatch
- Invalid enum value
- Referential integrity violation
- Security concern

### Warning (Allow but Flag)

- Optional field missing
- Data quality concern
- Unusual but valid value
- Low confidence score
- Stale data

### Info (Log Only)

- Validation passed with notes
- Default value used
- Optional enhancement available
