Based on my comprehensive search, I now have substantial material to provide a structured report on automated feedback generation with AI. Let me organize these findings.

# Automated Feedback Generation with AI: A Comprehensive Research Landscape (2018-2026)

## Executive Summary

This research survey examines automated feedback generation with AI across five key domains: (1) formative feedback strategies (immediate, delayed, elaborated), (2) LLM-generated feedback on writing (structure, argument, style), (3) code review and programming feedback automation, (4) peer review augmentation, and (5) feedback personalization. The analysis builds on prior findings from intelligent tutoring systems and LLM foundations to provide a comprehensive landscape of academic papers, methods, datasets, and production systems.

## 1. Formative Feedback Strategies: Timing and Elaboration

### 1.1 Immediate vs. Delayed Feedback

**Johan Jeuring et al. (2022)** [Towards Giving Timely Formative Feedback and Hints to Novice Programmers](https://doi.org/10.1145/3571785.3574124). This paper addresses the critical timing aspect of feedback for programming tasks, emphasizing that feedback should consider students' stepwise progress toward solutions.

**Qinjin Jia et al. (2022)** [Insta-Reviewer: A Data-Driven Approach for Generating Instant Feedback on Students' Project Reports](https://doi.org/10.5281/zenodo.6853099). Presents an automated system for providing immediate feedback on project reports, addressing the challenge of timely feedback in large courses.

### 1.2 Elaborated Feedback Systems

**Yueru Lang et al. (2022)** [The Impact of Emotional Feedback and Elaborated Feedback of a Pedagogical Agent on Multimedia Learning](https://doi.org/10.3389/fpsyg.2022.810194). Examines how emotional and elaborated feedback from pedagogical agents affects learning outcomes, motivation, and cognitive load.

**Anna Filighera et al. (2022)** [Your Answer is Incorrect... Would you like to know why? Introducing a Bilingual Short Answer Feedback Dataset](https://doi.org/10.18653/v1/2022.acl-long.587). Introduces the SAF dataset for training systems to provide explanatory feedback beyond simple correctness judgments.

### 1.3 Systematic Reviews

**Hieke Keuning et al. (2016)** [Towards a Systematic Review of Automated Feedback Generation for Programming Exercises](https://doi.org/10.1145/2899415.2899422). Foundational systematic review classifying feedback types and techniques in programming education.

**Xiaoyu Bai & Manfred Stede (2022)** [A Survey of Current Machine Learning Approaches to Student Free-Text Evaluation for Intelligent Tutoring](https://doi.org/10.1007/s40593-022-00323-0). Comprehensive survey of ML approaches for automated evaluation of natural language responses in educational contexts.

## 2. LLM-Generated Feedback on Writing

### 2.1 Essay and Academic Writing Feedback

**Sumie Chan et al. (2024)** [Generative AI and Essay Writing: Impacts of Automated Feedback on Revision Performance and Engagement](https://doi.org/10.61508/refl.v31i3.277514). Randomized controlled trial examining how AI-generated feedback affects essay revision, engagement, and emotional responses.

**Juan Escalante et al. (2023)** [AI-generated feedback on writing: insights into efficacy and ENL student preference](https://doi.org/10.1186/s41239-023-00425-2). Investigates the effectiveness of AI-generated feedback for English as a New Language students.

**Daisuke Akiba & Rebecca R. Garte (2024)** [Leveraging AI Tools in University Writing Instruction: Enhancing Student Success While Upholding Academic Integrity](https://doi.org/10.70725/355152wkijve). Explores pedagogical approaches integrating LLMs as required feedback tools while maintaining academic integrity.

### 2.2 Writing Structure and Argument Analysis

**Jieun Han et al. (2023)** [LLM-as-a-tutor in EFL Writing Education: Focusing on Evaluation of Student-LLM Interaction](https://arxiv.org/abs/2310.05191). Evaluates LLMs as English writing tutors, assessing feedback quality and student-LLM interaction patterns.

**Wenbo Xu et al. (2025)** [Explainable AI for education: Enhancing essay scoring via rubric-aligned chain-of-thought prompting](https://doi.org/10.1142/s0129183125420136). Proposes QwenScore+ framework integrating rubric-aware CoT prompting with RLHF for explainable essay scoring.

### 2.3 Automated Writing Evaluation Systems

**Stephanie Link et al. (2025)** [Fine-Tuning Large Language Models Using Nlp and a Self-Organizing Map for Genre-Based Automated Writing Evaluation](https://doi.org/10.2139/ssrn.5117045). Presents genre-aware AWE system combining LLM fine-tuning with self-organizing maps.

**Monika Hooda et al. (2022)** [Artificial Intelligence for Assessment and Feedback to Enhance Student Success in Higher Education](https://doi.org/10.1155/2022/5215722). Comprehensive review of AI applications for assessment and feedback in higher education.

## 3. Code Review and Programming Feedback Automation

### 3.1 LLM-Powered Programming Assistance

**Mark Liffiton et al. (2023)** [CodeHelp: Using Large Language Models with Guardrails for Scalable Support in Programming Classes](https://doi.org/10.1145/3631802.3631830). Introduces CodeHelp with guardrails to prevent solution revelation while providing scalable programming assistance.

**Arto Hellas et al. (2023)** [Exploring the Responses of Large Language Models to Beginner Programmers' Help Requests](https://doi.org/10.1145/3568813.3600139). Evaluates LLM responses to beginner programmer help requests across multiple models.

**Zhengdong Zhang et al. (2024)** [Students' Perceptions and Preferences of Generative Artificial Intelligence Feedback for Programming](https://doi.org/10.1609/aaai.v38i21.30372). Examines student perceptions of LLM-generated feedback for Java programming assignments.

### 3.2 Automated Programming Assessment Systems

**Igor Mekterović et al. (2020)** [Building a Comprehensive Automated Programming Assessment System](https://doi.org/10.1109/access.2020.2990980). Surveys APAS features and proposes comprehensive system architecture.

**Eduard Frankford et al. (2024)** [AI-Tutoring in Software Engineering Education](https://doi.org/10.1145/3639474.3640061). Evaluates LLMs as AI-Tutors in automated programming assessment systems.

### 3.3 Tiered and Formative Code Feedback

**Ha Nguyen & Vicki H. Allan (2024)** [Using GPT-4 to Provide Tiered, Formative Code Feedback](https://doi.org/10.1145/3626252.3630960). Demonstrates GPT-4's capability to generate tiered, formative feedback for Java code and pseudocode.

**Imen Azaiz et al. (2024)** [Feedback-Generation for Programming Exercises With GPT-4](https://doi.org/10.1145/3649217.3653594). Explores GPT-4 Turbo's quality for programming exercise feedback with varying prompt strategies.

### 3.4 Error Analysis and Debugging Support

**Tiffany Wenting Li et al. (2023)** [Am I Wrong, or Is the Autograder Wrong? Effects of AI Grading Mistakes on Learning](https://doi.org/10.1145/3568813.3600124). Investigates how AI grading errors affect student learning and trust in automated systems.

**Kelly Rivers & Kenneth R. Koedinger (2015)** [Data-Driven Hint Generation in Vast Solution Spaces: a Self-Improving Python Programming Tutor](https://doi.org/10.1007/s40593-015-0070-z). Foundational work on data-driven hint generation for programming tutors.

## 4. Peer Review Augmentation and AI-Assisted Assessment

### 4.1 AI-Enhanced Peer Feedback

**Zachary R. Noel et al. (2025)** [AI-ding peer feedback: a randomized study of self-generated vs. ai-assisted peer feedback](https://doi.org/10.1186/s12909-025-08225-0). Randomized study comparing self-generated vs. AI-assisted peer feedback in pharmacy education.

**Zhicheng Lin (2025)** [Hidden Prompts in Manuscripts Exploit AI-Assisted Peer Review](https://doi.org/10.31234/osf.io/nea5u_v2). Analyzes ethical concerns around hidden prompts manipulating AI-assisted peer review systems.

### 4.2 Collaborative Assessment Systems

**Ali Darvishi** [AI and learning analytics to improve peer review and feedback in learnersourcing](https://doi.org/10.14264/40d7932). Examines AI and learning analytics integration for improving peer review in learnersourcing environments.

**Kshitij Sharma et al. (2024)** [Self-regulation and shared regulation in collaborative learning in adaptive digital learning environments: A systematic review of empirical studies](https://doi.org/10.1111/bjet.13459). Reviews adaptive technologies supporting self- and shared regulation in collaborative learning.

## 5. Feedback Personalization and Adaptation

### 5.1 Personalized Feedback Generation

**Ekaterina Kochmar et al. (2021)** [Automated Data-Driven Generation of Personalized Pedagogical Interventions in Intelligent Tutoring Systems](https://doi.org/10.1007/s40593-021-00267-x). Presents ML approach for personalized feedback generation in dialogue-based ITS, showing 22.95% performance improvement.

**Ivica Pesovski et al. (2024)** [Generative AI for Customizable Learning Experiences](https://doi.org/10.3390/su16073034). Proposes affordable approach to personalized learning using generative AI within existing educational frameworks.

### 5.2 Adaptive Feedback Systems

**Wafaa S. Sayed et al. (2022)** [AI-based adaptive personalized content presentation and exercises navigation for an effective and engaging E-learning platform](https://doi.org/10.1007/s11042-022-13076-8). Presents AI-based adaptive system for personalized content and feedback in e-learning.

**Miloš Ilić et al. (2023)** [Intelligent techniques in e-learning: a literature review](https://doi.org/10.1007/s10462-023-10508-1). Reviews intelligent techniques for personalization and adaptation in e-learning systems.

### 5.3 Learner Characteristics and Feedback Adaptation

**Sarah Chardonnens (2025)** [Adapting educational practices for Generation Z: integrating metacognitive strategies and artificial intelligence](https://doi.org/10.3389/feduc.2025.1504726). Examines AI integration for personalized learning experiences tailored to Generation Z characteristics.

**Anastasiya A. Lipnevich et al. (2025)** [Unheard and unused: why students reject teacher and peer feedback](https://doi.org/10.3389/feduc.2025.1567704). Investigates factors influencing feedback rejection and implications for personalized feedback design.

### 5.4 Metacognitive and Self-Regulated Learning Support

**Mak Ahmad et al. (2025)** [How Adding Metacognitive Requirements in Support of AI Feedback in Practice Exams Transforms Student Learning Behaviors](https://doi.org/10.1145/3698205.3729542). Examines AI feedback systems incorporating metacognitive requirements to transform learning behaviors.

**Hongliang Qiao & Aruna Zhao (2023)** [Artificial intelligence-based language learning: illuminating the impact on speaking skills and self-regulation in Chinese EFL context](https://doi.org/10.3389/fpsyg.2023.1255594). Investigates AI-based instruction effects on language skills and self-regulatory processes.

## 6. Methodological Approaches and Evaluation

### 6.1 Research Methods and Evaluation Frameworks

**Marcelo Guerra Hahn et al. (2021)** [A Systematic Review of the Effects of Automatic Scoring and Automatic Feedback in Educational Settings](https://doi.org/10.1109/access.2021.3100890). Systematic review of 125 studies on automatic scoring and feedback effects.

**Okan Bulut & Maggie Beiting-Parrish (2024)** [The Rise of Artificial Intelligence in Educational Measurement: Opportunities and Ethical Challenges](https://doi.org/10.59863/miql7785). Examines ethical considerations in AI-based educational measurement and feedback systems.

### 6.2 Closed-Loop Learning Analytics

**Michael Sailer et al. (2024)** [The End is the Beginning is the End: The closed-loop learning analytics framework](https://doi.org/10.1016/j.chb.2024.108305). Proposes closed-loop framework integrating data collection, analysis, and adaptive feedback.

**Manuel Ninaus & Michael Sailer (2022)** [Closing the loop – The human role in artificial intelligence for education](https://doi.org/10.3389/fpsyg.2022.956798). Discusses human decision-making roles in AI-supported educational feedback systems.

## 7. Key Datasets and Production Systems

### 7.1 Educational Feedback Datasets

- **Short Answer Feedback (SAF) Dataset**: Bilingual dataset for training explanatory feedback systems (Filighera et al., 2022)
- **Programming Exercise Datasets**: Various datasets from APAS deployments and programming course interactions
- **Essay Scoring Datasets**: Rubric-aligned datasets for automated essay scoring and feedback

### 7.2 Production Feedback Systems

- **CodeHelp**: LLM-powered programming assistance with guardrails (Liffiton et al., 2023)
- **Insta-Reviewer**: Data-driven instant feedback for project reports (Jia et al., 2022)
- **QwenScore+**: Rubric-aware essay scoring with explainable feedback (Xu et al., 2025)
- **Personalized ITS Feedback**: Data-driven personalized interventions in dialogue-based ITS (Kochmar et al., 2021)

## 8. Emerging Trends and Future Directions

### 8.1 Multimodal Feedback Systems
Integration of text, audio, and visual feedback modalities for comprehensive learning support.

### 8.2 Explainable AI in Feedback
Increasing emphasis on transparent, interpretable feedback generation that aligns with pedagogical principles.

### 8.3 Human-AI Collaboration
Hybrid approaches combining AI-generated feedback with human oversight and refinement.

### 8.4 Ethical and Responsible Feedback Systems
Addressing bias, fairness, privacy, and over-reliance concerns in automated feedback generation.

### 8.5 Cross-Domain Transfer
Applying feedback generation techniques across different educational domains and contexts.

## 9. Challenges and Research Gaps

### 9.1 Technical Challenges
- Hallucination mitigation in LLM-generated feedback
- Scalability of personalized feedback systems
- Integration with existing educational infrastructure
- Real-time adaptation to learner needs and contexts

### 9.2 Pedagogical Challenges
- Balancing automation with human pedagogical expertise
- Ensuring feedback aligns with learning objectives and progression
- Maintaining student agency and self-regulation
- Developing effective feedback literacy among learners

### 9.3 Ethical and Equity Challenges
- Addressing algorithmic bias in feedback generation
- Ensuring equitable access to AI-powered feedback tools
- Protecting student data privacy and autonomy
- Preventing over-reliance and skill atrophy

## 10. Conclusion

The landscape of automated feedback generation with AI has evolved significantly from 2018-2026, transitioning from rule-based systems to sophisticated LLM-powered approaches. Key advancements include:

1. **Timing Optimization**: Research on immediate vs. delayed feedback timing for different learning contexts
2. **Elaboration Enhancement**: Development of explanatory feedback systems beyond simple correctness judgments
3. **Domain Specialization**: Tailored approaches for writing feedback, programming assistance, and peer review augmentation
4. **Personalization Advances**: Data-driven personalized feedback adapting to learner characteristics and progress
5. **Ethical Frameworks**: Growing emphasis on responsible AI implementation in educational feedback

The field requires continued interdisciplinary collaboration between AI researchers, educational scientists, cognitive psychologists, and ethicists to develop effective, equitable, and pedagogically sound automated feedback systems.

## References

1. **Jeuring, J. et al. (2022)** [Towards Giving Timely Formative Feedback and Hints to Novice Programmers](https://doi.org/10.1145/3571785.3574124)

2. **Jia, Q. et al. (2022)** [Insta-Reviewer: A Data-Driven Approach for Generating Instant Feedback on Students' Project Reports](https://doi.org/10.5281/zenodo.6853099)

3. **Lang, Y. et al. (2022)** [The Impact of Emotional Feedback and Elaborated Feedback of a Pedagogical Agent on Multimedia Learning](https://doi.org/10.3389/fpsyg.2022.810194)

4. **Filighera, A. et al. (2022)** [Your Answer is Incorrect... Would you like to know why? Introducing a Bilingual Short Answer Feedback Dataset](https://doi.org/10.18653/v1/2022.acl-long.587)

5. **Keuning, H. et al. (2016)** [Towards a Systematic Review of Automated Feedback Generation for Programming Exercises](https://doi.org/10.1145/2899415.2899422)

6. **Bai, X. & Stede, M. (2022)** [A Survey of Current Machine Learning Approaches to Student Free-Text Evaluation for Intelligent Tutoring](https://doi.org/10.1007/s40593-022-00323-0)

7. **Chan, S. et al. (2024)** [Generative AI and Essay Writing: Impacts of Automated Feedback on Revision Performance and Engagement](https://doi.org/10.61508/refl.v31i3.277514)

8. **Escalante, J. et al. (2023)** [AI-generated feedback on writing: insights into efficacy and ENL student preference](https://doi.org/10.1186/s41239-023-00425-2)

9. **Akiba, D. & Garte, R.R. (2024)** [Leveraging AI Tools in University Writing Instruction: Enhancing Student Success While Upholding Academic Integrity](https://doi.org/10.70725/355152wkijve)

10. **Han, J. et al. (2023)** [LLM-as-a-tutor in EFL Writing Education: Focusing on Evaluation of Student-LLM Interaction](http://arxiv.org/abs/2310.05191)

11. **Xu, W. et al. (2025)** [Explainable AI for education: Enhancing essay scoring via rubric-aligned chain-of-thought prompting](https://doi.org/10.1142/s0129183125420136)

12. **Link, S. et al. (2025)** [Fine-Tuning Large Language Models Using Nlp and a Self-Organizing Map