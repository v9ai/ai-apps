---
title: "A Customer Lifetime Value-aware Framework for Strategic Churn Prediction Using Deep Learning"
authors: ["Gurusamy Uma Maheswari", "A. Meenakshi", "S. Ram Prasath", "V. Sangeetha"]
year: 2026
venue: "Advances in Engineering Research"
doi: ""
arxiv_id: ""
url: "https://www.semanticscholar.org/paper/438279391c9b2c2d201f8c3ee98a63d5a55260dd"
citations: 0
source: s2
tier: broad
query: "customer churn prediction neural network"
tags: ["entity-resolution", "forecasting"]
---

# A Customer Lifetime Value-aware Framework for Strategic Churn Prediction Using Deep Learning

**Authors.** Gurusamy Uma Maheswari, A. Meenakshi, S. Ram Prasath, V. Sangeetha

**Venue / year.** Advances in Engineering Research · 2026

**Links.** [source](https://www.semanticscholar.org/paper/438279391c9b2c2d201f8c3ee98a63d5a55260dd)

**Abstract.**

Introduction.
 Customer churn prediction represents a challenge in the current era of rapid digital transformation, hyper-competition, and data-driven marketing. In sectors such as telecommunications and banking, even marginal reductions in churn translate to significant revenue protection. Numerous companies employ uniform approaches, leading to the inefficient allocation of marketing resources and loss of loyal customers. Recent research has advanced along two largely separate domains. The first focuses on improving predictive accuracy through machine learning and deep learning techniques. Another stream, rooted in marketing science, emphasizes the economic dimension of churn, introducing Customer Lifetime Value (CLV) as a key metric. Existing solutions either maximize accuracy at high computational cost or discuss value-based strategy without providing a technical, implementable system. To bridge this gap, this paper aims to create, test, and present a comprehensive churn control system integrating customer lifetime value framework (CVLV). To achieve this, the following tasks are addressed: segmenting customers based on dynamic CLV and churn risk scores; evaluating the efficiency of various neural network configurations; and building a decision model that assigns optimal deep learning architectures for targeted retention, seamlessly integrating data analytics with corporate strategy.
 
 
 Materials and Methods.
 The study was performed on two datasets: IBM Telco Customer Churn (7,043 customers, 21 features, binary churn) and Santander Customer Transaction Prediction (200,000 records, 200 numerical features, binary target variable). The data were preprocessed to address class imbalance and split 70-15-15 (train-validation-test) using 5-fold cross-validation. ANN (3–6 layers) and RNN/LSTM models were compared within the CVLV framework. The training utilized Adam optimizer, L2 regularization, dropout, early stopping, gradient clipping, and uniform batch size and epoch settings. The performance was evaluated based on accuracy, loss, and the Pareto frontier. Subsequently, customers were segmented by CLV/risk level, and retention strategies were assigned to the respective optimal models.
 
 
 Results.
 The comprehensive assessment of artificial neural networks (ANN) and recurrent neural networks (RNN) shows that RNN with 2 layers achieved marginally higher accuracy of 0.90, while the 3-layer ANN produced the best robustness with a loss of 0.25 with relatively similar predictive performance. With the CVLV framework, RNN 2L is assigned for high value, high risk relationships that need the most precision, ANN 3L is assigned for stable, high value relationships, and general RNN for low value customers.
 
 
 Discussion.
 This work has shown that the CVLV framework strategically optimizes churn prediction by aligning deep learning models with customer value-risk profiles. The data obtained confirm that ANN 3L provides optimal robustness while RNN 2L achieves superior accuracy for temporal patterns, together enabling more efficient and targeted retention interventions across industries. This approach can be deployed across the telecommunications, banking and retail sectors and facilitate a meaningful connection between technical model performance and strategic decision-making, enabling organizations to deploy retention efforts effectively by aligning model capability with the customer's value and probability of churn. The findings indicates that strategic model assignments based on CLV-risk profiles led to improved efficiencies associated with retention without compromising predictive reliability.
 
 
 Conclusion.
 
 The main results are that the ANN 3L model provides the optimal balance of accuracy (0.875) and robustness (loss: 0.25) for churn prediction, while the RNN 2L achieves peak accuracy (0.90) for high-risk segments. The practical significance lies in the proposed CVLV framework, which enables businesses to strategically align deep learning model selection with customer lifetime value, improving retention efficiency. Further research will focus on integrating real-time CLV updates and validating the framework across additional industry domains.

## Novelty (fill in)
- 
- 
- 

## Relevance to lead-gen (fill in)
- 

## Reuse opportunity (fill in)
- 
