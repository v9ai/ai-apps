import type { Personality } from "@/lib/personalities/types";

const personality: Personality = {
  name: "Connor Holmes",
  role: "Systems Lead, Sora",
  org: "OpenAI",
  description:
    "Core DeepSpeed contributor at Microsoft (FastGen, ZeRO++, DeepSpeed-Chat). PhD in HPC from Colorado School of Mines. Now Systems Lead for Sora at OpenAI.",
  slug: "connor-holmes",
  podcasts: [],
  github: "cmikeh2",
  papers: [
    {
      title: "DeepSpeed-FastGen: High-throughput Text Generation for LLMs via MII and DeepSpeed-Inference",
      arxiv: "2401.08671",
      date: "2024-01-09",
    },
    {
      title: "ZeRO++: Extremely Efficient Collective Communication for Giant Model Training",
      arxiv: "2306.10209",
      date: "2023-06-16",
    },
    {
      title: "DeepSpeed-Chat: Easy, Fast and Affordable RLHF Training of ChatGPT-like Models at All Scales",
      arxiv: "2308.01320",
      date: "2023-08-02",
    },
    {
      title: "DeepSpeed4Science Initiative: Enabling Large-Scale Scientific Discovery",
      arxiv: "2310.04610",
      date: "2023-10-06",
    },
    {
      title: "Random-LTD: Random and Layerwise Token Dropping Brings Efficient Training for Large-scale Transformers",
      arxiv: "2211.11586",
      date: "2022-11-17",
    },
    {
      title: "GRNN: Low-Latency and Scalable RNN Inference on GPUs",
      doi: "10.1145/3302424.3303949",
      date: "2019-03-25",
    },
  ],
  knownFor: "DeepSpeed-FastGen",
};

export default personality;
