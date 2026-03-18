export type Paper = {
  title: string;
  arxiv: string; // arXiv ID e.g. "2603.10031"
  date: string;  // YYYY-MM-DD
};

export type TimelineEvent = {
  date: string;
  event: string;
  url: string;
};

export type Contribution = {
  title: string;
  description: string;
  url: string;
};

export type Quote = {
  text: string;
  source: string;
  url: string;
};

export type PersonResearch = {
  slug: string;
  name: string;
  generated_at: string;
  bio: string;
  topics: string[];
  timeline: TimelineEvent[];
  key_contributions: Contribution[];
  quotes: Quote[];
  social: Record<string, string>;
  sources: { title: string; url: string }[];
};

export type Personality = {
  name: string;
  role: string;
  org: string;
  description: string;
  slug: string;
  podcasts: string[];
  github?: string; // GitHub username — avatar via github.com/{user}.png
  papers?: Paper[];
};

export type Category = {
  title: string;
  slug: string;
  personalities: Personality[];
};

export const categories: Category[] = [
  {
    title: "Lab Leaders & Founders",
    slug: "lab-leaders",
    personalities: [
      {
        name: "Sam Altman",
        role: "CEO",
        org: "OpenAI",
        description:
          "Appears everywhere: Lex Fridman, Dwarkesh, Bloomberg, CNBC, YC events.",
        slug: "sam-altman",
        podcasts: ["Lex Fridman", "Dwarkesh Podcast", "Bloomberg", "CNBC"],
      },
      {
        name: "Dario Amodei",
        role: "CEO",
        org: "Anthropic",
        description:
          "Recent Dwarkesh Podcast (Feb 2026) covering scaling hypothesis, economic diffusion of AI, and AGI timelines.",
        slug: "dario-amodei",
        podcasts: ["Dwarkesh Podcast", "Lex Fridman", "Big Technology", "Davos Panels"],
        github: "damodei",
      },
      {
        name: "Jensen Huang",
        role: "CEO",
        org: "NVIDIA",
        description:
          "Named one of TIME's most influential people in 2021 and 2024, keynotes at GTC, frequent podcast guest on AI infrastructure.",
        slug: "jensen-huang",
        podcasts: ["GTC Keynotes", "Bloomberg", "CNBC"],
      },
      {
        name: "Liang Wenfeng",
        role: "Founder & CEO",
        org: "DeepSeek",
        description:
          "Built DeepSeek-R1 for $5.6M, shocking Western AI. TIME 100 Most Influential in AI 2025. Famously reclusive.",
        slug: "liang-wenfeng",
        podcasts: ["ChinaTalk", "36Kr", "CCTV News"],
      },
      {
        name: "Yang Zhilin",
        role: "Founder & CEO",
        org: "Moonshot AI",
        description:
          "Author of Transformer-XL and XLNet papers. CMU doctorate, ex-Meta/Google Brain. Created Kimi chatbot.",
        slug: "yang-zhilin",
        podcasts: ["First Push", "36Kr", "LatePost"],
        github: "kimiyoung",
      },
    ],
  },
  {
    title: "Builders & Technical Leaders",
    slug: "builders",
    personalities: [
      {
        name: "Andrej Karpathy",
        role: "Founder, Eureka Labs",
        org: "Ex-OpenAI/Tesla",
        description:
          'Recent keynote at YC AI Startup School on "Software 3.0" where natural language becomes the programming interface.',
        slug: "andrej-karpathy",
        podcasts: ["Dwarkesh Podcast", "Lex Fridman", "YC Events"],
        github: "karpathy",
      },
      {
        name: "Boris Cherny",
        role: "Head of Claude Code",
        org: "Anthropic",
        description: "Extremely active in 2026 on the future of coding.",
        slug: "boris-cherny",
        podcasts: ["Lenny's Podcast", "Pragmatic Engineer", "MAD Podcast", "AI & I"],
        github: "bcherny",
      },
      {
        name: "Harrison Chase",
        role: "CEO",
        org: "LangChain",
        description:
          "Sequoia Training Data podcast (Jan 2026) on context engineering and long-horizon agents.",
        slug: "harrison-chase",
        podcasts: ["Sequoia Training Data", "VentureBeat", "This Week in Startups"],
        github: "hwchase17",
      },
      {
        name: "Jerry Liu",
        role: "CEO",
        org: "LlamaIndex",
        description:
          "DataFramed podcast covering AI agents for enterprise, document processing, and data structuring.",
        slug: "jerry-liu",
        podcasts: ["DataFramed", "Gradient Dissent", "MAD Podcast", "Latent Space"],
        github: "jerryjliu",
      },
      {
        name: "Ilya Sutskever",
        role: "Co-founder",
        org: "Safe Superintelligence (SSI)",
        description:
          'Famously warned that the "age of pre-training" was ending, calling training data the "fossil fuel" of AI.',
        slug: "ilya-sutskever",
        podcasts: ["Lex Fridman", "NeurIPS"],
      },
      {
        name: "Joao Moura",
        role: "Co-Founder & CEO",
        org: "CrewAI",
        description:
          "Built CrewAI into 475M+ agent automations/month. Active speaker on autonomous agents in enterprise AI.",
        slug: "joao-moura",
        podcasts: ["Software Engineering Daily", "Chain of Thought", "ODSC AI X", "Data Exchange"],
        github: "joaomdmoura",
      },
      {
        name: "Samuel Colvin",
        role: "Creator & CEO",
        org: "Pydantic",
        description:
          "Created Pydantic (most used Python validation library) and Pydantic AI, bringing FastAPI-like ergonomics to agents.",
        slug: "samuel-colvin",
        podcasts: ["Software Engineering Daily", "SE Radio", "Latent Space", "Vanishing Gradients"],
        github: "samuelcolvin",
      },
    ],
  },
  {
    title: "Researchers & Thinkers",
    slug: "researchers",
    personalities: [
      {
        name: "Yann LeCun",
        role: "Chief AI Scientist",
        org: "Meta",
        description:
          "Lex Fridman regular on AI research directions, active on X with contrarian takes on current LLM approaches.",
        slug: "yann-lecun",
        podcasts: ["Lex Fridman", "Machine Learning Street Talk"],
        github: "ylecun",
      },
      {
        name: "Demis Hassabis",
        role: "CEO",
        org: "Google DeepMind",
        description:
          "Nobel Prize winner, appears on Fridman, podcasts about AlphaFold, Gemini, and AGI paths.",
        slug: "demis-hassabis",
        podcasts: ["Lex Fridman", "TED", "Bloomberg"],
      },
      {
        name: "Fei-Fei Li",
        role: "Professor & Founder",
        org: "Stanford / World Labs",
        description: "AI ethics, computer vision pioneer.",
        slug: "fei-fei-li",
        podcasts: ["TED", "Research Podcasts"],
        github: "feifeili",
      },
      {
        name: "Geoffrey Hinton",
        role: '"Godfather of AI"',
        org: "University of Toronto",
        description:
          "Nobel Prize winner, high-profile appearances on AI safety and existential risk.",
        slug: "geoffrey-hinton",
        podcasts: ["Lex Fridman", "60 Minutes", "BBC"],
      },
      {
        name: "Athos Georgiou",
        role: "Founder & CEO",
        org: "NCA",
        description:
          "Applied AI researcher publishing on LLM inference optimization on AMD GPUs and multimodal document retrieval. Builds production RAG and agent systems.",
        slug: "athos-georgiou",
        podcasts: [],
        github: "athrael-soju",
        papers: [
          {
            title: "Architecture-Aware LLM Inference Optimization on AMD Instinct GPUs: A Comprehensive Benchmark and Deployment Study",
            arxiv: "2603.10031",
            date: "2026-02-27",
          },
          {
            title: "Spatially-Grounded Document Retrieval via Patch-to-Region Relevance Propagation",
            arxiv: "2512.02660",
            date: "2025-12-02",
          },
        ],
      },
    ],
  },
  {
    title: "Podcast Hosts & AI Personalities",
    slug: "hosts",
    personalities: [
      {
        name: "Lex Fridman",
        role: "MIT Researcher & Host",
        org: "Lex Fridman Podcast",
        description:
          "Marathon deep-dives with AI luminaries including Bengio, Altman, LeCun, and Karpathy.",
        slug: "lex-fridman",
        podcasts: ["Lex Fridman Podcast"],
        github: "lexfridman",
      },
      {
        name: "Dwarkesh Patel",
        role: "Host",
        org: "Dwarkesh Podcast",
        description:
          'His Dario Amodei episode was called "the most important AI podcast of 2026."',
        slug: "dwarkesh-patel",
        podcasts: ["Dwarkesh Podcast"],
        github: "dwarkeshsp",
      },
    ],
  },
  {
    title: "Rising Infrastructure & Product Leaders",
    slug: "rising-leaders",
    personalities: [
      {
        name: "Amjad Masad",
        role: "CEO",
        org: "Replit",
        description:
          "Frequent podcast guest on AI-native development, vibe coding, and the future of software creation.",
        slug: "amjad-masad",
        podcasts: ["Lex Fridman", "This Week in Startups", "Latent Space"],
        github: "amasad",
      },
      {
        name: "Mustafa Suleyman",
        role: "CEO, Microsoft AI",
        org: "Microsoft",
        description:
          "Co-founded DeepMind and Inflection AI before becoming CEO at Microsoft AI.",
        slug: "mustafa-suleyman",
        podcasts: ["Lex Fridman", "Bloomberg", "TED"],
      },
      {
        name: "Amanda Askell",
        role: "Character Lead",
        org: "Anthropic",
        description:
          "Growing podcast presence on AI alignment, Claude's personality, and prompt engineering philosophy.",
        slug: "amanda-askell",
        podcasts: ["Latent Space", "AI Research Podcasts"],
        github: "aaskell",
      },
      {
        name: "Noam Shazeer",
        role: "CEO",
        org: "Character.AI / Google",
        description:
          "Pioneer of the Transformer architecture, rare but extremely high-value appearances.",
        slug: "noam-shazeer",
        podcasts: ["Lex Fridman", "NeurIPS"],
      },
    ],
  },
  {
    title: "AI Infrastructure & Inference",
    slug: "infrastructure",
    personalities: [
      {
        name: "Swami Sivasubramanian",
        role: "VP, Agentic AI",
        org: "AWS",
        description:
          "Built DynamoDB, SageMaker, and Bedrock. 250+ patents. Keynote speaker at AWS re:Invent.",
        slug: "swami-sivasubramanian",
        podcasts: ["AWS Executive Insights", "WEF Meet the Leader", "CNBC"],
      },
      {
        name: "Woosuk Kwon",
        role: "Creator of vLLM; CTO",
        org: "Inferact / UC Berkeley",
        description:
          "Co-created vLLM, the most adopted open-source LLM inference engine. Inferact launched at $800M valuation.",
        slug: "woosuk-kwon",
        podcasts: ["The a16z Show", "PyTorch Conference"],
        github: "WoosukKwon",
      },
      {
        name: "Jeffrey Morgan",
        role: "Co-Founder & CEO",
        org: "Ollama",
        description:
          "Ex-Docker senior engineer. Ollama enables running LLMs locally. Low public profile, active on GitHub.",
        slug: "jeffrey-morgan",
        podcasts: ["GitHub", "X/Twitter"],
        github: "jmorganca",
      },
      {
        name: "Alex Atallah",
        role: "Co-Founder & CEO",
        org: "OpenRouter",
        description:
          "Previously co-founded OpenSea. OpenRouter aggregates 400+ LLMs behind a single API. Raised $40M.",
        slug: "alex-atallah",
        podcasts: ["Bankless Limitless", "Around the Prompt"],
        github: "alexanderatallah",
      },
      {
        name: "Yagil Burowski",
        role: "Founder & CEO",
        org: "LM Studio",
        description:
          "Ex-Apple engineer. LM Studio lets users run open-source LLMs locally with full data privacy.",
        slug: "yagil-burowski",
        podcasts: ["Data Driven NYC"],
        github: "yagil",
      },
      {
        name: "Krrish Dholakia",
        role: "Co-Founder & CEO",
        org: "LiteLLM / BerriAI",
        description:
          "Open-source LLM gateway (18K+ stars) providing unified OpenAI-compatible API for 100+ LLMs. YC W23.",
        slug: "krrish-dholakia",
        podcasts: ["GitHub", "LinkedIn"],
        github: "krrishdholakia",
      },
      {
        name: "Rohit Agarwal",
        role: "Co-Founder & CEO",
        org: "Portkey",
        description:
          "Built a unified control plane for production AI. Hit $5M revenue with 13-person team. $15M Series A.",
        slug: "rohit-agarwal",
        podcasts: ["Intelligence Unscripted", "Weaviate Podcast", "Lightspeed India"],
        github: "roh26it",
      },
    ],
  },
  {
    title: "Vector Database Founders",
    slug: "vector-dbs",
    personalities: [
      {
        name: "Jeff Huber",
        role: "Co-Founder & CEO",
        org: "Chroma",
        description:
          "Previously co-founded Standard Cyborg. Chroma is the leading open-source AI-native embeddings database.",
        slug: "jeff-huber",
        podcasts: ["Latent Space", "High Agency", "Founded & Funded"],
        github: "jeffchuber",
      },
      {
        name: "Bob van Luijt",
        role: "Co-Founder & CEO",
        org: "Weaviate",
        description:
          "Studied jazz composition before pivoting to tech. Built Weaviate into a central AI infrastructure component. $67M+ raised.",
        slug: "bob-van-luijt",
        podcasts: ["Weaviate Podcast", "MAD Podcast", "Software in Blue"],
        github: "bobvanluijt",
      },
      {
        name: "Andre Zayarni",
        role: "Co-Founder & CEO",
        org: "Qdrant",
        description:
          "Berlin-based, purpose-built open-source vector search engine in Rust. $50M Series B.",
        slug: "andre-zayarni",
        podcasts: ["Cerebral Valley", "Future of Computing"],
        github: "azayarni",
      },
      {
        name: "Vasilije Markovic",
        role: "Co-Founder & CEO",
        org: "Cognee",
        description:
          "Open-source AI memory engine combining graph and vector databases for semantic understanding.",
        slug: "vasilije-markovic",
        podcasts: ["Open Source Ready", "Data Engineering Podcast", "AI Engineering Podcast"],
        github: "Vasilije1990",
      },
      {
        name: "Shay Banon",
        role: "Co-Founder & CTO",
        org: "Elastic",
        description:
          "Wrote the first lines of Elasticsearch in 2009. Built Elastic into a public company (2018 IPO).",
        slug: "shay-banon",
        podcasts: ["Changelog", "The Decibel Podcast", "ARCHITECHT Show"],
        github: "kimchy",
      },
      {
        name: "Andrew Kane",
        role: "Creator & Maintainer",
        org: "PGVector (open source)",
        description:
          "Prolific OSS developer (430+ repos). Created pgvector — the default vector search extension for PostgreSQL.",
        slug: "andrew-kane",
        podcasts: ["GitHub"],
        github: "ankane",
      },
    ],
  },
];

const categoryColors: Record<string, string> = {
  "lab-leaders": "from-violet-500 to-purple-600",
  builders: "from-blue-500 to-cyan-600",
  researchers: "from-emerald-500 to-teal-600",
  hosts: "from-amber-500 to-orange-600",
  "rising-leaders": "from-rose-500 to-pink-600",
  infrastructure: "from-sky-500 to-indigo-600",
  "vector-dbs": "from-lime-500 to-green-600",
};

export function getCategoryColor(slug: string): string {
  return categoryColors[slug] ?? "from-gray-500 to-gray-600";
}

export function getInitials(name: string): string {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase();
}

export function getAvatarUrl(p: Personality): string | null {
  return p.github ? `https://github.com/${p.github}.png?size=200` : null;
}

export function getAllPersonalities(): Personality[] {
  return categories.flatMap((c) => c.personalities);
}

export function getPersonalityBySlug(slug: string): Personality | undefined {
  return getAllPersonalities().find((p) => p.slug === slug);
}

export function getCategoryForPersonality(slug: string): Category | undefined {
  return categories.find((c) => c.personalities.some((p) => p.slug === slug));
}

export function getResearch(slug: string): PersonResearch | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require(`./research/${slug}.json`) as PersonResearch;
  } catch {
    return null;
  }
}
