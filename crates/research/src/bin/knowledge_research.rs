use anyhow::{Context, Result};
use research::team::{LlmProvider, ResearchTask, TaskStatus, TeamConfig, TeamLead};
use research::tools::SearchToolConfig;

const DEFAULT_BASE_URL: &str = "https://api.deepseek.com";
const OUT_DIR: &str = "research-output/knowledge-ai";

fn research_tasks() -> Vec<ResearchTask> {
    let ctx = "This research surveys AI/ML applications for learning and studying — \
        covering cognitive science of learning, adaptive learning systems, intelligent tutoring, \
        learning analytics, LLMs in education, assessment & evaluation, self-regulated learning, \
        and human-AI collaborative learning. The goal is a comprehensive landscape of academic papers, \
        methods, datasets, and production systems across all domains (2018-2026). \
        IMPORTANT: For every paper you reference, include the full citation with a clickable link — \
        use the Semantic Scholar URL from `get_paper_detail`, or construct a DOI link \
        (`https://doi.org/{doi}`). Format each reference as: **Author et al. (Year)** \
        [Title](url). Include a References section at the end with all papers linked.";

    vec![
        // ══════════════════════════════════════════════════════════════════════
        // Tier 1 — Foundations (8 tasks, IDs 1-8, no dependencies)
        // ══════════════════════════════════════════════════════════════════════
        ResearchTask {
            id: 1,
            subject: "cognitive-science-learning-foundations".into(),
            description: format!(
                "Research foundational cognitive science of learning. Focus on: \
                (1) memory encoding and retrieval — dual-process theory, levels of processing, \
                (2) cognitive load theory — intrinsic, extraneous, germane load and AI optimization, \
                (3) desirable difficulties — spacing, interleaving, retrieval practice, \
                (4) transfer of learning — near/far transfer, analogical reasoning, \
                (5) attention and working memory constraints in digital learning environments. \
                Find seminal and recent papers on cognitive science of learning, memory research, \
                and cognitive load in AI-enhanced education (2018-2026). {ctx}"
            ),
            preamble: "You are a cognitive science researcher specialising in human learning \
                and memory. Produce structured findings in Markdown."
                .into(),
            status: TaskStatus::Pending,
            owner: None,
            dependencies: vec![],
            result: None,
        },
        ResearchTask {
            id: 2,
            subject: "adaptive-learning-systems-foundations".into(),
            description: format!(
                "Research foundational adaptive learning systems. Focus on: \
                (1) adaptive learning platforms — architecture, personalization engines, \
                (2) Bayesian knowledge tracing (BKT) and its extensions, \
                (3) item response theory (IRT) — 1PL, 2PL, 3PL models in digital learning, \
                (4) mastery-based progression and competency frameworks, \
                (5) learner modeling — knowledge state estimation, prerequisite graphs. \
                Find papers on adaptive learning systems, knowledge tracing, \
                and personalized learning platforms (2018-2026). {ctx}"
            ),
            preamble: "You are an adaptive learning researcher specialising in learner modeling \
                and personalization. Produce structured findings in Markdown."
                .into(),
            status: TaskStatus::Pending,
            owner: None,
            dependencies: vec![],
            result: None,
        },
        ResearchTask {
            id: 3,
            subject: "intelligent-tutoring-systems-foundations".into(),
            description: format!(
                "Research foundational intelligent tutoring systems (ITS). Focus on: \
                (1) ITS history — ACT-R, Cognitive Tutor, ANDES, AutoTutor, \
                (2) model tracing and constraint-based modeling approaches, \
                (3) dialogue-based tutoring — conversational strategies and scaffolding, \
                (4) domain modeling — expert models, bug libraries, misconception catalogs, \
                (5) student modeling — affect detection, engagement, knowledge estimation. \
                Find papers on intelligent tutoring systems, cognitive tutors, \
                and AI-driven instructional systems (2018-2026). {ctx}"
            ),
            preamble: "You are an intelligent tutoring systems researcher with expertise in \
                cognitive architectures for education. Produce structured findings in Markdown."
                .into(),
            status: TaskStatus::Pending,
            owner: None,
            dependencies: vec![],
            result: None,
        },
        ResearchTask {
            id: 4,
            subject: "learning-analytics-foundations".into(),
            description: format!(
                "Research foundational learning analytics and educational data mining. Focus on: \
                (1) educational data mining — association rules, clustering, classification, \
                (2) learning management system (LMS) data — xAPI, Caliper, clickstream analysis, \
                (3) early warning systems for at-risk students, \
                (4) sequence mining and process mining for learning paths, \
                (5) dashboards and visualization for learners and instructors. \
                Find papers on learning analytics, educational data mining, \
                and student behavior analysis (2018-2026). {ctx}"
            ),
            preamble: "You are a learning analytics researcher specialising in educational \
                data mining. Produce structured findings in Markdown."
                .into(),
            status: TaskStatus::Pending,
            owner: None,
            dependencies: vec![],
            result: None,
        },
        ResearchTask {
            id: 5,
            subject: "llms-in-education-foundations".into(),
            description: format!(
                "Research foundational applications of LLMs in education. Focus on: \
                (1) LLM-based tutoring — GPT, Claude, Gemini as educational assistants, \
                (2) prompt engineering for teaching — Socratic prompting, scaffolded dialogue, \
                (3) conversational pedagogy — turn-taking, error correction, explanation generation, \
                (4) content generation — question creation, explanation synthesis, worked examples, \
                (5) risks and limitations — hallucination in education, over-reliance, equity. \
                Find papers on LLMs in education, GPT-based tutoring, \
                and generative AI for learning (2020-2026). {ctx}"
            ),
            preamble: "You are an AI-in-education researcher specialising in large language \
                models for teaching and learning. Produce structured findings in Markdown."
                .into(),
            status: TaskStatus::Pending,
            owner: None,
            dependencies: vec![],
            result: None,
        },
        ResearchTask {
            id: 6,
            subject: "assessment-evaluation-ai-foundations".into(),
            description: format!(
                "Research foundational AI for assessment and evaluation. Focus on: \
                (1) automated essay scoring (AES) — neural approaches, rubric alignment, \
                (2) automated item generation (AIG) — template-based and neural methods, \
                (3) formative vs summative assessment with AI, \
                (4) fairness and bias in AI-based assessment — DIF, group invariance, \
                (5) computer-adaptive testing (CAT) algorithms and modern extensions. \
                Find papers on AI assessment, automated scoring, \
                and fair evaluation systems (2018-2026). {ctx}"
            ),
            preamble: "You are an educational measurement researcher specialising in AI-based \
                assessment. Produce structured findings in Markdown."
                .into(),
            status: TaskStatus::Pending,
            owner: None,
            dependencies: vec![],
            result: None,
        },
        ResearchTask {
            id: 7,
            subject: "self-regulated-learning-foundations".into(),
            description: format!(
                "Research foundational self-regulated learning (SRL) with AI. Focus on: \
                (1) SRL models — Zimmerman's cyclical model, Winne's COPES, Pintrich's framework, \
                (2) metacognition — monitoring, planning, evaluation in learning, \
                (3) motivation theories — self-determination, expectancy-value, achievement goals, \
                (4) goal setting and time management in digital learning, \
                (5) measuring SRL — think-alouds, trace data, questionnaires. \
                Find papers on self-regulated learning, metacognition, \
                and motivation in AI-enhanced education (2018-2026). {ctx}"
            ),
            preamble: "You are an educational psychology researcher specialising in self-regulated \
                learning and metacognition. Produce structured findings in Markdown."
                .into(),
            status: TaskStatus::Pending,
            owner: None,
            dependencies: vec![],
            result: None,
        },
        ResearchTask {
            id: 8,
            subject: "human-ai-collaborative-learning-foundations".into(),
            description: format!(
                "Research foundational human-AI collaborative learning. Focus on: \
                (1) human-AI teaming in educational contexts — complementary strengths, \
                (2) AI literacy — what learners need to know about AI to use it effectively, \
                (3) hybrid intelligence — combining human and AI capabilities for learning, \
                (4) trust and reliance — when to trust AI, calibrating expectations, \
                (5) co-regulation — AI supporting human self-regulation and vice versa. \
                Find papers on human-AI collaboration in education, AI literacy, \
                and hybrid intelligence for learning (2018-2026). {ctx}"
            ),
            preamble: "You are a human-computer interaction researcher specialising in \
                human-AI collaboration for education. Produce structured findings in Markdown."
                .into(),
            status: TaskStatus::Pending,
            owner: None,
            dependencies: vec![],
            result: None,
        },

        // ══════════════════════════════════════════════════════════════════════
        // Tier 2 — Specialized Deep-Dives (38 tasks, IDs 9-46)
        // ══════════════════════════════════════════════════════════════════════

        // ── Cognitive Science + AI (IDs 9-13, deps: [1]) ──────────────────
        ResearchTask {
            id: 9,
            subject: "spaced-repetition-algorithms".into(),
            description: format!(
                "Deep dive into spaced repetition algorithms and AI optimization. Focus on: \
                (1) Ebbinghaus forgetting curve and modern computational models, \
                (2) SM-2, SM-18, FSRS algorithms and their mathematical foundations, \
                (3) neural network-based scheduling — DASH, DeepSRS, HLR, \
                (4) multi-armed bandit approaches to review scheduling, \
                (5) large-scale studies on Anki, Duolingo, Mnemosyne effectiveness. \
                Find papers on spaced repetition optimization, memory scheduling algorithms, \
                and AI-enhanced review systems (2018-2026). {ctx}"
            ),
            preamble: "You are a memory science researcher specialising in computational \
                models of spaced repetition. Produce structured findings in Markdown."
                .into(),
            status: TaskStatus::Pending,
            owner: None,
            dependencies: vec![1],
            result: None,
        },
        ResearchTask {
            id: 10,
            subject: "knowledge-tracing-deep-models".into(),
            description: format!(
                "Deep dive into deep knowledge tracing models. Focus on: \
                (1) Deep Knowledge Tracing (DKT) — LSTM-based, GRU-based architectures, \
                (2) attention-based knowledge tracing — SAKT, AKT, SAINT, \
                (3) graph-based knowledge tracing — GKT, skill graphs, \
                (4) transformer-based models — SAINT+, simpleKT, sparseKT, \
                (5) comparison studies — DKT vs BKT vs attention models on standard benchmarks. \
                Find papers on deep knowledge tracing, neural student modeling, \
                and knowledge state estimation (2018-2026). {ctx}"
            ),
            preamble: "You are a knowledge tracing researcher specialising in deep learning \
                for student modeling. Produce structured findings in Markdown."
                .into(),
            status: TaskStatus::Pending,
            owner: None,
            dependencies: vec![1],
            result: None,
        },
        ResearchTask {
            id: 11,
            subject: "cognitive-load-ai-optimization".into(),
            description: format!(
                "Deep dive into cognitive load optimization with AI. Focus on: \
                (1) real-time cognitive load measurement — EEG, eye-tracking, physiological signals, \
                (2) adaptive content complexity based on estimated cognitive load, \
                (3) multimedia learning principles and AI-driven content design, \
                (4) worked example effect and fading with intelligent systems, \
                (5) split-attention and redundancy elimination via AI layout optimization. \
                Find papers on cognitive load AI, adaptive complexity, \
                and intelligent content design (2018-2026). {ctx}"
            ),
            preamble: "You are a cognitive load researcher specialising in AI-adaptive \
                instructional design. Produce structured findings in Markdown."
                .into(),
            status: TaskStatus::Pending,
            owner: None,
            dependencies: vec![1],
            result: None,
        },
        ResearchTask {
            id: 12,
            subject: "retrieval-practice-ai".into(),
            description: format!(
                "Deep dive into retrieval practice enhanced by AI. Focus on: \
                (1) testing effect — mechanisms, boundary conditions, recent meta-analyses, \
                (2) AI-generated practice questions — quality, difficulty calibration, \
                (3) adaptive quizzing systems — question selection algorithms, \
                (4) feedback timing and elaboration in retrieval practice, \
                (5) retrieval practice in STEM vs humanities — domain differences. \
                Find papers on retrieval practice, testing effect with AI, \
                and adaptive quizzing (2018-2026). {ctx}"
            ),
            preamble: "You are a learning science researcher specialising in retrieval \
                practice and the testing effect. Produce structured findings in Markdown."
                .into(),
            status: TaskStatus::Pending,
            owner: None,
            dependencies: vec![1],
            result: None,
        },
        ResearchTask {
            id: 13,
            subject: "emotion-affect-learning-ai".into(),
            description: format!(
                "Deep dive into emotion and affect in AI-enhanced learning. Focus on: \
                (1) affective computing for education — facial expression, speech, text analysis, \
                (2) academic emotions — boredom, confusion, frustration, flow detection, \
                (3) sentiment-aware tutoring — adapting instruction to emotional state, \
                (4) anxiety and test anxiety — detection and intervention strategies, \
                (5) positive affect and curiosity — fostering engagement through AI. \
                Find papers on affect detection in learning, emotion-aware tutoring, \
                and affective computing in education (2018-2026). {ctx}"
            ),
            preamble: "You are an affective computing researcher specialising in emotions \
                in educational contexts. Produce structured findings in Markdown."
                .into(),
            status: TaskStatus::Pending,
            owner: None,
            dependencies: vec![1],
            result: None,
        },

        // ── Adaptive & Personalized Learning (IDs 14-19, deps: [2]) ───────
        ResearchTask {
            id: 14,
            subject: "bayesian-knowledge-tracing-extensions".into(),
            description: format!(
                "Deep dive into Bayesian knowledge tracing extensions. Focus on: \
                (1) individualized BKT — per-student parameter estimation, \
                (2) contextual BKT — incorporating forgetting, hint usage, time-on-task, \
                (3) hierarchical Bayesian models for knowledge tracing, \
                (4) BKT with slip/guess adaptation and prerequisite structure, \
                (5) comparison with deep learning approaches on benchmark datasets (ASSISTments, Junyi). \
                Find papers on BKT extensions, Bayesian student modeling, \
                and probabilistic knowledge tracing (2018-2026). {ctx}"
            ),
            preamble: "You are a probabilistic modeling researcher specialising in Bayesian \
                approaches to student knowledge. Produce structured findings in Markdown."
                .into(),
            status: TaskStatus::Pending,
            owner: None,
            dependencies: vec![2],
            result: None,
        },
        ResearchTask {
            id: 15,
            subject: "reinforcement-learning-education".into(),
            description: format!(
                "Deep dive into reinforcement learning for educational policy optimization. Focus on: \
                (1) RL for instructional sequencing — when to teach what, \
                (2) multi-armed bandits for content recommendation, \
                (3) POMDP models for tutoring under student state uncertainty, \
                (4) reward shaping for educational objectives — learning vs engagement, \
                (5) offline RL from logged educational interaction data. \
                Find papers on RL in education, instructional policy optimization, \
                and bandit-based tutoring (2018-2026). {ctx}"
            ),
            preamble: "You are a reinforcement learning researcher applied to educational \
                systems. Produce structured findings in Markdown."
                .into(),
            status: TaskStatus::Pending,
            owner: None,
            dependencies: vec![2],
            result: None,
        },
        ResearchTask {
            id: 16,
            subject: "personalized-learning-paths".into(),
            description: format!(
                "Deep dive into personalized learning path generation. Focus on: \
                (1) curriculum sequencing algorithms — prerequisite-aware ordering, \
                (2) knowledge graph-based path planning — concept maps, skill graphs, \
                (3) multi-objective optimization — learning efficiency, engagement, difficulty, \
                (4) open learner models — transparency and learner control, \
                (5) production systems — Khan Academy, Coursera, Duolingo personalization. \
                Find papers on learning path optimization, curriculum sequencing, \
                and personalized education (2018-2026). {ctx}"
            ),
            preamble: "You are a personalized learning researcher specialising in curriculum \
                sequencing and path optimization. Produce structured findings in Markdown."
                .into(),
            status: TaskStatus::Pending,
            owner: None,
            dependencies: vec![2],
            result: None,
        },
        ResearchTask {
            id: 17,
            subject: "learning-style-adaptation".into(),
            description: format!(
                "Deep dive into learning style adaptation and individual differences. Focus on: \
                (1) learning styles debate — VARK, Kolb, and the evidence critique, \
                (2) evidence-based individual differences — prior knowledge, working memory capacity, \
                (3) aptitude-treatment interactions and adaptive instruction, \
                (4) learner preference modeling — what aspects actually matter for adaptation, \
                (5) universal design for learning (UDL) and AI-driven flexibility. \
                Find papers on learning style adaptation, individual differences, \
                and UDL with AI (2018-2026). {ctx}"
            ),
            preamble: "You are an educational psychology researcher specialising in individual \
                differences and adaptive instruction. Produce structured findings in Markdown."
                .into(),
            status: TaskStatus::Pending,
            owner: None,
            dependencies: vec![2],
            result: None,
        },
        ResearchTask {
            id: 18,
            subject: "recommender-systems-education".into(),
            description: format!(
                "Deep dive into recommender systems for educational content. Focus on: \
                (1) collaborative filtering for course and resource recommendation, \
                (2) content-based filtering using learning objectives and metadata, \
                (3) knowledge-aware recommendations — prerequisite and skill-aware, \
                (4) session-based and sequential recommendations for learning sessions, \
                (5) cold-start and data sparsity in educational recommendation. \
                Find papers on educational recommender systems, course recommendation, \
                and learning resource discovery (2018-2026). {ctx}"
            ),
            preamble: "You are a recommender systems researcher applied to educational \
                platforms. Produce structured findings in Markdown."
                .into(),
            status: TaskStatus::Pending,
            owner: None,
            dependencies: vec![2],
            result: None,
        },
        ResearchTask {
            id: 19,
            subject: "microlearning-mobile-learning".into(),
            description: format!(
                "Deep dive into microlearning and mobile learning with AI. Focus on: \
                (1) microlearning design principles — chunking, spaced delivery, just-in-time, \
                (2) mobile learning analytics — context-aware, location-aware, time-aware, \
                (3) push notification strategies for learning engagement, \
                (4) bite-sized content generation with AI — summarization, question generation, \
                (5) gamification and streaks — Duolingo model, engagement mechanics. \
                Find papers on microlearning, mobile learning AI, \
                and just-in-time learning (2018-2026). {ctx}"
            ),
            preamble: "You are a mobile learning researcher specialising in microlearning \
                and just-in-time education. Produce structured findings in Markdown."
                .into(),
            status: TaskStatus::Pending,
            owner: None,
            dependencies: vec![2],
            result: None,
        },

        // ── Intelligent Tutoring & LLM Tutors (IDs 20-25, deps: [3, 5]) ──
        ResearchTask {
            id: 20,
            subject: "llm-tutoring-dialogue-systems".into(),
            description: format!(
                "Deep dive into LLM-based tutoring dialogue systems. Focus on: \
                (1) Socratic dialogue generation — question chains, guided discovery, \
                (2) scaffolding strategies — fading, hints, worked examples via LLMs, \
                (3) dialogue policy — when to tell vs ask, error correction strategies, \
                (4) multi-turn coherence and pedagogical goal tracking, \
                (5) evaluation of LLM tutors — learning gains, student satisfaction, safety. \
                Find papers on LLM tutoring dialogue, Socratic AI, \
                and conversational tutoring systems (2020-2026). {ctx}"
            ),
            preamble: "You are a dialogue systems researcher specialising in LLM-based \
                tutoring. Produce structured findings in Markdown."
                .into(),
            status: TaskStatus::Pending,
            owner: None,
            dependencies: vec![3, 5],
            result: None,
        },
        ResearchTask {
            id: 21,
            subject: "automated-feedback-generation".into(),
            description: format!(
                "Deep dive into automated feedback generation with AI. Focus on: \
                (1) formative feedback — immediate, delayed, elaborated feedback strategies, \
                (2) LLM-generated feedback on writing — structure, argument, style, \
                (3) code review and programming feedback automation, \
                (4) peer review augmentation — AI-assisted peer assessment, \
                (5) feedback personalization — adapting tone, detail, and type to learner. \
                Find papers on automated feedback, AI-generated feedback, \
                and feedback in intelligent tutoring (2018-2026). {ctx}"
            ),
            preamble: "You are a feedback and assessment researcher specialising in \
                automated feedback generation. Produce structured findings in Markdown."
                .into(),
            status: TaskStatus::Pending,
            owner: None,
            dependencies: vec![3, 5],
            result: None,
        },
        ResearchTask {
            id: 22,
            subject: "math-science-tutoring-ai".into(),
            description: format!(
                "Deep dive into AI tutoring for mathematics and science. Focus on: \
                (1) math problem solving — step-by-step reasoning, symbolic computation, \
                (2) science simulation and inquiry-based learning with AI, \
                (3) misconception detection and remediation in STEM, \
                (4) visual and diagrammatic reasoning for STEM tutoring, \
                (5) systems — Photomath, Wolfram Alpha, Khanmigo, ALEKS in STEM. \
                Find papers on math tutoring AI, science education with AI, \
                and STEM intelligent tutoring (2018-2026). {ctx}"
            ),
            preamble: "You are a STEM education researcher specialising in AI tutoring for \
                mathematics and science. Produce structured findings in Markdown."
                .into(),
            status: TaskStatus::Pending,
            owner: None,
            dependencies: vec![3, 5],
            result: None,
        },
        ResearchTask {
            id: 23,
            subject: "language-learning-ai".into(),
            description: format!(
                "Deep dive into AI for language learning (L2 acquisition). Focus on: \
                (1) speech recognition and pronunciation assessment — ASR for L2, \
                (2) grammar error correction — neural GEC models, \
                (3) conversational practice — chatbots for language practice, \
                (4) vocabulary acquisition — spaced repetition, context-based learning, \
                (5) systems — Duolingo, Babbel, ChatGPT for language learning effectiveness. \
                Find papers on AI language learning, CALL, \
                and intelligent language tutoring (2018-2026). {ctx}"
            ),
            preamble: "You are a second language acquisition researcher specialising in \
                AI-assisted language learning. Produce structured findings in Markdown."
                .into(),
            status: TaskStatus::Pending,
            owner: None,
            dependencies: vec![3, 5],
            result: None,
        },
        ResearchTask {
            id: 24,
            subject: "coding-education-ai".into(),
            description: format!(
                "Deep dive into AI for coding education. Focus on: \
                (1) code completion and suggestion tools for learning — Copilot, Codex in education, \
                (2) automated program repair for student code — feedback and hints, \
                (3) code explanation generation — LLMs explaining code to novices, \
                (4) plagiarism detection vs AI-assisted coding — policy challenges, \
                (5) block-based to text-based programming transitions with AI scaffolding. \
                Find papers on AI coding education, programming tutoring, \
                and Copilot/LLM impact on learning to code (2018-2026). {ctx}"
            ),
            preamble: "You are a computing education researcher specialising in AI tools \
                for learning to program. Produce structured findings in Markdown."
                .into(),
            status: TaskStatus::Pending,
            owner: None,
            dependencies: vec![3, 5],
            result: None,
        },
        ResearchTask {
            id: 25,
            subject: "multimodal-tutoring-systems".into(),
            description: format!(
                "Deep dive into multimodal tutoring systems. Focus on: \
                (1) multimodal input — text, speech, gesture, gaze for learner understanding, \
                (2) embodied conversational agents and pedagogical agents, \
                (3) VR/AR tutoring — immersive learning environments with AI, \
                (4) whiteboard and handwriting recognition for math tutoring, \
                (5) multimodal learning analytics — combining modalities for richer assessment. \
                Find papers on multimodal tutoring, embodied agents, \
                and VR/AR in education with AI (2018-2026). {ctx}"
            ),
            preamble: "You are a multimodal interaction researcher specialising in embodied \
                tutoring systems. Produce structured findings in Markdown."
                .into(),
            status: TaskStatus::Pending,
            owner: None,
            dependencies: vec![3, 5],
            result: None,
        },

        // ── Learning Analytics & Assessment (IDs 26-31, deps: [4, 6]) ─────
        ResearchTask {
            id: 26,
            subject: "predictive-learning-analytics".into(),
            description: format!(
                "Deep dive into predictive learning analytics. Focus on: \
                (1) student performance prediction — classification and regression approaches, \
                (2) dropout and attrition prediction in MOOCs and online courses, \
                (3) feature engineering from LMS logs — engagement proxies, temporal patterns, \
                (4) fairness in predictive models — demographic bias, equity considerations, \
                (5) actionable analytics — translating predictions into interventions. \
                Find papers on predictive learning analytics, student success prediction, \
                and early warning systems (2018-2026). {ctx}"
            ),
            preamble: "You are a predictive analytics researcher specialising in student \
                success modeling. Produce structured findings in Markdown."
                .into(),
            status: TaskStatus::Pending,
            owner: None,
            dependencies: vec![4, 6],
            result: None,
        },
        ResearchTask {
            id: 27,
            subject: "automated-essay-scoring-nlp".into(),
            description: format!(
                "Deep dive into automated essay scoring with modern NLP. Focus on: \
                (1) BERT, GPT, and transformer-based essay scoring models, \
                (2) trait-based scoring — content, organization, conventions, style, \
                (3) cross-prompt and cross-domain generalization, \
                (4) adversarial attacks — gaming AES systems, robustness, \
                (5) human-AI agreement — correlation with expert raters, inter-rater reliability. \
                Find papers on neural essay scoring, transformer-based AES, \
                and writing assessment AI (2018-2026). {ctx}"
            ),
            preamble: "You are an NLP researcher specialising in automated writing \
                assessment. Produce structured findings in Markdown."
                .into(),
            status: TaskStatus::Pending,
            owner: None,
            dependencies: vec![4, 6],
            result: None,
        },
        ResearchTask {
            id: 28,
            subject: "automated-item-generation".into(),
            description: format!(
                "Deep dive into automated item (question) generation. Focus on: \
                (1) template-based and ontology-driven item generation, \
                (2) neural question generation — seq2seq, transformer-based, \
                (3) distractor generation for multiple-choice questions, \
                (4) difficulty and discrimination estimation for generated items, \
                (5) LLM-based question generation — GPT-4, Claude for test creation. \
                Find papers on automated item generation, question generation NLP, \
                and AI test creation (2018-2026). {ctx}"
            ),
            preamble: "You are a psychometrics researcher specialising in automated item \
                generation. Produce structured findings in Markdown."
                .into(),
            status: TaskStatus::Pending,
            owner: None,
            dependencies: vec![4, 6],
            result: None,
        },
        ResearchTask {
            id: 29,
            subject: "plagiarism-ai-detection".into(),
            description: format!(
                "Deep dive into plagiarism and AI-generated text detection in education. Focus on: \
                (1) traditional plagiarism detection — text matching, paraphrasing detection, \
                (2) AI-generated text detection — GPTZero, Turnitin AI, watermarking, \
                (3) stylometric analysis and authorship verification, \
                (4) accuracy and false positive rates — impact on students, \
                (5) policy responses — academic integrity in the age of generative AI. \
                Find papers on plagiarism detection, AI text detection, \
                and academic integrity AI (2020-2026). {ctx}"
            ),
            preamble: "You are an academic integrity researcher specialising in plagiarism \
                and AI detection systems. Produce structured findings in Markdown."
                .into(),
            status: TaskStatus::Pending,
            owner: None,
            dependencies: vec![4, 6],
            result: None,
        },
        ResearchTask {
            id: 30,
            subject: "competency-based-assessment".into(),
            description: format!(
                "Deep dive into competency-based assessment with AI. Focus on: \
                (1) competency frameworks and ontologies for skills mapping, \
                (2) evidence-centered design (ECD) with AI-collected evidence, \
                (3) performance-based assessment — simulations, project evaluation with AI, \
                (4) micro-credentials and digital badges — AI-verified competencies, \
                (5) portfolio assessment with AI — automated rubric application. \
                Find papers on competency-based assessment, skills-based evaluation, \
                and AI-verified credentials (2018-2026). {ctx}"
            ),
            preamble: "You are a competency-based education researcher specialising in \
                AI-enhanced assessment. Produce structured findings in Markdown."
                .into(),
            status: TaskStatus::Pending,
            owner: None,
            dependencies: vec![4, 6],
            result: None,
        },
        ResearchTask {
            id: 31,
            subject: "learning-process-mining".into(),
            description: format!(
                "Deep dive into learning process mining and behavior analysis. Focus on: \
                (1) process mining techniques applied to learning event logs, \
                (2) sequential pattern mining for study strategies, \
                (3) temporal analytics — time-on-task, session patterns, circadian effects, \
                (4) self-regulated learning trace analysis — planning, monitoring, evaluation, \
                (5) multi-channel data fusion — LMS + eye-tracking + physiological. \
                Find papers on learning process mining, study behavior analysis, \
                and temporal learning analytics (2018-2026). {ctx}"
            ),
            preamble: "You are a process mining researcher specialising in learning behavior \
                analysis. Produce structured findings in Markdown."
                .into(),
            status: TaskStatus::Pending,
            owner: None,
            dependencies: vec![4, 6],
            result: None,
        },

        // ── Self-Regulated Learning & Metacognition (IDs 32-36, deps: [7]) ─
        ResearchTask {
            id: 32,
            subject: "metacognitive-scaffolding-ai".into(),
            description: format!(
                "Deep dive into AI-based metacognitive scaffolding. Focus on: \
                (1) metacognitive prompts — self-explanation, reflection prompts via AI, \
                (2) calibration training — helping learners assess their own knowledge accurately, \
                (3) planning scaffolds — AI-guided study planning and resource allocation, \
                (4) monitoring scaffolds — real-time comprehension checks and alerts, \
                (5) Betty's Brain, MetaTutor, and other metacognitive tutoring systems. \
                Find papers on metacognitive scaffolding, AI reflection prompts, \
                and calibration training (2018-2026). {ctx}"
            ),
            preamble: "You are a metacognition researcher specialising in AI scaffolding \
                for self-regulation. Produce structured findings in Markdown."
                .into(),
            status: TaskStatus::Pending,
            owner: None,
            dependencies: vec![7],
            result: None,
        },
        ResearchTask {
            id: 33,
            subject: "note-taking-summarization-ai".into(),
            description: format!(
                "Deep dive into AI-assisted note-taking and summarization for learning. Focus on: \
                (1) AI summarization for learning — extractive vs abstractive, lecture summarization, \
                (2) note-taking strategies — Cornell, mapping, outlining with AI assistance, \
                (3) knowledge organization tools — concept maps, mind maps generated by AI, \
                (4) Notion AI, Otter.ai, and similar tools for student productivity, \
                (5) desirable difficulties debate — does AI summarization help or hurt learning? \
                Find papers on AI note-taking, learning summarization, \
                and knowledge organization AI (2018-2026). {ctx}"
            ),
            preamble: "You are a learning strategies researcher specialising in note-taking \
                and summarization with AI. Produce structured findings in Markdown."
                .into(),
            status: TaskStatus::Pending,
            owner: None,
            dependencies: vec![7],
            result: None,
        },
        ResearchTask {
            id: 34,
            subject: "study-planning-time-management".into(),
            description: format!(
                "Deep dive into AI-assisted study planning and time management. Focus on: \
                (1) intelligent scheduling — optimal study session planning with AI, \
                (2) deadline management and procrastination intervention, \
                (3) workload estimation and difficulty prediction for courses, \
                (4) Pomodoro-like techniques with AI adaptation, \
                (5) study plan optimization — interleaving, spacing across multiple subjects. \
                Find papers on AI study planning, time management in learning, \
                and intelligent scheduling for students (2018-2026). {ctx}"
            ),
            preamble: "You are a learning productivity researcher specialising in study \
                planning and time management. Produce structured findings in Markdown."
                .into(),
            status: TaskStatus::Pending,
            owner: None,
            dependencies: vec![7],
            result: None,
        },
        ResearchTask {
            id: 35,
            subject: "motivation-engagement-ai".into(),
            description: format!(
                "Deep dive into AI for motivation and engagement in learning. Focus on: \
                (1) gamification with AI — adaptive game elements, dynamic difficulty, \
                (2) intrinsic motivation support — autonomy, competence, relatedness via AI, \
                (3) engagement detection — behavioral, cognitive, emotional engagement signals, \
                (4) nudging and behavioral interventions via AI systems, \
                (5) growth mindset interventions and AI-delivered encouragement. \
                Find papers on AI motivation, engagement detection, \
                and gamification in education (2018-2026). {ctx}"
            ),
            preamble: "You are a motivation researcher specialising in AI-enhanced engagement \
                in learning. Produce structured findings in Markdown."
                .into(),
            status: TaskStatus::Pending,
            owner: None,
            dependencies: vec![7],
            result: None,
        },
        ResearchTask {
            id: 36,
            subject: "collaborative-learning-ai".into(),
            description: format!(
                "Deep dive into AI-supported collaborative learning. Focus on: \
                (1) intelligent group formation — optimal team composition algorithms, \
                (2) AI moderation of group discussions — facilitation, summarization, \
                (3) collaborative knowledge construction — shared annotations, wikis with AI, \
                (4) peer tutoring orchestration — matching tutors and tutees with AI, \
                (5) CSCL (computer-supported collaborative learning) with AI agents. \
                Find papers on collaborative learning AI, group formation algorithms, \
                and AI-facilitated discussion (2018-2026). {ctx}"
            ),
            preamble: "You are a collaborative learning researcher specialising in AI-mediated \
                group learning. Produce structured findings in Markdown."
                .into(),
            status: TaskStatus::Pending,
            owner: None,
            dependencies: vec![7],
            result: None,
        },

        // ── Human-AI Collaboration & AI Literacy (IDs 37-41, deps: [8]) ───
        ResearchTask {
            id: 37,
            subject: "ai-literacy-curriculum-design".into(),
            description: format!(
                "Deep dive into AI literacy and curriculum design. Focus on: \
                (1) AI literacy frameworks — what should students know about AI?, \
                (2) K-12 AI education — age-appropriate AI concepts and activities, \
                (3) university AI across disciplines — AI for non-CS students, \
                (4) teacher AI literacy — professional development for educators, \
                (5) national and international AI education policies and standards. \
                Find papers on AI literacy, AI education curriculum, \
                and AI across the curriculum (2018-2026). {ctx}"
            ),
            preamble: "You are an AI education researcher specialising in AI literacy \
                curriculum design. Produce structured findings in Markdown."
                .into(),
            status: TaskStatus::Pending,
            owner: None,
            dependencies: vec![8],
            result: None,
        },
        ResearchTask {
            id: 38,
            subject: "learning-to-prompt-ai".into(),
            description: format!(
                "Deep dive into learning to prompt AI effectively. Focus on: \
                (1) prompt engineering as a learning skill — frameworks and taxonomies, \
                (2) scaffolding effective AI use — templates, rubrics for prompting, \
                (3) critical evaluation of AI output — fact-checking, bias detection, \
                (4) co-creation with AI — writing, coding, research with LLM assistance, \
                (5) metacognitive skills for AI interaction — knowing when and how to use AI. \
                Find papers on prompt literacy, learning to use AI, \
                and AI interaction skills (2020-2026). {ctx}"
            ),
            preamble: "You are a digital literacy researcher specialising in AI interaction \
                skills. Produce structured findings in Markdown."
                .into(),
            status: TaskStatus::Pending,
            owner: None,
            dependencies: vec![8],
            result: None,
        },
        ResearchTask {
            id: 39,
            subject: "ethical-ai-education".into(),
            description: format!(
                "Deep dive into ethical considerations of AI in education. Focus on: \
                (1) privacy and student data — FERPA, GDPR, COPPA compliance, \
                (2) algorithmic bias in educational AI — racial, gender, socioeconomic, \
                (3) surveillance and monitoring concerns — proctoring, tracking, \
                (4) consent and autonomy — student/parent rights in AI-driven education, \
                (5) equity and access — digital divide, AI as equalizer vs amplifier of inequality. \
                Find papers on AI ethics in education, privacy, \
                and algorithmic fairness in learning systems (2018-2026). {ctx}"
            ),
            preamble: "You are an AI ethics researcher specialising in educational \
                technology. Produce structured findings in Markdown."
                .into(),
            status: TaskStatus::Pending,
            owner: None,
            dependencies: vec![8],
            result: None,
        },
        ResearchTask {
            id: 40,
            subject: "teacher-ai-partnership".into(),
            description: format!(
                "Deep dive into teacher-AI partnership and augmentation. Focus on: \
                (1) AI as teaching assistant — grading, feedback, content preparation, \
                (2) teacher dashboards — AI-generated insights for instructional decisions, \
                (3) professional development — AI coaching for teachers, \
                (4) lesson planning with AI — curriculum alignment, differentiation, \
                (5) teacher attitudes and adoption — barriers, enablers, trust in AI. \
                Find papers on teacher-AI collaboration, AI teaching assistants, \
                and educator professional development with AI (2018-2026). {ctx}"
            ),
            preamble: "You are a teacher education researcher specialising in AI-augmented \
                teaching. Produce structured findings in Markdown."
                .into(),
            status: TaskStatus::Pending,
            owner: None,
            dependencies: vec![8],
            result: None,
        },
        ResearchTask {
            id: 41,
            subject: "ai-accessibility-inclusive-education".into(),
            description: format!(
                "Deep dive into AI for accessibility and inclusive education. Focus on: \
                (1) AI for learners with disabilities — dyslexia, ADHD, autism support, \
                (2) text-to-speech and speech-to-text for accessibility, \
                (3) automatic captioning and sign language recognition, \
                (4) content adaptation for diverse learning needs — simplification, translation, \
                (5) culturally responsive AI — avoiding Western-centric educational models. \
                Find papers on AI accessibility, inclusive education technology, \
                and assistive AI for learning (2018-2026). {ctx}"
            ),
            preamble: "You are an inclusive education researcher specialising in AI \
                accessibility. Produce structured findings in Markdown."
                .into(),
            status: TaskStatus::Pending,
            owner: None,
            dependencies: vec![8],
            result: None,
        },

        // ── Emerging Frontiers (IDs 42-46, mixed deps) ────────────────────
        ResearchTask {
            id: 42,
            subject: "multiagent-learning-environments".into(),
            description: format!(
                "Deep dive into multi-agent learning environments. Focus on: \
                (1) multiple AI agents in educational settings — tutor + companion + evaluator, \
                (2) agent-based simulation for learning — economics, science, social systems, \
                (3) debate and argumentation with AI agents for critical thinking, \
                (4) role-playing scenarios — AI agents as historical figures, patients, clients, \
                (5) orchestration frameworks for multi-agent educational systems. \
                Find papers on multi-agent education, educational simulations, \
                and multi-agent tutoring architectures (2018-2026). {ctx}"
            ),
            preamble: "You are a multi-agent systems researcher applied to education. \
                Produce structured findings in Markdown."
                .into(),
            status: TaskStatus::Pending,
            owner: None,
            dependencies: vec![3, 5],
            result: None,
        },
        ResearchTask {
            id: 43,
            subject: "knowledge-graphs-education".into(),
            description: format!(
                "Deep dive into knowledge graphs for education. Focus on: \
                (1) educational knowledge graph construction — concepts, prerequisites, skills, \
                (2) knowledge graph embeddings for learner modeling, \
                (3) prerequisite learning — automatic prerequisite extraction from text, \
                (4) knowledge graph-enhanced recommendation and path planning, \
                (5) open educational knowledge graphs — Wikidata, DBpedia for education. \
                Find papers on knowledge graphs in education, concept prerequisite learning, \
                and educational ontologies (2018-2026). {ctx}"
            ),
            preamble: "You are a knowledge graph researcher applied to educational \
                systems. Produce structured findings in Markdown."
                .into(),
            status: TaskStatus::Pending,
            owner: None,
            dependencies: vec![2, 4],
            result: None,
        },
        ResearchTask {
            id: 44,
            subject: "open-educational-resources-ai".into(),
            description: format!(
                "Deep dive into AI for open educational resources (OER). Focus on: \
                (1) automatic OER search, curation, and quality assessment, \
                (2) content alignment to learning standards and competencies, \
                (3) remix and adaptation of OER with AI assistance, \
                (4) accessibility checking and improvement of OER, \
                (5) copyright and licensing — AI-assisted license compatibility checking. \
                Find papers on AI for OER, educational resource curation, \
                and content alignment AI (2018-2026). {ctx}"
            ),
            preamble: "You are an open education researcher specialising in AI for OER \
                curation and adaptation. Produce structured findings in Markdown."
                .into(),
            status: TaskStatus::Pending,
            owner: None,
            dependencies: vec![5, 8],
            result: None,
        },
        ResearchTask {
            id: 45,
            subject: "lifelong-learning-ai".into(),
            description: format!(
                "Deep dive into AI for lifelong and continuous learning. Focus on: \
                (1) skills gap analysis — labor market AI meets learning recommendation, \
                (2) professional development and upskilling with AI, \
                (3) corporate training optimization — LMS + AI, \
                (4) informal learning recognition — prior learning assessment with AI, \
                (5) learning across the lifespan — AI for aging learners, retraining. \
                Find papers on lifelong learning AI, workforce development, \
                and continuous education systems (2018-2026). {ctx}"
            ),
            preamble: "You are a lifelong learning researcher specialising in AI for \
                workforce development. Produce structured findings in Markdown."
                .into(),
            status: TaskStatus::Pending,
            owner: None,
            dependencies: vec![2, 8],
            result: None,
        },
        ResearchTask {
            id: 46,
            subject: "neuroscience-informed-ai-learning".into(),
            description: format!(
                "Deep dive into neuroscience-informed AI for learning. Focus on: \
                (1) brain-computer interfaces for learning — EEG-based attention detection, \
                (2) neuroimaging studies of learning — fMRI, fNIRS and AI analysis, \
                (3) neurofeedback for concentration and learning enhancement, \
                (4) sleep and memory consolidation — AI scheduling around sleep, \
                (5) dual coding theory and multimedia learning from a neuroscience perspective. \
                Find papers on educational neuroscience with AI, BCI for learning, \
                and neuroscience-informed instructional design (2018-2026). {ctx}"
            ),
            preamble: "You are an educational neuroscience researcher specialising in \
                brain-informed learning technology. Produce structured findings in Markdown."
                .into(),
            status: TaskStatus::Pending,
            owner: None,
            dependencies: vec![1],
            result: None,
        },

        // ══════════════════════════════════════════════════════════════════════
        // Tier 3 — Domain Synthesis (9 tasks, IDs 47-55)
        // ══════════════════════════════════════════════════════════════════════
        ResearchTask {
            id: 47,
            subject: "cognitive-science-ai-synthesis".into(),
            description: format!(
                "Synthesise ALL cognitive science + AI research (tasks 9-13) into a unified \
                Cognitive Science of AI-Enhanced Learning report. Produce: \
                (1) comparative analysis of spaced repetition algorithms and their effectiveness, \
                (2) deep knowledge tracing state-of-the-art and remaining challenges, \
                (3) cognitive load optimization strategies that work in practice, \
                (4) retrieval practice integration with AI systems, \
                (5) affect-aware learning — what emotion detection adds to tutoring. {ctx}"
            ),
            preamble: "You are a senior cognitive science researcher. Produce a comprehensive \
                synthesis report in Markdown integrating all cognitive science + AI findings."
                .into(),
            status: TaskStatus::Pending,
            owner: None,
            dependencies: vec![9, 10, 11, 12, 13],
            result: None,
        },
        ResearchTask {
            id: 48,
            subject: "adaptive-personalized-synthesis".into(),
            description: format!(
                "Synthesise ALL adaptive and personalized learning research (tasks 14-19) into \
                a unified Adaptive Learning Intelligence report. Produce: \
                (1) BKT vs deep learning for knowledge tracing — when to use what, \
                (2) RL-based instructional policy — practical viability assessment, \
                (3) personalized path generation — algorithms that work at scale, \
                (4) evidence on individual differences that matter for adaptation, \
                (5) recommended adaptive learning platform architecture. {ctx}"
            ),
            preamble: "You are a senior adaptive learning researcher. Produce a comprehensive \
                synthesis report in Markdown integrating all personalized learning findings."
                .into(),
            status: TaskStatus::Pending,
            owner: None,
            dependencies: vec![14, 15, 16, 17, 18, 19],
            result: None,
        },
        ResearchTask {
            id: 49,
            subject: "tutoring-llm-synthesis".into(),
            description: format!(
                "Synthesise ALL intelligent tutoring and LLM research (tasks 20-25) into a \
                unified Tutoring Intelligence report. Produce: \
                (1) LLM tutoring effectiveness — evidence for learning gains, \
                (2) domain-specific tutoring — what works in math, language, coding, \
                (3) multimodal tutoring — combining text, speech, vision for richer interaction, \
                (4) feedback generation best practices across domains, \
                (5) recommended architecture for a next-generation LLM tutoring system. {ctx}"
            ),
            preamble: "You are a senior ITS researcher. Produce a comprehensive synthesis \
                report in Markdown integrating all tutoring and LLM findings."
                .into(),
            status: TaskStatus::Pending,
            owner: None,
            dependencies: vec![20, 21, 22, 23, 24, 25],
            result: None,
        },
        ResearchTask {
            id: 50,
            subject: "analytics-assessment-synthesis".into(),
            description: format!(
                "Synthesise ALL learning analytics and assessment research (tasks 26-31) into \
                a unified Analytics & Assessment Intelligence report. Produce: \
                (1) predictive analytics — what works and fairness challenges, \
                (2) automated scoring — essay, code, competency assessment state-of-the-art, \
                (3) item generation — quality and viability for production use, \
                (4) academic integrity in the AI age — detection and policy, \
                (5) recommended assessment analytics platform architecture. {ctx}"
            ),
            preamble: "You are a senior learning analytics researcher. Produce a comprehensive \
                synthesis report in Markdown integrating all analytics and assessment findings."
                .into(),
            status: TaskStatus::Pending,
            owner: None,
            dependencies: vec![26, 27, 28, 29, 30, 31],
            result: None,
        },
        ResearchTask {
            id: 51,
            subject: "self-regulated-metacognition-synthesis".into(),
            description: format!(
                "Synthesise ALL self-regulated learning and metacognition research (tasks 32-36) \
                into a unified SRL Intelligence report. Produce: \
                (1) metacognitive scaffolding — what interventions produce measurable gains, \
                (2) AI note-taking and summarization — help or hindrance to learning, \
                (3) study planning AI — practical effectiveness and adoption, \
                (4) motivation and engagement — AI interventions that work, \
                (5) collaborative learning — AI facilitation best practices. {ctx}"
            ),
            preamble: "You are a senior educational psychology researcher. Produce a \
                comprehensive synthesis report in Markdown integrating all SRL findings."
                .into(),
            status: TaskStatus::Pending,
            owner: None,
            dependencies: vec![32, 33, 34, 35, 36],
            result: None,
        },
        ResearchTask {
            id: 52,
            subject: "human-ai-literacy-synthesis".into(),
            description: format!(
                "Synthesise ALL human-AI collaboration and literacy research (tasks 37-41) into \
                a unified Human-AI Learning Partnership report. Produce: \
                (1) AI literacy — essential competencies and curriculum approaches, \
                (2) prompt literacy — teaching effective AI interaction, \
                (3) ethics and governance — privacy, bias, surveillance concerns, \
                (4) teacher-AI partnership — adoption barriers and enablers, \
                (5) accessibility and inclusion — AI as equalizer. {ctx}"
            ),
            preamble: "You are a senior human-AI interaction researcher. Produce a \
                comprehensive synthesis report in Markdown integrating all human-AI findings."
                .into(),
            status: TaskStatus::Pending,
            owner: None,
            dependencies: vec![37, 38, 39, 40, 41],
            result: None,
        },
        ResearchTask {
            id: 53,
            subject: "emerging-frontiers-synthesis".into(),
            description: format!(
                "Synthesise ALL emerging frontiers research (tasks 42-46) into a unified \
                Emerging Frontiers in AI Learning report. Produce: \
                (1) multi-agent educational environments — architectures and use cases, \
                (2) knowledge graphs for education — construction and application, \
                (3) OER and lifelong learning with AI — scale and access, \
                (4) neuroscience-informed AI learning — what's practical today, \
                (5) most promising emerging directions for 2026-2030. {ctx}"
            ),
            preamble: "You are a senior educational technology researcher. Produce a \
                comprehensive synthesis report in Markdown integrating all emerging findings."
                .into(),
            status: TaskStatus::Pending,
            owner: None,
            dependencies: vec![42, 43, 44, 45, 46],
            result: None,
        },
        ResearchTask {
            id: 54,
            subject: "top-papers-datasets-gaps".into(),
            description: format!(
                "Compile the TOP 50 most important papers across ALL domains, catalog key \
                datasets and benchmarks, and identify research gaps. Produce: \
                (1) ranked paper list — title, authors, year, venue, key contribution, relevance, \
                (2) datasets catalog — ASSISTments, EdNet, Junyi, Open University, etc., \
                (3) benchmarks and leaderboards — knowledge tracing, AES, question generation, \
                (4) research gaps — underexplored areas, missing datasets, methodological needs, \
                (5) high-impact research directions for the next 3-5 years. {ctx}"
            ),
            preamble: "You are a senior research bibliographer. Produce a ranked compilation \
                of top papers, datasets, and research gaps in AI for learning."
                .into(),
            status: TaskStatus::Pending,
            owner: None,
            dependencies: vec![47, 48, 49, 50, 51, 52, 53],
            result: None,
        },
        ResearchTask {
            id: 55,
            subject: "implementation-roadmap-landscape".into(),
            description: format!(
                "Create an implementation roadmap and industry landscape for AI in learning. \
                Produce: \
                (1) production readiness assessment by domain — what's deployable now vs future, \
                (2) EdTech landscape — key players (Duolingo, Khan Academy, Coursera, etc.), \
                (3) startup ecosystem — emerging companies and funding trends, \
                (4) build vs buy analysis for key capabilities, \
                (5) phased implementation roadmap — quick wins, medium-term, long-term, \
                (6) ethical framework — privacy, bias, equity considerations for deployment. {ctx}"
            ),
            preamble: "You are a senior EdTech strategist. Produce a comprehensive \
                implementation roadmap and industry landscape report."
                .into(),
            status: TaskStatus::Pending,
            owner: None,
            dependencies: vec![47, 48, 49, 50, 51, 52, 53],
            result: None,
        },
    ]
}

#[tokio::main]
async fn main() -> Result<()> {
    tracing_subscriber::fmt::init();
    dotenvy::dotenv().ok();

    let api_key =
        std::env::var("DEEPSEEK_API_KEY").context("DEEPSEEK_API_KEY must be set")?;
    let base_url = std::env::var("DEEPSEEK_BASE_URL")
        .unwrap_or_else(|_| DEFAULT_BASE_URL.to_string());
    let scholar_key = std::env::var("SEMANTIC_SCHOLAR_API_KEY").ok();

    std::fs::create_dir_all(OUT_DIR)
        .with_context(|| format!("creating output dir {OUT_DIR}"))?;

    let tasks = research_tasks();
    let team_size = 55;
    eprintln!(
        "Launching knowledge/learning AI research team: {team_size} workers, {} tasks\n",
        tasks.len()
    );

    let lead = TeamLead::new(TeamConfig {
        team_size,
        provider: LlmProvider::DeepSeek { api_key, base_url },
        scholar_key,
        code_root: None,
        synthesis_preamble: Some(
            "You are a world-class research director producing the definitive landscape \
            report on AI/ML for learning and studying. Synthesise all findings into a coherent, \
            actionable executive report."
                .into(),
        ),
        synthesis_prompt_template: Some(
            "You have received {count} research reports from domain-specialist agents \
            covering all aspects of AI/ML for learning and studying. Synthesise them into a single \
            comprehensive report with the following sections:\n\n\
            # AI for Learning & Studying — Deep Research Synthesis\n\n\
            ## Executive Summary\n\
            High-level landscape overview, key findings, and strategic implications.\n\n\
            ## Cross-Cutting Themes\n\
            Techniques, architectures, and patterns that span multiple domains.\n\n\
            ## Top 50 Papers\n\
            The most important papers across all domains with citations and links.\n\n\
            ## Emerging Trends (2026-2030)\n\
            What's coming next in AI for education and learning.\n\n\
            ## Datasets & Benchmarks\n\
            Essential open datasets, benchmarks, and competitions.\n\n\
            ## Research Gaps\n\
            Highest-impact open problems and underexplored areas.\n\n\
            ## Ethics & Governance\n\
            Privacy, bias, fairness, surveillance, equity in educational AI.\n\n\
            ## Implementation Roadmap\n\
            From research to production — phased plan, tech stacks, build vs buy.\n\n\
            ## EdTech Landscape\n\
            Industry players, startups, funding, market opportunity.\n\n\
            ---\n\n\
            Individual agent reports:\n\n{combined}"
                .into(),
        ),
        tool_config: Some(SearchToolConfig {
            default_limit: 10,
            abstract_max_chars: 500,
            max_authors: 5,
            include_fields_of_study: true,
            include_venue: true,
            search_description: None,
            detail_description: None,
        }),
        scholar_concurrency: Some(1),
        mailto: std::env::var("RESEARCH_MAILTO").ok(),
        output_dir: Some(OUT_DIR.into()),
        synthesis_provider: None,
        ranker: None,
    });

    let result = lead.run(tasks).await?;

    for (id, subject, content) in &result.findings {
        let path = format!("{OUT_DIR}/agent-{id:03}-{subject}.md");
        std::fs::write(&path, content)
            .with_context(|| format!("writing {path}"))?;
        eprintln!("  wrote {path} ({} bytes)", content.len());
    }

    let synthesis_path = format!("{OUT_DIR}/synthesis.md");
    std::fs::write(&synthesis_path, &result.synthesis)
        .with_context(|| format!("writing {synthesis_path}"))?;
    eprintln!("  wrote {synthesis_path} ({} bytes)", result.synthesis.len());

    let mut combined = String::from(
        "# AI for Learning & Studying — Complete Research Report (55 Agents)\n\n",
    );
    for (id, subject, content) in &result.findings {
        combined.push_str(&format!(
            "## Agent {id}: {subject}\n\n{content}\n\n---\n\n"
        ));
    }
    combined.push_str("## Grand Synthesis\n\n");
    combined.push_str(&result.synthesis);

    let combined_path =
        format!("{OUT_DIR}/knowledge-ai-research-complete.md");
    std::fs::write(&combined_path, &combined)
        .with_context(|| format!("writing {combined_path}"))?;
    eprintln!("  wrote {combined_path} ({} bytes)", combined.len());

    eprintln!("\nDone — {} agent reports + synthesis + combined.", result.findings.len());
    Ok(())
}
