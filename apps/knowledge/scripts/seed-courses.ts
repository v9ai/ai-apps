/**
 * Seed Class Central course data into external_courses + lesson_courses.
 * Run: npm run seed:courses
 *
 * Each entry has a `classcentralUrl` that links to a Class Central search
 * pre-filtered to that course title + provider (always resolves correctly).
 */
import { db } from "@/src/db";
import { externalCourses, lessonCourses } from "@/src/db/schema";
import { eq, and } from "drizzle-orm";

interface CourseEntry {
  title: string;
  provider: string;
  description: string;
  level: "Beginner" | "Intermediate" | "Advanced";
  isFree: boolean;
  rating?: number;
  reviewCount?: number;
  durationHours?: number;
  /** Class Central URL — use search URL for reliability */
  url: string;
  /** Lesson slugs this course maps to */
  slugs: string[];
}

// ---------------------------------------------------------------------------
// Curated catalog
// URL convention: https://www.classcentral.com/search?q={encoded_title}
// ---------------------------------------------------------------------------
const CATALOG: CourseEntry[] = [
  // ── Foundations & Architecture ──────────────────────────────────────────
  {
    title: "Neural Networks and Deep Learning",
    provider: "DeepLearning.AI / Coursera",
    description:
      "Andrew Ng's flagship deep-learning course — build and train neural networks from scratch, covering forward/backprop, vectorization, and shallow vs. deep nets.",
    level: "Beginner",
    isFree: true,
    rating: 4.9,
    reviewCount: 44200,
    durationHours: 12,
    url: "https://www.classcentral.com/course/neural-networks-deep-learning-9058",
    slugs: ["transformer-architecture", "model-architectures", "scaling-laws", "pretraining-data"],
  },
  {
    title: "Natural Language Processing Specialization",
    provider: "DeepLearning.AI / Coursera",
    description:
      "Four-course NLP series covering sentiment analysis, machine translation, attention mechanisms, and Transformer-based models in practice.",
    level: "Intermediate",
    isFree: true,
    rating: 4.8,
    reviewCount: 18500,
    durationHours: 80,
    url: "https://www.classcentral.com/search?q=natural+language+processing+specialization+deeplearning.ai",
    slugs: ["transformer-architecture", "tokenization", "embeddings", "model-architectures"],
  },
  {
    title: "CS224N: Natural Language Processing with Deep Learning",
    provider: "Stanford University",
    description:
      "Stanford's graduate NLP course — Transformers, attention, subword tokenization, pre-training, and modern NLP architectures.",
    level: "Advanced",
    isFree: true,
    rating: 4.9,
    reviewCount: 5200,
    durationHours: 60,
    url: "https://www.classcentral.com/course/stanford-natural-language-processing-with-deep-learning-13838",
    slugs: ["transformer-architecture", "tokenization", "embeddings", "model-architectures", "scaling-laws"],
  },
  {
    title: "Efficient ML: Model Optimization Techniques",
    provider: "MIT / edX",
    description:
      "Covers quantization, pruning, knowledge distillation, and hardware-aware neural architecture search for efficient inference.",
    level: "Advanced",
    isFree: true,
    rating: 4.7,
    reviewCount: 3100,
    durationHours: 40,
    url: "https://www.classcentral.com/search?q=efficient+machine+learning+model+optimization+MIT",
    slugs: ["inference-optimization", "distillation-compression"],
  },

  // ── Prompting & In-Context Learning ────────────────────────────────────
  {
    title: "ChatGPT Prompt Engineering for Developers",
    provider: "DeepLearning.AI",
    description:
      "Isa Fulford & Andrew Ng's short course — iterative prompt development, summarization, inference, transforming, expanding, and building a chatbot.",
    level: "Beginner",
    isFree: true,
    rating: 4.8,
    reviewCount: 29000,
    durationHours: 2,
    url: "https://www.classcentral.com/search?q=chatgpt+prompt+engineering+for+developers+deeplearning.ai",
    slugs: ["prompt-engineering-fundamentals", "few-shot-chain-of-thought", "system-prompts", "structured-output"],
  },
  {
    title: "Prompt Engineering with Llama 2 & 3",
    provider: "DeepLearning.AI / Meta",
    description:
      "Best practices for prompting Meta's Llama models — zero-shot, few-shot, chain-of-thought, and tool-use patterns with open-weight LLMs.",
    level: "Beginner",
    isFree: true,
    rating: 4.7,
    reviewCount: 11000,
    durationHours: 2,
    url: "https://www.classcentral.com/search?q=prompt+engineering+with+llama+2+deeplearning.ai",
    slugs: ["prompt-engineering-fundamentals", "few-shot-chain-of-thought", "adversarial-prompting"],
  },
  {
    title: "Prompt Engineering Guide (Course)",
    provider: "DAIR.AI",
    description:
      "Comprehensive open course on prompt engineering — techniques, applications, models, and limitations with practical examples.",
    level: "Beginner",
    isFree: true,
    rating: 4.6,
    reviewCount: 6400,
    durationHours: 8,
    url: "https://www.classcentral.com/search?q=prompt+engineering+guide+DAIR.AI",
    slugs: ["prompt-engineering-fundamentals", "prompt-optimization", "adversarial-prompting"],
  },

  // ── RAG & Retrieval ─────────────────────────────────────────────────────
  {
    title: "LangChain for LLM Application Development",
    provider: "DeepLearning.AI",
    description:
      "Build LLM-powered apps with LangChain — models, prompts, memory, chains, Q&A, evaluation, and agents with Harrison Chase.",
    level: "Beginner",
    isFree: true,
    rating: 4.7,
    reviewCount: 24500,
    durationHours: 3,
    url: "https://www.classcentral.com/search?q=langchain+for+llm+application+development+deeplearning.ai",
    slugs: ["vector-databases", "chunking-strategies", "retrieval-strategies", "embedding-models"],
  },
  {
    title: "Building and Evaluating Advanced RAG",
    provider: "DeepLearning.AI / LlamaIndex",
    description:
      "Advanced RAG techniques — sentence window retrieval, auto-merging, TruLens evaluation, RAG triad (context relevance, groundedness, answer relevance).",
    level: "Intermediate",
    isFree: true,
    rating: 4.8,
    reviewCount: 9800,
    durationHours: 2,
    url: "https://www.classcentral.com/search?q=building+evaluating+advanced+rag+deeplearning.ai+llamaindex",
    slugs: ["advanced-rag", "rag-evaluation", "retrieval-strategies", "chunking-strategies"],
  },
  {
    title: "Vector Databases: from Embeddings to Applications",
    provider: "DeepLearning.AI / Weaviate",
    description:
      "Understand vector embeddings, build semantic search, implement RAG with Weaviate, and explore sparse vs. dense retrieval.",
    level: "Beginner",
    isFree: true,
    rating: 4.7,
    reviewCount: 13200,
    durationHours: 2,
    url: "https://www.classcentral.com/search?q=vector+databases+embeddings+applications+weaviate+deeplearning.ai",
    slugs: ["vector-databases", "embedding-models", "retrieval-strategies"],
  },
  {
    title: "Knowledge Graphs for RAG",
    provider: "DeepLearning.AI / Neo4j",
    description:
      "Use knowledge graphs to augment LLMs — build graph-based RAG pipelines with Neo4j, Cypher queries, and entity extraction.",
    level: "Intermediate",
    isFree: true,
    rating: 4.6,
    reviewCount: 5600,
    durationHours: 2,
    url: "https://www.classcentral.com/search?q=knowledge+graphs+RAG+neo4j+deeplearning.ai",
    slugs: ["advanced-rag", "retrieval-strategies"],
  },

  // ── Fine-tuning & Training ──────────────────────────────────────────────
  {
    title: "Finetuning Large Language Models",
    provider: "DeepLearning.AI / Lamini",
    description:
      "When and how to fine-tune LLMs — data preparation, training loop, evaluation, LoRA, and comparing fine-tuning vs. prompting.",
    level: "Intermediate",
    isFree: true,
    rating: 4.7,
    reviewCount: 16000,
    durationHours: 2,
    url: "https://www.classcentral.com/search?q=finetuning+large+language+models+deeplearning.ai+lamini",
    slugs: ["fine-tuning-fundamentals", "lora-adapters", "dataset-curation"],
  },
  {
    title: "Reinforcement Learning from Human Feedback",
    provider: "DeepLearning.AI",
    description:
      "RLHF from scratch — reward modeling, PPO, Constitutional AI, and how alignment training shapes LLM behavior.",
    level: "Intermediate",
    isFree: true,
    rating: 4.7,
    reviewCount: 8900,
    durationHours: 2,
    url: "https://www.classcentral.com/search?q=reinforcement+learning+human+feedback+deeplearning.ai",
    slugs: ["rlhf-preference", "fine-tuning-fundamentals"],
  },
  {
    title: "Efficiently Serving LLMs",
    provider: "DeepLearning.AI / Predibase",
    description:
      "Explore how LoRA and QLoRA adapters enable efficient multi-tenant serving, batching, and parameter-efficient fine-tuning at scale.",
    level: "Intermediate",
    isFree: true,
    rating: 4.6,
    reviewCount: 6200,
    durationHours: 2,
    url: "https://www.classcentral.com/search?q=efficiently+serving+LLMs+deeplearning.ai+predibase",
    slugs: ["lora-adapters", "inference-optimization", "fine-tuning-fundamentals"],
  },

  // ── Context Engineering ─────────────────────────────────────────────────
  {
    title: "Building Systems with the ChatGPT API",
    provider: "DeepLearning.AI",
    description:
      "Multi-step pipelines, chain-of-thought reasoning, input/output moderation, and building multi-turn conversation systems.",
    level: "Beginner",
    isFree: true,
    rating: 4.8,
    reviewCount: 18700,
    durationHours: 2,
    url: "https://www.classcentral.com/search?q=building+systems+chatgpt+api+deeplearning.ai",
    slugs: ["context-engineering", "context-window-management", "system-prompts"],
  },
  {
    title: "LLM Twin: Building Your Production-Ready Personal AI",
    provider: "Paul Iusztin / DecodingML",
    description:
      "End-to-end production LLM project: feature pipeline, RAG, fine-tuning, and context assembly with cloud deployment.",
    level: "Advanced",
    isFree: false,
    rating: 4.7,
    reviewCount: 1800,
    durationHours: 20,
    url: "https://www.classcentral.com/search?q=LLM+twin+production+personal+AI+decodingml",
    slugs: ["context-engineering", "memory-architectures", "dynamic-context-assembly", "context-compression"],
  },

  // ── Agents & Harnesses ──────────────────────────────────────────────────
  {
    title: "AI Agents in LangGraph",
    provider: "DeepLearning.AI / LangChain",
    description:
      "Build agentic systems with LangGraph — stateful agents, memory, human-in-the-loop, and multi-agent orchestration patterns.",
    level: "Intermediate",
    isFree: true,
    rating: 4.8,
    reviewCount: 14500,
    durationHours: 3,
    url: "https://www.classcentral.com/search?q=AI+agents+in+langgraph+deeplearning.ai",
    slugs: ["agent-architectures", "multi-agent-systems", "agent-memory", "agent-orchestration", "agent-harnesses"],
  },
  {
    title: "Functions, Tools and Agents with LangChain",
    provider: "DeepLearning.AI",
    description:
      "OpenAI function calling, LangChain tools and toolkits, tagging, extraction, ReAct and OpenAI agent patterns.",
    level: "Intermediate",
    isFree: true,
    rating: 4.7,
    reviewCount: 11200,
    durationHours: 3,
    url: "https://www.classcentral.com/search?q=functions+tools+agents+langchain+deeplearning.ai",
    slugs: ["function-calling", "agent-architectures", "agent-sdks"],
  },
  {
    title: "Multi AI Agent Systems with crewAI",
    provider: "DeepLearning.AI / crewAI",
    description:
      "Design and deploy multi-agent systems — role-based agents, task delegation, tool integration, and real-world automation workflows.",
    level: "Intermediate",
    isFree: true,
    rating: 4.7,
    reviewCount: 9600,
    durationHours: 3,
    url: "https://www.classcentral.com/search?q=multi+AI+agent+systems+crewAI+deeplearning.ai",
    slugs: ["multi-agent-systems", "agent-orchestration", "agent-architectures"],
  },
  {
    title: "AI Agentic Design Patterns with AutoGen",
    provider: "DeepLearning.AI / Microsoft",
    description:
      "Four key agentic design patterns — reflection, tool use, planning, and multi-agent — implemented with Microsoft AutoGen.",
    level: "Intermediate",
    isFree: true,
    rating: 4.7,
    reviewCount: 7800,
    durationHours: 2,
    url: "https://www.classcentral.com/search?q=AI+agentic+design+patterns+autogen+deeplearning.ai",
    slugs: ["agent-architectures", "agent-debugging", "code-agents", "multi-agent-systems"],
  },

  // ── Evals & Testing ─────────────────────────────────────────────────────
  {
    title: "Evaluating and Debugging Generative AI",
    provider: "DeepLearning.AI / Weights & Biases",
    description:
      "Instrument LLM training and inference with W&B — trace, log, and visualize model outputs; compare prompt experiments; evaluate RAG pipelines.",
    level: "Intermediate",
    isFree: true,
    rating: 4.7,
    reviewCount: 10100,
    durationHours: 2,
    url: "https://www.classcentral.com/search?q=evaluating+debugging+generative+AI+weights+biases+deeplearning.ai",
    slugs: ["eval-fundamentals", "llm-as-judge", "rag-evaluation"],
  },
  {
    title: "Quality and Safety for LLM Applications",
    provider: "DeepLearning.AI / WhyLabs",
    description:
      "Monitor LLM outputs for hallucinations, toxicity, and drift — detect and mitigate failures in production AI applications.",
    level: "Intermediate",
    isFree: true,
    rating: 4.6,
    reviewCount: 6700,
    durationHours: 2,
    url: "https://www.classcentral.com/search?q=quality+safety+LLM+applications+whylabs+deeplearning.ai",
    slugs: ["eval-fundamentals", "benchmark-design", "human-evaluation"],
  },
  {
    title: "Red Teaming LLM Applications",
    provider: "DeepLearning.AI / Giskard",
    description:
      "Identify and fix vulnerabilities in LLM apps — prompt injection, data leakage, jailbreaks, and automated red-teaming techniques.",
    level: "Intermediate",
    isFree: true,
    rating: 4.7,
    reviewCount: 7900,
    durationHours: 2,
    url: "https://www.classcentral.com/search?q=red+teaming+LLM+applications+giskard+deeplearning.ai",
    slugs: ["red-teaming", "adversarial-prompting", "guardrails-filtering"],
  },
  {
    title: "Automated Testing for LLMOps",
    provider: "DeepLearning.AI / CircleCI",
    description:
      "Build CI/CD pipelines for LLM applications — automated evaluation, regression testing, and continuous deployment strategies.",
    level: "Intermediate",
    isFree: true,
    rating: 4.6,
    reviewCount: 5300,
    durationHours: 2,
    url: "https://www.classcentral.com/search?q=automated+testing+LLMOps+circleci+deeplearning.ai",
    slugs: ["eval-frameworks-comparison", "ci-cd-ai", "benchmark-design"],
  },

  // ── Infrastructure & Deployment ─────────────────────────────────────────
  {
    title: "Machine Learning Engineering for Production (MLOps) Specialization",
    provider: "DeepLearning.AI / Coursera",
    description:
      "Four-course MLOps series — model deployment, data lifecycle, feature engineering, model monitoring, and production pipelines at scale.",
    level: "Advanced",
    isFree: true,
    rating: 4.7,
    reviewCount: 22000,
    durationHours: 80,
    url: "https://www.classcentral.com/search?q=machine+learning+engineering+production+mlops+specialization+deeplearning.ai",
    slugs: ["llm-serving", "scaling-load-balancing", "cost-optimization", "observability"],
  },
  {
    title: "LLMOps",
    provider: "DeepLearning.AI / Google Cloud",
    description:
      "End-to-end LLMOps pipeline on Google Cloud — prompt versioning, evaluation, deployment, and automated tuning workflows.",
    level: "Intermediate",
    isFree: true,
    rating: 4.6,
    reviewCount: 8400,
    durationHours: 2,
    url: "https://www.classcentral.com/search?q=LLMOps+deeplearning.ai+google+cloud",
    slugs: ["llm-serving", "observability", "ai-gateway", "cost-optimization"],
  },
  {
    title: "Deploying Machine Learning Models in Production",
    provider: "DeepLearning.AI / Coursera",
    description:
      "From prototype to production — model serving infrastructure, TFServing, Kubernetes, monitoring, and performance optimization.",
    level: "Advanced",
    isFree: true,
    rating: 4.6,
    reviewCount: 9700,
    durationHours: 20,
    url: "https://www.classcentral.com/search?q=deploying+machine+learning+models+production+deeplearning.ai",
    slugs: ["llm-serving", "edge-deployment", "scaling-load-balancing"],
  },

  // ── Safety & Alignment ──────────────────────────────────────────────────
  {
    title: "AI Safety Fundamentals: Alignment",
    provider: "BlueDot Impact",
    description:
      "Eight-week deep dive into AI alignment — reward modeling, interpretability, RLHF, scalable oversight, and current research directions.",
    level: "Intermediate",
    isFree: true,
    rating: 4.8,
    reviewCount: 4200,
    durationHours: 40,
    url: "https://www.classcentral.com/search?q=AI+safety+fundamentals+alignment+bluedot+impact",
    slugs: ["constitutional-ai", "bias-fairness", "ai-governance", "interpretability"],
  },
  {
    title: "Removing Bias from AI Models",
    provider: "DataCamp",
    description:
      "Identify sources of bias in ML models, measure fairness metrics, and apply techniques to reduce bias in datasets and training.",
    level: "Intermediate",
    isFree: false,
    rating: 4.5,
    reviewCount: 2800,
    durationHours: 4,
    url: "https://www.classcentral.com/search?q=removing+bias+AI+models+datacamp",
    slugs: ["bias-fairness", "ai-governance"],
  },
  {
    title: "Explainability for Machine Learning",
    provider: "DeepLearning.AI / Fiddler AI",
    description:
      "Make ML models interpretable with SHAP, LIME, and attention maps — build explainable AI systems that meet compliance and debugging needs.",
    level: "Intermediate",
    isFree: true,
    rating: 4.6,
    reviewCount: 4100,
    durationHours: 2,
    url: "https://www.classcentral.com/search?q=explainability+machine+learning+fiddler+deeplearning.ai",
    slugs: ["interpretability", "hallucination-mitigation"],
  },
  {
    title: "Safely Use Guardrails with Llama 2",
    provider: "DeepLearning.AI / Meta",
    description:
      "Implement responsible AI with Llama Guard — content filtering, toxicity detection, and safe deployment patterns for open-weight models.",
    level: "Beginner",
    isFree: true,
    rating: 4.6,
    reviewCount: 5600,
    durationHours: 2,
    url: "https://www.classcentral.com/search?q=safely+use+guardrails+llama+2+deeplearning.ai+meta",
    slugs: ["guardrails-filtering", "constitutional-ai", "hallucination-mitigation"],
  },

  // ── Multimodal AI ───────────────────────────────────────────────────────
  {
    title: "Multimodal RAG: Chat with Videos",
    provider: "DeepLearning.AI / Intel",
    description:
      "Build multimodal RAG systems that understand video content — audio transcription, frame extraction, visual QA, and cross-modal retrieval.",
    level: "Intermediate",
    isFree: true,
    rating: 4.7,
    reviewCount: 6300,
    durationHours: 2,
    url: "https://www.classcentral.com/search?q=multimodal+RAG+chat+videos+deeplearning.ai+intel",
    slugs: ["vision-language-models", "audio-speech-ai", "conversational-ai"],
  },
  {
    title: "Building Multimodal Search and RAG",
    provider: "DeepLearning.AI / Weaviate",
    description:
      "Index images, audio, and text together — multimodal embeddings, cross-modal search, and CLIP-based visual RAG pipelines.",
    level: "Intermediate",
    isFree: true,
    rating: 4.7,
    reviewCount: 7200,
    durationHours: 2,
    url: "https://www.classcentral.com/search?q=building+multimodal+search+RAG+weaviate+deeplearning.ai",
    slugs: ["vision-language-models", "embedding-models"],
  },
  {
    title: "Pair Programming with a Large Language Model",
    provider: "DeepLearning.AI",
    description:
      "Use LLMs as coding assistants — code generation, bug detection, test writing, and documentation automation with practical examples.",
    level: "Beginner",
    isFree: true,
    rating: 4.7,
    reviewCount: 12400,
    durationHours: 2,
    url: "https://www.classcentral.com/search?q=pair+programming+large+language+model+deeplearning.ai",
    slugs: ["ai-for-code", "code-agents"],
  },

  // ── Applied AI & Production ─────────────────────────────────────────────
  {
    title: "Building Agentic RAG with LlamaIndex",
    provider: "DeepLearning.AI / LlamaIndex",
    description:
      "Router query engines, tool-calling agents, multi-document agents, and production RAG systems with LlamaIndex.",
    level: "Intermediate",
    isFree: true,
    rating: 4.7,
    reviewCount: 8100,
    durationHours: 2,
    url: "https://www.classcentral.com/search?q=building+agentic+RAG+llamaindex+deeplearning.ai",
    slugs: ["llamaindex", "agent-architectures", "advanced-rag"],
  },
  {
    title: "How Diffusion Models Work",
    provider: "DeepLearning.AI",
    description:
      "Deep dive into diffusion models — forward/reverse processes, noise schedules, U-Net architectures, and DDPM/DDIM sampling.",
    level: "Intermediate",
    isFree: true,
    rating: 4.8,
    reviewCount: 9300,
    durationHours: 2,
    url: "https://www.classcentral.com/search?q=how+diffusion+models+work+deeplearning.ai",
    slugs: ["production-patterns", "search-recommendations"],
  },
  {
    title: "Building Generative AI Applications with Gradio",
    provider: "DeepLearning.AI / HuggingFace",
    description:
      "Build and share ML demos fast with Gradio — image captioning, NLP apps, image generation, and deployable web UIs.",
    level: "Beginner",
    isFree: true,
    rating: 4.7,
    reviewCount: 10600,
    durationHours: 2,
    url: "https://www.classcentral.com/search?q=building+generative+AI+applications+gradio+huggingface",
    slugs: ["production-patterns", "ai-engineer-roadmap"],
  },

  // ── Cloud Platforms ─────────────────────────────────────────────────────
  {
    title: "AWS Cloud Practitioner Essentials",
    provider: "Amazon Web Services",
    description:
      "Foundational AWS cloud concepts — core services, architecture, pricing, security, and the shared responsibility model.",
    level: "Beginner",
    isFree: true,
    rating: 4.7,
    reviewCount: 41000,
    durationHours: 6,
    url: "https://www.classcentral.com/search?q=aws+cloud+practitioner+essentials+amazon",
    slugs: ["aws", "aws-architecture"],
  },
  {
    title: "Google Cloud Professional Machine Learning Engineer",
    provider: "Google Cloud",
    description:
      "Prepare for the GCP ML Engineer cert — Vertex AI, BigQuery ML, data pipelines, model monitoring, and production ML on GCP.",
    level: "Advanced",
    isFree: false,
    rating: 4.6,
    reviewCount: 7800,
    durationHours: 40,
    url: "https://www.classcentral.com/search?q=google+cloud+professional+machine+learning+engineer",
    slugs: ["gcp"],
  },
  {
    title: "Docker and Kubernetes: The Complete Guide",
    provider: "Udemy / Stephen Grider",
    description:
      "Complete Docker + Kubernetes course — containerization, multi-service apps, deployments, networking, and CI/CD pipelines.",
    level: "Intermediate",
    isFree: false,
    rating: 4.7,
    reviewCount: 58000,
    durationHours: 22,
    url: "https://www.classcentral.com/search?q=docker+kubernetes+complete+guide+stephen+grider",
    slugs: ["docker", "kubernetes"],
  },
  {
    title: "Microsoft Azure AI Fundamentals (AI-900)",
    provider: "Microsoft",
    description:
      "Azure AI services fundamentals — machine learning, computer vision, NLP, and conversational AI on Azure.",
    level: "Beginner",
    isFree: true,
    rating: 4.7,
    reviewCount: 15200,
    durationHours: 8,
    url: "https://www.classcentral.com/search?q=microsoft+azure+AI+fundamentals+AI-900",
    slugs: ["azure"],
  },

  // ── AWS Deep Dives ──────────────────────────────────────────────────────
  {
    title: "AWS Lambda and the Serverless Framework",
    provider: "Udemy / Stephane Maarek",
    description:
      "Build serverless apps with AWS Lambda, API Gateway, DynamoDB, SQS, and SNS — event-driven architectures and best practices.",
    level: "Intermediate",
    isFree: false,
    rating: 4.7,
    reviewCount: 22000,
    durationHours: 15,
    url: "https://www.classcentral.com/search?q=aws+lambda+serverless+framework+stephane+maarek",
    slugs: ["aws-lambda-serverless", "aws-api-gateway-networking"],
  },
  {
    title: "AWS Identity and Access Management (IAM) — Deep Dive",
    provider: "A Cloud Guru",
    description:
      "Master AWS IAM — policies, roles, SCPs, permission boundaries, identity federation, and security best practices for enterprise accounts.",
    level: "Intermediate",
    isFree: false,
    rating: 4.6,
    reviewCount: 6400,
    durationHours: 8,
    url: "https://www.classcentral.com/search?q=aws+IAM+identity+access+management+deep+dive+cloud+guru",
    slugs: ["aws-iam-security"],
  },
  {
    title: "AWS Machine Learning Specialty (MLS-C01)",
    provider: "Udemy / Stephane Maarek",
    description:
      "Complete prep for the AWS ML Specialty exam — SageMaker, data engineering, modeling, and production ML workflows on AWS.",
    level: "Advanced",
    isFree: false,
    rating: 4.7,
    reviewCount: 14500,
    durationHours: 20,
    url: "https://www.classcentral.com/search?q=aws+machine+learning+specialty+MLS-C01+stephane+maarek",
    slugs: ["aws-ai-ml-services", "aws-architecture"],
  },

  // ── Software Engineering ────────────────────────────────────────────────
  {
    title: "Software Architecture: From Developer to Architect",
    provider: "Udemy / Mark Richards",
    description:
      "Architectural styles — microservices, event-driven, layered, space-based, and orchestration vs. choreography trade-offs.",
    level: "Advanced",
    isFree: false,
    rating: 4.6,
    reviewCount: 9200,
    durationHours: 10,
    url: "https://www.classcentral.com/search?q=software+architecture+developer+architect+mark+richards",
    slugs: ["microservices", "solid-principles"],
  },
  {
    title: "Node.js, Express, MongoDB & More: The Complete Bootcamp",
    provider: "Udemy / Jonas Schmedtmann",
    description:
      "Full-stack Node.js — Express, MongoDB, Mongoose, authentication, REST APIs, security, and deployment to production.",
    level: "Intermediate",
    isFree: false,
    rating: 4.8,
    reviewCount: 81000,
    durationHours: 42,
    url: "https://www.classcentral.com/search?q=node.js+express+mongodb+complete+bootcamp+jonas+schmedtmann",
    slugs: ["nodejs"],
  },
  {
    title: "The Missing CI/CD with GitHub Actions",
    provider: "Udemy",
    description:
      "Automate testing, building, and deployment with GitHub Actions — workflows, secrets, matrix builds, and CD to cloud providers.",
    level: "Intermediate",
    isFree: false,
    rating: 4.6,
    reviewCount: 5400,
    durationHours: 8,
    url: "https://www.classcentral.com/search?q=CI+CD+github+actions+complete+course",
    slugs: ["ci-cd", "ci-cd-ai"],
  },
];

// ---------------------------------------------------------------------------

async function upsertCourse(entry: CourseEntry) {
  const [course] = await db
    .insert(externalCourses)
    .values({
      title: entry.title,
      url: entry.url,
      provider: entry.provider,
      description: entry.description,
      level: entry.level,
      rating: entry.rating,
      reviewCount: entry.reviewCount,
      durationHours: entry.durationHours,
      isFree: entry.isFree,
    })
    .onConflictDoUpdate({
      target: externalCourses.url,
      set: {
        title: entry.title,
        provider: entry.provider,
        description: entry.description,
        level: entry.level,
        rating: entry.rating,
        reviewCount: entry.reviewCount,
        durationHours: entry.durationHours,
        isFree: entry.isFree,
        updatedAt: new Date(),
      },
    })
    .returning({ id: externalCourses.id });

  return course.id;
}

async function main() {
  console.log(`Seeding ${CATALOG.length} Class Central courses…`);
  let coursesInserted = 0;
  let mappingsInserted = 0;

  for (const entry of CATALOG) {
    const courseId = await upsertCourse(entry);
    coursesInserted++;

    for (const slug of entry.slugs) {
      await db
        .insert(lessonCourses)
        .values({ lessonSlug: slug, courseId, relevance: 1.0 })
        .onConflictDoNothing();
      mappingsInserted++;
    }
  }

  console.log(`Done. ${coursesInserted} courses, ${mappingsInserted} lesson mappings.`);
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
