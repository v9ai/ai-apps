import type { Personality } from "@/lib/personalities/types";

const personality: Personality = {
  name: "Robert Nishihara",
  role: "Co-Founder & CEO",
  org: "Anyscale",
  description:
    "Co-creator of Ray, the open-source distributed computing framework powering AI workloads at OpenAI, Amazon, and NVIDIA. PhD from UC Berkeley under Ion Stoica. Built Anyscale to $1B+ valuation.",
  slug: "robert-nishihara",
  podcasts: [
    "Fiddler AI Explained",
    "O'Reilly Radar Podcast",
    "Frontlines",
    "Inspired Capital: Inspired in 15",
  ],
  github: "robertnishihara",
  papers: [
    {
      title:
        "Ray: A Distributed Framework for Emerging AI Applications",
      arxiv: "1712.05889",
      date: "2018-10-08",
    },
  ],
  knownFor: "Ray",
};

export default personality;
