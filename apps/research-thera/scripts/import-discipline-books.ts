import { config } from "dotenv";
import { resolve } from "path";

config({ path: resolve(process.cwd(), ".env.local") });
config({ path: resolve(process.cwd(), ".env") });

import {
  insertRecommendedBooks,
  listAllRecommendedBooks,
  deleteRecommendedBooksByCategory,
} from "../src/db";

type BookSeed = {
  title: string;
  authors: string[];
  year: number;
  isbn: string;
  description: string;
  whyRecommended: string;
  category: "parenting-discipline" | "self-discipline";
};

const PARENTING_BOOKS: BookSeed[] = [
  {
    title: "Positive Discipline (Revised)",
    authors: ["Jane Nelsen"],
    year: 2011,
    isbn: "9780307794161",
    description:
      "The foundational volume of the Positive Discipline movement. Reframes misbehavior as a coded message about belonging and significance, and offers concrete non-punitive tools (family meetings, routine charts, \"kind and firm\" language) to replace both permissiveness and punishment.",
    whyRecommended:
      "PRACTITIONER — Ed.D. in educational psychology; developer of the Positive Discipline model. Adlerian / Dreikursian framework; small-trial evaluations show reductions in harsh discipline, though the book is primarily a practitioner synthesis rather than a summary of the author's own RCTs.",
    category: "parenting-discipline",
  },
  {
    title: "Peaceful Parent, Happy Kids: How to Stop Yelling and Start Connecting",
    authors: ["Laura Markham"],
    year: 2012,
    isbn: "9781101613627",
    description:
      "Organizes discipline around three ideas: regulate the parent first, foster connection, and coach rather than control. Heavy on concrete scripts for tantrums, sibling conflict, and limit-setting without punishment or rewards.",
    whyRecommended:
      "PRACTITIONER — Ph.D. in clinical psychology, Columbia; founder of AhaParenting.com. Synthesizes attachment theory (Bowlby, Ainsworth), affective neuroscience (Schore, Siegel), and emotion-coaching research (Gottman) into a parent-coaching model.",
    category: "parenting-discipline",
  },
  {
    title: "How to Talk So Kids Will Listen & Listen So Kids Will Talk",
    authors: ["Adele Faber", "Elaine Mazlish"],
    year: 2001,
    isbn: "9781853407055",
    description:
      "A four-decade bestseller that teaches a compact set of communication moves parents can use instead of commanding, labeling, or lecturing. Structured as illustrated exercises; focuses on the language of discipline more than on consequences.",
    whyRecommended:
      "POPULAR — Popularization of Ginott's humanistic parent-communication model; no RCTs by the authors, but the specific skills (acknowledging feelings, describing rather than praising, engaging cooperation) are embedded in many evidence-based programs.",
    category: "parenting-discipline",
  },
  {
    title: "How to Talk So Little Kids Will Listen: A Survival Guide to Life with Children Ages 2–7",
    authors: ["Joanna Faber", "Julie King"],
    year: 2017,
    isbn: "9781501131653",
    description:
      "Age-specific reboot of the original. Gives parents very granular scripts for the high-friction moments of early childhood (brushing teeth, sharing, meltdowns) and a short troubleshooting appendix for common patterns.",
    whyRecommended:
      "POPULAR — Extension of Faber & Mazlish's Ginott-derived framework, adapted for toddlers/preschoolers; no RCTs. Joanna Faber is a Faber-Mazlish workshop leader; Julie King is a Harvard-trained lawyer turned parent educator.",
    category: "parenting-discipline",
  },
  {
    title:
      "No-Drama Discipline: The Whole-Brain Way to Calm the Chaos and Nurture Your Child's Developing Mind",
    authors: ["Daniel J. Siegel", "Tina Payne Bryson"],
    year: 2014,
    isbn: "9780345548054",
    description:
      "Reframes discipline as \"teaching\" (from Latin disciplina) rather than punishment. Gives parents a neurobiological vocabulary (upstairs/downstairs brain, high-road/low-road) and a step-by-step sequence: regulate yourself, connect, redirect.",
    whyRecommended:
      "RESEARCH-BACKED — Siegel is clinical professor of psychiatry at UCLA; Bryson is a clinical psychologist. Grounded in interpersonal neurobiology and the developmental-neuroscience literature on prefrontal regulation, attachment, and affect; Siegel's peer-reviewed work on mindsight and integration underpins the \"connect-then-redirect\" model.",
    category: "parenting-discipline",
  },
  {
    title:
      "The Whole-Brain Child: 12 Revolutionary Strategies to Nurture Your Child's Developing Mind",
    authors: ["Daniel J. Siegel", "Tina Payne Bryson"],
    year: 2012,
    isbn: "9781780338385",
    description:
      "The precursor to No-Drama Discipline, focused on the developmental neuroscience that makes discipline sometimes necessary and sometimes impossible. Offers 12 strategies (e.g., \"name it to tame it,\" \"engage, don't enrage\") that parents can use in the moment.",
    whyRecommended:
      "RESEARCH-BACKED — Draws on Siegel's interpersonal-neurobiology program and peer-reviewed work on integration, memory, and affect regulation.",
    category: "parenting-discipline",
  },
  {
    title: "The Yes Brain: How to Cultivate Courage, Curiosity, and Resilience in Your Child",
    authors: ["Daniel J. Siegel", "Tina Payne Bryson"],
    year: 2018,
    isbn: "9780399594670",
    description:
      "Pivots from moment-to-moment discipline to the longer project of building the self-regulation, insight, and empathy that make discipline less necessary. Useful companion to No-Drama Discipline for parents of school-age and early-adolescent children.",
    whyRecommended:
      "RESEARCH-BACKED — Integrates affective neuroscience on approach vs. avoidance states, executive-function research, and attachment work into a parenting framework.",
    category: "parenting-discipline",
  },
  {
    title:
      "Parenting from the Inside Out: How a Deeper Self-Understanding Can Help You Raise Children Who Thrive",
    authors: ["Daniel J. Siegel", "Mary Hartzell"],
    year: 2013,
    isbn: "9781101662694",
    description:
      "Argues that a parent's ability to discipline calmly is largely a function of how they have made sense of their own childhood. Pairs exercises on autobiographical reflection with applied neurobiology of caregiver states.",
    whyRecommended:
      "RESEARCH-BACKED — Built on the adult-attachment research literature (Main, Hesse, Fonagy) and Siegel's work on reflective function. The coherent-narrative concept comes directly from the Adult Attachment Interview research program.",
    category: "parenting-discipline",
  },
  {
    title:
      "The Explosive Child: A New Approach for Understanding and Parenting Easily Frustrated, Chronically Inflexible Children (6th ed.)",
    authors: ["Ross W. Greene"],
    year: 2021,
    isbn: "9780063092464",
    description:
      "Replaces reward/consequence-based discipline with a three-step problem-solving protocol: identify lagging skills and unsolved problems, then collaborate with the child to solve them. Essential for parents of \"explosive,\" anxious, or neurodivergent children where traditional behavior plans fail.",
    whyRecommended:
      "RESEARCH-BACKED — Ph.D. in clinical psychology; formerly Harvard Medical School; originator of the Collaborative & Proactive Solutions (CPS) model. CPS has been evaluated in multiple peer-reviewed studies (including Greene et al., J Consult Clin Psych) showing reductions in oppositional behavior comparable to parent-management training, with lower dropout.",
    category: "parenting-discipline",
  },
  {
    title: "Raising Human Beings: Creating a Collaborative Partnership with Your Child",
    authors: ["Ross W. Greene"],
    year: 2017,
    isbn: "9781476723761",
    description:
      "Broadens CPS from crisis management to everyday discipline. Argues that the real goal of discipline is partnership and skill-building, and walks parents through applying the same Plan B conversation to school, screens, chores, and peer conflict.",
    whyRecommended:
      "RESEARCH-BACKED — Same CPS research program; extends the model beyond the clinical \"explosive\" population to typically developing children.",
    category: "parenting-discipline",
  },
  {
    title:
      "The Power of Positive Parenting: Transforming the Lives of Children, Parents, and Communities Using the Triple P System",
    authors: ["Matthew R. Sanders", "Trevor G. Mazzucchelli"],
    year: 2017,
    isbn: "9780190629076",
    description:
      "The most authoritative single-volume treatment of the Triple P approach: five core positive-parenting principles (safe environment, positive learning environment, assertive discipline, realistic expectations, self-care) with specific discipline tools (planned ignoring, quiet time, behavior charts, family rules).",
    whyRecommended:
      "RESEARCH-BACKED — Sanders is professor of clinical psychology at UQ and founder of Triple P, one of the most heavily studied parenting programs worldwide (hundreds of RCTs). Direct summary of 40+ years of Triple P research including Cochrane / meta-analytic evidence showing reductions in disruptive behavior and harsh parenting.",
    category: "parenting-discipline",
  },
  {
    title: "The Kazdin Method for Parenting the Defiant Child",
    authors: ["Alan E. Kazdin", "Carlo Rotella"],
    year: 2009,
    isbn: "9780547348247",
    description:
      "A surprisingly readable manualization of Parent Management Training for parents. Focuses on shaping, specific praise, strategic antecedents, and carefully designed consequence systems. The clearest trade-book treatment of operant behavior-change science applied to everyday discipline.",
    whyRecommended:
      "RESEARCH-BACKED — Sterling Professor of Psychology, Yale; director of the Yale Parenting Center; former APA president; 700+ peer-reviewed publications. Direct translation of the Yale Parenting Center's randomized trials of PMT for oppositional and conduct problems.",
    category: "parenting-discipline",
  },
  {
    title: "Your Defiant Child: 8 Steps to Better Behavior (2nd ed.)",
    authors: ["Russell A. Barkley", "Christine M. Benton"],
    year: 2013,
    isbn: "9781462510078",
    description:
      "Eight-session program parents can work through at home for mild-to-moderate oppositional behavior, especially in the context of ADHD. Strong on why previous attempts failed (coercive cycles) and how to re-structure commands, attention, and consequences.",
    whyRecommended:
      "RESEARCH-BACKED — Barkley is clinical professor of psychiatry at VCU Medical Center and one of the most-cited researchers in ADHD. Direct parent-facing adaptation of Barkley's Defiant Children clinician manual; grounded in Patterson's coercion theory and 30+ years of Barkley's own research on self-regulation.",
    category: "parenting-discipline",
  },
  {
    title: "The Incredible Years: A Trouble-Shooting Guide for Parents of Children Aged 2–8 Years",
    authors: ["Carolyn Webster-Stratton"],
    year: 2019,
    isbn: "9780578434513",
    description:
      "Walks parents through the Incredible Years \"parenting pyramid\": play, praise and rewards at the base; limit-setting, ignoring, and time-out only at the top. Rich in scripted examples and troubleshooting for common implementation failures.",
    whyRecommended:
      "RESEARCH-BACKED — Professor emeritus, University of Washington School of Nursing; NIH MERIT Award. Parent-facing companion to the Incredible Years BASIC program; 40+ RCTs demonstrate reductions in child conduct problems and harsh parenting.",
    category: "parenting-discipline",
  },
  {
    title: "1-2-3 Magic: 3-Step Discipline for Calm, Effective, and Happy Parenting (6th ed.)",
    authors: ["Thomas W. Phelan"],
    year: 2016,
    isbn: "9781492629894",
    description:
      "The most widely used trade book on \"counting\" and time-out. Distinguishes \"stop behaviors\" (manage with counting) from \"start behaviors\" (manage with routines and rewards) and warns parents off the two classic failure modes: too much talk and too much emotion.",
    whyRecommended:
      "PRACTITIONER — Ph.D. in clinical psychology; decades of clinical work with ADHD. A small number of independent evaluations have found positive effects; draws on operant-conditioning principles but is primarily a practitioner's simplification rather than a direct summary of the author's own RCTs.",
    category: "parenting-discipline",
  },
  {
    title: "Raising an Emotionally Intelligent Child: The Heart of Parenting",
    authors: ["John Gottman", "Joan DeClaire"],
    year: 2011,
    isbn: "9781439126165",
    description:
      "Introduces the five-step emotion-coaching sequence (awareness, connection, listening, labeling, problem-solving/limit-setting). Frames discipline as inseparable from the emotional conversation: limits only work once the feeling has been named and accepted.",
    whyRecommended:
      "RESEARCH-BACKED — Emeritus professor of psychology, University of Washington; pioneer of observational marital and family research. Direct summary of Gottman's longitudinal research on \"meta-emotion\" and children's outcomes.",
    category: "parenting-discipline",
  },
  {
    title: "Between Parent and Child: Revised and Updated",
    authors: ["Haim G. Ginott", "Alice Ginott", "H. Wallace Goddard"],
    year: 2009,
    isbn: "9780307514189",
    description:
      "The 1965 classic, carefully updated. Teaches the distinction between accepting the child's feelings and accepting their behavior, and models the replacement of judgment, threats, and sarcasm with descriptive, respectful language. The stylistic and ethical parent of much modern gentle-discipline literature.",
    whyRecommended:
      "PRACTITIONER — Ginott was a child psychologist and clinical professor at NYU and Adelphi; his humanistic approach seeded work by Faber & Mazlish, Gordon, and indirectly Gottman. Clinical synthesis rather than RCT-based.",
    category: "parenting-discipline",
  },
  {
    title: "Parent Effectiveness Training: The Proven Program for Raising Responsible Children",
    authors: ["Thomas Gordon"],
    year: 2008,
    isbn: "9780307453167",
    description:
      "The originator of \"I-messages,\" active listening, and the \"no-lose\" conflict-resolution method. Crucial historically: the first mass-market book to reject both authoritarian and permissive parenting in favor of a democratic, skill-based third option, and the template for most of what follows.",
    whyRecommended:
      "PRACTITIONER — Clinical psychologist; student of Carl Rogers; three-time Nobel Peace Prize nominee. Multiple independent evaluations (Cedar & Levant, 1990 meta-analysis) have found positive effects of P.E.T. on parent attitudes and some child outcomes.",
    category: "parenting-discipline",
  },
];

const SELF_BOOKS: BookSeed[] = [
  {
    title: "Willpower: Rediscovering the Greatest Human Strength",
    authors: ["Roy F. Baumeister", "John Tierney"],
    year: 2011,
    isbn: "9781594203077",
    description:
      "Baumeister and Tierney argue that self-control behaves like a muscle — fatigued by use, strengthened by training, and fuelled by glucose. The book organizes a sprawling literature into accessible narratives (dieters, Victorian diarists, David Blaine) but does not account for the subsequent replication failures.",
    whyRecommended:
      "RESEARCH-BACKED — Summarizes ~20 years of Baumeister-lab studies. REPLICATION CAVEAT: the central ego-depletion effect failed a pre-registered multi-lab RRR (Hagger et al. 2016) and a 2021 registered replication (Vohs et al.). Read as a well-told primary-source history whose headline claim is now contested.",
    category: "self-discipline",
  },
  {
    title:
      "The Willpower Instinct: How Self-Control Works, Why It Matters, and What You Can Do to Get More of It",
    authors: ["Kelly McGonigal"],
    year: 2011,
    isbn: "9781101553732",
    description:
      "A 10-week curriculum that treats willpower as trainable via meditation, sleep, and stress reduction. More balanced than Willpower on self-criticism vs. self-compassion as motivators.",
    whyRecommended:
      "RESEARCH-BACKED — Health psychologist, Stanford lecturer. Synthesizes self-regulation research (Baumeister, Muraven, Gross, Mischel). Shares ego-depletion-era assumptions; her emphasis on stress, self-compassion, and the \"what-the-hell effect\" holds up well.",
    category: "self-discipline",
  },
  {
    title: "Good Habits, Bad Habits: The Science of Making Positive Changes That Stick",
    authors: ["Wendy Wood"],
    year: 2019,
    isbn: "9781250159083",
    description:
      "The best single volume on habits from an active researcher. Argues that relying on willpower is the least effective intervention; reshaping friction and cues is far more reliable.",
    whyRecommended:
      "RESEARCH-BACKED — Provost Professor of Psychology & Business, USC; 30+ years of peer-reviewed habit research. Directly summarizes Wood's own program (Wood & Neal 2007; Neal, Wood, Labrecque & Lally 2012) showing ~43% of daily behavior is habitual and that context change, not motivation, is the main lever.",
    category: "self-discipline",
  },
  {
    title: "Tiny Habits: The Small Changes That Change Everything",
    authors: ["B.J. Fogg"],
    year: 2020,
    isbn: "9780358003328",
    description:
      "Practical behavior-design manual: shrink behaviors until they require near-zero motivation, anchor to existing routines, celebrate immediately to wire in emotion. The \"anchor–tiny behavior–celebration\" recipe is the operational core.",
    whyRecommended:
      "RESEARCH-BACKED — Founder, Stanford Behavior Design Lab; 20+ years of persuasive-technology research. Derived from Fogg's Behavior Model (B=MAP) published since 2009 and refined with thousands of coached participants.",
    category: "self-discipline",
  },
  {
    title: "The Power of Habit: Why We Do What We Do in Life and Business",
    authors: ["Charles Duhigg"],
    year: 2012,
    isbn: "9781400069286",
    description:
      "Popularized the \"cue–routine–reward\" habit loop. Business-case chapters (Alcoa, Target, Febreze) are memorable but the scientific core is the neuroscience of chunking in the basal ganglia.",
    whyRecommended:
      "PRACTITIONER — Pulitzer-winning investigative journalist (NYT); Harvard MBA. Synthesizes Graybiel's basal-ganglia habit research (MIT), Wood's automaticity work, and Prochaska's stages of change. Not primary research, but careful reporting on primary sources.",
    category: "self-discipline",
  },
  {
    title: "Atomic Habits: An Easy & Proven Way to Build Good Habits & Break Bad Ones",
    authors: ["James Clear"],
    year: 2018,
    isbn: "9780735211292",
    description:
      "The most-read operational habit manual of the last decade. Light on novel theory but unusually good at translating research into checklists an average reader can execute.",
    whyRecommended:
      "PRACTITIONER — Writer and entrepreneur; not an academic researcher. Secondary synthesis of Wood, Fogg, Duhigg, Duckworth; the \"Four Laws\" (make it obvious / attractive / easy / satisfying) map onto Fogg's B=MAP and Wood's context/friction findings.",
    category: "self-discipline",
  },
  {
    title:
      "Making Habits, Breaking Habits: Why We Do Things, Why We Don't, and How to Make Any Change Stick",
    authors: ["Jeremy Dean"],
    year: 2013,
    isbn: "9780738216089",
    description:
      "A tighter, less-hyped complement to Duhigg; useful for readers who want to know where the \"21 days\" and \"66 days\" numbers actually come from (and how wide the confidence intervals are).",
    whyRecommended:
      "PRACTITIONER — PhD researcher (UCL); founder of PsyBlog. Walks through Lally et al. (2010, EJSP) — the 66-days-to-automaticity study — and related UCL habit research directly.",
    category: "self-discipline",
  },
  {
    title: "Grit: The Power of Passion and Perseverance",
    authors: ["Angela Duckworth"],
    year: 2016,
    isbn: "9781501111105",
    description:
      "Argues that sustained passion + perseverance toward long-term goals predicts achievement beyond IQ. Readable case studies; take the effect-size claims with the replication literature in hand.",
    whyRecommended:
      "RESEARCH-BACKED — Christopher H. Browne Distinguished Professor of Psychology, Penn; MacArthur Fellow. Summarizes Duckworth's own Grit Scale validation studies. CAVEAT: Credé, Tynan & Harms (2017, JPSP) found grit correlates ~0.84 with conscientiousness and adds minimal incremental validity.",
    category: "self-discipline",
  },
  {
    title: "Deep Work: Rules for Focused Success in a Distracted World",
    authors: ["Cal Newport"],
    year: 2016,
    isbn: "9781455586691",
    description:
      "The defining modern argument for time-blocked, interruption-free cognitive work. Operationally: monastic/bimodal/rhythmic/journalistic scheduling patterns.",
    whyRecommended:
      "PRACTITIONER — Associate Professor of CS, Georgetown. Synthesizes Ericsson's deliberate practice, attention-residue work (Leroy 2009), and Csikszentmihalyi's flow. Newport's own academic work is in CS, not attention science, so treat the psychology as curated rather than primary.",
    category: "self-discipline",
  },
  {
    title: "A World Without Email: Reimagining Work in an Age of Communication Overload",
    authors: ["Cal Newport"],
    year: 2021,
    isbn: "9780525536550",
    description:
      "Pairs with Deep Work by attacking the organizational environment rather than the individual. Useful for knowledge workers whose individual discipline is being eaten by institutional async chaos.",
    whyRecommended:
      "PRACTITIONER — Draws on organizational-psychology and CS literature on context switching and workflow design.",
    category: "self-discipline",
  },
  {
    title: "Indistractable: How to Control Your Attention and Choose Your Life",
    authors: ["Nir Eyal"],
    year: 2019,
    isbn: "9781526610232",
    description:
      "A practical manual for knowledge workers; notable for the \"timeboxing\" and \"identity pact\" tactics.",
    whyRecommended:
      "PRACTITIONER — Lecturer at Stanford GSB and Design School. Synthesis of self-control and habit research (Baumeister, Fogg, Duckworth). Eyal's distinction between \"traction\" and \"distraction\" is useful framing though not itself an empirical construct.",
    category: "self-discipline",
  },
  {
    title: "Self-Compassion: The Proven Power of Being Kind to Yourself",
    authors: ["Kristin Neff"],
    year: 2011,
    isbn: "9780061733529",
    description:
      "Core thesis: self-compassion — not self-esteem — predicts resilient behavior change. Directly challenges the \"beat-yourself-up\" model of discipline.",
    whyRecommended:
      "RESEARCH-BACKED — Associate Professor of Educational Psychology, UT Austin; developed the Self-Compassion Scale (Neff 2003), the field-standard measure. Summarizes Neff's own scale-development and outcome studies, plus trials showing self-compassion reduces procrastination and \"what-the-hell\" lapses better than self-criticism.",
    category: "self-discipline",
  },
  {
    title: "The Mindful Self-Compassion Workbook",
    authors: ["Kristin Neff", "Christopher Germer"],
    year: 2018,
    isbn: "9781462526789",
    description:
      "The practitioner version: 8 weeks of exercises with a genuine clinical-trial evidence base. The closest thing on this list to a manualized intervention.",
    whyRecommended:
      "RESEARCH-BACKED — Neff (UT Austin) + Germer (Harvard Medical School) developed the 8-week MSC program. Published by Guilford (leading clinical-psychology publisher); operationalizes the RCT-validated MSC program (Neff & Germer 2013, J Clin Psych).",
    category: "self-discipline",
  },
  {
    title: "Rethinking Positive Thinking: Inside the New Science of Motivation",
    authors: ["Gabriele Oettingen"],
    year: 2014,
    isbn: "9781591846871",
    description:
      "Argues naive positive fantasizing reduces goal attainment; contrasting Wish–Outcome–Obstacle–Plan (WOOP) improves it. One of the most robust individual-level behavior-change protocols in the literature.",
    whyRecommended:
      "RESEARCH-BACKED — Professor of Psychology, NYU and University of Hamburg. Directly summarizes Oettingen's own RCTs on Mental Contrasting with Implementation Intentions (MCII / WOOP): Oettingen et al. 2001, 2010, 2013; Duckworth, Grant, Loew, Oettingen & Gollwitzer 2011. Strong replication record compared to ego depletion.",
    category: "self-discipline",
  },
  {
    title: "A Guide to the Good Life: The Ancient Art of Stoic Joy",
    authors: ["William B. Irvine"],
    year: 2009,
    isbn: "9780195374612",
    description:
      "Culturally important entry point for readers who want a disciplined life-philosophy without religion. Read it as philosophy, not evidence-based therapy.",
    whyRecommended:
      "POPULAR — Professor of Philosophy, Wright State University. Philosophy, not psychology. Irvine connects negative visualization to hedonic-adaptation research (Brickman & Campbell), but the book is primarily a pragmatic reading of Seneca, Epictetus, and Marcus Aurelius.",
    category: "self-discipline",
  },
  {
    title: "How to Be a Stoic: Using Ancient Philosophy to Live a Modern Life",
    authors: ["Massimo Pigliucci"],
    year: 2017,
    isbn: "9780465097951",
    description:
      "A more intellectually serious counterpart to Irvine. Useful specifically because Pigliucci flags where Stoic claims go beyond the evidence.",
    whyRecommended:
      "POPULAR — Professor of Philosophy, CUNY City College; PhDs in genetics and philosophy. Philosophy, not clinical trials. Pigliucci engages directly with Albert Ellis's REBT and the CBT tradition that descends from Stoicism.",
    category: "self-discipline",
  },
  {
    title: "Four Thousand Weeks: Time Management for Mortals",
    authors: ["Oliver Burkeman"],
    year: 2021,
    isbn: "9780374159122",
    description:
      "An antidote to the productivity-optimization strand of this list. Argues that many \"discipline\" problems are actually finitude-denial problems; the honest response is triage, not better systems. A useful counterweight before you try to implement every other book here.",
    whyRecommended:
      "PRACTITIONER — Journalist (long-time Guardian psychology columnist). Synthesis of Heidegger, behavioral economics of planning fallacy, and contemporary attention research.",
    category: "self-discipline",
  },
];

const ALL_BOOKS = [...PARENTING_BOOKS, ...SELF_BOOKS];
const CATEGORIES = ["parenting-discipline", "self-discipline"] as const;

async function main() {
  const force = process.argv.includes("--force");

  console.log(
    `Preparing to import ${ALL_BOOKS.length} books (${PARENTING_BOOKS.length} parenting + ${SELF_BOOKS.length} self).`,
  );

  const existing = await listAllRecommendedBooks();
  const existingInCategories = existing.filter((b) =>
    (CATEGORIES as readonly string[]).includes(b.category),
  );

  if (existingInCategories.length > 0) {
    if (!force) {
      console.error(
        `Refusing to import: ${existingInCategories.length} row(s) already exist for categories ${CATEGORIES.join(", ")} with goal_id IS NULL.`,
      );
      console.error(
        `Re-run with --force to delete + reinsert, or call deleteRecommendedBooksByCategory() manually.`,
      );
      process.exit(1);
    }
    console.log(`--force: deleting ${existingInCategories.length} existing row(s)...`);
    for (const cat of CATEGORIES) {
      const n = await deleteRecommendedBooksByCategory(cat, true);
      console.log(`  deleted ${n} from ${cat}`);
    }
  }

  const inserted = await insertRecommendedBooks(
    ALL_BOOKS.map((b) => ({
      title: b.title,
      authors: b.authors,
      year: b.year,
      isbn: b.isbn,
      description: b.description,
      whyRecommended: b.whyRecommended,
      category: b.category,
    })),
  );

  console.log(`Inserted ${inserted.length} book(s).`);

  const counts = new Map<string, number>();
  for (const b of inserted) {
    counts.set(b.category, (counts.get(b.category) ?? 0) + 1);
  }
  for (const [cat, n] of counts) {
    console.log(`  ${cat}: ${n}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
