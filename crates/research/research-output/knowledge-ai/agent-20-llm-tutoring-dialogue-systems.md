Now let me organize my findings into a comprehensive report:

# LLM-Based Tutoring Dialogue Systems: A Deep Dive (2020-2026)

## Executive Summary

This research survey provides a comprehensive analysis of LLM-based tutoring dialogue systems, focusing on five key areas: (1) Socratic dialogue generation, (2) scaffolding strategies, (3) dialogue policy, (4) multi-turn coherence and pedagogical goal tracking, and (5) evaluation methods. Building on prior findings from foundational ITS and LLM applications in education, this report synthesizes recent advances (2020-2026) in conversational tutoring systems powered by large language models.

## 1. Socratic Dialogue Generation: Question Chains and Guided Discovery

### 1.1 Foundational Approaches

**Diana‑Margarita Córdova‑Esparza (2025)** [AI-Powered Educational Agents: Opportunities, Innovations, and Ethical Challenges](https://doi.org/10.3390/info16060469). This systematic review of 82 studies provides a consolidated view of how AI-powered educational agents are engineered and validated, highlighting Socratic dialogue implementations across various domains.

**Siyang Liu et al. (2024)** [Advancing Generative Intelligent Tutoring Systems with GPT-4: Design, Evaluation, and a Modular Framework for Future Learning Platforms](https://doi.org/10.3390/electronics13244876). Presents a modular framework for designing Generative ITSs with Socratic-style interactions, tested with 30 undergraduate students showing significant improvements in foundational English skills.

### 1.2 Question Chain Generation

**Jakub Mačina et al. (2023)** [MathDial: A Dialogue Tutoring Dataset with Rich Pedagogical Properties Grounded in Math Reasoning Problems](https://doi.org/10.18653/v1/2023.findings-emnlp.372). Introduces a framework for generating tutoring dialogues by pairing human teachers with LLMs prompted to represent common student errors, creating 3k teacher-student dialogues with extensive scaffolding annotations.

**Rok Gabrovšek & David Rihtaršič (2025)** [Custom Generative Artificial Intelligence Tutors in Action: An Experimental Evaluation of Prompt Strategies in STEM Education](https://doi.org/10.3390/su17219508). Evaluates prompt strategies for Socratic dialogue in electrical engineering education, analyzing 208 student-tutoring tool interactions.

## 2. Scaffolding Strategies: Fading, Hints, and Worked Examples

### 2.1 Adaptive Scaffolding Frameworks

**Michael Sailer et al. (2024)** [The End is the Beginning is the End: The closed-loop learning analytics framework](https://doi.org/10.1016/j.chb.2024.108305). Presents a closed-loop framework integrating scaffolding strategies with learning analytics, emphasizing adaptive fading based on student progress.

**Paola Mejía‑Domenzain et al. (2024)** [Enhancing Procedural Writing Through Personalized Example Retrieval: A Case Study on Cooking Recipes](https://doi.org/10.1007/s40593-024-00405-1). Demonstrates adaptive scaffolding through personalized example retrieval for procedural writing, addressing limitations of one-size-fits-all approaches.

### 2.2 Worked Examples Generation

**Breanna Jury et al. (2024)** [Evaluating LLM-generated Worked Examples in an Introductory Programming Course](https://doi.org/10.1145/3636243.3636252). Evaluates LLM-generated interactive worked examples in a first-year Python programming course (n = ~400), finding that prompt chaining and one-shot learning optimize LLM output for educational content.

**James Prather et al. (2024)** [The Widening Gap: The Benefits and Harms of Generative AI for Novice Programmers](https://doi.org/10.48550/arXiv.2405.17739). Examines how LLMs provide scaffolding through code suggestions, hints, and explanations, while highlighting risks of over-reliance.

### 2.3 Hint Generation Strategies

**Victor-Alexandru Pădurean et al. (2024)** [BugSpotter: Automated Generation of Code Debugging Exercises](https://doi.org/10.48550/arXiv.2411.14303). Focuses on debugging scaffolding through automated hint generation for code errors, emphasizing the importance of guiding students to identify root causes rather than providing solutions.

## 3. Dialogue Policy: When to Tell vs Ask, Error Correction Strategies

### 3.1 Mixed-Initiative Dialogue Management

**Julieto Perez & Ethel Ong (2024)** [Designing an LLM-Based Dialogue Tutoring System for Novice Programming](https://doi.org/10.58459/icce.2024.4954). Presents DT4-Coding, a dialogue-based tutoring system using Ohlsson's Theory of Learning from Performance Error for error detection and correction in programming education.

**Jakub Mačina et al. (2023)** [Opportunities and Challenges in Neural Dialog Tutoring](https://doi.org/10.18653/v1/2023.eacl-main.173). Discusses dialogue policy challenges in neural dialog tutoring, including the balance between guiding students and revealing solutions too early.

### 3.2 Error Correction and Feedback Strategies

**Shan Qing & L Chen (2025)** [A Conceptual Framework for an LLM-Powered Multimodal Affective Tutoring System for Programming Education](https://doi.org/10.1145/3765325.3765345). Proposes a framework integrating affective computing with error correction strategies, addressing emotional states in programming education.

**D. P. Weitekamp et al. (2024)** [AI2T: Building Trustable AI Tutors by Interactively Teaching a Self-Aware Learning Agent](https://doi.org/10.48550/arXiv.2411.17924). Introduces AI2T, an interactively teachable AI that learns step-by-step solution tracking rules from 20-30 minutes of training, enabling robust error correction.

## 4. Multi-Turn Coherence and Pedagogical Goal Tracking

### 4.1 Goal-Oriented Dialogue Management

**Zhiwu Gong & Di Wu (2025)** [Theoretical Framework and Application Strategies of Human-AI Co-Creative Intelligent Tutoring Systems](https://doi.org/10.1145/3766557.3766625). Presents a theoretical framework for Human-AI co-creative ITS integrating cognitive science, pedagogy, and HCI principles for goal tracking.

**Y. X. Li et al. (2025)** [Beyond Single-Turn: A Survey on Multi-Turn Interactions with Large Language Models](https://doi.org/10.48550/arXiv.2504.04717). Comprehensive survey of multi-turn LLM interactions in education, covering task-oriented dialogue and conversational engagement.

### 4.2 Context Management and Coherence

**Nader Akoury et al. (2023)** [A Framework for Exploring Player Perceptions of LLM-Generated Dialogue in Commercial Video Games](https://doi.org/10.18653/v1/2023.findings-emnlp.151). While focused on gaming, provides insights into multi-turn coherence evaluation frameworks applicable to educational dialogues.

**Zheng Zhang et al. (2023)** [VISAR: A Human-AI Argumentative Writing Assistant with Visual Programming and Rapid Draft Prototyping](https://doi.org/10.48550/arXiv.2304.07810). Demonstrates hierarchical goal tracking in writing assistance, maintaining coherence across multiple drafting iterations.

## 5. Evaluation of LLM Tutors: Learning Gains, Student Satisfaction, Safety

### 5.1 Comprehensive Evaluation Frameworks

**Kaushal Kumar Maurya et al. (2025)** [Unifying AI Tutor Evaluation: An Evaluation Taxonomy for Pedagogical Ability Assessment of LLM-Powered AI Tutors](https://doi.org/10.18653/v1/2025.naacl-long.57). Presents a unified evaluation taxonomy for assessing pedagogical abilities of LLM-powered tutors across multiple dimensions.

**Wei Qiu et al. (2024)** [A Systematic Approach to Evaluate the Use of Chatbots in Educational Contexts: Learning Gains, Engagements and Perceptions](https://doi.org/10.35542/osf.io/7yga3). Provides a replicable framework for structured evaluation including longitudinal randomized control trials.

### 5.2 Learning Outcomes Assessment

**Galina Ilieva et al. (2023)** [Effects of Generative Chatbots in Higher Education](https://doi.org/10.3390/info14090492). Examines learning outcomes from generative chatbots in higher education, highlighting engagement and performance improvements.

**Andrii V. Riabko & Tetiana А. Vakaliuk (2024)** [Physics on autopilot: exploring the use of an AI assistant for independent problem-solving practice](https://doi.org/10.55056/etq.671). Experimental study comparing teacher-guided vs. chatbot-guided physics problem-solving with 12th-grade students.

### 5.3 Safety and Ethical Considerations

**James Prather et al. (2023)** [The Robots Are Here: Navigating the Generative AI Revolution in Computing Education](https://doi.org/10.1145/3623762.3633499). Addresses safety concerns in computing education, including academic integrity and appropriate use of AI tutors.

**Nigel Francis et al. (2025)** [Generative AI in Higher Education: Balancing Innovation and Integrity](https://doi.org/10.3389/bjbs.2024.14048). Examines dual-edged nature of GenAI integration, balancing innovation with academic integrity and equity concerns.

**Ahmad A. Abujaber et al. (2023)** [A Strengths, Weaknesses, Opportunities, and Threats (SWOT) Analysis of ChatGPT Integration in Nursing Education](https://doi.org/10.7759/cureus.48643). SWOT analysis highlighting safety considerations in specialized educational domains.

## 6. Technical Architectures and Implementation Approaches

### 6.1 Modular Frameworks

**Mark Liffiton et al. (2023)** [CodeHelp: Using Large Language Models with Guardrails for Scalable Support in Programming Classes](https://doi.org/10.1145/3631802.3631830). Presents CodeHelp with guardrails to prevent over-reliance while providing scalable programming assistance.

**Ben Liu et al. (2025)** [One Size doesn't Fit All: A Personalized Conversational Tutoring Agent for Mathematics Instruction](https://doi.org/10.1145/3701716.3717527). Demonstrates personalized conversational tutoring with adaptation to individual learner characteristics in mathematics.

### 6.2 Retrieval-Augmented Generation (RAG) Approaches

**H. A. Modran et al. (2024)** [LLM Intelligent Agent Tutoring in Higher Education Courses using a RAG Approach](https://doi.org/10.20944/preprints202407.0519.v1). Implements RAG for reducing hallucination and improving factual accuracy in educational agents.

**Wanli Xing et al. (2024)** [Investigating Knowledge Graphs as Structured External Memory to Enhance Large Language Models' Generation for Mathematical Concept Answering](https://doi.org/10.35542/osf.io/mx83s_v1). Uses knowledge graphs as external memory to enhance LLM accuracy in mathematical concept answering.

## 7. Datasets and Benchmarks

### 7.1 Dialogue Tutoring Datasets

**MathDial Dataset (2023)**: 3k teacher-student tutoring dialogues grounded in multi-step math reasoning problems with extensive pedagogical annotations.

**Conversational Tutoring Corpora**: Various datasets collected through human-AI collaboration frameworks for training and evaluating dialogue tutors.

### 7.2 Evaluation Benchmarks

**FrontierScience Bench (2025)**: Evaluates AI research capabilities in LLMs, including educational reasoning tasks.

**Pedagogical Ability Assessment Benchmarks**: Specialized benchmarks for evaluating tutoring-specific capabilities beyond general language understanding.

## 8. Emerging Trends and Future Directions

### 8.1 Multimodal Tutoring Systems
Integration of text, speech, visual, and affective signals for comprehensive student modeling and adaptive scaffolding.

### 8.2 Human-AI Collaborative Tutoring
Hybrid approaches combining teacher expertise with AI scalability, as emphasized in Córdova-Esparza's systematic review.

### 8.3 Longitudinal Adaptation
Systems that learn and adapt over extended periods based on student progress and changing needs.

### 8.4 Cross-Domain Transfer
Development of tutoring systems that can transfer pedagogical strategies across different subject domains.

## 9. Key Challenges and Research Gaps

### 9.1 Technical Challenges
- **Hallucination Mitigation**: Ensuring factual accuracy in generated content
- **Scalability**: Balancing personalization with computational efficiency
- **Context Management**: Maintaining coherence across extended dialogue sessions

### 9.2 Pedagogical Challenges
- **Scaffolding Fading**: Determining optimal timing for reducing support
- **Error Diagnosis**: Accurately identifying root causes of student misconceptions
- **Motivational Support**: Integrating affective and motivational scaffolding

### 9.3 Ethical and Practical Challenges
- **Over-Reliance Prevention**: Designing systems that promote learning rather than dependency
- **Equity and Access**: Ensuring fair access across diverse student populations
- **Teacher Integration**: Supporting effective teacher-AI collaboration

## 10. Conclusion

The field of LLM-based tutoring dialogue systems has advanced significantly from 2020-2026, transitioning from basic question-answering to sophisticated Socratic dialogue generation with adaptive scaffolding. Key insights include:

1. **Hybrid Human-AI Approaches** consistently outperform fully autonomous systems by combining AI scalability with pedagogical expertise
2. **Structured Scaffolding** through fading hints, worked examples, and error correction strategies is essential for effective learning
3. **Multi-turn Coherence** requires sophisticated goal tracking and context management beyond single-turn interactions
4. **Comprehensive Evaluation** must include learning gains, engagement, satisfaction, and safety considerations
5. **Ethical Implementation** requires careful attention to over-reliance prevention, equity, and academic integrity

Future research should focus on longitudinal studies, cross-domain transfer, and deeper integration of cognitive science principles with LLM capabilities to create truly effective and responsible AI tutors.

## References

1. **Córdova‑Esparza, D.‑M. (2025)** [AI-Powered Educational Agents: Opportunities, Innovations, and Ethical Challenges](https://doi.org/10.3390/info16060469)

2. **Liu, S., Guo, X., Hu, X., & Zhao, X. (2024)** [Advancing Generative Intelligent Tutoring Systems with GPT-4: Design, Evaluation, and a Modular Framework for Future Learning Platforms](https://doi.org/10.3390/electronics13244876)

3. **Mačina, J., Daheim, N., Chowdhury, S. P., Sinha, T., Kapur, M., Gurevych, I., & Sachan, M. (2023)** [MathDial: A Dialogue Tutoring Dataset with Rich Pedagogical Properties Grounded in Math Reasoning Problems](https://doi.org/10.18653/v1/2023.findings-emnlp.372)

4. **Gabrovšek, R., & Rihtaršič, D. (2025)** [Custom Generative Artificial Intelligence Tutors in Action: An Experimental Evaluation of Prompt Strategies in STEM Education](https://doi.org/10.3390/su17219508)

5. **Sailer, M., Ninaus, M., Huber, S. E., Bauer, E., & Greiff, S. (2024)** [The End is the Beginning is the End: The closed-loop learning analytics framework](https://doi.org/10.1016/j.chb.2024.108305)

6. **Mejía‑Domenzain, P., Frej, J., Neshaei, S. P., Mouchel, L., & Nazaretsky, T. (2024)** [Enhancing Procedural Writing Through Personalized Example Retrieval: A Case Study on Cooking Recipes](https://doi.org/10.1007/s40593-024-00405-1)

7. **Jury, B., Lorusso, A., Leinonen, J., Denny, P., & Luxton-Reilly, A. (2024)** [Evaluating LLM-generated Worked Examples in an Introductory Programming Course](https://doi.org/10.1145/3636243.3636252)

8. **Prather, J., Reeves, B. N., Leinonen, J., MacNeil, S., & Randrianasolo, A. S. (2024)** [The Widening Gap: The Benefits and Harms of Generative AI for Novice Programmers](https://doi.org/10.48550/arXiv.2405.17739)

9. **Pădurean, V.-A., Denny, P., & Singla, A. (2024)** [BugSpotter: Automated Generation of Code Debugging Exercises](https://doi.org/10.48550/arXiv.2411.14303)

10. **Perez, J., & Ong, E. (2024)** [Designing an LLM-Based Dialogue Tutoring System for Novice Programming](https://doi.org/10.58459/icce.2024.4954)

11. **Mačina, J., Daheim, N., Wang, L., Sinha, T., Kapur, M., Gurevych, I., & Sachan, M. (2023)** [Opportunities and Challenges in Neural Dialog Tutoring](https://doi.org/10.18653/v1/2023.eacl-main.173)

12. **Qing, S., & Chen, L. (2025)** [A Conceptual Framework for an LLM-Powered Multimodal Affective Tutoring System for Programming Education](https://doi.org/10.1145/3765325.3765345)

13. **Weitekamp, D. P., Harpstead, E., & Koedinger, K. R. (2024)** [AI2T: Building Trustable AI Tutors by Interactively Teaching a Self-Aware Learning Agent](https://doi.org/10.48550/arXiv.2411.17924)

14. **Gong, Z., & Wu, D. (2025)** [Theoretical Framework and Application Strategies of Human-AI Co-Creative Intelligent Tutoring Systems](https://doi.org/10.1145/3766557.3766625)

15. **Li, Y. X., Shen, X., Yao, X., Ding, X., & Miao, Y. (2025)** [Beyond Single-Turn: A Survey on Multi-Turn Interactions with Large Language Models](https://doi.org/10.48550/arXiv.2504.04717)

16. **Akoury, N., Yang, Q., & Iyyer, M. (2023)** [A Framework for Exploring Player Perceptions of LLM-Generated Dialogue in Commercial Video Games](https://doi.org/10.18653/v1/2023.findings-emnlp.151)

17. **Zhang, Z., Gao, J., Dhaliwal, R. S., & Li, T. J.-J. (2023)** [VIS