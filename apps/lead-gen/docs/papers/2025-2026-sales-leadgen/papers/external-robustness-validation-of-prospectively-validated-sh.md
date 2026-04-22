---
title: "External robustness validation of prospectively validated shield-RT model for acute care risk prediction during radiotherapy."
authors: ["Jennifer Yin", "M. Elia", "Ryzen Benson", "A. Witztum", "N. Eclov", "I. Friesner", "S.C.D. Hampson", "M. Palta", "Jean Feng", "Julian C. Hong"]
year: 2025
venue: "JCO Oncology Practice"
doi: ""
arxiv_id: ""
url: "https://www.semanticscholar.org/paper/434107d94f8d559c91e7e869f426e5994e5908fd"
citations: 0
source: s2
tier: core
query: "lead scoring machine learning gradient boosting"
tags: ["entity-resolution", "matching", "evaluation"]
---

# External robustness validation of prospectively validated shield-RT model for acute care risk prediction during radiotherapy.

**Authors.** Jennifer Yin, M. Elia, Ryzen Benson, A. Witztum, N. Eclov, I. Friesner, S.C.D. Hampson, M. Palta, Jean Feng, Julian C. Hong

**Venue / year.** JCO Oncology Practice · 2025

**Links.** [source](https://www.semanticscholar.org/paper/434107d94f8d559c91e7e869f426e5994e5908fd)

**Abstract.**

596
 
 
 Background:
 During radiation therapy, 10-20% of cancer patients experience emergent health complications requiring hospital or emergency department admission. We previously reported SHIELD-RT, a randomized controlled trial where a gradient-boosted tree machine learning model was applied to electronic health record (EHR) data to identify high-risk patients and direct increased clinical evaluations, reducing admissions by 45% and overall costs by 48% (NCT04277650). External validation across different patient characteristics are critical, yet rare, in healthcare AI, particularly for prospectively evaluated algorithms. We evaluate the SHIELD-RT model’s robustness across sociodemographic groups on an external validation cohort.
 Methods:
 The model was originally trained on patients treated from 2013 to 2016 at Duke University and externally evaluated on 12,095 sociodemographically distinct patients treated from 2013-2022 at University of California, San Francisco (UCSF). We compared model performance at UCSF across age, sex, race, and ethnicity subgroups. Key metrics included area under the receiver operating characteristic curve (AUROC), Brier score, true positive rate (TPR), and false positive rate (FPR). We also assessed admission rate differences between high- and low-risk classified patients.
 Results:
 Across almost all subgroups, high-risk classified patients had ~13% true admission rates vs 3% for low-risk patients, showing the model’s ability to distinguish between high- and low-risk patients consistently across groups. Groups with lower overall admission rates (unknown sex, race, and ethnicity) still showed significant distinction between high- and low-risk patients, but smaller gaps. Model performance was stable across subgroups (AUC 0.72 - 0.86), with overlapping 95% confidence intervals, though small subgroup sizes limit statistical power. Brier scores <0.07 for all subgroups indicate strong calibration. TPRs (0.50 - 0.76) and FPRs (0.17 - 0.25) varied moderately across subgroups. TPRs exhibited overlapping 95% CIs, while Male, Hispanic, Black, or age <65 patients had marginally higher FPR (all < 8% absolute difference).
 Conclusions:
 The SHIELD-RT model demonstrated overall robustness across patient groups despite significant population differences between the institutions. There were subtle, potentially non-clinically significant discrepancies observed primarily in FPR in specific populations, which may lead to oversensitivity and could be considered in future implementation. Future work should focus on improving subgroup representation and exploring threshold optimization strategies to ensure robust and generalizable model performance in real-world clinical settings.

## Novelty (fill in)
- 
- 
- 

## Relevance to lead-gen (fill in)
- 

## Reuse opportunity (fill in)
- 
