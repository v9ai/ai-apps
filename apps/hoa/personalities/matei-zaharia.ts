import type { Personality } from "@/lib/personalities/types";

const personality: Personality = {
  name: "Matei Zaharia",
  role: "CTO & Co-Founder",
  org: "Databricks",
  description:
    "Creator of Apache Spark. Co-founder and CTO of Databricks ($134B valuation). Associate Professor at UC Berkeley. Co-created MLflow, Delta Lake, ColBERT, and DSPy. Pioneered the concept of compound AI systems. ACM Doctoral Dissertation Award winner.",
  slug: "matei-zaharia",
  podcasts: ["ACM ByteCast", "Data Radicals", "Software Engineering Daily"],
  github: "mateiz",
  papers: [
    {
      title:
        "Resilient Distributed Datasets: A Fault-Tolerant Abstraction for In-Memory Cluster Computing",
      doi: "10.5555/2228298.2228301",
      date: "2012-04-25",
    },
    {
      title: "Accelerating the Machine Learning Lifecycle with MLflow",
      date: "2018-12-01",
    },
    {
      title:
        "ColBERTv2: Effective and Efficient Retrieval via Lightweight Late Interaction",
      arxiv: "2112.01488",
      date: "2022-05-01",
    },
    {
      title:
        "Compiling Declarative Language Model Calls into Self-Improving Pipelines (DSPy)",
      arxiv: "2310.03714",
      date: "2024-01-16",
    },
  ],
  knownFor: "Apache Spark",
};

export default personality;
