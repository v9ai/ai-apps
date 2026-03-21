import type { Personality } from "@/lib/personalities/types";

const personality: Personality = {
  name: "Hongyi Zhang",
  role: "Research Scientist",
  org: "ByteDance",
  description:
    "Co-creator of Mixup (11K+ citations), one of the most influential data augmentation techniques in deep learning. PhD from MIT under Suvrit Sra on Riemannian optimization. Created Fixup Initialization for training deep ResNets without normalization. Now leads Monetization GenAI research at ByteDance.",
  slug: "hongyi-zhang",
  podcasts: [],
  github: "hongyi-zhang",
  papers: [
    {
      title: "mixup: Beyond Empirical Risk Minimization",
      arxiv: "1710.09412",
      date: "2017-10-25",
    },
    {
      title: "Fixup Initialization: Residual Learning Without Normalization",
      arxiv: "1901.09321",
      date: "2019-01-27",
    },
    {
      title: "Riemannian SVRG: Fast Stochastic Optimization on Riemannian Manifolds",
      arxiv: "1605.07147",
      date: "2016-05-23",
    },
    {
      title: "Towards Riemannian Accelerated Gradient Methods",
      arxiv: "1806.02812",
      date: "2018-06-07",
    },
  ],
  knownFor: "Mixup data augmentation",
};

export default personality;
