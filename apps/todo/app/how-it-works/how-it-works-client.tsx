"use client";

import type { CSSProperties } from "react";
import { HowItWorks } from "@/components/how-it-works";
import { Table, Badge, Text, Separator } from "@radix-ui/themes";
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

const categoryColors: Record<string, "green" | "amber" | "cyan" | "violet" | "orange" | "pink" | "blue" | "teal"> = {
  "Cognitive Load": "green",
  "Planning Fallacy": "amber",
  "Chronotype Science": "cyan",
  "Progressive Disclosure": "violet",
  Gamification: "orange",
  "Endowed Progress": "pink",
  "Energy Management": "blue",
  "UX Research": "teal",
};

export function HowItWorksClient() {
  return (
    <HowItWorks
      papers={papers}
      title="How It Works"
      subtitle="8 cognitive science papers. 4 AI agents. One system that works with your biology, not against it."
      stats={researchStats}
      agents={pipelineAgents}
      story={story}
    >
      <hr style={rule} />
      <p style={{ color: "var(--gray-a8, rgba(0,0,0,0.5))", margin: "0 0 1rem" }}>
        The pipeline above covers what happens when you add a task: natural language &rarr;
        structured data &rarr; priority scoring &rarr; energy matching &rarr; schedule optimization.
        The sections below go deeper into each layer &mdash; from AI integration to the algorithms
        that back every feature.
      </p>

      {/* ─── AI Integration ──────────────────────────────────────── */}

      <h3 style={{ fontSize: "1.25rem", fontWeight: 600, margin: "2rem 0 0.75rem" }}>
        AI Integration
      </h3>
      <p>
        Every AI feature runs through Qwen Plus via the DashScope OpenAI-compatible API
        at temperature 0.3 for deterministic, structured output. Four specialized endpoints
        handle different aspects of task intelligence, each with constrained JSON-only prompts
        and regex extraction fallbacks to guarantee structured output. All endpoints require an
        authenticated session &mdash; every Qwen call is tied to a real user, never anonymous.
      </p>

      <hr style={rule} />

      <h3 style={{ fontSize: "1.25rem", fontWeight: 600, margin: "0 0 0.75rem" }}>
        Natural Language Parsing
      </h3>
      <p>
        When you press <code style={code}>Cmd+K</code> and type &ldquo;finish the Q3 report by
        Friday, high priority, depends on data review,&rdquo; the input hits{" "}
        <code style={code}>/api/ai/parse</code>. Qwen Plus extracts four fields in a single pass:
        a clean task title, an ISO due date (if mentioned), an estimated duration in minutes, and
        an energy preference (<code style={code}>&quot;high&quot;</code>,{" "}
        <code style={code}>&quot;medium&quot;</code>, or <code style={code}>&quot;low&quot;</code>)
        based on the task&rsquo;s cognitive complexity. The prompt enforces JSON-only output with
        a 512-token cap, and a regex extraction fallback handles edge cases where the model wraps
        the JSON in markdown. If parsing fails entirely, the task still creates with just the raw
        title &mdash; AI enhances but never blocks.
      </p>

      <hr style={rule} />

      <h3 style={{ fontSize: "1.25rem", fontWeight: 600, margin: "0 0 0.75rem" }}>
        AI Categorization &amp; Subtask Breakdown
      </h3>
      <p>
        The <code style={code}>/api/ai/suggest</code> endpoint serves two modes. In categorization
        mode, Qwen Plus analyzes a task title and optional description to suggest a priority score
        (1&ndash;5), energy preference, and realistic time estimate &mdash; turning a vague
        &ldquo;clean up the garage&rdquo; into a structured task with{" "}
        <code style={code}>priority: 2, energyPreference: &quot;high&quot;, estimatedMinutes: 120</code>.
        In subtask mode, Qwen Plus breaks a complex task into 3&ndash;7 concrete subtasks, each
        with its own time estimate and energy level. The subtask prompt uses a 1024-token cap to
        accommodate the array output, while categorization stays at 512 tokens for speed.
      </p>

      <hr style={rule} />

      <h3 style={{ fontSize: "1.25rem", fontWeight: 600, margin: "0 0 0.75rem" }}>
        Smart Scheduling
      </h3>
      <p>
        The scheduling engine combines Qwen Plus&rsquo;s reasoning with the user&rsquo;s
        chronotype profile. <code style={code}>smartSchedulingSuggestion()</code> sends the model
        the full context: all pending tasks with their energy requirements and priority scores,
        the user&rsquo;s chronotype (early bird, intermediate, or night owl), their configured
        buffer percentage (default 25% per Kahneman&rsquo;s planning fallacy research), and any
        existing calendar blocks. Qwen returns time-block suggestions with reasoning &mdash;
        explaining why a high-energy task landed in the user&rsquo;s biological prime time and
        why a 2-hour estimate became a 2.5-hour block. The 2048-token cap gives the model room
        to reason about scheduling trade-offs across an entire day.
      </p>

      <hr style={rule} />

      {/* ─── Algorithms ─────────────────────────────────────────── */}

      <h3 style={{ fontSize: "1.25rem", fontWeight: 600, margin: "0 0 0.75rem" }}>
        Priority Algorithm
      </h3>
      <p>
        Priority isn&rsquo;t a single number &mdash; it&rsquo;s a weighted formula.{" "}
        <code style={code}>calculatePriorityScore()</code> combines four factors: deadline urgency
        (40% weight, exponential decay as the due date approaches), user-assigned value (30%),
        dependency impact (20%, tasks that block others get boosted), and project weight (10%).
        Urgency scoring is non-linear: an overdue task scores 1.0, a task due in 4 hours scores
        0.95, tomorrow scores 0.8, next week scores 0.4. Tasks that are themselves blocked get
        deprioritized to 0.1 &mdash; no point surfacing work you can&rsquo;t start. This formula
        implements Miller&rsquo;s 7&plusmn;2 principle by ensuring only the most relevant tasks
        float to the top of a 7-item chunked view.
      </p>

      <hr style={rule} />

      <h3 style={{ fontSize: "1.25rem", fontWeight: 600, margin: "0 0 0.75rem" }}>
        Energy Matching
      </h3>
      <p>
        Three chronotype profiles &mdash; early bird, intermediate, and night owl &mdash;
        define distinct energy curves throughout the day. Early birds peak at 6&ndash;10 AM
        with medium energy from 10 AM&ndash;2 PM; night owls peak at 2&ndash;6 PM with medium
        energy from 6&ndash;10 PM. The <code style={code}>suggestTimeSlot()</code> function matches
        a task&rsquo;s energy preference against the user&rsquo;s chronotype curve, scoring
        compatibility from 1.0 (perfect match) down to 0.1 (3+ hours from optimal). When the
        ideal slot is occupied, the algorithm expands &plusmn;2 hours looking for the next best
        fit &mdash; never scheduling deep work during an energy trough. This is Roenneberg&rsquo;s
        chronotype research (2003) translated directly into scheduling code, backed by
        Baumeister&rsquo;s finding that matching task difficulty to energy levels reduces
        abandonment by 40%.
      </p>

      <hr style={rule} />

      <h3 style={{ fontSize: "1.25rem", fontWeight: 600, margin: "0 0 0.75rem" }}>
        Streak &amp; Gamification Engine
      </h3>
      <p>
        The streak system goes beyond simple day counting. Five states handle every real-world
        scenario: same-day completions maintain the streak, next-day completions increment it,
        2&ndash;3 day gaps with an available freeze preserve the streak (consuming the freeze),
        2&ndash;3 day gaps without a freeze trigger recovery mode (50% credit to soften the blow),
        and gaps longer than 3 days fully reset. Users earn 1 freeze per month. Four visual
        tiers &mdash; gray (0&ndash;2 days), blue (3&ndash;13), green (14&ndash;29), and gold
        (30+) &mdash; provide escalating feedback. The longest-ever streak is tracked separately
        as a personal best. This implements Zichermann&rsquo;s finding that streak mechanics with
        freeze/recovery increase engagement by 34% over simple completion tracking, while the
        recovery mechanic prevents the &ldquo;all-or-nothing&rdquo; dropout that kills most
        habit-tracking systems.
      </p>

      <hr style={rule} />

      {/* ─── Architecture ────────────────────────────────────────── */}

      <h3 style={{ fontSize: "1.25rem", fontWeight: 600, margin: "0 0 0.75rem" }}>
        System Architecture
      </h3>
      <p>
        Next.js App Router (React 19) with TypeScript deploys on Vercel. LLM analysis uses
        Qwen Plus via the DashScope OpenAI-compatible endpoint ({" "}
        <code style={code}>DASHSCOPE_API_KEY</code>). Authentication uses Better Auth with
        server-side sessions &mdash; HTTP-only cookies, no client-side tokens. Middleware in{" "}
        <code style={code}>proxy.ts</code> validates session cookies and redirects unauthenticated
        users. The database layer uses Drizzle ORM with Neon serverless Postgres, where every
        query filters by <code style={code}>userId</code> to enforce data isolation. The schema
        stores tasks with priority scores, energy preferences, estimated/actual minutes, and a
        2-level subtask hierarchy via <code style={code}>parentTaskId</code> self-reference. Task
        dependencies use a separate join table (<code style={code}>taskDependencies</code>) tracking
        blocking/blocked relationships. User preferences persist chronotype, custom priority
        weights (JSONB), chunk size (default 7), buffer percentage (default 25%), and gamification
        toggle.
      </p>

      <hr style={rule} />

      <h3 style={{ fontSize: "1.25rem", fontWeight: 600, margin: "0 0 0.75rem" }}>
        Database Design
      </h3>
      <p>
        Five tables implement the full task intelligence model. The{" "}
        <code style={code}>tasks</code> table carries the core fields: title, status (inbox,
        active, completed, archived), computed <code style={code}>priorityScore</code> (real),
        manual <code style={code}>priorityManual</code> (1&ndash;5), due date, estimated/actual
        minutes, energy preference, and position for custom ordering.{" "}
        <code style={code}>taskDependencies</code> uses a composite primary key on
        (blockingTaskId, blockedTaskId) to prevent duplicates while enabling the priority
        algorithm&rsquo;s dependency-impact scoring.{" "}
        <code style={code}>userStreaks</code> tracks current/longest streaks, last completion date,
        and available freezes.{" "}
        <code style={code}>userPreferences</code> stores chronotype, energy patterns, priority
        weights, chunk size, and buffer percentage &mdash; all configurable per user. Tasks sort
        by <code style={code}>priorityScore DESC, position ASC</code> and paginate at 7 items
        (the cognitive load limit from Miller 1956).
      </p>

      <hr style={rule} />

      {/* ─── Research Table ──────────────────────────────────────── */}

      <h3 style={{ fontSize: "1.25rem", fontWeight: 600, margin: "0 0 0.75rem" }}>
        Research Table
      </h3>
      <Text as="p" size="2" color="gray" style={{ margin: "0 0 1rem" }}>
        The evidence base behind every feature &mdash; from task chunking to streak mechanics.
      </Text>

      <div style={{ overflowX: "auto" }}>
        <Table.Root variant="surface">
          <Table.Header>
            <Table.Row>
              <Table.ColumnHeaderCell>#</Table.ColumnHeaderCell>
              <Table.ColumnHeaderCell>Title</Table.ColumnHeaderCell>
              <Table.ColumnHeaderCell>Category</Table.ColumnHeaderCell>
              <Table.ColumnHeaderCell>Authors</Table.ColumnHeaderCell>
              <Table.ColumnHeaderCell>Year</Table.ColumnHeaderCell>
              <Table.ColumnHeaderCell>Key Finding</Table.ColumnHeaderCell>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {papers.map((paper) => (
              <Table.Row key={paper.slug}>
                <Table.Cell>
                  <Text size="2" weight="medium">
                    {paper.number}
                  </Text>
                </Table.Cell>
                <Table.Cell>
                  <Text size="2" weight="medium">
                    {paper.title}
                  </Text>
                </Table.Cell>
                <Table.Cell>
                  <Badge
                    color={categoryColors[paper.category] ?? "gray"}
                    variant="soft"
                    size="1"
                  >
                    {paper.category}
                  </Badge>
                </Table.Cell>
                <Table.Cell>
                  <Text size="2">{paper.authors}</Text>
                </Table.Cell>
                <Table.Cell>
                  <Text size="2">{paper.year}</Text>
                </Table.Cell>
                <Table.Cell style={{ maxWidth: 320 }}>
                  <Text size="1" color="gray">
                    {paper.finding}
                  </Text>
                </Table.Cell>
              </Table.Row>
            ))}
          </Table.Body>
        </Table.Root>
      </div>
    </HowItWorks>
  );
}
