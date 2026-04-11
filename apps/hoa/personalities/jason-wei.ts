import type { Personality } from "@/lib/personalities/types";

const personality: Personality = {
  name: "Jason Wei",
  role: "Research Scientist",
  org: "Meta Superintelligence Labs",
  description:
    "Pioneered chain-of-thought prompting, instruction tuning (FLAN), and emergent abilities of LLMs at Google Brain. Co-created OpenAI's o1 reasoning model. Now at Meta Superintelligence Labs working on reasoning and reinforcement learning.",
  slug: "jason-wei",
  podcasts: ["Dwarkesh Podcast", "Stanford AI Club", "Best AI Papers Explained"],
  github: "jasonwei20",
  papers: [
    {
      title: "Chain-of-Thought Prompting Elicits Reasoning in Large Language Models",
      arxiv: "2201.11903",
      date: "2022-01-28",
    },
    {
      title: "Finetuned Language Models Are Zero-Shot Learners",
      arxiv: "2109.01652",
      date: "2021-09-03",
    },
    {
      title: "Emergent Abilities of Large Language Models",
      arxiv: "2206.07682",
      date: "2022-06-15",
    },
    {
      title: "Scaling Instruction-Finetuned Language Models",
      arxiv: "2210.11416",
      date: "2022-10-20",
    },
    {
      title: "EDA: Easy Data Augmentation Techniques for Boosting Performance on Text Classification Tasks",
      arxiv: "1901.11196",
      date: "2019-01-31",
    },
  ],
  knownFor: "Chain-of-thought prompting",
};

export default personality;
