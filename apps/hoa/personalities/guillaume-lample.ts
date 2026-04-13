import type { Personality } from "@/lib/personalities/types";

const personality: Personality = {
  name: "Guillaume Lample",
  role: "Co-founder & Chief Scientist",
  org: "Mistral AI",
  description:
    "Co-founded Mistral AI after leading research at Meta FAIR. Expert in unsupervised machine translation and large language models. Drove Mistral's technical architecture.",
  slug: "guillaume-lample",
  linkedinImage: "https://media.letelegramme.fr/api/v1/images/view/68de314a22f05644280d9832/web_portrait_l/68de314a22f05644280d9832.1",
  podcasts: ["Latent Space", "MLST"],
  papers: [
    {
      title: "Mistral 7B",
      arxiv: "2310.06825",
      date: "2023-10-10",
    },
    {
      title: "Unsupervised Machine Translation Using Monolingual Corpora Only",
      arxiv: "1711.00043",
      date: "2017-10-31",
    },
  ],
  knownFor: "Mistral 7B",
};

export default personality;
