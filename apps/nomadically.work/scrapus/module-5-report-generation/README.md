# Module 5: Report Generation via LLM Summarization (Local)

## Purpose

Generate concise lead reports by pulling facts from SQLite and context from
ChromaDB, constructing a grounded prompt, and calling GPT-4 (or a local LLM).

---

## Data Assembly

```python
def assemble_lead_data(company_id: int) -> dict:
    conn = sqlite3.connect("scrapus_data/scrapus.db")

    # 1. Core profile from SQLite
    company = conn.execute(
        "SELECT * FROM companies WHERE id = ?", (company_id,)
    ).fetchone()

    # 2. All facts from SQLite
    facts = conn.execute(
        "SELECT fact_type, fact_text FROM company_facts WHERE company_id = ?",
        (company_id,)
    ).fetchall()

    # 3. Key people from SQLite
    people = conn.execute(
        "SELECT name, role FROM persons WHERE company_id = ?",
        (company_id,)
    ).fetchall()

    # 4. Explanation from matching stage (SQLite)
    explanation = conn.execute(
        "SELECT top_factors FROM lead_explanations WHERE company_id = ?",
        (company_id,)
    ).fetchone()

    # 5. Related page content from ChromaDB (for richer context)
    chroma_client = chromadb.PersistentClient(path="scrapus_data/chromadb")
    pages = chroma_client.get_collection("page_documents")
    related = pages.query(
        query_texts=[company["name"]],
        n_results=3,
        where={"has_org_entity": True}
    )

    return {
        "company": company,
        "facts": facts,
        "people": people,
        "match_reasons": json.loads(explanation["top_factors"]),
        "source_snippets": related["documents"][0]
    }
```

## Prompt Construction

```python
def build_prompt(lead_data: dict) -> str:
    c = lead_data["company"]
    facts_str = "\n".join(f"- {f['fact_text']}" for f in lead_data["facts"])
    people_str = ", ".join(f"{p['name']} ({p['role']})" for p in lead_data["people"])
    reasons = "; ".join(r["factor"] for r in lead_data["match_reasons"])

    return f"""Generate a brief lead summary for the following company:
- Name: {c['name']}
- Industry: {c['industry']}
- Location: {c['location']}
- Founded: {c['founded_year']}, ~{c['employee_count']} employees
- Key people: {people_str}
- Recent events:
{facts_str}
- Why this is a lead: {reasons}

Write 3-4 sentences highlighting who {c['name']} is, recent notable
events, and why it's a good sales prospect. Only use the provided
information. Do not introduce new facts."""
```

## LLM Calling -- Two Options

### Option A: OpenAI API (original)

```python
import openai

def generate_summary_openai(prompt: str) -> str:
    response = openai.chat.completions.create(
        model="gpt-4",
        messages=[
            {"role": "system", "content": "You are a B2B sales analyst. "
             "Write concise, factual lead summaries in a professional tone. "
             "Only use facts provided in the user message."},
            {"role": "user", "content": prompt}
        ],
        max_tokens=200,
        temperature=0.3
    )
    return response.choices[0].message.content
```

### Option B: Local LLM via Ollama (fully offline)

```python
import requests

def generate_summary_local(prompt: str) -> str:
    response = requests.post("http://localhost:11434/api/generate", json={
        "model": "llama3.1:8b",
        "prompt": prompt,
        "system": "You are a B2B sales analyst. Write concise, factual "
                  "lead summaries. Only use facts provided.",
        "options": {"temperature": 0.3, "num_predict": 200}
    })
    return response.json()["response"]
```

## Output Storage -- SQLite

```sql
CREATE TABLE lead_reports (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    company_id INTEGER REFERENCES companies(id),
    summary_text TEXT,
    model_used TEXT,          -- 'gpt-4', 'llama3.1:8b', 'gemini-1.5'
    prompt_text TEXT,         -- full prompt for reproducibility
    fact_count INTEGER,       -- how many facts were in prompt
    word_count INTEGER,
    created_at REAL
);
```

## Example Output

> **Acme Corp** -- A mid-sized cybersecurity company based in Berlin. Acme
> recently launched an AI-driven threat detection platform and expanded its
> engineering team by 50% this year. These developments, along with a
> successful $10M funding round in 2023, suggest rapid growth. Acme's focus
> on AI solutions in cybersecurity aligns with the target profile for
> AI-based software providers in Europe.

## Quality Results

| Metric                            | GPT-4 | Extractive |
|-----------------------------------|-------|------------|
| User satisfaction (>= satisfactory)| 92%   | 72%        |
| Average rating                    | 4.6/5 | 3.9/5      |
| Factual accuracy                  | 97%   | --         |
| Average length                    | ~60 words | ~100 words |

## ChromaDB's Role in Summarization

ChromaDB provides supplementary context that SQLite facts alone might miss.
If the KG has sparse facts about a company, querying ChromaDB for similar
page documents can surface additional context:

```python
similar_companies = company_collection.query(
    query_embeddings=[company_embedding],
    n_results=5,
    where={"industry": {"$eq": "cybersecurity"}}
)
```

This is optional enrichment -- the core summary always relies on SQLite facts
to maintain factual grounding. ChromaDB context is passed to the LLM as
"background" only if the fact count is below a threshold (e.g., < 3 facts).
