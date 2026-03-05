import {
  Box,
  Card,
  Flex,
  Grid,
  Heading,
  Text,
  Badge,
  Separator,
} from "@radix-ui/themes";
import {
  Swords,
  BookOpen,
  Brain,
  AlertTriangle,
  Scale,
  Users,
  ExternalLink,
  Shield,
  Gavel,
} from "lucide-react";

interface ResearchPaper {
  title: string;
  authors: string;
  year: number;
  venue: string;
  finding: string;
  relevance: string;
  category: string;
  url: string;
}

const papers: ResearchPaper[] = [
  {
    title: "AI Safety via Debate",
    authors: "Irving, Christiano & Amodei",
    year: 2018,
    venue: "arXiv 1805.00899",
    finding:
      "Two AI agents debating can answer questions in PSPACE -- exponentially harder than what a single judge could verify alone. The authors explicitly cite legal adversarial proceedings as the motivating analogy.",
    relevance:
      "Our Attacker/Defender/Judge pipeline is a direct implementation of this framework, applied to legal brief analysis.",
    category: "AI Debate",
    url: "https://arxiv.org/abs/1805.00899",
  },
  {
    title: "Debating with More Persuasive LLMs Leads to More Truthful Answers",
    authors: "Khan, Hughes, Valentine et al.",
    year: 2024,
    venue: "ICML 2024 (Best Paper Award)",
    finding:
      "When two LLM experts debate, non-expert judges achieve 76% accuracy (models) and 88% accuracy (humans), vs. 48% and 60% baselines. Debate helps weaker agents evaluate stronger ones.",
    relevance:
      "Empirically proves our core mechanism: structured debate between AI agents surfaces truth even when the judge is less expert than the debaters.",
    category: "AI Debate",
    url: "https://arxiv.org/abs/2402.06782",
  },
  {
    title:
      "Improving Factuality and Reasoning through Multiagent Debate",
    authors: "Du, Li, Torralba, Tenenbaum & Mordatch",
    year: 2024,
    venue: "ICML 2024",
    finding:
      "Multi-agent debate boosts reasoning accuracy by +15 percentage points on arithmetic and +8 on math reasoning. Even when all agents start wrong, debate converges on the correct answer.",
    relevance:
      "Validates our multi-round approach: 3 agents debating over 2+ rounds catch errors that a single pass never would.",
    category: "Multi-Agent",
    url: "https://arxiv.org/abs/2305.14325",
  },
  {
    title:
      "Encouraging Divergent Thinking in LLMs through Multi-Agent Debate",
    authors: "Liang, He, Jiao, Wang et al.",
    year: 2024,
    venue: "EMNLP 2024",
    finding:
      "Identifies the \"Degeneration-of-Thought\" problem: LLMs become locked into initial (potentially incorrect) positions during self-reflection. Multi-agent debate with a judge breaks this pattern.",
    relevance:
      "Explains exactly why single-agent brief review fails -- the model commits to its first reading and cannot self-correct. Our adversarial structure forces genuine re-examination.",
    category: "Multi-Agent",
    url: "https://arxiv.org/abs/2305.19118",
  },
  {
    title:
      "Large Legal Fictions: Profiling Legal Hallucinations in LLMs",
    authors: "Dahl, Magesh, Suzgun & Ho (Stanford)",
    year: 2024,
    venue: "Journal of Legal Analysis",
    finding:
      "LLMs hallucinate legal facts 69-88% of the time on verifiable questions about federal court cases. GPT-4 hallucinated 58%, GPT-3.5 at 69%, Llama 2 at 88%.",
    relevance:
      "The scientific basis for our Citation Verifier agent. Single-pass AI cannot be trusted with legal citations -- period.",
    category: "Hallucination",
    url: "https://arxiv.org/abs/2401.01301",
  },
  {
    title:
      "Hallucination-Free? Assessing Reliability of Leading AI Legal Research Tools",
    authors: "Magesh, Surani, Dahl et al. (Stanford)",
    year: 2025,
    venue: "Journal of Empirical Legal Studies",
    finding:
      "Even purpose-built legal AI tools hallucinate: Lexis+ AI at 17%, Westlaw AI at 33%, GPT-4 at 43%. RAG alone does not solve the legal hallucination problem.",
    relevance:
      "Even the best single-pass tools fail. Adversarial verification provides the additional layer that RAG-based tools lack.",
    category: "Hallucination",
    url: "https://arxiv.org/abs/2405.20362",
  },
  {
    title: "Procedural Justice: A Psychological Analysis",
    authors: "Thibaut & Walker",
    year: 1975,
    venue: "Lawrence Erlbaum Associates",
    finding:
      "Landmark empirical study comparing adversarial and inquisitorial procedures. Found that adversarial systems -- where parties control evidence presentation -- produce more thorough fact-finding than any single investigator.",
    relevance:
      "The foundational experiment proving adversarial systems work. 50 years of legal scholarship builds on this. We apply it to AI.",
    category: "Legal Scholarship",
    url: "https://scholarship.law.duke.edu/cgi/viewcontent.cgi?article=2648&context=dlj",
  },
  {
    title:
      "Mata v. Avianca, Inc. -- The Case That Changed Legal AI",
    authors: "Judge P. Kevin Castel, S.D.N.Y.",
    year: 2023,
    venue: "1:22-cv-01461 (S.D.N.Y.)",
    finding:
      "Lawyer sanctioned $5,000 for filing a ChatGPT-generated brief with 6 fabricated cases. Since then, $31K+ in combined sanctions across courts and 300+ judges now require AI citation verification.",
    relevance:
      "The landmark wake-up call. Our system would have caught every fabricated citation before filing.",
    category: "Case Law",
    url: "https://law.justia.com/cases/federal/district-courts/new-york/nysdce/1:2022cv01461/575368/54/",
  },
];

const stats = [
  {
    number: "58%",
    label: "GPT-4 legal hallucination rate",
    source: "Stanford HAI, Journal of Legal Analysis 2024",
  },
  {
    number: "+15pp",
    label: "Accuracy boost from multi-agent debate",
    source: "Du et al., ICML 2024",
  },
  {
    number: "300+",
    label: "Judges now require AI citation verification",
    source: "Post Mata v. Avianca standing orders",
  },
  {
    number: "$31K",
    label: "Sanctions for AI-fabricated citations",
    source: "Combined across U.S. courts, 2023-2025",
  },
];

function categoryColor(
  cat: string
): "crimson" | "blue" | "amber" | "green" | "purple" {
  switch (cat) {
    case "AI Debate":
      return "crimson";
    case "Multi-Agent":
      return "blue";
    case "Legal Scholarship":
      return "purple";
    case "Hallucination":
      return "amber";
    case "Case Law":
      return "green";
    default:
      return "crimson";
  }
}

function categoryIcon(cat: string) {
  switch (cat) {
    case "AI Debate":
      return <Swords size={14} />;
    case "Multi-Agent":
      return <Users size={14} />;
    case "Legal Scholarship":
      return <Scale size={14} />;
    case "Hallucination":
      return <AlertTriangle size={14} />;
    case "Case Law":
      return <Gavel size={14} />;
    default:
      return <Brain size={14} />;
  }
}

export function WhyThisWorks() {
  return (
    <Flex direction="column" gap="6">
      {/* Section Header */}
      <Flex direction="column" gap="2" align="center">
        <Badge color="crimson" variant="soft" size="2">
          Research-Backed
        </Badge>
        <Heading size="7" align="center">
          Why Adversarial Analysis Works
        </Heading>
        <Text
          size="3"
          color="gray"
          align="center"
          style={{ maxWidth: 640 }}
        >
          Our approach isn&apos;t a guess -- it&apos;s grounded in decades of legal
          tradition and cutting-edge AI safety research. The adversarial
          system has been humanity&apos;s best truth-finding mechanism for
          centuries. We apply it to AI.
        </Text>
      </Flex>

      {/* Key Stats */}
      <Grid columns={{ initial: "2", sm: "4" }} gap="4">
        {stats.map((stat) => (
          <Card key={stat.label}>
            <Flex direction="column" align="center" gap="1" py="2">
              <Heading
                size="8"
                style={{ color: "var(--crimson-9)", letterSpacing: "-0.03em" }}
              >
                {stat.number}
              </Heading>
              <Text size="2" weight="medium" align="center">
                {stat.label}
              </Text>
              <Text
                size="1"
                color="gray"
                align="center"
                style={{ maxWidth: 200 }}
              >
                {stat.source}
              </Text>
            </Flex>
          </Card>
        ))}
      </Grid>

      <Separator size="4" />

      {/* The Core Insight */}
      <Card
        style={{
          background:
            "linear-gradient(135deg, var(--crimson-a2) 0%, var(--crimson-a1) 100%)",
          border: "1px solid var(--crimson-a4)",
        }}
      >
        <Flex direction="column" gap="3" p="2">
          <Flex align="center" gap="2">
            <Box className="diff-icon">
              <Brain size={18} />
            </Box>
            <Heading size="4">The Core Insight</Heading>
          </Flex>
          <Text size="3" style={{ lineHeight: 1.7 }}>
            A single AI reviewing a legal brief will miss weaknesses and
            hallucinate citations -- Stanford found that even GPT-4 fabricates
            legal facts 58% of the time. The adversarial system solves this:
            one agent attacks, another defends, and an impartial judge weighs the
            evidence. Lon Fuller argued in 1961 that adversarial challenge is
            the only effective means for combating the natural tendency to
            judge too swiftly -- a fact-finder who develops a premature
            hypothesis will unconsciously commit to it. LLMs exhibit this
            exact behavior. Our 6-agent pipeline breaks the pattern.
          </Text>
        </Flex>
      </Card>

      {/* Research Papers Grid */}
      <Flex direction="column" gap="3">
        <Heading size="5">The Research</Heading>
        <Grid columns={{ initial: "1", md: "2" }} gap="4">
          {papers.map((paper) => (
            <a
              key={paper.title}
              href={paper.url}
              target="_blank"
              rel="noopener noreferrer"
              style={{ textDecoration: "none", color: "inherit" }}
            >
              <Card
                variant="surface"
                className="feature-card"
                style={{ cursor: "pointer", height: "100%" }}
              >
                <Flex direction="column" gap="3">
                  <Flex justify="between" align="start" gap="2">
                    <Flex direction="column" gap="1" style={{ flex: 1 }}>
                      <Flex align="center" gap="2">
                        <Badge
                          color={categoryColor(paper.category)}
                          variant="soft"
                          size="1"
                        >
                          {categoryIcon(paper.category)}
                          {paper.category}
                        </Badge>
                        <Text size="1" color="gray">
                          {paper.year}
                        </Text>
                      </Flex>
                      <Heading size="3">{paper.title}</Heading>
                      <Text size="1" color="gray">
                        {paper.authors} -- {paper.venue}
                      </Text>
                    </Flex>
                    <ExternalLink
                      size={14}
                      style={{ color: "var(--gray-8)", flexShrink: 0, marginTop: 4 }}
                    />
                  </Flex>

                  <Separator size="4" />

                  <Flex direction="column" gap="2">
                    <Text size="2" style={{ lineHeight: 1.6 }}>
                      <Text weight="medium" size="2">
                        Finding:
                      </Text>{" "}
                      {paper.finding}
                    </Text>
                    <Text
                      size="1"
                      style={{
                        color: "var(--crimson-11)",
                        lineHeight: 1.5,
                      }}
                    >
                      {paper.relevance}
                    </Text>
                  </Flex>
                </Flex>
              </Card>
            </a>
          ))}
        </Grid>
      </Flex>

      {/* How It Maps to Our Pipeline */}
      <Card>
        <Flex direction="column" gap="4" p="2">
          <Heading size="4">How the Research Maps to Our Pipeline</Heading>
          <Flex direction="column" gap="3">
            {[
              {
                agent: "Attacker",
                icon: <Swords size={18} />,
                color: "var(--crimson-9)" as string,
                paper: "Irving et al. (2018), Perez et al. (2022)",
                desc: "The adversarial probe. Grounded in the AI Safety via Debate framework and red-teaming methodology -- adversarial agents expose flaws a cooperative reviewer would miss.",
              },
              {
                agent: "Defender",
                icon: <Shield size={18} />,
                color: "var(--blue-9)" as string,
                paper: "Du et al. (ICML 2024), Liang et al. (EMNLP 2024)",
                desc: "Multi-agent debate shows wrong initial answers converge on truth through rounds of challenge. The Defender breaks the Degeneration-of-Thought trap.",
              },
              {
                agent: "Judge",
                icon: <Gavel size={18} />,
                color: "var(--amber-9)" as string,
                paper: "Khan et al. (ICML 2024 Best Paper)",
                desc: "Non-expert judges achieve 88% accuracy when aided by structured debate vs. 60% baseline. The Judge leverages adversarial structure to make better decisions.",
              },
              {
                agent: "Citation Verifier",
                icon: <BookOpen size={18} />,
                color: "var(--green-9)" as string,
                paper: "Stanford HAI (2024, 2025)",
                desc: "With 58-88% hallucination rates on legal citations -- and even Lexis+ AI wrong 17% of the time -- a dedicated verification agent is a professional obligation.",
              },
              {
                agent: "Jurisdiction Expert",
                icon: <Scale size={18} />,
                color: "var(--purple-9)" as string,
                paper: "Thibaut & Walker (1975)",
                desc: "A brief that wins in one jurisdiction can lose in another. Procedural precision is the adversarial system's core requirement -- and its greatest strength.",
              },
              {
                agent: "Brief Rewriter",
                icon: <Brain size={18} />,
                color: "var(--orange-9)" as string,
                paper: "Mata v. Avianca (2023)",
                desc: "The lesson of $31K+ in sanctions: never file unreviewed AI output. The Rewriter produces a revised brief only after 5 other agents have vetted every claim.",
              },
            ].map((row) => (
              <Flex key={row.agent} gap="3" align="start">
                <Box
                  className="pipeline-icon"
                  style={
                    { "--pipe-color": row.color } as React.CSSProperties
                  }
                >
                  {row.icon}
                </Box>
                <Flex direction="column" gap="1" style={{ flex: 1 }}>
                  <Flex align="center" gap="2">
                    <Text size="2" weight="bold">
                      {row.agent}
                    </Text>
                    <Text size="1" color="gray">
                      {row.paper}
                    </Text>
                  </Flex>
                  <Text size="2" color="gray" style={{ lineHeight: 1.6 }}>
                    {row.desc}
                  </Text>
                </Flex>
              </Flex>
            ))}
          </Flex>
        </Flex>
      </Card>
    </Flex>
  );
}
