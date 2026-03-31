"""Generate synthetic B2B outreach email training data via DeepSeek API.

Produces diverse email examples by combining company profiles, recipient
personas, email types, and style variants. Validates outputs against quality
rules. Supports negative example generation for contrastive/DPO training.

Usage:
  python3 mlx-training/generate_synthetic_emails.py --count 1000
  python3 mlx-training/generate_synthetic_emails.py --count 100 --dry-run
  python3 mlx-training/generate_synthetic_emails.py --count 500 --neg-ratio 0.15
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
    "Never reference crypto, blockchain, trading, or Web3. "
    'Output ONLY valid JSON: {"subject": "...", "body": "..."}'
)

TRAINING_SYSTEM = (
    "You write B2B outreach emails for Vadim Nicolai, Senior Software Engineer "
    "(10+ years: React, TypeScript, AI/ML, Rust, Node.js, GraphQL). "
    "Never reference crypto, blockchain, trading, or Web3. "
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
- re_engage: 60-90 words
- referral: 80-120 words

Respond with ONLY the JSON object, no markdown fences."""

TEACHER_SYSTEM_NEGATIVE = """You are generating NEGATIVE training data for a small language model that writes B2B outreach emails.

Given a scenario (company, recipient, email type), produce a DELIBERATELY BAD email as valid JSON:
{"subject": "...", "body": "..."}

Make it bad in one or more of these ways:
- WAY too long (2-3x the word limit)
- No clear CTA or buried CTA
- Generic flattery ("I was impressed by your innovative approach")
- No {{name}} placeholder — just use a generic greeting
- Salesy, spammy tone
- Irrelevant skill mentions
- Multiple CTAs competing for attention

Still produce valid JSON, but the EMAIL QUALITY should be poor.

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
    {"name": "TalentAI", "industry": "HR Tech", "description": "AI-driven talent acquisition and workforce analytics. Automated screening and skills matching.", "ai_tier": 2, "services": ["Talent Acquisition", "Workforce Analytics", "Skills Matching"]},
    {"name": "ChainMind", "industry": "Supply Chain AI", "description": "End-to-end supply chain visibility with ML-driven demand sensing. Inventory optimization at scale.", "ai_tier": 2, "services": ["Demand Sensing", "Inventory Optimization", "Supply Chain Visibility"]},
    {"name": "RetainIQ", "industry": "Customer Success Platform", "description": "Predictive customer health scoring and churn prevention. Real-time engagement analytics.", "ai_tier": 1, "services": ["Customer Health Scoring", "Churn Prevention", "Engagement Analytics"]},
    {"name": "SignalSell", "industry": "Sales Intelligence", "description": "Buyer intent signals from web activity and firmographic data. Pipeline prediction engine.", "ai_tier": 1, "services": ["Intent Signals", "Pipeline Prediction", "Firmographic Data"]},
    {"name": "ShieldOps", "industry": "DevSecOps", "description": "Shift-left security platform for CI/CD. Automated vulnerability scanning and policy enforcement.", "ai_tier": 1, "services": ["Security Scanning", "Policy Enforcement", "CI/CD Security"]},
    {"name": "SensorGrid", "industry": "IoT Platform", "description": "Enterprise IoT device management and edge computing. Real-time telemetry processing.", "ai_tier": 1, "services": ["Device Management", "Edge Computing", "Telemetry Processing"]},
    {"name": "WaymakersAI", "industry": "Autonomous Vehicles", "description": "Self-driving perception and planning stack. LiDAR fusion and real-time decision systems.", "ai_tier": 2, "services": ["Perception Stack", "LiDAR Fusion", "Motion Planning"]},
    {"name": "LingvoLab", "industry": "NLP Research", "description": "Large language model fine-tuning and evaluation platform. Multilingual NLP tooling.", "ai_tier": 2, "services": ["LLM Fine-tuning", "NLP Evaluation", "Multilingual Models"]},
    {"name": "RiskLens AI", "industry": "Financial Risk AI", "description": "Real-time credit risk modeling and stress testing. Regulatory compliance automation.", "ai_tier": 2, "services": ["Credit Risk Models", "Stress Testing", "Regulatory Compliance"]},
    {"name": "MedVault", "industry": "Healthcare Data", "description": "HIPAA-compliant health data lake and interoperability platform. Clinical NLP pipelines.", "ai_tier": 1, "services": ["Health Data Lake", "Interoperability", "Clinical NLP"]},
    {"name": "CaseAI", "industry": "Legal AI", "description": "AI-powered litigation analytics and case outcome prediction. Document review automation.", "ai_tier": 2, "services": ["Litigation Analytics", "Case Prediction", "Document Review"]},
    {"name": "BuildSight", "industry": "Construction Tech", "description": "Construction project management with computer vision for site monitoring. Progress tracking.", "ai_tier": 1, "services": ["Site Monitoring", "Progress Tracking", "Project Management"]},
    {"name": "ShelfLogic", "industry": "Retail Analytics", "description": "In-store analytics and planogram optimization. Shopper behavior modeling using computer vision.", "ai_tier": 1, "services": ["Store Analytics", "Planogram Optimization", "Shopper Modeling"]},
    {"name": "CarbonTrace", "industry": "Climate AI", "description": "Carbon footprint measurement and ESG reporting automation. Emissions forecasting.", "ai_tier": 1, "services": ["Carbon Measurement", "ESG Reporting", "Emissions Forecasting"]},
    {"name": "PulseSocial", "industry": "Social Media Analytics", "description": "Brand sentiment analysis and trend detection across social platforms. Real-time dashboards.", "ai_tier": 1, "services": ["Sentiment Analysis", "Trend Detection", "Social Dashboards"]},
    {"name": "ClickVerse", "industry": "Ad Tech", "description": "Programmatic ad bidding with ML-optimized creatives. Real-time attribution and fraud detection.", "ai_tier": 2, "services": ["Programmatic Bidding", "Creative Optimization", "Ad Fraud Detection"]},
    {"name": "RouteFleet", "industry": "Fleet Management", "description": "Fleet tracking and route optimization for last-mile delivery. Predictive vehicle maintenance.", "ai_tier": 1, "services": ["Fleet Tracking", "Route Optimization", "Predictive Maintenance"]},
    {"name": "FactoryMind", "industry": "Industrial IoT", "description": "Smart factory monitoring with anomaly detection. Digital twin simulation for manufacturing.", "ai_tier": 2, "services": ["Anomaly Detection", "Digital Twins", "Smart Factory"]},
    {"name": "BabelSpeak", "industry": "Real-time Translation", "description": "Low-latency speech-to-speech translation for enterprise meetings. Custom domain vocabularies.", "ai_tier": 2, "services": ["Speech Translation", "Low-latency NLP", "Domain Vocabularies"]},
    {"name": "TrustGuard", "industry": "Fraud Detection", "description": "Transaction fraud detection with graph neural networks. Real-time risk scoring API.", "ai_tier": 2, "services": ["Fraud Detection", "Graph Neural Networks", "Risk Scoring"]},
    {"name": "NeuroSearch", "industry": "Enterprise Search", "description": "Semantic enterprise search powered by embeddings. Knowledge graph construction.", "ai_tier": 2, "services": ["Semantic Search", "Knowledge Graphs", "Embeddings"]},
    {"name": "VoiceLayer", "industry": "Conversational AI", "description": "Voice assistant platform for customer service. ASR and dialog management.", "ai_tier": 2, "services": ["Voice Assistants", "ASR", "Dialog Management"]},
    {"name": "PixelFlow", "industry": "Computer Vision", "description": "Visual inspection and quality control for manufacturing. Custom model training platform.", "ai_tier": 2, "services": ["Visual Inspection", "Quality Control", "Model Training"]},
    {"name": "DocuBrain", "industry": "Document Intelligence", "description": "Intelligent document processing and extraction. Invoice, receipt, and form understanding.", "ai_tier": 1, "services": ["Document Processing", "Data Extraction", "Form Understanding"]},
    {"name": "QuantumLeap", "industry": "Quantum Computing", "description": "Hybrid quantum-classical optimization platform. Quantum ML algorithm development.", "ai_tier": 2, "services": ["Quantum Optimization", "Quantum ML", "Hybrid Computing"]},
    {"name": "DataMesh", "industry": "Data Infrastructure", "description": "Data mesh architecture platform. Federated data governance and self-serve analytics.", "ai_tier": 0, "services": ["Data Mesh", "Data Governance", "Self-serve Analytics"]},
    {"name": "CodePilotAI", "industry": "AI Developer Tools", "description": "AI code generation and refactoring tools. Context-aware code completion engine.", "ai_tier": 2, "services": ["Code Generation", "Refactoring AI", "Code Completion"]},
    {"name": "SafeHarbor", "industry": "Privacy Tech", "description": "Privacy-preserving ML with differential privacy and federated learning. GDPR compliance tools.", "ai_tier": 2, "services": ["Differential Privacy", "Federated Learning", "GDPR Compliance"]},
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
    {"name": "Chris", "position": "Head of ML Engineering", "seniority": "Director", "department": "AI/ML"},
    {"name": "Nina", "position": "Principal Engineer", "seniority": "Principal", "department": "Engineering"},
    {"name": "Jordan", "position": "Engineering Lead", "seniority": "Lead", "department": "Engineering"},
    {"name": "Priya", "position": "Director of Data Science", "seniority": "Director", "department": "Data Science"},
    {"name": "Kevin", "position": "VP of Data", "seniority": "VP", "department": "Data"},
    {"name": "Sandra", "position": "Chief AI Officer", "seniority": "C-suite", "department": "AI/ML"},
    {"name": "Marcus", "position": "Co-founder & CTO", "seniority": "C-suite", "department": "Executive"},
    {"name": "Diana", "position": "Head of Infrastructure", "seniority": "Director", "department": "Infrastructure"},
    {"name": "Wei", "position": "Engineering Manager (ML)", "seniority": "Manager", "department": "AI/ML"},
    {"name": "Carlos", "position": "Senior ML Engineer", "seniority": "Senior", "department": "AI/ML"},
    {"name": "Fatima", "position": "Director of Product", "seniority": "Director", "department": "Product"},
    {"name": "Derek", "position": "Head of Backend Engineering", "seniority": "Director", "department": "Engineering"},
    {"name": "Yuki", "position": "Technical Program Manager", "seniority": "Senior", "department": "Program Management"},
]

EMAIL_TYPES = ["initial", "followup_1", "followup_2", "followup_3", "re_engage", "referral"]

SEQUENCE_LABELS = {
    "initial": "initial outreach",
    "followup_1": "first follow-up",
    "followup_2": "second follow-up",
    "followup_3": "final follow-up",
    "re_engage": "re-engagement after 3+ months",
    "referral": "referral-based introduction",
}

STYLE_VARIANTS = ["concise", "formal", "casual"]

# ── DeepSeek API ─────────────────────────────────────────────────────────────

DEEPSEEK_URL = os.environ.get("DEEPSEEK_API_URL", "https://api.deepseek.com/v1/chat/completions")


def call_deepseek(client: httpx.Client, api_key: str, user_prompt: str) -> str | None:
    """Call DeepSeek API and return the assistant content."""
    return call_deepseek_with_system(client, api_key, TEACHER_SYSTEM, user_prompt)


def call_deepseek_with_system(client: httpx.Client, api_key: str, system_prompt: str, user_prompt: str) -> str | None:
    """Call DeepSeek API with a custom system prompt and return the assistant content."""
    try:
        resp = client.post(
            DEEPSEEK_URL,
            headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
            json={
                "model": "deepseek-chat",
                "messages": [
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt},
                ],
                "temperature": 0.8,
                "max_tokens": 1024,
            },
            timeout=60.0,
        )
        resp.raise_for_status()
        data = resp.json()
        return data["choices"][0]["message"]["content"]
    except Exception as e:
        print(f"  API error: {e}", file=sys.stderr)
        return None


# ── Build scenario prompt ────────────────────────────────────────────────────


def build_scenario_prompt(company: dict, recipient: dict, email_type: str, style: str | None = None) -> str:
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
    elif email_type == "re_engage":
        parts.append("- Re-engagement after 3+ months of silence")
        parts.append("- Acknowledge time has passed, offer a new angle or reason to reconnect")
        parts.append("- 60-90 words")
    elif email_type == "referral":
        parts.append("- Email mentioning a mutual connection or referral")
        parts.append("- Lead with the referral, explain relevance briefly")
        parts.append("- 80-120 words")

    if style:
        style_instructions = {
            "concise": "STYLE: Write in a concise, direct style. Short sentences, no filler.",
            "formal": "STYLE: Write in a formal, professional style. Polished but not stiff.",
            "casual": "STYLE: Write in a casual, conversational style. Friendly and approachable.",
        }
        parts.append("")
        parts.append(style_instructions[style])

    return "\n".join(parts)


# ── Build training user message (student format) ────────────────────────────


def build_training_user_message(company: dict, recipient: dict, email_type: str, style: str | None = None) -> str:
    """Build the user message in the same format as export_email_data.py."""
    seq_label = SEQUENCE_LABELS[email_type]
    parts = [f"Write a {seq_label} email.", ""]

    parts.append("RECIPIENT:")
    parts.append(f"- Name: {recipient['name']}")
    parts.append(f"- Position: {recipient['position']}")
    parts.append(f"- Seniority: {recipient['seniority']}")
    if recipient.get("department"):
        parts.append(f"- Department: {recipient['department']}")
    parts.append("")

    # Sequence position context
    sequence_positions = {
        "initial": "1 of 4",
        "followup_1": "2 of 4",
        "followup_2": "3 of 4",
        "followup_3": "4 of 4",
        "re_engage": "re-engagement after 3 months",
        "referral": "referral introduction",
    }

    parts.append("COMPANY:")
    parts.append(f"- Name: {company['name']}")
    parts.append(f"- Industry: {company['industry']}")
    parts.append(f"- Description: {company['description'][:500]}")
    if company["ai_tier"] > 0:
        tier = {1: "AI-first", 2: "AI-native"}[company["ai_tier"]]
        parts.append(f"- AI tier: {tier}")
    if company.get("services"):
        parts.append(f"- Services: {', '.join(company['services'][:5])}")
    parts.append(f"- Email sequence position: {sequence_positions[email_type]}")
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
    elif email_type == "re_engage":
        parts.append("- Re-engagement after 3+ months of silence")
        parts.append("- Acknowledge time has passed, provide a new angle")
        parts.append("- 60-90 words")
    elif email_type == "referral":
        parts.append("- Referral-based introduction via mutual connection")
        parts.append("- Lead with the referral, keep it brief")
        parts.append("- 80-120 words")
    parts.append('- Use {{name}} placeholder for recipient name')

    if style:
        style_labels = {
            "concise": "Write in a concise, direct style.",
            "formal": "Write in a formal, professional style.",
            "casual": "Write in a casual, conversational style.",
        }
        parts.append(f"- Style: {style_labels[style]}")

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
        "re_engage": (40, 120),
        "referral": (60, 150),
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


def generate(count: int, out_dir: Path, dry_run: bool = False, neg_ratio: float = 0.1):
    api_key = os.environ.get("DEEPSEEK_API_KEY")
    if not api_key and not dry_run:
        print("ERROR: Set DEEPSEEK_API_KEY", file=sys.stderr)
        sys.exit(1)

    neg_count = int(count * neg_ratio)
    pos_count = count - neg_count

    # Build all scenarios
    random.seed(42)
    scenarios = []
    for company in COMPANIES:
        for recipient in RECIPIENTS:
            for email_type in EMAIL_TYPES:
                style = random.choice(STYLE_VARIANTS)
                scenarios.append((company, recipient, email_type, style, False))

    random.shuffle(scenarios)

    # Split into positive and negative pools
    pos_scenarios = scenarios[:]
    neg_scenarios = [(c, r, t, s, True) for c, r, t, s, _ in scenarios[:]]
    random.shuffle(neg_scenarios)

    # Limit to requested counts (with headroom for validation failures)
    pos_target = int(pos_count * 1.3)
    neg_target = int(neg_count * 1.5)  # more headroom for negatives (harder to validate)
    pos_scenarios = pos_scenarios[:pos_target]
    neg_scenarios = neg_scenarios[:neg_target]

    all_scenarios = pos_scenarios + neg_scenarios
    random.shuffle(all_scenarios)

    print(f"Generating {count} synthetic emails ({pos_count} positive + {neg_count} negative)")
    print(f"  {len(all_scenarios)} attempts with headroom...")
    if dry_run:
        print("DRY RUN — showing first 3 scenario prompts:")
        for i, (c, r, t, s, neg) in enumerate(all_scenarios[:3]):
            label = " [NEGATIVE]" if neg else ""
            print(f"\n--- Scenario {i+1}{label} (style: {s}) ---")
            print(build_scenario_prompt(c, r, t, style=s))
        return

    records = []
    pos_generated = 0
    neg_generated = 0
    failures = 0
    client = httpx.Client()

    try:
        for i, (company, recipient, email_type, style, is_negative) in enumerate(all_scenarios):
            if pos_generated >= pos_count and neg_generated >= neg_count:
                break
            if is_negative and neg_generated >= neg_count:
                continue
            if not is_negative and pos_generated >= pos_count:
                continue

            # Build teacher prompt
            teacher_prompt = build_scenario_prompt(company, recipient, email_type, style=style)

            # For negative examples, use the negative teacher system prompt
            if is_negative:
                raw = call_deepseek_with_system(client, api_key, TEACHER_SYSTEM_NEGATIVE, teacher_prompt)
            else:
                raw = call_deepseek(client, api_key, teacher_prompt)
            if not raw:
                failures += 1
                continue

            # Validate (negatives skip validation — they're intentionally bad)
            if is_negative:
                text = raw.strip()
                text = re.sub(r"^```(?:json)?\s*", "", text)
                text = re.sub(r"\s*```$", "", text)
                try:
                    email = json.loads(text.strip())
                    if not isinstance(email, dict) or not email.get("subject") or not email.get("body"):
                        failures += 1
                        continue
                except json.JSONDecodeError:
                    failures += 1
                    continue
            else:
                email = validate_email(raw, email_type)
                if not email:
                    failures += 1
                    if failures <= 5:
                        print(f"  validation failed (#{failures}): {raw[:100]}...", file=sys.stderr)
                    continue

            # Build training record (student format)
            user_msg = build_training_user_message(company, recipient, email_type, style=style)
            assistant_msg = f"<think>\n</think>\n{json.dumps(email, ensure_ascii=False)}"

            record = {
                "messages": [
                    {"role": "system", "content": TRAINING_SYSTEM},
                    {"role": "user", "content": user_msg},
                    {"role": "assistant", "content": assistant_msg},
                ]
            }
            if is_negative:
                record["_negative"] = True

            records.append(record)

            if is_negative:
                neg_generated += 1
            else:
                pos_generated += 1

            if (i + 1) % 50 == 0:
                total = pos_generated + neg_generated
                print(f"  progress: {total}/{count} generated ({pos_generated} pos, {neg_generated} neg, {failures} failures)")

            # Rate limit: ~2 req/sec
            time.sleep(0.5)

    finally:
        client.close()

    total = pos_generated + neg_generated
    print(f"\nGenerated: {total} valid emails ({pos_generated} positive, {neg_generated} negative, {failures} failures)")

    # Write to file
    path = out_dir / "outreach-email" / "synthetic.jsonl"
    path.parent.mkdir(parents=True, exist_ok=True)
    with open(path, "w") as f:
        for rec in records:
            f.write(json.dumps(rec, ensure_ascii=False) + "\n")
    print(f"Written to {path}")


def main():
    parser = argparse.ArgumentParser(description="Generate synthetic email training data")
    parser.add_argument("--count", type=int, default=1000, help="Number of emails to generate")
    parser.add_argument("--out-dir", type=Path, default=Path("mlx-training/data"))
    parser.add_argument("--dry-run", action="store_true", help="Show prompts only, don't call API")
    parser.add_argument("--neg-ratio", type=float, default=0.1, help="Fraction of negative examples (default 0.1)")
    args = parser.parse_args()

    generate(args.count, args.out_dir, args.dry_run, args.neg_ratio)


if __name__ == "__main__":
    main()
