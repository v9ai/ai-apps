import type { Personality } from "@/lib/personalities/types";

const personality: Personality = {
  name: "Richard Liaw",
  role: "Product Leader / Co-creator of Ray Tune",
  org: "Anyscale",
  description:
    "Co-creator of Ray Tune, co-author of the Ray OSDI paper and O'Reilly's 'Learning Ray'. UC Berkeley RISELab researcher turned Anyscale product leader.",
  slug: "richard-liaw",
  podcasts: ["Kubernetes Podcast from Google", "Software Engineering Daily"],
  github: "richardliaw",
  knownFor: "Ray Tune",
  papers: [
    {
      title: "Tune: A Research Platform for Distributed Model Selection and Training",
      arxiv: "1807.05118",
      date: "2018-07-13",
    },
    {
      title: "Ray: A Distributed Framework for Emerging AI Applications",
      date: "2018-10-08",
    },
    {
      title: "RLlib: Abstractions for Distributed Reinforcement Learning",
      date: "2017-12-26",
    },
    {
      title: "HyperSched: Dynamic Resource Reallocation for Model Development on a Deadline",
      date: "2019-11-20",
    },
    {
      title: "RubberBand: Cloud-based Hyperparameter Tuning",
      date: "2021-04-21",
    },
  ],
};

export default personality;
