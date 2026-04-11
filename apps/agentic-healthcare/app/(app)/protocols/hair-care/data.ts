// ── Protocol ID (DB record for research) ─────────────────────────

export const HAIR_CARE_PROTOCOL_ID = "78e4bd40-a075-45f5-9f48-f9173cf479f7";

// ── Types ────────────────────────────────────────────────────────

export type Treatment = {
  name: string;
  dosage: string;
  timing: string;
  notes?: string;
};

export type BloodMarker = {
  name: string;
  threshold: string;
  treatments: Treatment[];
  retestInterval: string;
  clinicalNotes: string[];
};

export type DHTTreatmentTier = {
  tier: number;
  label: string;
  description: string;
  items: string[];
};

export type TimelinePhase = {
  period: string;
  actions: string[];
};

export type StackItem = {
  name: string;
  dosage: string;
  condition?: string;
};

export type StackGroup = {
  timing: string;
  icon: string;
  items: StackItem[];
};

export type RetestEntry = {
  marker: string;
  interval: string;
  notes?: string;
};

// ── Nutritional Markers ──────────────────────────────────────────

export const NUTRITIONAL_MARKERS: BloodMarker[] = [
  {
    name: "Ferritin",
    threshold: "Below 70 ng/mL",
    treatments: [
      {
        name: "Iron bisglycinate",
        dosage: "25\u201350 mg daily",
        timing: "Empty stomach, with vitamin C",
        notes: "Away from coffee/tea/dairy by 2+ hours",
      },
    ],
    retestInterval: "Every 3 months",
    clinicalNotes: [
      "Gentler on the stomach than ferrous sulfate.",
      "Hair shedding resolves 3\u20136 months after levels normalize.",
      "If ferritin is below 20, investigate: diet, heavy periods, or gut absorption issues.",
    ],
  },
  {
    name: "Vitamin D",
    threshold: "Below 40 ng/mL",
    treatments: [
      {
        name: "Vitamin D3",
        dosage: "4,000\u20135,000 IU/day",
        timing: "With a fat-containing meal",
      },
      {
        name: "Vitamin K2 (MK-7)",
        dosage: "100\u2013200 mcg",
        timing: "With D3",
        notes: "Directs calcium properly",
      },
    ],
    retestInterval: "After 3 months",
    clinicalNotes: [
      "Fat-soluble \u2014 must take with dietary fat.",
      "If severely deficient (below 20), a doctor may prescribe 50,000 IU weekly for 8 weeks.",
      "Maintenance once in range: 2,000 IU/day.",
    ],
  },
  {
    name: "Zinc",
    threshold: "Deficiency confirmed via blood work",
    treatments: [
      {
        name: "Zinc picolinate or bisglycinate",
        dosage: "15\u201330 mg/day",
        timing: "With food to avoid nausea",
      },
      {
        name: "Copper",
        dosage: "1\u20132 mg",
        timing: "With zinc",
        notes: "Long-term zinc depletes copper \u2014 always pair",
      },
    ],
    retestInterval: "After 2\u20133 months",
    clinicalNotes: [
      "Signs beyond hair loss: white spots on nails, slow wound healing, frequent colds.",
    ],
  },
  {
    name: "B12 & Folate",
    threshold: "Low B12 or folate levels",
    treatments: [
      {
        name: "Methylcobalamin (active B12)",
        dosage: "1,000 mcg sublingual daily",
        timing: "Sublingual",
      },
      {
        name: "Methylfolate",
        dosage: "400\u2013800 mcg",
        timing: "Daily",
      },
    ],
    retestInterval: "After 2\u20133 months",
    clinicalNotes: [
      "Avoid cyanocobalamin and folic acid \u2014 synthetic forms some people can't convert well, especially with MTHFR gene variants.",
      "If B12 is very low (below 200), get tested for pernicious anemia and consider intramuscular injections.",
    ],
  },
  {
    name: "Magnesium",
    threshold: "Most people are deficient (soil depletion)",
    treatments: [
      {
        name: "Magnesium glycinate or threonate",
        dosage: "200\u2013400 mg",
        timing: "Before bed",
        notes: "Glycinate: general deficiency + sleep. Threonate: crosses blood-brain barrier.",
      },
    ],
    retestInterval: "As part of routine panels",
    clinicalNotes: [
      "Avoid magnesium oxide \u2014 poor absorption.",
      "Most people are deficient because soil depletion has reduced magnesium in food.",
    ],
  },
  {
    name: "Omega-3 Index",
    threshold: "Below 8%",
    treatments: [
      {
        name: "EPA/DHA (fish oil or algae-based)",
        dosage: "1,000\u20132,000 mg daily",
        timing: "With your fattiest meal",
      },
    ],
    retestInterval: "After 3\u20134 months",
    clinicalNotes: [
      "Omega-3 index measures red blood cell membrane content \u2014 takes 3\u20134 months of consistent supplementation to shift.",
      "Omega-3s reduce scalp inflammation, which contributes to follicle miniaturization.",
    ],
  },
];

// ── DHT / Androgenetic Alopecia ──────────────────────────────────

export const DHT_TREATMENT_TIERS: DHTTreatmentTier[] = [
  {
    tier: 1,
    label: "Topical (Johnson's preference)",
    description: "Topical finasteride 0.1% + minoxidil 5% compounded together, applied to scalp daily. Keeps DHT-blocking local, far fewer systemic side effects than oral.",
    items: [],
  },
  {
    tier: 2,
    label: "Oral finasteride",
    description: "1 mg/day, the standard prescription. Johnson avoids this due to potential sexual side effects (2\u20134% of users).",
    items: [
      "Get baseline hormone panels before starting",
      "Recheck at 3 and 6 months",
    ],
  },
  {
    tier: 3,
    label: "Natural DHT blockers",
    description: "Weaker than finasteride but some studies show modest benefit. Johnson doesn't rely on these.",
    items: [
      "Saw palmetto: 320 mg/day",
      "Pumpkin seed oil: 400 mg/day",
    ],
  },
  {
    tier: 4,
    label: "Johnson's full topical formula",
    description: "Compounded by a pharmacy. A dermatologist can write a prescription for a similar compound.",
    items: [
      "Minoxidil",
      "Caffeine",
      "Melatonin",
      "Tretinoin",
      "Vitamins D3 and E",
      "Dutasteride",
    ],
  },
];

export const DHT_TIMELINE: TimelinePhase[] = [
  {
    period: "Month 1\u20133",
    actions: [
      "Start topical minoxidil 5% alone",
      "Assess tolerance",
    ],
  },
  {
    period: "Month 3\u20136",
    actions: [
      "Add topical finasteride, or oral if comfortable with risk profile",
    ],
  },
  {
    period: "Month 6+",
    actions: [
      "Evaluate progress",
      "Add red light therapy cap (6 min/day)",
      "Consider microneedling (1.5mm derma pen, every 2 weeks)",
      "Do not microneedle on same day as minoxidil \u2014 wait 24h",
    ],
  },
];

// ── Endocrine Markers ────────────────────────────────────────────

export const ENDOCRINE_MARKERS: BloodMarker[] = [
  {
    name: "Thyroid (TSH, T3, T4)",
    threshold: "TSH above 4.0 or below 0.4, or free T3/T4 out of range",
    treatments: [
      {
        name: "Levothyroxine",
        dosage: "Per prescription",
        timing: "Standard treatment for hypothyroidism",
      },
      {
        name: "Selenium (selenomethionine)",
        dosage: "200 mcg/day",
        timing: "If thyroid antibodies elevated (early Hashimoto's)",
        notes: "Also consider reducing gluten \u2014 evidence for lowering thyroid antibodies",
      },
    ],
    retestInterval: "Per endocrinologist",
    clinicalNotes: [
      "Needs medical treatment, not supplements alone.",
      "Hypothyroidism causes diffuse thinning (even all over, including eyebrows and outer third of eyebrows) \u2014 different from pattern baldness.",
      "Hair regrowth typically begins 4\u20136 months after thyroid levels normalize.",
      "If antibodies (anti-TPO, anti-TG) elevated but TSH still 'normal' \u2014 this is early Hashimoto's.",
    ],
  },
  {
    name: "Prolactin",
    threshold: "Significantly elevated",
    treatments: [],
    retestInterval: "Per specialist",
    clinicalNotes: [
      "Can cause hair thinning in both men and women.",
      "Common causes: stress, certain medications, rarely a pituitary microadenoma.",
      "Needs further investigation with MRI if significantly elevated.",
      "This is not something to self-treat.",
    ],
  },
  {
    name: "Insulin / Glucose",
    threshold: "Elevated fasting insulin or glucose",
    treatments: [
      {
        name: "Berberine",
        dosage: "500 mg 2x/day with meals",
        timing: "Natural insulin sensitizer",
      },
      {
        name: "Inositol",
        dosage: "2\u20134 g/day",
        timing: "Natural insulin sensitizer",
      },
      {
        name: "Metformin",
        dosage: "Per prescription",
        timing: "If fasting insulin is persistently high",
      },
    ],
    retestInterval: "Every 3 months",
    clinicalNotes: [
      "Insulin resistance worsens androgenetic alopecia by increasing androgen activity.",
      "Reduce refined carbs and sugar, strength train regularly.",
      "Johnson's approach: last meal early, low body fat, daily exercise.",
    ],
  },
];

// ── Autoimmune Markers ───────────────────────────────────────────

export const AUTOIMMUNE_MARKERS: BloodMarker[] = [
  {
    name: "ANA Positive",
    threshold: "Positive ANA test",
    treatments: [],
    retestInterval: "Per rheumatologist",
    clinicalNotes: [
      "Suggests autoimmune involvement \u2014 possibly alopecia areata, lupus-related hair loss, or another autoimmune condition.",
      "This changes the entire approach away from Johnson's protocol (androgenetic alopecia) toward immunomodulation.",
      "See a dermatologist and potentially a rheumatologist.",
      "Treatments may include: corticosteroid injections, JAK inhibitors (like baricitinib), or topical immunotherapy.",
    ],
  },
];

// ── Daily Supplement Stack ───────────────────────────────────────

export const DAILY_STACK: StackGroup[] = [
  {
    timing: "Morning with food",
    icon: "\u2600\uFE0F",
    items: [
      { name: "Vitamin D3 + K2", dosage: "4,000\u20135,000 IU + 100\u2013200 mcg" },
      { name: "Omega-3 (EPA/DHA)", dosage: "1,000\u20132,000 mg" },
      { name: "Zinc + Copper", dosage: "15\u201330 mg + 1\u20132 mg", condition: "if deficient" },
      { name: "Magnesium", dosage: "200\u2013400 mg", condition: "if not taken at bedtime" },
    ],
  },
  {
    timing: "Empty stomach (2h gap)",
    icon: "\u23F0",
    items: [
      { name: "Iron bisglycinate + Vitamin C", dosage: "25\u201350 mg", condition: "if ferritin low" },
    ],
  },
  {
    timing: "Sublingual",
    icon: "\u{1F48A}",
    items: [
      { name: "B12 methylcobalamin", dosage: "1,000 mcg", condition: "if low" },
    ],
  },
  {
    timing: "Before bed",
    icon: "\u{1F319}",
    items: [
      { name: "Magnesium glycinate", dosage: "200\u2013400 mg", condition: "if not taken in morning" },
    ],
  },
  {
    timing: "Topical (scalp, morning)",
    icon: "\u{1F9F4}",
    items: [
      { name: "Minoxidil 5%", dosage: "Apply + massage with silicone scrubber 1\u20132 min" },
    ],
  },
  {
    timing: "Topical (scalp, evening)",
    icon: "\u{1F30C}",
    items: [
      { name: "Custom compound", dosage: "If prescribed by dermatologist" },
    ],
  },
  {
    timing: "Device",
    icon: "\u{1F534}",
    items: [
      { name: "Red light cap", dosage: "6 minutes daily" },
    ],
  },
];

// ── Retesting Schedule ───────────────────────────────────────────

export const RETEST_SCHEDULE: RetestEntry[] = [
  { marker: "Ferritin", interval: "Every 3 months", notes: "Until above 70 ng/mL" },
  { marker: "Vitamin D", interval: "After 3 months", notes: "Then maintenance check every 6 months" },
  { marker: "Zinc", interval: "After 2\u20133 months" },
  { marker: "B12 & Folate", interval: "After 2\u20133 months" },
  { marker: "Omega-3 Index", interval: "After 3\u20134 months" },
  { marker: "Hormones (DHT)", interval: "At 3 and 6 months after starting treatment" },
  { marker: "Thyroid", interval: "Per endocrinologist" },
  { marker: "Insulin / Glucose", interval: "Every 3 months", notes: "Until stable" },
  { marker: "Full panel", interval: "Every 6 months once stable" },
];
