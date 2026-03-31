"""Generate synthetic B2B outreach email training data via DeepSeek API.

Produces diverse email examples by combining company profiles, recipient
personas, and email types. Validates outputs against quality rules.

Usage:
  python3 mlx-training/generate_synthetic_emails.py --count 800
  python3 mlx-training/generate_synthetic_emails.py --count 100 --dry-run
"""

from __future__ import annotations

import argparse
import json
import os
import random
import re
import sys
import time
from pathlib import Path

import httpx

# ── Constants ────────────────────────────────────────────────────────────────

SYSTEM_PROMPT = (
    "You write B2B outreach emails for Vadim Nicolai, Senior Software Engineer "
    "(10+ years: React, TypeScript, AI/ML, Rust, Node.js, GraphQL). "
    'Output ONLY valid JSON: {"subject": "...", "body": "..."}'
)

TRAINING_SYSTEM = (
    "You write B2B outreach emails for Vadim Nicolai, Senior Software Engineer "
    "(10+ years: React, TypeScript, AI/ML, Rust, Node.js, GraphQL). "
    'Output ONLY valid JSON: {"subject": "...", "body": "..."}'
)

# DeepSeek teacher prompt — generates the training pair
TEACHER_SYSTEM = """You are generating training data for a small language model that writes B2B outreach emails.

Given a scenario (company, recipient, email type), produce a realistic email as valid JSON:
{"subject": "...", "body": "..."}

RULES:
- Subject: < 60 chars, no spam triggers, no ALL CAPS, professional but human
- Body: use {{name}} placeholder for recipient first name
- Start with "Hey {{name}}," or "Hi {{name}},"
- End with "Thanks,\\nVadim" or "Best,\\nVadim"
- One clear, low-friction CTA (quick call, chat, connect)
- Reference specific company/tech details naturally
- NO generic flattery ("I was impressed by your innovative approach")
- NO fabricated certifications or experience
- Keep skills relevant to the role/company

WORD LIMITS by type:
- initial: 100-180 words
- followup_1: 80-120 words
- followup_2: 70-100 words
- followup_3: 50-80 words

Respond with ONLY the JSON object, no markdown fences."""

# ── Company profiles ─────────────────────────────────────────────────────────

COMPANIES = [
    {"name": "NeuralScale", "industry": "AI/ML Platform", "description": "Building scalable ML infrastructure for enterprise. GPU cluster orchestration and model serving.", "ai_tier": 2, "services": ["ML Infrastructure", "Model Serving", "GPU Orchestration"]},
    {"name": "DataForge", "industry": "Data Engineering", "description": "Real-time data pipelines and analytics platform. Processing petabytes of event data.", "ai_tier": 1, "services": ["Data Pipelines", "Stream Processing", "Analytics"]},
    {"name": "CloudBridge", "industry": "Cloud Infrastructure", "description": "Multi-cloud management platform. Kubernetes orchestration and infrastructure as code.", "ai_tier": 0, "services": ["Cloud Management", "Kubernetes", "IaC"]},
    {"name": "FinTechFlow", "industry": "Fintech", "description": "Payment processing and financial APIs for developers. PCI-compliant infrastructure.", "ai_tier": 0, "services": ["Payment Processing", "Financial APIs", "Compliance"]},
    {"name": "HealthAI", "industry": "Healthtech", "description": "AI-powered diagnostic tools for radiology. Medical image analysis using deep learning.", "ai_tier": 2, "services": ["Medical AI", "Image Analysis", "Diagnostics"]},
    {"name": "DevToolsHQ", "industry": "Developer Tools", "description": "Code review automation and CI/CD platform. AI-assisted code analysis.", "ai_tier": 1, "services": ["Code Review", "CI/CD", "Static Analysis"]},
    {"name": "EcommerceOS", "industry": "E-commerce", "description": "Headless commerce platform with React storefronts. Personalization engine.", "ai_tier": 1, "services": ["E-commerce Platform", "Personalization", "React Storefronts"]},
    {"name": "SecureNet", "industry": "Cybersecurity", "description": "Threat detection platform using behavioral analytics. Real-time security monitoring.", "ai_tier": 1, "services": ["Threat Detection", "Security Analytics", "SIEM"]},
    {"name": "EdTechPro", "industry": "Edtech", "description": "Online learning platform with AI tutoring. Adaptive learning paths.", "ai_tier": 1, "services": ["AI Tutoring", "Adaptive Learning", "Content Platform"]},
    {"name": "RoboticaLabs", "industry": "Robotics", "description": "Autonomous warehouse robotics. Computer vision and path planning.", "ai_tier": 2, "services": ["Warehouse Automation", "Computer Vision", "Path Planning"]},
    {"name": "GreenEnergy AI", "industry": "Cleantech", "description": "AI optimization for renewable energy grids. Predictive maintenance for solar/wind.", "ai_tier": 2, "services": ["Energy Optimization", "Predictive Maintenance", "Grid Management"]},
    {"name": "LegalMind", "industry": "Legaltech", "description": "Contract analysis and due diligence automation. NLP for legal documents.", "ai_tier": 1, "services": ["Contract Analysis", "NLP", "Due Diligence"]},
    {"name": "PropTech360", "industry": "Proptech", "description": "Property management SaaS with virtual tours. Market analytics dashboard.", "ai_tier": 0, "services": ["Property Management", "Virtual Tours", "Market Analytics"]},
    {"name": "LogiTrack", "industry": "Logistics", "description": "Supply chain optimization platform. Route planning and demand forecasting.", "ai_tier": 1, "services": ["Supply Chain", "Route Optimization", "Demand Forecasting"]},
    {"name": "MediaAI Studio", "industry": "Media & Entertainment", "description": "AI-powered video editing and content creation tools. Automated subtitling.", "ai_tier": 2, "services": ["Video AI", "Content Creation", "Automated Subtitling"]},
    {"name": "AgriSense", "industry": "Agtech", "description": "Precision agriculture using satellite imagery and IoT sensors. Crop yield prediction.", "ai_tier": 1, "services": ["Precision Agriculture", "Satellite Analysis", "IoT"]},
    {"name": "TravelStack", "industry": "Travel", "description": "Travel booking API aggregator. Dynamic pricing and recommendation engine.", "ai_tier": 1, "services": ["Booking API", "Dynamic Pricing", "Recommendations"]},
    {"name": "InsurTech AI", "industry": "Insurtech", "description": "Automated underwriting and claims processing using ML. Risk assessment models.", "ai_tier": 2, "services": ["Underwriting AI", "Claims Automation", "Risk Models"]},
    {"name": "GameForge", "industry": "Gaming", "description": "Game development studio building multiplayer infrastructure. Real-time networking.", "ai_tier": 0, "services": ["Multiplayer Infrastructure", "Game Backend", "Real-time Networking"]},
    {"name": "BioCompute", "industry": "Biotech", "description": "Computational biology platform. Protein structure prediction and drug discovery.", "ai_tier": 2, "services": ["Computational Biology", "Drug Discovery", "Protein Prediction"]},
]

# ── Recipient personas ───────────────────────────────────────────────────────

RECIPIENTS = [
    {"name": "Sarah", "position": "CTO", "seniority": "C-suite", "department": "Engineering"},
    {"name": "Michael", "position": "VP of Engineering", "seniority": "VP", "department": "Engineering"},
    {"name": "Lisa", "position": "Head of AI", "seniority": "Director", "department": "AI/ML"},
    {"name": "James", "position": "Engineering Manager", "seniority": "Manager", "department": "Engineering"},
    {"name": "Emily", "position": "Tech Lead", "seniority": "Lead", "department": "Engineering"},
    {"name": "David", "position": "Director of Engineering", "seniority": "Director", "department": "Engineering"},
    {"name": "Anna", "position": "Head of Product Engineering", "seniority": "Director", "department": "Product"},
    {"name": "Robert", "position": "Senior Technical Recruiter", "seniority": "Senior", "department": "Talent"},
    {"name": "Maria", "position": "VP of Product", "seniority": "VP", "department": "Product"},
    {"name": "Tom", "position": "Founder & CEO", "seniority": "C-suite", "department": "Executive"},
    {"name": "Rachel", "position": "Head of Platform Engineering", "seniority": "Director", "department": "Platform"},
    {"name": "Alex", "position": "Staff Engineer", "seniority": "Staff", "department": "Engineering"},
]

EMAIL_TYPES = ["initial", "followup_1", "followup_2", "followup_3"]

SEQUENCE_LABELS = {
    "initial": "initial outreach",
    "followup_1": "first follow-up",
    "followup_2": "second follow-up",
    "followup_3": "final follow-up",
}

# ── DeepSeek API ─────────────────────────────────────────────────────────────

DEEPSEEK_URL = os.environ.get("DEEPSEEK_API_URL", "https://api.deepseek.com/v1/chat/completions")


def call_deepseek(client: httpx.Client, api_key: str, user_prompt: str) -> str | None:
    """Call DeepSeek API and return the assistant content."""
    try:
        resp = client.post(
            DEEPSEEK_URL,
            headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
            json={
                "model": "deepseek-chat",
                "messages": [
                    {"role": "system", "content": TEACHER_SYSTEM},
                    {"role": "user", "content": user_prompt},
                ],
                "temperature": 0.8,
                "max_tokens": 1024,
            },
            timeout=30.0,
        )
        resp.raise_for_status()
        data = resp.json()
        return data["choices"][0]["message"]["content"]
    except Exception as e:
        print(f"  API error: {e}", file=sys.stderr)
        return None


# ── Build scenario prompt ────────────────────────────────────────────────────


def build_scenario_prompt(company: dict, recipient: dict, email_type: str) -> str:
    seq_label = SEQUENCE_LABELS[email_type]
    parts = [f"Generate a {seq_label} email for this scenario:", ""]

    parts.append("RECIPIENT:")
    parts.append(f"- Name: {recipient['name']}")
    parts.append(f"- Position: {recipient['position']}")
    parts.append(f"- Seniority: {recipient['seniority']}")
    parts.append(f"- Department: {recipient['department']}")
    parts.append("")

    parts.append("COMPANY:")
    parts.append(f"- Name: {company['name']}")
    parts.append(f"- Industry: {company['industry']}")
    parts.append(f"- Description: {company['description']}")
    if company["ai_tier"] > 0:
        tier = {1: "AI-first", 2: "AI-native"}[company["ai_tier"]]
        parts.append(f"- AI tier: {tier}")
    if company.get("services"):
        parts.append(f"- Services: {', '.join(company['services'])}")
    parts.append("")

    parts.append("EMAIL TYPE:")
    if email_type == "initial":
        parts.append("- Cold outreach exploring engineering opportunities")
        parts.append("- Highlight skills relevant to this company")
        parts.append("- 100-180 words, one CTA")
    elif email_type == "followup_1":
        parts.append("- First follow-up to previous outreach")
        parts.append("- Reference previous message, add new angle")
        parts.append("- 80-120 words")
    elif email_type == "followup_2":
        parts.append("- Second follow-up, brief and respectful")
        parts.append("- Offer flexibility on timing")
        parts.append("- 70-100 words")
    elif email_type == "followup_3":
        parts.append("- Final follow-up, gracious close")
        parts.append("- Leave door open, no pressure")
        parts.append("- 50-80 words")

    return "\n".join(parts)


# ── Build training user message (student format) ────────────────────────────


def build_training_user_message(company: dict, recipient: dict, email_type: str) -> str:
    """Build the user message in the same format as export_email_data.py."""
    seq_label = SEQUENCE_LABELS[email_type]
    parts = [f"Write a {seq_label} email.", ""]

    parts.append("RECIPIENT:")
    parts.append(f"- Name: {recipient['name']}")
    parts.append(f"- Position: {recipient['position']}")
    if recipient.get("seniority"):
        parts.append(f"- Seniority: {recipient['seniority']}")
    if recipient.get("department"):
        parts.append(f"- Department: {recipient['department']}")
    parts.append("")

    parts.append("COMPANY:")
    parts.append(f"- Name: {company['name']}")
    parts.append(f"- Industry: {company['industry']}")
    parts.append(f"- Description: {company['description'][:500]}")
    if company["ai_tier"] > 0:
        tier = {1: "AI-first", 2: "AI-native"}[company["ai_tier"]]
        parts.append(f"- AI tier: {tier}")
    if company.get("services"):
        parts.append(f"- Services: {', '.join(company['services'][:5])}")
    parts.append("")

    parts.append("INSTRUCTIONS:")
    if email_type == "initial":
        parts.append("- Cold outreach to explore engineering opportunities")
        parts.append("- Highlight relevant experience only")
        parts.append("- 100-180 words, one clear CTA")
    elif email_type == "followup_1":
        parts.append("- First follow-up, reference previous email")
        parts.append("- Acknowledge they may be busy")
        parts.append("- 80-120 words, one question or CTA")
    elif email_type == "followup_2":
        parts.append("- Second follow-up, brief and respectful")
        parts.append("- Offer flexibility on timing")
        parts.append("- 70-100 words")
    elif email_type == "followup_3":
        parts.append("- Final follow-up, gracious close")
        parts.append("- Leave door open for future")
        parts.append("- 50-80 words")
    parts.append('- Use {{name}} placeholder for recipient name')

    return "\n".join(parts)


# ── Quality validation ───────────────────────────────────────────────────────

SPAM_WORDS = {"free", "urgent", "act now", "limited time", "guaranteed", "no obligation", "click here", "buy now", "discount", "winner"}


def validate_email(raw: str, email_type: str) -> dict | None:
    """Parse and validate generated email. Returns {subject, body} or None."""
    # Strip markdown fences
    text = raw.strip()
    text = re.sub(r"^```(?:json)?\s*", "", text)
    text = re.sub(r"\s*```$", "", text)
    text = text.strip()

    try:
        data = json.loads(text)
    except json.JSONDecodeError:
        return None

    if not isinstance(data, dict):
        return None
    subject = data.get("subject", "")
    body = data.get("body", "")
    if not subject or not body:
        return None

    # Subject checks
    if len(subject) > 60:
        return None
    if subject.isupper():
        return None

    # Word count checks
    wc = len(body.split())
    limits = {
        "initial": (80, 220),
        "followup_1": (60, 150),
        "followup_2": (50, 130),
        "followup_3": (35, 100),
    }
    lo, hi = limits.get(email_type, (50, 250))
    if wc < lo or wc > hi:
        return None

    # Spam check
    body_lower = body.lower()
    if any(w in body_lower for w in SPAM_WORDS):
        return None

    return {"subject": subject, "body": body}


# ── Main generation loop ────────────────────────────────────────────────────


def generate(count: int, out_dir: Path, dry_run: bool = False):
    api_key = os.environ.get("DEEPSEEK_API_KEY")
    if not api_key and not dry_run:
        print("ERROR: Set DEEPSEEK_API_KEY", file=sys.stderr)
        sys.exit(1)

    # Build all scenarios
    random.seed(42)
    scenarios = []
    for company in COMPANIES:
        for recipient in RECIPIENTS:
            for email_type in EMAIL_TYPES:
                scenarios.append((company, recipient, email_type))

    random.shuffle(scenarios)

    # Limit to requested count (with headroom for validation failures)
    target = int(count * 1.3)  # 30% headroom
    scenarios = scenarios[:target]

    print(f"Generating {count} synthetic emails ({len(scenarios)} attempts with headroom)...")
    if dry_run:
        print("DRY RUN — showing first 3 scenario prompts:")
        for i, (c, r, t) in enumerate(scenarios[:3]):
            print(f"\n--- Scenario {i+1} ---")
            print(build_scenario_prompt(c, r, t))
        return

    records = []
    failures = 0
    client = httpx.Client()

    try:
        for i, (company, recipient, email_type) in enumerate(scenarios):
            if len(records) >= count:
                break

            # Build teacher prompt
            teacher_prompt = build_scenario_prompt(company, recipient, email_type)
            raw = call_deepseek(client, api_key, teacher_prompt)
            if not raw:
                failures += 1
                continue

            # Validate
            email = validate_email(raw, email_type)
            if not email:
                failures += 1
                if failures <= 5:
                    print(f"  validation failed (#{failures}): {raw[:100]}...", file=sys.stderr)
                continue

            # Build training record (student format)
            user_msg = build_training_user_message(company, recipient, email_type)
            assistant_msg = f"<think>\n</think>\n{json.dumps(email, ensure_ascii=False)}"

            records.append({
                "messages": [
                    {"role": "system", "content": TRAINING_SYSTEM},
                    {"role": "user", "content": user_msg},
                    {"role": "assistant", "content": assistant_msg},
                ]
            })

            if (i + 1) % 50 == 0:
                print(f"  progress: {len(records)}/{count} generated ({failures} failures)")

            # Rate limit: ~2 req/sec
            time.sleep(0.5)

    finally:
        client.close()

    print(f"\nGenerated: {len(records)} valid emails ({failures} failures)")

    # Write to file
    path = out_dir / "outreach-email" / "synthetic.jsonl"
    path.parent.mkdir(parents=True, exist_ok=True)
    with open(path, "w") as f:
        for rec in records:
            f.write(json.dumps(rec, ensure_ascii=False) + "\n")
    print(f"Written to {path}")


def main():
    parser = argparse.ArgumentParser(description="Generate synthetic email training data")
    parser.add_argument("--count", type=int, default=800, help="Number of emails to generate")
    parser.add_argument("--out-dir", type=Path, default=Path("mlx-training/data"))
    parser.add_argument("--dry-run", action="store_true", help="Show prompts only, don't call API")
    args = parser.parse_args()

    generate(args.count, args.out_dir, args.dry_run)


if __name__ == "__main__":
    main()
