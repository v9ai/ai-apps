---
title: "Evaluating the impact of stem cell transplantation in myelodysplastic syndrome using machine learning and comparative modeling"
authors: ["Ziyi Li", "K. Chien", "Yue Lyu", "K. Sasaki", "I. Bouligny", "Yue Wei", "G. Montalban-Bravo", "S. Loghavi", "A. Bataller", "U. Popat", "H. Kantarjian", "A. Bazinet", "G. Garcia-Manero"]
year: 2025
venue: "Blood"
doi: ""
arxiv_id: ""
url: "https://www.semanticscholar.org/paper/63b4261c9157a4141e9d513f6ad987af34d2c9fd"
citations: 1
source: s2
tier: core
query: "lead scoring machine learning gradient boosting"
tags: ["entity-resolution", "lead-scoring", "llm-agents", "personalization"]
---

# Evaluating the impact of stem cell transplantation in myelodysplastic syndrome using machine learning and comparative modeling

**Authors.** Ziyi Li, K. Chien, Yue Lyu, K. Sasaki, I. Bouligny, Yue Wei, G. Montalban-Bravo, S. Loghavi, A. Bataller, U. Popat, H. Kantarjian, A. Bazinet, G. Garcia-Manero

**Venue / year.** Blood · 2025

**Links.** [source](https://www.semanticscholar.org/paper/63b4261c9157a4141e9d513f6ad987af34d2c9fd)

**Abstract.**

Background: Most patients with myelodysplastic syndromes (MDS) experience incomplete and short-lived responses to hypomethylating agents (HMAs), the current first-line therapy for higher-risk MDS. Loss of response and disease progression typically lead to poor survival outcomes, with median survival of just 4–6 months. Allogeneic stem cell transplantation (SCT) offers the potential to significantly extend survival, even after HMA failure, but it carries substantial risks and complications. Accurate prediction of survival and treatment outcomes is therefore essential for timely, informed decision-making between HMA and SCT.
 Existing risk stratification tools such as the Revised International Prognostic Scoring System (IPSS-R) and the Molecular IPSS (IPSS-M) classify patients into broad risk categories but fall short in providing personalized survival estimates. Moreover, these systems rely on linear models, whereas modern machine learning methods can capture both linear and nonlinear effects, offering more precise predictions.
 Methods: To address these gaps, we applied the Cox proportional hazards model alongside four machine learning approaches—Random Survival Forest (RSF), Gradient Boosting for Survival (GBM), eXtreme Gradient Boosting (XGBoost), and Ensemble Super Learner (SL)—to generate individualized survival predictions for MDS patients. We compared predicted versus observed survival in both SCT and non-SCT cohorts and further explored patient characteristics associated with longer- or shorter-than-expected survival among those who underwent SCT.
 Results: We trained Cox proportional hazards and four machine learning models using a cohort of 814 SCT-naïve MDS patients. Covariates included age, peripheral blood counts, bone marrow blasts, cytogenetic risk scores, and 15 common gene mutation statuses. The trained models were then independently applied to two non-overlapping testing cohorts: 555 patients who received SCT and 300 additional SCT-naïve patients. Compared to SCT-naïve patients, those who received SCT were significantly younger (median age 58 vs. 71 years, p < 0.001), had higher IPSS-R scores (5.5 vs. 4.0, p < 0.001), higher hemoglobin levels (9.7 vs. 9.2, p = 0.017), lower platelet counts (74 vs. 98, p = 0.001), and higher bone marrow blast percentages (6.0% vs. 3.0%, p < 0.001). The median time from diagnosis to SCT was 7 months (Interquartile range: 5–13).
 In the independent testing cohort of SCT-naïve patients, machine learning models outperformed the Cox model in survival prediction (C-index: 0.81 for RSF, 0.811 for GBM, 0.81 for XGBoost, 0.815 for Super Learner, vs. 0.776 for Cox). However, predictive accuracy was lower in the SCT cohort (C-index range: 0.679–0.696 across models), suggesting that SCT substantially alters patients' survival trajectories.
 Using predictions from the SL model, we classified patients who lived ≥3 months longer than predicted as “good” SCT responders (n = 266) and those who died ≥3 months earlier as “poor” responders (n = 132). A multivariable logistic regression model incorporating age, hemoglobin, platelet count, and cytogenetics score revealed that higher hemoglobin levels were significantly associated with lower odds of a favorable SCT response (odds ratio [OR] 0.79; 95% confidence interval [CI]: 0.69–0.89; p = 0.00019). Older age (OR per 10-year increase: 0.80; 95% CI: 0.66–0.97; p = 0.033), higher platelet count (OR per 10-unit increase: 0.98; 95% CI: 0.96–0.99; p = 0.0145), and lower cytogenetics risk scores (OR: 1.19; 95% CI: 1.00–1.43; p = 0.046) were also associated with decreased odds of SCT benefit. Additional clinical variables, including Absolute Neutrophil Count (ANC), bone marrow (BM) blast percentage, and TP53 mutation status, were evaluated in univariate analysis but did not reach statistical significance and were therefore excluded from the multivariable model (ANC: p = 0.59; BM blasts: p = 0.09; TP53: p = 0.26).Conclusions: This study presents the first systematic application of modern machine learning models to compare SCT and non-SCT outcomes in MDS. Our findings confirm that SCT can significantly alter patient survival—either prolonging or shortening life—and highlight key patient characteristics associated with treatment response. These results underscore the need for larger, stratified studies to better guide patient selection and optimize SCT o

## Novelty (fill in)
- 
- 
- 

## Relevance to lead-gen (fill in)
- 

## Reuse opportunity (fill in)
- 
