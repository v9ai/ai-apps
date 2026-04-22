---
title: "Cold Email Generation Datasets for Prompt Evaluation (Informative vs. Basic Prompting)"
authors: ["Saravanarajan G"]
year: 2025
venue: ""
doi: "10.5281/zenodo.16903346"
arxiv_id: ""
url: "https://zenodo.org/records/16903346"
citations: 0
source: zenodo
tier: core
query: "cold email personalization LLM agent outreach"
tags: ["email-llm", "entity-resolution", "personalization", "evaluation"]
---

# Cold Email Generation Datasets for Prompt Evaluation (Informative vs. Basic Prompting)

**Authors.** Saravanarajan G

**Venue / year.** 2025

**Links.** [DOI](https://doi.org/10.5281/zenodo.16903346) · [source](https://zenodo.org/records/16903346)

**Abstract.**

This repository contains two datasets designed to evaluate the performance of Large Language Models (LLMs) on&nbsp;personalized cold email generation tasks. Both datasets were created using job postings as input and recording generated cold emails under different prompting strategies.
Each dataset is stored in .xlsx format and includes:


Job URL &ndash; The source link to the job posting.


Job Role, Skills, and Description &ndash; Extracted details about the target job.


Generated Email &ndash; The cold email output produced by the LLM.


Personalization Fields &ndash; Candidate portfolio links, company details (XYZ, AI/Software Consulting), and personalization tokens.


Prompt Reference &ndash; The prompt used to guide generation shown Below.


Datasets


Dataset 1: all_model_evaluation_P1.xlsx (Informative &amp; Detail-Oriented Prompt)


Emails are generated using a comprehensive prompt template that enforces a structured format, detailed explanation of portfolio links, strong role alignment, and a professional call-to-action.


Intended for benchmarking LLMs in information integration, personalization, and professional tone adherence.Prompt:
email_prompt_informative = PromptTemplate.from_template("""You are a highly skilled AI writing assistant helping a job applicant from XYZ (AI/Software Consulting) draft a professional cold email. The email should reflect clarity, confidence, and deep alignment with the job description.
### JOB POSTING INFORMATION:- Job Role: {job_role}- Key Skills: {job_skills}- Description: {job_description}
### CANDIDATE PROFILE:- Portfolio Links: {link_list}
### TASK:Write a cold email to the hiring manager. The email should:- Greet and address the hiring manager professionally- Clearly state the candidate is applying for the "{job_role}" role- Mention **each** portfolio link and how it demonstrates alignment with the job- Maintain a balance of professionalism and enthusiasm- Include a call-to-action asking for an interview or meeting
### EMAIL STRUCTURE:1. Formal greeting2. Interest in the role and how it matches the candidate's background3. Explanation of portfolio links4. Enthusiastic closing with call-to-action
### OUTPUT FORMAT:Dear Hiring Manager,
[Write the email here]
Best regards, &nbsp;ABC, Business Development Executive""")




Dataset 2: all_model_evaluation_P2.xlsx (Basic &amp; Minimal Prompt)


Emails are generated with a minimal, general-purpose prompt template that requests only basic elements: greeting, job title mention, portfolio links, and short closing.


Intended for evaluating LLMs in conciseness, generalization, and quick response generation.Prompt:&nbsp;
email_prompt_basic = PromptTemplate.from_template("""Write a simple cold email applying for the role of {job_role} at XYZ (AI/Software Consulting).
Include:- A greeting to the hiring manager- Mention of the job title- Reference to the candidate&rsquo;s portfolio links: {link_list}- A short closing with a request to connect
Job Description: {job_description} &nbsp;Skills: {job_skills}
End with:Best regards, &nbsp;ABC, Business Development Executive""")




Use Cases


Benchmarking LLM performance on structured vs. minimal prompts


Studying the effects of prompt detail level on personalization and professionalism in generated texts


Research in prompt engineering, noise robustness, information integration, and personalized communication


Training/testing datasets for cold email generation models


File Format


Both datasets are provided in Microsoft Excel (.xlsx) format.


Each row corresponds to one job posting &rarr; generated email pair.


License
Openly available for research and educational purposes. Please cite this dataset if used in publications.

## Novelty (fill in)
- 
- 
- 

## Relevance to lead-gen (fill in)
- 

## Reuse opportunity (fill in)
- 
