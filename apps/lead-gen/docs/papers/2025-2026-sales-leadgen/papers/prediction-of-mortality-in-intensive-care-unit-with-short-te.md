---
title: "Prediction of mortality in intensive care unit with short-term heart rate variability: Machine learning-based analysis of the MIMIC-III database"
authors: ["Lexin Huang", "Zixuan Dou", "Fang Fang", "Boda Zhou", "Ping Zhang", "Rui Jiang"]
year: 2025
venue: "Comput. Biol. Medicine"
doi: ""
arxiv_id: ""
url: "https://www.semanticscholar.org/paper/99f7ce8a9b7ac4019f2b7f7bf1a22b9c27e9754d"
citations: 7
source: s2
tier: core
query: "lead scoring machine learning gradient boosting"
tags: ["lead-scoring"]
---

# Prediction of mortality in intensive care unit with short-term heart rate variability: Machine learning-based analysis of the MIMIC-III database

**Authors.** Lexin Huang, Zixuan Dou, Fang Fang, Boda Zhou, Ping Zhang, Rui Jiang

**Venue / year.** Comput. Biol. Medicine · 2025

**Links.** [source](https://www.semanticscholar.org/paper/99f7ce8a9b7ac4019f2b7f7bf1a22b9c27e9754d)

**Abstract.**

BACKGROUND
Prognosis prediction in the intensive care unit (ICU) traditionally relied on physiological scoring systems based on clinical indicators at admission. Electrocardiogram (ECG) provides easily accessible information, with heart rate variability (HRV) derived from ECG showing prognostic value. However, few studies have conducted a comprehensive analysis of HRV-based prognostic model against established standards, which limits the application of HRV's prognostic value in clinical settings. This study aims to evaluate the utility of HRV in predicting mortality in the ICU. Additionally, we analyzed the applicability and interpretability of the HRV-integrated clinical model and identified the HRV factors that are most significant for patient prognosis.


METHODS
A total of 2838 patients from the MIMIC-III database were retrospectively included in this study. These patients were randomly divided into training and testing sets at a 4:1 ratio. We collected 86 HRV indicators from patients' lead II ECG readings between 0.5h and 2h before the time of death in the ICU of deceased patients or time of discharge from the ICU of alive patients, in addition to 9 clinical parameters upon admission. Subsequently, machine learning models were developed by algorithms including logistic regression (LR), Random Forest (RF), Adaptive Boosting (Adaboost), Gradient Boost (GB), eXtreme Gradient Boosting (XGB), and Light GBM (LGB) algorithms. An ensemble model that integrated these six algorithms, along with a deep neural network model, was also explored. The ten most important variables were identified using the Shapley method. Subsequently, an HRV-modified clinical scoring system was constructed through recursive feature elimination.


RESULTS
The study demonstrated that the integrated model, utilizing both clinical and HRV features, outperformed the model based solely on clinical information in XGB, LGB and LR algorithms (p = 0.005-0.03). The ensemble model exhibited the best performance (AUROC = 0.878), followed closely by XGB algorithm (AUROC = 0.869). Both of these models significantly outperformed the APS III scoring system (AUROC = 0.765). Notably, this improvement is not dependent on a specific disease but rather on the timing of ECG recordings that are closer to clinical endpoints. For parameter analysis, Shapley's method identified MSEn, SD1SD2, DFAα1, and DFAα2 as key HRV features in predicting mortality. These variables also showed significant differences in univariate analysis across patients with different clinical outcomes (p < 0.0001). Additionally, regardless of machine learning, the additive scoring system incorporating HRV showed a significant enhancement in prognostic ability compared to traditional physiological scores APS III (p = 0.02).


CONCLUSIONS
The integration of HRV features into mortality prediction models has been shown to enhance predictive performances in ICU. This enhancement is not limited to specific machine learning models or diseases but is influenced by the timing of HRV measurement relative to clinical endpoints. HRV features, when combined with other clinical parameters, offer high interpretability and significant prognostic value. Furthermore, incorporating HRV into traditional ICU scoring systems can lead to improved predictive performance.

## Novelty (fill in)
- 
- 
- 

## Relevance to lead-gen (fill in)
- 

## Reuse opportunity (fill in)
- 
