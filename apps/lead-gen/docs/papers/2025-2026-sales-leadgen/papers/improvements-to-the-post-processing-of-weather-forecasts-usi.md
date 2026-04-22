---
title: "Improvements to the post-processing of weather forecasts using machine learning and feature selection"
authors: ["Kazuma Iwase", "Tomoyuki Takenawa"]
year: 2026
venue: ""
doi: ""
arxiv_id: "2604.19340v1"
url: "https://arxiv.org/abs/2604.19340v1"
citations: 0
source: arxiv
tier: core
query: "NeuralUCB neural contextual bandit recommendation"
tags: ["entity-resolution", "forecasting"]
---

# Improvements to the post-processing of weather forecasts using machine learning and feature selection

**Authors.** Kazuma Iwase, Tomoyuki Takenawa

**Venue / year.** 2026

**Links.** [arXiv:2604.19340v1](https://arxiv.org/abs/2604.19340v1) · [source](https://arxiv.org/abs/2604.19340v1)

**Abstract.**

This study aims to develop and improve machine learning-based post-processing models for precipitation, temperature, and wind speed predictions using the Mesoscale Model (MSM) dataset provided by the Japan Meteorological Agency (JMA) for 18 locations across Japan, including plains, mountainous regions, and islands. By incorporating meteorological variables from grid points surrounding the target locations as input features and applying feature selection based on correlation analysis, we found that, in our experimental setting, the LightGBM-based models achieved lower RMSE than the specific neural-network baselines tested in this study, including a reproduced CNN baseline, and also generally achieved lower RMSE than both the raw MSM forecasts and the JMA post-processing product, MSM Guidance (MSMG), across many locations and forecast lead times. Because precipitation has a highly skewed distribution with many zero cases, we additionally examined Tweedie-based loss functions and event-weighted training strategies for precipitation forecasting. These improved event-oriented performance relative to the original LightGBM model, especially at higher rainfall thresholds, although the gains were site dependent and overall performance remained slightly below MSMG.

## Novelty (fill in)
- 
- 
- 

## Relevance to lead-gen (fill in)
- 

## Reuse opportunity (fill in)
- 
