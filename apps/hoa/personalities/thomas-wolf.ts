import type { Personality } from "@/lib/personalities/types";

const personality: Personality = {
  name: "Thomas Wolf",
  role: "Co-founder & CSO",
  org: "Hugging Face",
  description:
    "Co-founded Hugging Face and created the Transformers and Datasets libraries. Led BigScience/BLOOM, the largest open AI research collaboration. Now pushing open-source robotics with LeRobot.",
  slug: "thomas-wolf",
  podcasts: ["Training Data (Sequoia)", "Practical AI", "MLOps Community", "TWIML AI", "Analytics Vidhya", "Prosus From Data to Dollars"],
  github: "thomwolf",
  knownFor: "Hugging Face Transformers",
  papers: [
    {
      title: "HuggingFace's Transformers: State-of-the-art Natural Language Processing",
      arxiv: "1910.03771",
      date: "2020-10-09",
    },
    {
      title: "DistilBERT, a distilled version of BERT: smaller, faster, cheaper and lighter",
      arxiv: "1910.01108",
      date: "2019-10-02",
    },
    {
      title: "Datasets: A Community Library for Natural Language Processing",
      arxiv: "2109.02846",
      date: "2021-09-07",
    },
    {
      title: "The FineWeb Datasets: Decanting the Web for the Finest Text Data at Scale",
      arxiv: "2406.17557",
      date: "2024-06-25",
    },
  ],
};

export default personality;
