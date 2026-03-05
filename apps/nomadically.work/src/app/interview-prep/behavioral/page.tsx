"use client";

import { useState } from "react";
import {
  Container,
  Heading,
  Text,
  Flex,
  Card,
  Box,
  Button,
  Badge,
} from "@radix-ui/themes";

// ── Data ─────────────────────────────────────────────────────────────

interface BehavioralQuestion {
  id: string;
  question: string;
  starHints: {
    situation: string;
    task: string;
    action: string;
    result: string;
  };
  lookingFor: string[];
}

interface Category {
  id: string;
  name: string;
  emoji: string;
  description: string;
  questions: BehavioralQuestion[];
}

const CATEGORIES: Category[] = [
  {
    id: "leadership",
    name: "Leadership & Initiative",
    emoji: "🚀",
    description:
      "Demonstrate ownership, proactive decision-making, and the ability to drive outcomes without being told.",
    questions: [
      {
        id: "l-1",
        question:
          "Tell me about a time you led a project or initiative that wasn't part of your job description.",
        starHints: {
          situation:
            "Set the scene: what gap or opportunity did you notice? Why wasn't anyone else addressing it?",
          task: "What did you decide to take on, and what was the expected outcome?",
          action:
            "How did you rally support, plan the work, and execute? Emphasize decisions YOU made.",
          result:
            "Quantify the impact. What changed because you stepped up? What did you learn about leading without authority?",
        },
        lookingFor: [
          "Self-starter mentality — identifies problems proactively",
          "Ability to influence without formal authority",
          "Structured approach to ambiguous situations",
          "Measurable outcomes, not just effort",
        ],
      },
      {
        id: "l-2",
        question:
          "Describe a situation where you had to make a difficult technical decision with incomplete information.",
        starHints: {
          situation:
            "What was the context? Why was the decision urgent or high-stakes?",
          task: "What were the options, and what made the decision difficult?",
          action:
            "How did you gather what information you could? How did you weigh trade-offs and communicate your reasoning?",
          result:
            "What was the outcome? If it turned out wrong, what did you learn and how did you course-correct?",
        },
        lookingFor: [
          "Comfort with ambiguity and calculated risk",
          "Structured decision-making frameworks",
          "Transparency about trade-offs",
          "Willingness to own outcomes, including mistakes",
        ],
      },
      {
        id: "l-3",
        question:
          "Tell me about a time you championed a significant technical change (new tool, architecture, process).",
        starHints: {
          situation:
            "What problem were you solving? Why did the status quo need to change?",
          task: "What change did you propose, and what resistance did you anticipate?",
          action:
            "How did you build your case? Did you create a proof of concept, write an RFC, or present data?",
          result:
            "Was the change adopted? What was the measurable impact on the team or product?",
        },
        lookingFor: [
          "Ability to build consensus through evidence, not just opinion",
          "Strategic thinking about when to push for change",
          "Empathy for those affected by the change",
          "Follow-through on adoption and measuring results",
        ],
      },
    ],
  },
  {
    id: "conflict",
    name: "Conflict & Disagreement",
    emoji: "⚖️",
    description:
      "Show how you navigate disagreements constructively and turn tension into better outcomes.",
    questions: [
      {
        id: "c-1",
        question:
          "Tell me about a time you disagreed with your manager or tech lead on a technical approach.",
        starHints: {
          situation:
            "What was the disagreement about? What was at stake?",
          task: "What was your position, and why did you believe it was the right approach?",
          action:
            "How did you communicate your disagreement? Did you escalate, compromise, or disagree-and-commit?",
          result:
            "What happened? Whether you 'won' or not, what did the experience teach you about productive disagreement?",
        },
        lookingFor: [
          "Respectful but assertive communication",
          "Data-driven arguments, not ego-driven",
          "Ability to disagree and commit when the decision goes another way",
          "Focus on the best outcome for the team/product",
        ],
      },
      {
        id: "c-2",
        question:
          "Describe a situation where two teammates had conflicting approaches and you helped resolve it.",
        starHints: {
          situation:
            "What was the conflict? Why were both sides invested in their approach?",
          task: "What role did you play — mediator, tiebreaker, facilitator?",
          action:
            "How did you understand each perspective? What process did you use to reach resolution?",
          result:
            "What was decided? How did the relationship between the teammates evolve afterward?",
        },
        lookingFor: [
          "Active listening and empathy for multiple viewpoints",
          "Facilitation skills — creating space for productive discussion",
          "Focus on shared goals over individual preferences",
          "Ability to move the team forward without creating resentment",
        ],
      },
      {
        id: "c-3",
        question:
          "Tell me about a time you received critical feedback that was hard to hear. How did you respond?",
        starHints: {
          situation:
            "What was the feedback, and who gave it? Why was it difficult?",
          task: "What did you need to do with the feedback?",
          action:
            "How did you process it emotionally? What concrete steps did you take to address it?",
          result:
            "How did your behavior or work change? Did you follow up with the person who gave the feedback?",
        },
        lookingFor: [
          "Self-awareness and emotional maturity",
          "Growth mindset — treats feedback as information, not attack",
          "Concrete behavior change, not just acknowledgment",
          "Proactive follow-up and accountability",
        ],
      },
    ],
  },
  {
    id: "teamwork",
    name: "Teamwork & Collaboration",
    emoji: "🤝",
    description:
      "Demonstrate how you amplify the team's effectiveness, share knowledge, and work across boundaries.",
    questions: [
      {
        id: "t-1",
        question:
          "Tell me about a successful cross-team collaboration. What made it work?",
        starHints: {
          situation:
            "What teams were involved, and what was the shared goal?",
          task: "What was your specific role in the collaboration?",
          action:
            "How did you align priorities, communicate across different contexts, and handle dependencies?",
          result:
            "What was delivered? What would you do differently for smoother cross-team work next time?",
        },
        lookingFor: [
          "Ability to work across organizational boundaries",
          "Clear communication with people who have different contexts",
          "Proactive dependency management",
          "Shared ownership of outcomes",
        ],
      },
      {
        id: "t-2",
        question:
          "Describe a time you mentored or onboarded someone. What was your approach?",
        starHints: {
          situation:
            "Who were you mentoring and what was their starting point?",
          task: "What did they need to learn or accomplish?",
          action:
            "How did you structure the mentoring? Pair programming, code reviews, documentation, scheduled check-ins?",
          result:
            "How did the person grow? What did you learn about teaching and knowledge transfer?",
        },
        lookingFor: [
          "Investment in others' growth, not just own productivity",
          "Ability to adapt teaching style to the learner",
          "Patience and structured knowledge transfer",
          "Recognition that mentoring is bidirectional",
        ],
      },
      {
        id: "t-3",
        question:
          "Tell me about a time a project was falling behind. How did you help the team recover?",
        starHints: {
          situation:
            "What was the project, and what caused it to fall behind?",
          task: "What was your role — were you responsible for the delay, or helping others?",
          action:
            "What specific steps did you take? Scope reduction, re-prioritization, extra effort, asking for help?",
          result:
            "Did the project ship? What processes changed to prevent similar situations?",
        },
        lookingFor: [
          "Ownership mentality even when the problem isn't 'yours'",
          "Pragmatic trade-off thinking (scope vs. time vs. quality)",
          "Transparent communication about risks and status",
          "Focus on systemic fixes, not just heroics",
        ],
      },
    ],
  },
  {
    id: "adaptability",
    name: "Adaptability & Learning",
    emoji: "🔄",
    description:
      "Show how you handle change, learn quickly, and turn setbacks into growth opportunities.",
    questions: [
      {
        id: "a-1",
        question:
          "Tell me about a time you had to quickly learn a new technology or domain to deliver on a project.",
        starHints: {
          situation:
            "What was the new tech/domain? Why was speed important?",
          task: "What did you need to build or accomplish with this new knowledge?",
          action:
            "How did you learn? Docs, tutorials, reading source code, finding experts, building prototypes?",
          result:
            "Did you deliver on time? How deep did your understanding become, and what's your retention strategy?",
        },
        lookingFor: [
          "Efficient learning strategies, not just 'I read the docs'",
          "Willingness to be a beginner and ask questions",
          "Ability to be productive while still learning",
          "Knowing when 'good enough' understanding suffices vs. when deep mastery is needed",
        ],
      },
      {
        id: "a-2",
        question:
          "Describe a project or approach that failed. What happened and what did you take away from it?",
        starHints: {
          situation:
            "What was the project or approach? What were the initial expectations?",
          task: "What went wrong — was it technical, process, people, or a combination?",
          action:
            "How did you respond when things started failing? Did you pivot, escalate, or double down?",
          result:
            "What was the ultimate outcome? What specific lessons did you carry into future work?",
        },
        lookingFor: [
          "Honest accountability — not blaming others or external factors",
          "Analytical thinking about root causes",
          "Concrete lessons learned, not generic 'I learned a lot'",
          "Evidence that behavior actually changed as a result",
        ],
      },
      {
        id: "a-3",
        question:
          "Tell me about a time priorities shifted significantly mid-project. How did you handle it?",
        starHints: {
          situation:
            "What changed — new business priority, reorg, technical constraint, market shift?",
          task: "How did the change affect your current work and commitments?",
          action:
            "How did you re-plan? How did you communicate the impact to stakeholders?",
          result:
            "Were you able to deliver value despite the shift? How did you manage your own frustration or the team's?",
        },
        lookingFor: [
          "Flexibility without losing focus on outcomes",
          "Clear communication about impact of changes",
          "Ability to preserve value from work already done",
          "Emotional resilience and positive attitude through change",
        ],
      },
    ],
  },
  {
    id: "problem-solving",
    name: "Problem Solving",
    emoji: "🧩",
    description:
      "Demonstrate analytical thinking, creative solutions, and how you approach complex technical challenges.",
    questions: [
      {
        id: "p-1",
        question:
          "Tell me about the most complex bug you've debugged. Walk me through your process.",
        starHints: {
          situation:
            "What was the system, and what were the symptoms?",
          task: "Why was this bug particularly difficult — intermittent, multi-system, data-dependent?",
          action:
            "Walk through your debugging methodology step by step. What tools did you use? How did you narrow down the cause?",
          result:
            "What was the root cause? How did you fix it and prevent recurrence?",
        },
        lookingFor: [
          "Systematic debugging methodology, not trial-and-error",
          "Ability to reason about complex system interactions",
          "Use of appropriate tools (logging, profiling, tracing)",
          "Root cause thinking — fix the cause, not just the symptom",
        ],
      },
      {
        id: "p-2",
        question:
          "Describe a time you had to make a significant trade-off between speed, quality, and scope.",
        starHints: {
          situation:
            "What was the project and what constraints were you under?",
          task: "What trade-offs were on the table? What were the stakes of each choice?",
          action:
            "How did you evaluate the options? Who did you consult? How did you communicate the trade-off?",
          result:
            "What did you choose and why? In hindsight, was it the right call?",
        },
        lookingFor: [
          "Pragmatic engineering judgment",
          "Ability to articulate trade-offs clearly to both technical and non-technical stakeholders",
          "Understanding that 'perfect' is often the enemy of 'shipped'",
          "Willingness to revisit and improve after shipping",
        ],
      },
      {
        id: "p-3",
        question:
          "Tell me about a time you improved the performance or reliability of a system significantly.",
        starHints: {
          situation:
            "What system was underperforming, and what was the impact?",
          task: "What was the performance target or reliability requirement?",
          action:
            "How did you identify the bottleneck? What changes did you make, and how did you validate them?",
          result:
            "What improvement did you achieve (specific numbers)? How did you ensure the improvement was sustained?",
        },
        lookingFor: [
          "Measurement-driven approach — profiling before optimizing",
          "Understanding of system-level performance characteristics",
          "Ability to identify the highest-impact optimization",
          "Verification and monitoring of improvements",
        ],
      },
    ],
  },
  {
    id: "communication",
    name: "Communication",
    emoji: "💬",
    description:
      "Show how you explain complex ideas clearly, give and receive feedback, and keep stakeholders informed.",
    questions: [
      {
        id: "co-1",
        question:
          "Tell me about a time you had to explain a complex technical concept to a non-technical audience.",
        starHints: {
          situation:
            "What was the concept, and who was the audience?",
          task: "Why did they need to understand it? What decision depended on their understanding?",
          action:
            "What analogies, visuals, or simplifications did you use? How did you check for understanding?",
          result:
            "Did they understand well enough to make the right decision? What did you learn about technical communication?",
        },
        lookingFor: [
          "Ability to adjust communication to the audience's level",
          "Use of analogies and concrete examples over jargon",
          "Checking for understanding, not just talking",
          "Focus on what matters to the audience, not what's interesting to you",
        ],
      },
      {
        id: "co-2",
        question:
          "Describe a situation where miscommunication caused a problem. How did you fix it and prevent it from happening again?",
        starHints: {
          situation:
            "What was miscommunicated, and between whom?",
          task: "What was the impact of the miscommunication?",
          action:
            "How did you identify the root cause of the miscommunication? What did you do to resolve the immediate issue?",
          result:
            "What process, tool, or habit did you put in place to prevent recurrence?",
        },
        lookingFor: [
          "Ownership of communication breakdowns (even if 'not your fault')",
          "Root cause analysis applied to human processes",
          "Systemic thinking — improving processes, not just blaming people",
          "Proactive communication habits",
        ],
      },
    ],
  },
  {
    id: "remote-work",
    name: "Remote Work",
    emoji: "🌍",
    description:
      "Especially relevant for EU remote roles — demonstrate that you thrive in distributed, async-first environments.",
    questions: [
      {
        id: "r-1",
        question:
          "How do you stay productive and connected when working remotely across time zones?",
        starHints: {
          situation:
            "Describe your remote work setup and the time zone spread of your team.",
          task: "What challenges did the distributed setup create for collaboration?",
          action:
            "What specific practices do you follow? Async communication tools, overlap hours, documentation habits, social rituals?",
          result:
            "How do you measure your own productivity? How do teammates experience working with you remotely?",
        },
        lookingFor: [
          "Concrete async-first practices, not just 'I use Slack'",
          "Proactive over-communication and documentation",
          "Self-discipline and time management",
          "Intentional relationship-building across distance",
        ],
      },
      {
        id: "r-2",
        question:
          "Tell me about a time remote/async communication caused a misunderstanding. How did you resolve it?",
        starHints: {
          situation:
            "What was the misunderstanding and what medium was it in (Slack, email, PR comment)?",
          task: "What was the impact — delayed work, hurt feelings, wrong implementation?",
          action:
            "How did you detect the misunderstanding? What did you do — jump on a call, write a longer explanation, create a shared doc?",
          result:
            "How was it resolved? What communication habit did you adopt to prevent similar issues?",
        },
        lookingFor: [
          "Awareness that written communication lacks tone and nuance",
          "Willingness to 'upgrade' the communication channel when needed",
          "Documentation and clarity as default practices",
          "Empathy for how messages land across cultures and contexts",
        ],
      },
      {
        id: "r-3",
        question:
          "How do you handle the isolation or boundary-blurring aspects of remote work?",
        starHints: {
          situation:
            "What specific challenges have you faced with remote work boundaries?",
          task: "What was at stake — burnout, disconnection, work-life imbalance?",
          action:
            "What routines, boundaries, or habits have you built? How do you maintain social connection with your team?",
          result:
            "How sustainable is your remote work setup long-term? What would you tell someone new to remote work?",
        },
        lookingFor: [
          "Self-awareness about personal needs and limits",
          "Proactive strategies, not just 'I deal with it'",
          "Healthy boundaries without being unavailable",
          "Long-term sustainability mindset",
        ],
      },
    ],
  },
];

// ── Components ───────────────────────────────────────────────────────

function QuestionCard({ question }: { question: BehavioralQuestion }) {
  const [showHints, setShowHints] = useState(false);
  const [showLookingFor, setShowLookingFor] = useState(false);

  return (
    <Card mb="3">
      <Flex direction="column" gap="3">
        <Text size="3" weight="medium">
          {question.question}
        </Text>

        <Flex gap="2">
          <Button
            size="1"
            variant="soft"
            onClick={() => setShowHints(!showHints)}
          >
            {showHints ? "Hide STAR Hints" : "Show STAR Hints"}
          </Button>
          <Button
            size="1"
            variant={showLookingFor ? "soft" : "solid"}
            onClick={() => setShowLookingFor(!showLookingFor)}
          >
            {showLookingFor ? "Hide What They Look For" : "What Interviewers Look For"}
          </Button>
        </Flex>

        {showHints && (
          <Box
            p="3"
            style={{
              backgroundColor: "var(--accent-3)",
              borderRadius: "var(--radius-2)",
            }}
          >
            <Text size="2" weight="bold" mb="2">
              STAR Framework Hints
            </Text>
            <Flex direction="column" gap="2" mt="2">
              <Text as="p" size="2">
                <strong>Situation:</strong> {question.starHints.situation}
              </Text>
              <Text as="p" size="2">
                <strong>Task:</strong> {question.starHints.task}
              </Text>
              <Text as="p" size="2">
                <strong>Action:</strong> {question.starHints.action}
              </Text>
              <Text as="p" size="2">
                <strong>Result:</strong> {question.starHints.result}
              </Text>
            </Flex>
          </Box>
        )}

        {showLookingFor && (
          <Box
            p="3"
            style={{
              backgroundColor: "var(--green-3)",
              borderRadius: "var(--radius-2)",
            }}
          >
            <Text size="2" weight="bold" mb="2">
              What Interviewers Look For
            </Text>
            <Flex direction="column" gap="1" mt="2">
              {question.lookingFor.map((item, i) => (
                <Text as="p" size="2" key={i}>
                  • {item}
                </Text>
              ))}
            </Flex>
          </Box>
        )}
      </Flex>
    </Card>
  );
}

// ── Page ──────────────────────────────────────────────────────────────

export default function BehavioralQuestionsPage() {
  const [activeCategory, setActiveCategory] = useState(CATEGORIES[0].id);

  const category = CATEGORIES.find((c) => c.id === activeCategory)!;
  const totalQuestions = CATEGORIES.reduce(
    (sum, c) => sum + c.questions.length,
    0
  );

  return (
    <Container size="3" p="8">
      <Flex direction="column" gap="6">
        {/* Header */}
        <Box>
          <Heading size="8" mb="2">
            Behavioral Interview Questions
          </Heading>
          <Text size="4" color="gray">
            {totalQuestions} questions across {CATEGORIES.length} categories with
            STAR framework guidance. Practice structuring your answers around
            Situation, Task, Action, and Result.
          </Text>
        </Box>

        {/* STAR Framework reminder */}
        <Card style={{ backgroundColor: "var(--blue-3)" }}>
          <Heading size="4" mb="2">
            The STAR Method
          </Heading>
          <Flex direction="column" gap="1">
            <Text as="p" size="2">
              <strong>Situation</strong> — Set the context. Where were you working? What was the project or team?
            </Text>
            <Text as="p" size="2">
              <strong>Task</strong> — What was your responsibility or the challenge you faced?
            </Text>
            <Text as="p" size="2">
              <strong>Action</strong> — What specifically did YOU do? (Not the team — you.)
            </Text>
            <Text as="p" size="2">
              <strong>Result</strong> — What was the outcome? Quantify if possible. What did you learn?
            </Text>
          </Flex>
        </Card>

        {/* Category navigation */}
        <Flex gap="2" wrap="wrap">
          {CATEGORIES.map((cat) => (
            <Button
              key={cat.id}
              variant={activeCategory === cat.id ? "solid" : "outline"}
              onClick={() => setActiveCategory(cat.id)}
              size="2"
            >
              {cat.emoji} {cat.name}
              <Badge
                ml="1"
                variant="soft"
                color={activeCategory === cat.id ? "gray" : undefined}
              >
                {cat.questions.length}
              </Badge>
            </Button>
          ))}
        </Flex>

        {/* Category description */}
        <Text size="3" color="gray">
          {category.description}
        </Text>

        {/* Questions */}
        {category.questions.map((q) => (
          <QuestionCard key={q.id} question={q} />
        ))}
      </Flex>
    </Container>
  );
}
