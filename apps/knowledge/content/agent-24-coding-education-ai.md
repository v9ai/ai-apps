Now let me compile all these findings into a comprehensive structured report. Based on my searches, I have gathered substantial literature across all five focus areas. Let me organize this into a comprehensive report.

# AI for Coding Education: A Comprehensive Research Landscape (2018-2026)

## Executive Summary

This research survey examines AI applications in coding education across five critical domains: (1) code completion and suggestion tools, (2) automated program repair, (3) code explanation generation, (4) plagiarism detection vs AI-assisted coding, and (5) block-based to text-based programming transitions. The analysis synthesizes findings from 2018-2026, building on foundational work in intelligent tutoring systems and LLM applications in education to provide a comprehensive landscape of academic papers, methods, datasets, and production systems.

## 1. Code Completion and Suggestion Tools for Learning

### 1.1 GitHub Copilot and Codex in Education

**Brett A. Becker et al. (2023)** [Programming Is Hard - Or at Least It Used to Be](https://doi.org/10.1145/3545945.3569759). This position paper (302 citations) argues that the computing education community must act quickly to leverage opportunities and mitigate challenges presented by AI-driven code generation tools like GitHub Copilot.

**James Prather et al. (2023)** [The Robots Are Here: Navigating the Generative AI Revolution in Computing Education](https://doi.org/10.1145/3623762.3633499). Examines how LLM-powered tools that interpret and generate source code are reshaping computing education, with specific focus on GitHub Copilot and similar tools (279 citations).

**James Finnie-Ansley et al. (2023)** [My AI Wants to Know if This Will Be on the Exam: Testing OpenAI's Codex on CS2 Programming Exercises](https://doi.org/10.1145/3576123.3576134). Extends research beyond introductory programming to examine Codex performance on CS2-level exercises, revealing capabilities and limitations in more advanced contexts (159 citations).

### 1.2 Educational Impact Studies

**Manal Alanazi et al. (2025)** [The Influence of Artificial Intelligence Tools on Learning Outcomes in Computer Programming: A Systematic Review and Meta-Analysis](https://doi.org/10.3390/computers14050185). Meta-analysis of 35 controlled studies showing AI-assisted learning significantly reduces cognitive load and improves learning outcomes in programming courses.

**Olga Timčenko (2024)** [Case Study: Using Artificial Intelligence as a Tutor for a Programming Course](https://doi.org/10.1109/ithet61869.2024.10837624). Case study where GitHub Copilot served as a coding tutor, leading to higher-quality student projects and increased engagement.

### 1.3 Guardrails and Responsible Use

**Mark Liffiton et al. (2023)** [CodeHelp: Using Large Language Models with Guardrails for Scalable Support in Programming Classes](https://doi.org/10.1145/3631802.3631830). Introduces CodeHelp, an LLM-powered tool with guardrails to prevent over-reliance while providing on-demand assistance (147 citations).

## 2. Automated Program Repair for Student Code

### 2.1 Traditional Program Repair Approaches

**Sumit Gulwani et al. (2018)** [Automated clustering and program repair for introductory programming assignments](https://doi.org/10.1145/3192366.3192387). Presents a novel automated program repair algorithm using existing correct student solutions to generate feedback, enabling scalability for large courses (119 citations).

**Jooyong Yi et al. (2017)** [A feasibility study of using automated program repair for introductory programming assignments](https://doi.org/10.1145/3106237.3106262). Early feasibility study exploring the marriage of intelligent programming tutoring and automated program repair technologies (111 citations).

### 2.2 LLM-Based Program Repair

**Charles Koutcheme et al. (2023)** [Automated Program Repair Using Generative Models for Code Infilling](https://doi.org/10.1007/978-3-031-36272-9_74). Investigates using generative models for code infilling to repair student programs, showing improved performance over traditional methods.

**Qianhui Zhao et al. (2025)** [Peer-aided repairer: empowering large language models to repair advanced student assignments](https://doi.org/10.1007/s10664-025-10716-z). Proposes a peer-aided approach where LLMs leverage correct peer solutions to repair advanced student assignments.

### 2.3 Error Classification and Localization

**Siqi Han et al. (2023)** [ErrorCLR: Semantic Error Classification, Localization and Repair for Introductory Programming Assignments](https://doi.org/10.1145/3539618.3591680). Presents ErrorCLR, a comprehensive framework for semantic error classification, localization, and repair in student code.

## 3. Code Explanation Generation for Novices

### 3.1 LLM-Powered Code Understanding

**Daye Nam et al. (2024)** [Using an LLM to Help With Code Understanding](https://doi.org/10.1145/3597503.3639187). Investigates LLM-based conversational UIs built directly in IDEs to help programmers understand code, with implications for educational settings (241 citations).

**Juho Leinonen et al. (2023)** [Comparing Code Explanations Created by Students and Large Language Models](https://doi.org/10.1145/3587102.3588785). Comparative study examining differences between student-generated and LLM-generated code explanations, revealing both strengths and limitations of LLM explanations (171 citations).

### 3.2 Enhanced Error Messages

**Juho Leinonen et al. (2023)** [Using Large Language Models to Enhance Programming Error Messages](https://doi.org/10.1145/3545945.3569770). Demonstrates how LLMs can transform cryptic compiler error messages into novice-friendly explanations, addressing a long-standing challenge in programming education (202 citations).

### 3.3 Logic Error Detection

**Stephen MacNeil et al. (2024)** [Decoding Logic Errors: A Comparative Study on Bug Detection by Students and Large Language Models](https://doi.org/10.1145/3636243.3636245). Compares student and LLM performance in detecting logic errors, highlighting LLM strengths in certain error patterns while identifying areas where human reasoning remains superior.

## 4. Plagiarism Detection vs AI-Assisted Coding

### 4.1 Academic Integrity Challenges

**Yogesh K. Dwivedi et al. (2023)** [Opinion Paper: "So what if ChatGPT wrote it?" Multidisciplinary perspectives on opportunities, challenges and implications of generative conversational AI for research, practice and policy](https://doi.org/10.1016/j.ijinfomgt.2023.102642). Comprehensive multidisciplinary analysis of ChatGPT's implications, including academic integrity concerns in programming education (3275 citations).

**Debby Cotton et al. (2023)** [Chatting and cheating: Ensuring academic integrity in the era of ChatGPT](https://doi.org/10.1080/14703297.2023.2190148). Examines the tension between ChatGPT's educational benefits and academic integrity risks, with specific considerations for programming courses (1735 citations).

### 4.2 Policy and Pedagogical Responses

**Miriam Sullivan et al. (2023)** [ChatGPT in higher education: Considerations for academic integrity and student learning](https://doi.org/10.37074/jalt.2023.6.1.17). Argues for adapting teaching and assessment practices to embrace AI tools while maintaining academic integrity standards (681 citations).

**Mike Perkins (2023)** [Academic Integrity considerations of AI Large Language Models in the post-pandemic era: ChatGPT and beyond](https://doi.org/10.53761/1.20.02.07). Explores academic integrity considerations specifically for programming education, suggesting new assessment paradigms (602 citations).

### 4.3 Detection and Prevention Strategies

**Jaromír Šavelka et al. (2023)** [Thrilled by Your Progress! Large Language Models (GPT-4) No Longer Struggle to Pass Assessments in Higher Education Programming Courses](https://doi.org/10.1145/3568813.3600142). Documents GPT-4's ability to pass programming assessments, highlighting the need for new assessment strategies that focus on process rather than just final code (124 citations).

## 5. Block-Based to Text-Based Programming Transitions

### 5.1 Modality Transitions and Challenges

**Joel Coffman et al. (2023)** [Visual vs. Textual Programming Languages in CS0.5](https://doi.org/10.1145/3545945.3569722). Randomized comparative study of 1083 students examining impacts of transitioning from visual (RAPTOR) to textual (Python) programming languages, revealing both cognitive and affective challenges.

**Alexander Repenning (2017)** [Moving Beyond Syntax: Lessons from 20 Years of Blocks Programing in AgentSheets](https://doi.org/10.18293/vlss2017-010). Argues for moving beyond syntactic concerns in block-based programming to support semantic and pragmatic understanding, with implications for transition to text-based languages.

### 5.2 AI-Enhanced Transition Support

**Advait Sarkar (2023)** [Will Code Remain a Relevant User Interface for End-User Programming with Generative AI Models?](https://doi.org/10.1145/3622758.3622882). Proposes the "generative shift hypothesis" suggesting that generative AI may change the relevance of traditional programming languages for end-users, with implications for educational transitions.

**James Prather et al. (2024)** [Interactions with Prompt Problems: A New Way to Teach Programming with Large Language Models](http://arxiv.org/abs/2401.10759). Introduces "Prompt Problems" as a new pedagogical approach that could bridge visual and textual programming by focusing on problem specification rather than syntax.

### 5.3 Scaffolding Approaches

**Johan Jeuring et al. (2022)** [Towards Giving Timely Formative Feedback and Hints to Novice Programmers](https://doi.org/10.1145/3571785.3574124). Examines approaches for providing stepwise feedback and hints to novice programmers, with applications for scaffolding transitions between programming modalities.

## 6. Cognitive Science and Learning Foundations

### 6.1 Student Misconceptions and Difficulties

**Yizhou Qian & James Daniel Lehman (2017)** [Students' Misconceptions and Other Difficulties in Introductory Programming](https://doi.org/10.1145/3077618). Comprehensive review of student misconceptions in introductory programming, providing foundational understanding for AI tool design (484 citations).

### 6.2 Adaptive Learning Systems

**Sami Sarsa et al. (2022)** [Automatic Generation of Programming Exercises and Code Explanations Using Large Language Models](https://doi.org/10.1145/3501385.3543957). Demonstrates OpenAI Codex's ability to generate novel programming exercises and explanations, enabling adaptive learning content creation (412 citations).

### 6.3 Self-Regulated Learning Support

**Paul Denny et al. (2024)** [Prompt Problems: A New Programming Exercise for the Generative AI Era](https://doi.org/10.1145/3626252.3630909). Introduces a new type of programming exercise focusing on prompt construction for code-generating models, supporting development of self-regulated learning skills (129 citations).

## 7. Methodological Approaches and Evaluation

### 7.1 Research Methods in AI Coding Education
- **Empirical Studies**: Controlled experiments examining AI tool impact (Finnie-Ansley et al., 2023; Šavelka et al., 2023)
- **Case Studies**: Implementation reports from specific educational contexts (Timčenko, 2024)
- **Systematic Reviews**: Comprehensive literature syntheses (Alanazi et al., 2025; Lo, 2023)
- **Comparative Studies**: Direct comparisons between human and AI performance (MacNeil et al., 2024; Leinonen et al., 2023)

### 7.2 Evaluation Metrics
- **Learning Outcomes**: Exam scores, assignment completion rates, skill acquisition
- **Cognitive Load**: Mental effort measurements during programming tasks
- **Engagement Metrics**: Time on task, interaction patterns, tool usage frequency
- **Quality Assessments**: Code correctness, efficiency, readability, maintainability
- **Affective Measures**: Student confidence, frustration levels, motivation

## 8. Key Production Systems and Tools

### 8.1 Commercial and Open-Source Tools
- **GitHub Copilot**: AI pair programmer with educational applications
- **ChatGPT/Codex**: General-purpose LLMs adapted for programming education
- **CodeHelp**: Research tool with guardrails for educational use
- **ErrorCLR**: Framework for semantic error classification and repair
- **M-Flow**: Flow-based music programming platform for K-12 education

### 8.2 Research Platforms
- **AutoTutor**: Conversational tutoring system with programming applications
- **Cognitive Tutor**: Model-tracing tutor for programming concepts
- **ASSISTments**: Web-based platform with programming support features

## 9. Ethical Considerations and Future Directions

### 9.1 Ethical Challenges
- **Over-reliance Prevention**: Balancing assistance with skill development
- **Equity and Access**: Ensuring fair access to AI tools across student populations
- **Privacy Concerns**: Protecting student data in AI-powered educational systems
- **Algorithmic Bias**: Addressing potential biases in AI-generated content and feedback

### 9.2 Future Research Directions
1. **Longitudinal Studies**: Extended investigations of AI tool impact on programming skill development
2. **Cross-Cultural Applications**: Adaptation of AI tools for diverse educational contexts
3. **Teacher Professional Development**: Research on effective training for AI tool integration
4. **Assessment Innovation**: Development of new evaluation methods for AI-assisted programming
5. **Hybrid Intelligence Systems**: Integration of human and AI capabilities in programming education

## 10. Conclusion

The landscape of AI in coding education has evolved rapidly from 2018-2026, with LLMs fundamentally reshaping how programming is taught and learned. Key findings include:

1. **Code completion tools** like GitHub Copilot show promise for enhancing learning but require careful integration to prevent over-reliance
2. **Automated program repair** systems are advancing from traditional algorithms to LLM-based approaches, improving feedback quality
3. **Code explanation generation** represents a major opportunity for LLMs to support novice understanding
4. **Academic integrity challenges** necessitate rethinking assessment strategies while leveraging AI's educational potential
5. **Block-to-text transitions** can be scaffolded through AI tools that bridge syntactic and conceptual gaps

The field requires continued interdisciplinary collaboration between AI researchers, educational scientists, cognitive psychologists, and ethicists to develop responsible, effective, and equitable AI-powered programming education systems.

## References

1. **Becker, B. A. et al. (2023)** [Programming Is Hard - Or at Least It Used to Be](https://doi.org/10.1145/3545945.3569759)

2. **Prather, J. et al. (2023)** [The Robots Are Here: Navigating the Generative AI Revolution in Computing Education](https://doi.org/10.1145/3623762.3633499)

3. **Finnie-Ansley, J. et al. (2023)** [My AI Wants to Know if This Will Be on the Exam: Testing OpenAI's Codex on CS2 Programming Exercises](https://doi.org/10.1145/3576123.3576134)

4. **Alanazi, M. et al. (2025)** [The Influence of Artificial Intelligence Tools on Learning Outcomes in Computer Programming: A Systematic Review and Meta-Analysis](https://doi.org/10.3390/computers14050185)

5. **Timčenko, O. (2024)** [Case Study: Using Artificial Intelligence as a Tutor for a Programming Course](https://doi.org/10.1109/ithet61869.2024.10837624)

6. **Liffiton, M. et al. (2023)** [CodeHelp: Using Large Language Models with Guardrails for Scalable Support in Programming Classes](https://doi.org/10.1145/3631802.3631830)

7. **Gulwani, S. et al. (2018)** [Automated clustering and program repair for introductory programming assignments](https://doi.org/10.1145/3192366.3192387)

8. **Yi, J. et al. (2017)** [A feasibility study of using automated program repair for introductory programming assignments](https://doi.org/10.1145/3106237.3106262)

9. **Koutcheme, C. et al. (2023)** [Automated Program Repair Using Generative Models for Code Infilling](https://doi.org/10.1007/978-3-031-36272-9_74)

10. **Zhao, Q. et al. (2025)** [Peer-aided repairer: empowering large language models to repair advanced student assignments](https://doi.org/10.1007/s10664-025-10716-z)

11. **Han, S. et al. (2023)** [ErrorCLR: Semantic Error Classification, Localization and Repair for Introductory Programming Assignments](https://doi.org/10.1145/3539618.3591680)

12. **Nam, D. et al. (2024)** [Using an LLM to Help With Code Understanding](https://doi.org/10.1145/3597503.3639187)

13. **Leinonen, J. et al. (2023)** [Comparing Code Explanations Created by Students and Large Language Models](https://doi.org/10.1145/3587102.3588785)

14. **Leinonen, J. et al. (2023)** [Using Large Language Models to Enhance Programming Error Messages](https://doi.org/10.1145/3545945.3569770)

15. **MacNeil, S. et al. (2024)** [Decoding Logic Errors: A Comparative Study on Bug Detection by Students and Large Language Models](https://doi.org/10.1145/3636243.3636245)

16. **Dwivedi, Y. K. et al. (2023)** [Opinion Paper: "So what if ChatGPT wrote it?" Multidisciplinary perspectives on opportunities, challenges and implications of generative conversational AI for research, practice and policy](https://doi.org/10.1016/j.ijinfomgt.2023.102642)

17. **Cotton, D. et al. (2023)** [Chatting and cheating: Ensuring academic integrity in the era of ChatGPT](https://doi.org/10.1080/14703297.2023.2190148)

18. **Sullivan, M. et al. (2023)** [ChatGPT in higher education: Considerations for academic integrity and student learning](https://doi.org/10.37074/j