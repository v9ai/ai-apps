"""Local filesystem persistence via LlamaIndex StorageContext.

Stores workflow outputs (interview prep reports, tech knowledge lessons) as
LlamaIndex Documents in a local SimpleDocumentStore + SimpleVectorStore.
Data persists to `llamaindex/.storage/` and can be reloaded across runs.
"""

import os

from llama_index.core import Document, StorageContext, load_index_from_storage
from llama_index.core.storage.docstore import SimpleDocumentStore
from llama_index.core.storage.index_store import SimpleIndexStore
from llama_index.core.vector_stores import SimpleVectorStore

STORAGE_DIR = os.path.join(os.path.dirname(__file__), "..", ".storage")


def _ensure_dir() -> str:
    path = os.path.normpath(STORAGE_DIR)
    os.makedirs(path, exist_ok=True)
    return path


def get_storage_context() -> StorageContext:
    """Load existing StorageContext from disk, or create a new one."""
    persist_dir = _ensure_dir()
    try:
        return StorageContext.from_defaults(persist_dir=persist_dir)
    except (FileNotFoundError, ValueError):
        return StorageContext.from_defaults(
            docstore=SimpleDocumentStore(),
            vector_store=SimpleVectorStore(),
            index_store=SimpleIndexStore(),
        )


def persist(storage_context: StorageContext) -> None:
    """Write storage to local filesystem."""
    persist_dir = _ensure_dir()
    storage_context.persist(persist_dir=persist_dir)
    print(f"  Persisted storage to {persist_dir}")


def store_interview_prep(
    application_id: int,
    job_title: str,
    company_name: str,
    report: str,
    parsed: dict,
    question_sets: list[dict],
) -> None:
    """Store an interview prep report as a LlamaIndex Document."""
    import json

    doc_id = f"interview-prep-{application_id}"
    doc = Document(
        doc_id=doc_id,
        text=report,
        metadata={
            "type": "interview_prep",
            "application_id": application_id,
            "job_title": job_title,
            "company_name": company_name,
            "role_type": parsed.get("role_type", ""),
            "seniority": parsed.get("seniority", ""),
            "tech_stack": json.dumps(parsed.get("tech_stack", [])),
            "categories": json.dumps([qs["category"] for qs in question_sets]),
            "total_questions": sum(len(qs["qa_pairs"]) for qs in question_sets),
        },
    )

    ctx = get_storage_context()
    ctx.docstore.add_documents([doc], allow_update=True)
    persist(ctx)
    print(f"  Stored interview prep doc: {doc_id} ({len(report)} chars)")


def store_tech_knowledge(
    application_id: int,
    job_title: str,
    company_name: str,
    technologies: list[dict],
    generated: list[dict],
) -> None:
    """Store tech knowledge lessons as LlamaIndex Documents (one per technology)."""
    import json

    ctx = get_storage_context()
    docs = []

    # Summary document
    summary_id = f"tech-knowledge-{application_id}"
    docs.append(Document(
        doc_id=summary_id,
        text=json.dumps({
            "technologies": technologies,
            "lessons_count": len(generated),
        }, indent=2),
        metadata={
            "type": "tech_knowledge_summary",
            "application_id": application_id,
            "job_title": job_title,
            "company_name": company_name,
            "tech_count": len(technologies),
            "lessons_count": len(generated),
        },
    ))

    # One document per lesson
    for g in generated:
        doc_id = f"tech-lesson-{application_id}-{g['tag']}"
        docs.append(Document(
            doc_id=doc_id,
            text=g["content"],
            metadata={
                "type": "tech_lesson",
                "application_id": application_id,
                "job_title": job_title,
                "company_name": company_name,
                "tag": g["tag"],
                "label": g["label"],
                "category": g["category"],
                "word_count": g["word_count"],
            },
        ))

    ctx.docstore.add_documents(docs, allow_update=True)
    persist(ctx)
    print(f"  Stored {len(docs)} docs to local storage (1 summary + {len(generated)} lessons)")
