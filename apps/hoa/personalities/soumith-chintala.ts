import type { Personality } from "@/lib/personalities/types";

const personality: Personality = {
  name: "Soumith Chintala",
  role: "CTO",
  org: "Thinking Machines Lab",
  description:
    "Co-creator and long-time lead of PyTorch. Spent 11 years at Meta FAIR as VP of AI Infrastructure. Co-authored foundational GAN papers (DCGAN, Wasserstein GAN). Now CTO at Mira Murati's Thinking Machines Lab.",
  slug: "soumith-chintala",
  podcasts: ["Latent Space", "The Gradient", "Gradient Dissent", "Lex Fridman"],
  github: "soumith",
  papers: [
    {
      title: "Unsupervised Representation Learning with Deep Convolutional Generative Adversarial Networks",
      arxiv: "1511.06434",
      date: "2015-11-19",
    },
    {
      title: "Wasserstein GAN",
      arxiv: "1701.07875",
      date: "2017-01-26",
    },
  ],
  knownFor: "PyTorch",
};

export default personality;
