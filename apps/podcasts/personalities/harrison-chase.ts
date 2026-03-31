import type { Personality } from "@/lib/personalities/types";

const personality: Personality = {
  name: "Harrison Chase",
  role: "CEO",
  org: "LangChain",
  description:
    "Built LangChain into the dominant LLM orchestration framework. Coined 'context engineering' as the key discipline for agent builders. Publishes on data quality assertions for LLM pipelines.",
  slug: "harrison-chase",
  podcasts: [
    "Sequoia Training Data",
    "This Week in Startups",
    "TWIML AI Podcast",
    "a16z Podcast",
    "Latent Space",
    "No Priors",
    "Unsupervised Learning",
    "The Generalist",
    "Thursday Nights in AI",
    "Gradient Dissent",
  ],
  github: "hwchase17",
  papers: [
    {
      title: "PROMPTEVALS: A Dataset of Assertions and Guardrails for Custom Production Large Language Model Pipelines",
      arxiv: "2504.14738",
      date: "2025-04-20",
    },
    {
      title: "SPADE: Synthesizing Data Quality Assertions for Large Language Model Pipelines",
      arxiv: "2401.03038",
      date: "2024-01-05",
    },
  ],
  knownFor: "LangChain",
};

export default personality;
