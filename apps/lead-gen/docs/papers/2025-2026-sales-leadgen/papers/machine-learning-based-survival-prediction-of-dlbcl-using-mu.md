---
title: "Machine learning based survival prediction of DLBCL: Using multimodal data."
authors: ["Fahad Ahmed", "Z. Frosch", "R. Khanal", "Lalit Sehgal", "Shazia Nakhoda", "Marcus R. Messmer", "Mariusz A. Wasik", "N. Mackrides", "Yibin Yang", "Reza Nejati"]
year: 2025
venue: "Blood"
doi: ""
arxiv_id: ""
url: "https://www.semanticscholar.org/paper/3c06365e7530b3bf9757acf2476bfd73c4c91772"
citations: 0
source: s2
tier: core
query: "lead scoring machine learning gradient boosting"
tags: ["entity-resolution", "evaluation"]
---

# Machine learning based survival prediction of DLBCL: Using multimodal data.

**Authors.** Fahad Ahmed, Z. Frosch, R. Khanal, Lalit Sehgal, Shazia Nakhoda, Marcus R. Messmer, Mariusz A. Wasik, N. Mackrides, Yibin Yang, Reza Nejati

**Venue / year.** Blood · 2025

**Links.** [source](https://www.semanticscholar.org/paper/3c06365e7530b3bf9757acf2476bfd73c4c91772)

**Abstract.**

Background: Diffuse-large B-cell lymphoma (DLBCL) is a heterogeneous disease with outcomes influenced by various clinical and molecular predictors. Our aim for this study was to develop a machine learning based prediction of overall survival using clinical, laboratory, and gene expression data.
 Methods: We previously analyzed publicly available normalized expression data from NCBI-GEO (GSE181063), encompassing 1,311 DLBCL patients; where we extracted 41 genes that were associated with overall survival using statistical modeling. Here we developed a binary gene matrix that was generated from median expression of all the study population and anything with higher than median expression was considered (high expression) for the differential gene expression of 41 genes and clinical (Age, Gender, first line of treatment, curative intent, ECOG, B symptoms, Stage and IPI score), Imaging (number of lymph nodes), and lab data (LDH, CBC findings) was added to it. Outcomes included time-points (>6 months, >1, >3, >5 and >10 year(s)) and were binarized (alive = 1 and dead = 0). SMOTE (Synthetic Minority Over-sampling Technique) was used because of the imbalanced nature of biological and clinical data. Nine different machine learning models (MLMs) were developed, and the best MLMs were ranked and presented here. MLMs included: RandomForest (RF), Gradient Boosting (GB), XGBoost (XGB), AdaBoost (AB), Logistic Regression (LR), Naïve Bayes (NB), Multi-Layer Perceptron (MLP), Support Vector Machines (SVM), and k-Nearest Neighbors (KNN). The performance of these models was evaluated using true positives (TP), true negatives (TN), false positives (FP), false negative (FN), overall accuracy, sensitivity, specificity, positive predictive value (PPV), negative predictive value (NPV), F1-score, and area under the receiver-operator curve (AUROC).
 Results: That dataset included 1,311 patients with a median OS of 5.3±4.0 years (range: <1 to 14.3 years). Based on the criteria mentioned in the methods section, 41 genes were associated with a significant survival OS association, and clinical factors were included, such as the age of the patient, gender, and others. The best performing modes for each endpoint were as follows: OS >6 months, RF accuracy (87.8%), sensitivity (96.2%), specificity (53.8%), PPV (89.4%), NPV (77.8%), F1-score (0.92), AUROC (0.89). OS >1 year, AB accuracy (79.8%), sensitivity (87.8%), specificity (58.9%), PPV (84.7%), NPV (65.2%), F1-score (0.86), AUROC (0.86). OS >3 years, RF accuracy (79.0%), sensitivity (90.7%), specificity (59.6%), PPV (78.7%), NPV (79.7%), F1-score (0.84), AUROC (0.86). OS >5 years, RF accuracy (78.6%), sensitivity (81.7%), specificity (53.8%), PPV (78.2%), NPV (79.2%), F1-score (0.80), AUROC (0.84). OS >10 years, NB, accuracy (62.6%), sensitivity (78.8%), specificity (60.3%), PPV (22.3%), NPV (95.2%), F1-score (0.35), AUROC (0.76).
 Discussion: These findings suggest that clinical and gene expression data can be used to predict survival in DLBCL. For each endpoint, a better machine learning algorithm can be developed; however, excessive fine-tuning of the algorithms can lead to over-fitting and can fail external validation. In the current analysis, we did not fine tune any of the algorithms. A deeper analysis all models does show promise in each time point in terms of and each evaluation metric (TP, TN, FP, FN, overall accuracy, sensitivity, specificity, PPV, NPV, F1-score, AUROC).
 Conclusions: While these machine learning models show promise, further validation studies are essential to developing a robust prediction tool.

## Novelty (fill in)
- 
- 
- 

## Relevance to lead-gen (fill in)
- 

## Reuse opportunity (fill in)
- 
