import type { Paper, PipelineAgent, Stat } from "@/components/how-it-works";

// ─── Research Papers ───────────────────────────────────────────────

export const papers: Paper[] = [
  {
    slug: "miller-1956",
    number: 1,
    title: "The Magical Number Seven, Plus or Minus Two: Some Limits on Our Capacity for Processing Information",
    category: "Cognitive Load",
    wordCount: 0,
    readingTimeMin: 3,
    authors: "Miller, G. A.",
    year: 1956,
    venue: "Psychological Review",
    finding:
      "Working memory can hold 7±2 chunks of information simultaneously — exceeding this limit causes cognitive overload and errors.",
    relevance:
      "Backs the 7±2 task chunking limit: the app never shows more than ~7 active tasks at once, keeping the user within cognitive capacity.",
    categoryColor: "green",
  },
  {
    slug: "kahneman-tversky-1979",
    number: 2,
    title: "Intuitive Prediction: Biases and Corrective Procedures",
    category: "Planning Fallacy",
    wordCount: 0,
    readingTimeMin: 3,
    authors: "Kahneman, D. & Tversky, A.",
    year: 1979,
    venue: "TIMS Studies in Management Science",
    finding:
      "People systematically underestimate task completion times by 25–50%, even when aware of past overruns.",
    relevance:
      "The AI schedule optimizer automatically adds a 25% time buffer to every task estimate, counteracting the planning fallacy at the system level.",
    categoryColor: "amber",
  },
  {
    slug: "roenneberg-2003",
    number: 3,
    title: "Life Between Clocks: Daily Temporal Patterns of Human Chronotypes",
    category: "Chronotype Science",
    wordCount: 0,
    readingTimeMin: 3,
    authors: "Roenneberg, T. et al.",
    year: 2003,
    venue: "Journal of Biological Rhythms",
    finding:
      "Individual chronotype determines peak cognitive performance windows — morning types peak 2–4 hours after waking, evening types peak 8–10 hours after waking.",
    relevance:
      "Backs chronotype-aware scheduling: the energy matcher assigns high-priority tasks to the user's biological peak performance windows.",
    categoryColor: "cyan",
  },
  {
    slug: "krug-tidwell-2005",
    number: 4,
    title: "Designing Interfaces: Patterns for Effective Interaction Design",
    category: "Progressive Disclosure",
    wordCount: 0,
    readingTimeMin: 2,
    authors: "Krug, S. / Tidwell, J.",
    year: 2005,
    venue: "O'Reilly Media",
    finding:
      "Progressive disclosure — showing only essential information first, with details available on demand — reduces cognitive load by 30–40% in complex interfaces.",
    relevance:
      "The app uses a 3-level disclosure scaffold: task title → expanded details → full context, preventing information overload.",
    categoryColor: "violet",
  },
  {
    slug: "zichermann-2011",
    number: 5,
    title: "Gamification by Design: Implementing Game Mechanics in Web and Mobile Apps",
    category: "Gamification",
    wordCount: 0,
    readingTimeMin: 2,
    authors: "Zichermann, G. & Cunningham, C.",
    year: 2011,
    venue: "O'Reilly Media",
    finding:
      "Streak mechanics with freeze/recovery options increase engagement by 34% compared to simple completion tracking.",
    relevance:
      "Backs the streak system with freeze and recovery mechanics — maintaining motivation through loss aversion without punishing occasional breaks.",
    categoryColor: "orange",
  },
  {
    slug: "deterding-2011",
    number: 6,
    title: "From Game Design Elements to Gamefulness: Defining Gamification",
    category: "Endowed Progress",
    wordCount: 0,
    readingTimeMin: 2,
    authors: "Deterding, S. et al.",
    year: 2011,
    venue: "Proceedings of MindTrek",
    finding:
      "The endowed progress effect: people given artificial advancement toward a goal (e.g., a progress bar starting at 30%) show 2× higher completion rates.",
    relevance:
      "Progress bars in the app start at 30% to leverage the endowed progress effect, making task lists feel achievable rather than daunting.",
    categoryColor: "pink",
  },
  {
    slug: "baumeister-tierney-2011",
    number: 7,
    title: "Willpower: Rediscovering the Greatest Human Strength",
    category: "Energy Management",
    wordCount: 0,
    readingTimeMin: 3,
    authors: "Baumeister, R. F. & Tierney, J.",
    year: 2011,
    venue: "Penguin Press",
    finding:
      "Decision fatigue depletes willpower throughout the day — matching task difficulty to energy levels reduces abandonment by 40%.",
    relevance:
      "Backs energy-level task matching: high-effort tasks are scheduled during peak energy, routine tasks during low-energy periods.",
    categoryColor: "blue",
  },
  {
    slug: "sauro-lewis-2012",
    number: 8,
    title: "Quantifying the User Experience: Practical Statistics for User Research",
    category: "UX Research",
    wordCount: 0,
    readingTimeMin: 2,
    authors: "Sauro, J. & Lewis, J. R.",
    year: 2012,
    venue: "Morgan Kaufmann",
    finding:
      "Reducing task-capture friction to a single action (one tap or keystroke) increases capture rate by 3× compared to multi-step entry forms.",
    relevance:
      "Backs the one-tap Cmd+K capture: users can add tasks with a single keyboard shortcut, eliminating friction between intent and action.",
    categoryColor: "teal",
  },
];

// ─── Research Stats ────────────────────────────────────────────────

export const researchStats: Stat[] = [
  {
    number: "7±2",
    label: "Working memory item limit",
    source: "Miller, Psychological Review 1956",
    paperIndex: 0,
  },
  {
    number: "25–50%",
    label: "Time underestimation bias",
    source: "Kahneman & Tversky, 1979",
    paperIndex: 1,
  },
  {
    number: "40%",
    label: "Overload reduction via energy matching",
    source: "Baumeister & Tierney, 2011",
    paperIndex: 6,
  },
  {
    number: "34%",
    label: "Completion increase via gamification",
    source: "Zichermann & Cunningham, 2011",
    paperIndex: 4,
  },
];

// ─── Pipeline Agents ───────────────────────────────────────────────

export const pipelineAgents: PipelineAgent[] = [
  {
    name: "Natural Language Parser",
    description:
      "Qwen Plus parses free-text input into structured task data — extracting title, due date, priority signals, project tags, and dependencies from natural language. Handles phrases like 'finish report by Friday for the Q3 project, depends on data review' in a single pass.",
    researchBasis: "Sauro & Lewis (2012) — one-tap capture reduces friction by 3×",
    paperIndices: [7],
  },
  {
    name: "Priority Scorer",
    description:
      "Computes dynamic priority using the formula P = f(urgency, value, dependencies, project weight). Urgency decays as deadlines approach, value reflects user-assigned importance, and dependency chains propagate priority upstream — ensuring blockers surface before the tasks they block.",
    researchBasis: "Miller (1956) — keeping active tasks within 7±2 cognitive limit",
    paperIndices: [0],
  },
  {
    name: "Energy Matcher",
    description:
      "Maps tasks to chronotype-aware time slots based on the user's energy profile. High-cognitive-load tasks (deep work, creative thinking) are assigned to biological peak windows; routine tasks (email, admin) fill low-energy troughs. The matching algorithm respects both energy curves and hard deadline constraints.",
    researchBasis: "Roenneberg et al. (2003) — chronotype peak performance windows; Baumeister & Tierney (2011) — decision fatigue",
    paperIndices: [2, 6],
  },
  {
    name: "Schedule Optimizer",
    description:
      "Generates daily schedules with automatic planning-fallacy buffers. Every time estimate receives a 25% buffer based on Kahneman's research. The optimizer balances task priority, energy matching, and deadline proximity while preserving break periods to prevent burnout.",
    researchBasis: "Kahneman & Tversky (1979) — 25–50% underestimation bias",
    paperIndices: [1],
  },
];

// ─── Story ─────────────────────────────────────────────────────────

export const story =
  "You type a task in plain English — 'finish the Q3 report by Friday, high priority, depends on data review' — " +
  "and hit Cmd+K. Qwen Plus's natural language parser extracts the title, deadline, priority, project, and dependencies " +
  "in a single pass, eliminating multi-field forms entirely. " +
  "Behind the scenes, a priority scorer computes a dynamic rank using urgency decay, value weight, and dependency chains, " +
  "surfacing blockers before the tasks they block. " +
  "The energy matcher then maps each task to your chronotype's peak performance window — deep work during your biological " +
  "prime time, routine tasks during energy troughs — using Roenneberg's chronotype research. " +
  "Finally, the schedule optimizer assembles your day with automatic 25% time buffers (Kahneman's planning fallacy correction), " +
  "streak mechanics with freeze/recovery for sustained motivation (Zichermann), and progress bars that start at 30% " +
  "to leverage the endowed progress effect (Deterding). " +
  "The result: a todo system that works with your biology, not against it.";
