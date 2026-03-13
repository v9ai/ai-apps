"use client";

import type { CSSProperties } from "react";
import { HowItWorks } from "@ai-apps/ui/how-it-works";
import { papers, researchStats, pipelineAgents, story } from "./data";

const rule: CSSProperties = {
  border: "none",
  borderTop: "1px solid var(--gray-a3, rgba(0,0,0,0.08))",
  margin: "2.5rem 0",
};

const code: CSSProperties = {
  background: "var(--gray-a2, rgba(0,0,0,0.04))",
  padding: "0.15em 0.4em",
  borderRadius: 4,
  fontSize: "0.92em",
};

export function HowItWorksClient() {
  return (
    <HowItWorks
      papers={papers}
      title="How It Works"
      subtitle="8 peer-reviewed papers. 7 clinical ratios. One trajectory pipeline that turns blood test snapshots into a health story."
      stats={researchStats}
      agents={pipelineAgents}
      story={story}
    >
      <hr style={rule} />
      <p style={{ color: "var(--gray-a8, rgba(0,0,0,0.5))", margin: "0 0 1rem" }}>
        The pipeline above covers what runs when you upload a blood test: PDF &rarr; markers &rarr;
        ratios &rarr; health vector &rarr; similarity &amp; velocity &rarr; LLM insights. The sections
        below go deeper into each layer — from infrastructure to evaluation.
      </p>

      <h3 style={{ fontSize: "1.25rem", fontWeight: 600, margin: "2rem 0 0.75rem" }}>
        System Architecture
      </h3>
      <p>
        Every architectural choice serves one goal: keep health data secure while making trajectory
        analysis fast. Next.js App Router (React 19) with TypeScript deploys on Vercel, and
        Supabase serves as the entire backend: Postgres for structured data and embeddings, Auth for
        signup/login/password reset with email confirmation, and Storage for PDF uploads. Every table
        is protected by Row Level Security enforced via <code style={code}>auth.uid() = user_id</code>, ensuring
        complete data isolation between users. The pgvector extension stores 1024-dimensional health
        vectors with HNSW (Hierarchical Navigable Small World) indexing for sub-linear approximate
        nearest neighbor search. LLM analysis uses Qwen Plus via the DashScope OpenAI-compatible
        endpoint, and embeddings use Qwen text-embedding-v4 (1024 dimensions) through the same API.
      </p>

      <hr style={rule} />

      <h3 style={{ fontSize: "1.25rem", fontWeight: 600, margin: "0 0 0.75rem" }}>
        Database Design
      </h3>
      <p>
        Trajectory analysis only works if "find similar health states" is a fast query, not a
        full table scan — so the database is built around vectors from the ground up. The pgvector
        extension stores 1024-dimensional vectors in the{" "}
        <code style={code}>health_state_embeddings</code> table, indexed with HNSW using{" "}
        <code style={code}>vector_cosine_ops</code> for fast approximate nearest neighbor queries. A{" "}
        <code style={code}>derived_metrics</code> JSONB column stores all 7 computed ratios alongside the
        embedding — avoiding re-computation at query time. The schema evolved across 16 SQL
        migrations: from <code style={code}>blood_tests</code>/<code style={code}>blood_markers</code> to test embeddings
        (1536-dim) to health state embeddings (1024-dim) with trajectory RPCs. Key Postgres
        functions include <code style={code}>get_health_trajectory_with_similarity()</code> for cosine-based
        trajectory timelines, <code style={code}>hybrid_search_markers()</code> combining full-text and vector
        search, <code style={code}>match_health_states()</code>, <code style={code}>match_conditions()</code>, and{" "}
        <code style={code}>match_medications()</code> for multi-modal retrieval. Row Level Security on every
        table enforces <code style={code}>auth.uid() = user_id</code>, ensuring complete data isolation.
      </p>

      <hr style={rule} />

      <h3 style={{ fontSize: "1.25rem", fontWeight: 600, margin: "0 0 0.75rem" }}>
        PDF Processing Pipeline
      </h3>
      <p>
        Lab reports come in dozens of formats — structured HTML tables, European key-value pairs,
        free-text narratives — and the parser handles them all. Unstructured.io with HiRes strategy
        performs document parsing and OCR, then a three-tier parser fallback takes over: first, HTML table extraction
        via regex for structured reports; second, European FormKeysValues pair parsing for continental
        lab formats; third, free-text pattern matching for unstructured reports. Alias-based marker
        resolution uses a case-insensitive <code style={code}>MARKER_ALIAS_MAP</code> to normalize variations
        like &ldquo;Trigliceride&rdquo; to &ldquo;Triglycerides&rdquo;.{" "}
        <code style={code}>computeFlag()</code> automatically classifies markers as normal, low, or high by
        parsing reference ranges (handling <code style={code}>&lt;</code>, <code style={code}>&gt;</code>, and dash ranges).
        Deduplication by marker name and HTML stripping handle PDFs with embedded markup. Files are
        uploaded to a Supabase Storage bucket at{" "}
        <code style={code}>blood-tests/&#123;user_id&#125;/&#123;timestamp&#125;_&#123;filename&#125;</code>.
      </p>

      <hr style={rule} />

      <h3 style={{ fontSize: "1.25rem", fontWeight: 600, margin: "0 0 0.75rem" }}>
        Clinical Ratio Engine
      </h3>
      <p>
        Raw biomarker values alone miss the story — ratios between markers reveal metabolic
        patterns that individual numbers cannot. Seven derived metrics are computed by{" "}
        <code style={code}>computeDerivedMetrics()</code>, each with peer-reviewed thresholds stored in{" "}
        <code style={code}>METRIC_REFERENCES</code>. TG/HDL (Triglycerides
        divided by HDL): optimal below 2.0, borderline 2.0–3.5 (McLaughlin et al. 2003). NLR
        (Neutrophils divided by Lymphocytes): optimal 1.0–3.0, borderline 3.0–5.0 (Forget et al.
        2017). De Ritis ratio (AST divided by ALT): optimal 0.8–1.2, borderline 1.2–2.0 (De Ritis
        1957; Botros &amp; Sikaris 2013). BUN/Creatinine: optimal 10–20, borderline 20–25 (Hosten
        1990). TC/HDL: optimal below 4.5, borderline 4.5–5.5 (Millan et al. 2009). HDL/LDL: optimal
        0.4 or above, borderline 0.3–0.4 (Castelli 1996). TyG Index (log base 10 of TG times
        Glucose times 0.5): optimal below 8.5, borderline 8.5–9.0 (Simental-Mendia 2008).{" "}
        <code style={code}>classifyMetricRisk()</code> maps each value to optimal, borderline, elevated, or low.
        Direction interpretation is range-aware: NLR, BUN/Creatinine, and De Ritis are measured by
        distance to optimal midpoint; HDL/LDL is higher-is-better; TC/HDL, TG/HDL, and TyG are
        lower-is-better.
      </p>

      <hr style={rule} />

      <h3 style={{ fontSize: "1.25rem", fontWeight: 600, margin: "0 0 0.75rem" }}>
        Security &amp; Privacy
      </h3>
      <p>
        Health data demands zero-trust isolation — a bug in application code should never be
        the only thing standing between one user&rsquo;s labs and another&rsquo;s. Row Level Security
        on every Supabase table enforces{" "}
        <code style={code}>auth.uid() = user_id</code> at the database level, so no user can read or write
        another user&rsquo;s health data regardless of what happens in the app layer. Supabase Auth
        handles signup, login, and password reset with email confirmation. Storage bucket isolation ensures PDFs are stored at{" "}
        <code style={code}>&#123;user_id&#125;/&#123;timestamp&#125;_&#123;filename&#125;</code> with RLS on{" "}
        <code style={code}>storage.objects</code>. No health data leaves the Supabase project boundary:
        embeddings, metrics, and analysis results all stay in the same Postgres instance. All LLM
        calls include a disclaimer that this is not medical advice and users should consult their
        doctor.
      </p>

      <hr style={rule} />

      <h3 style={{ fontSize: "1.25rem", fontWeight: 600, margin: "0 0 0.75rem" }}>
        Search and Retrieval
      </h3>
      <p>
        A useful health answer needs context from everywhere — labs, medications, symptoms,
        conditions — not just the single table that matches a keyword. The Q&amp;A system uses
        multi-modal RAG: <code style={code}>askHealthQuestion()</code> runs 6 parallel pgvector searches across
        tests, markers, conditions, medications, symptoms, and appointments. Hybrid marker search uses a PostgreSQL function{" "}
        <code style={code}>hybrid_search_markers()</code> that combines <code style={code}>ts_rank</code> full-text search
        (0.3 weight) with vector cosine similarity (0.7 weight) for best-of-both-worlds retrieval.
        Marker trend detection via <code style={code}>find_similar_markers_over_time()</code> enables longitudinal
        tracking of individual biomarkers across panels. The health QA system prompt cross-references
        symptoms with lab results, considers medication interactions, and never diagnoses — it
        highlights patterns and suggests questions for your doctor.
      </p>

      <hr style={rule} />

      <h3 style={{ fontSize: "1.25rem", fontWeight: 600, margin: "0 0 0.75rem" }}>
        Evaluation Pipeline
      </h3>
      <p>
        When the output is a health trajectory interpretation, "it looks about right" is not
        good enough — every risk classification and directional claim needs automated
        verification. Two evaluation frameworks cover the pipeline: Promptfoo for individual prompt
        testing (health QA responses) and Braintrust for end-to-end trajectory evaluation across 15
        test cases. Four
        custom scorers validate output quality: RiskClassification verifies metric risk tiers against{" "}
        <code style={code}>METRIC_REFERENCES</code>, TrajectoryDirection checks improving/stable/deteriorating
        labels against computed velocity, ClinicalFactuality regex-validates threshold claims against
        21 patterns with citations, plus Factuality and Relevance autoevals. The eval task mirrors{" "}
        <code style={code}>getTrajectoryInsights()</code> exactly — same system prompt, same metric context, same
        velocity computation. Test cases cover improving cholesterol, deteriorating inflammation,
        mixed metabolic profiles, all-optimal baselines, velocity acceleration scenarios, and
        boundary threshold edge cases.
      </p>

      <hr style={rule} />

      <h3 style={{ fontSize: "1.25rem", fontWeight: 600, margin: "0 0 0.75rem" }}>
        Deployment &amp; Infrastructure
      </h3>
      <p>
        Shipping fast means sharing code — the healthcare app, the law-adversarial app, and the
        shared UI library all live in one repository and deploy independently. The pnpm monorepo
        uses Turborepo for task orchestration, and a shared <code style={code}>@ai-apps/ui</code> package
        (including this how-it-works component) is built with bunchee and consumed by both apps. Vercel
        deployment uses Next.js App Router (React 19) with automatic ISR for static pages —{" "}
        <code style={code}>/how-it-works</code> is prerendered at build time. Environment configuration requires{" "}
        <code style={code}>DASHSCOPE_API_KEY</code> for Qwen LLM and embeddings,{" "}
        <code style={code}>UNSTRUCTURED_API_KEY</code> for PDF parsing, and Supabase project URL, anon key, and
        service role key. Local development uses the Supabase CLI with migrations tracked in{" "}
        <code style={code}>supabase/migrations/</code>.
      </p>
    </HowItWorks>
  );
}
