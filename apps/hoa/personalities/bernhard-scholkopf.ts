import type { Personality } from "@/lib/personalities/types";

const personality: Personality = {
  name: "Bernhard Scholkopf",
  role: "Director, Dept. of Empirical Inference",
  org: "Max Planck Institute for Intelligent Systems",
  description:
    "Pioneer of kernel methods and causal inference in ML. Co-founded ELLIS, leads causal representation learning research, and contributed to exoplanet discovery.",
  slug: "bernhard-scholkopf",
  linkedinImage: "https://2025.ijcai.org/wp-content/invited_talks/bernhard_scholkopf.jpg",
  podcasts: ["Causal Bandits Podcast", "Lex Fridman"],
  papers: [
    {
      title: "Causality for Machine Learning",
      arxiv: "1911.10500",
      date: "2019-11-22",
    },
    {
      title: "Towards Causal Representation Learning",
      arxiv: "2102.11107",
      date: "2021-02-22",
    },
    {
      title: "From Statistical to Causal Learning",
      arxiv: "2204.00607",
      date: "2022-04-01",
    },
  ],
  knownFor: "Kernel Methods & Causality",
};

export default personality;
