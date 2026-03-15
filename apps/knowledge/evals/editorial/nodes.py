"""Node functions for the journalism editorial graph."""

from langchain_core.messages import HumanMessage, SystemMessage

from editorial.models import build_fast, build_reasoner
from editorial.prompts import (
    journalism_editor,
    journalism_intro_strategist,
    journalism_researcher,
    journalism_seo,
    journalism_writer,
)
from editorial.state import JournalismState


def research_entry_node(state: JournalismState) -> dict:
    """Passthrough node for fan-out to researcher and seo."""
    return {}


def researcher_node(state: JournalismState) -> dict:
    """Research the topic using the reasoner model."""
    llm = build_reasoner()
    messages = [
        SystemMessage(content=journalism_researcher(state["topic"])),
        HumanMessage(content=f"Research this topic: {state['topic']}"),
    ]
    response = llm.invoke(messages)
    return {"research": response.content}


def seo_node(state: JournalismState) -> dict:
    """Produce SEO strategy using the fast model."""
    llm = build_fast()
    messages = [
        SystemMessage(content=journalism_seo(state["topic"])),
        HumanMessage(content=f"Analyze SEO strategy for: {state['topic']}"),
    ]
    response = llm.invoke(messages)
    return {"seo": response.content}


def intro_strategist_node(state: JournalismState) -> dict:
    """Design intro hook strategies using the fast model."""
    llm = build_fast()
    messages = [
        SystemMessage(content=journalism_intro_strategist(state["topic"])),
        HumanMessage(content=f"Design intro strategies for: {state['topic']}"),
    ]
    response = llm.invoke(messages)
    return {"intro_strategy": response.content}


def writer_node(state: JournalismState) -> dict:
    """Write or revise a draft based on research + SEO + editor feedback."""
    llm = build_reasoner()

    if state.get("editor_output") and not state.get("approved"):
        # Revision path — feed editor notes back (pipeline.rs:510-515)
        user_content = (
            f"## Revision Notes from Editor\n\n{state['editor_output']}\n\n---\n\n"
            f"## Original Research Brief\n\n{state['research']}\n\n---\n\n"
            f"## SEO Strategy\n\n{state['seo']}\n\n---\n\n"
            f"## Intro Strategy\n\n{state.get('intro_strategy', '')}\n\n---\n\n"
            f"## Previous Draft (revise this, don't start from scratch)\n\n{state['draft']}"
        )
    else:
        # First draft path (pipeline.rs:456)
        user_content = (
            f"## Research Brief\n\n{state['research']}\n\n---\n\n"
            f"## SEO Strategy\n\n{state['seo']}\n\n---\n\n"
            f"## Intro Strategy\n\n{state.get('intro_strategy', '')}"
        )

    messages = [
        SystemMessage(content=journalism_writer()),
        HumanMessage(content=user_content),
    ]
    response = llm.invoke(messages)
    return {"draft": response.content}


def editor_node(state: JournalismState) -> dict:
    """Review the draft and decide APPROVE or REVISE."""
    llm = build_reasoner()

    # Input format from pipeline.rs:481-483
    user_content = (
        f"## Draft\n\n{state['draft']}\n\n---\n\n"
        f"## Research Brief\n\n{state['research']}\n\n---\n\n"
        f"## SEO Strategy\n\n{state['seo']}"
    )

    messages = [
        SystemMessage(content=journalism_editor()),
        HumanMessage(content=user_content),
    ]
    response = llm.invoke(messages)
    content = response.content

    # Parse decision (pipeline.rs:487-488)
    approved = "APPROVE" in content or "status: published" in content
    decision = "approve" if approved else "revise"

    return {
        "editor_output": content,
        "editor_decision": decision,
        "revision_rounds": state.get("revision_rounds", 0) + 1,
        "approved": approved,
    }
