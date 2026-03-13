use anyhow::{Context, Result};
use research::team::{LlmProvider, ResearchTask, TaskStatus, TeamConfig, TeamLead};
use research::tools::SearchToolConfig;

const DEFAULT_BASE_URL: &str = "https://api.deepseek.com";
const OUT_DIR: &str = "research-output/real-estate-ai";

fn research_tasks() -> Vec<ResearchTask> {
    let ctx = "This research supports building AI/ML applications for the real estate industry — \
        covering property valuation, market forecasting, computer vision for buildings, NLP for listings, \
        geospatial analytics, investment & finance, PropTech/IoT, sustainability & climate risk, \
        legal/regulatory AI, and generative/emerging AI. The goal is a comprehensive landscape survey \
        of academic papers, methods, datasets, and production systems across all 10 domains.";

    vec![
        // ══════════════════════════════════════════════════════════════════════
        // Tier 1 — Foundational (10 tasks, no deps)
        // ══════════════════════════════════════════════════════════════════════
        ResearchTask {
            id: 1,
            subject: "ml-property-valuation-foundations".into(),
            description: format!(
                "Research foundational ML approaches to property valuation. Focus on: \
                (1) hedonic pricing models and their ML extensions, \
                (2) gradient boosting (XGBoost, LightGBM, CatBoost) for automated valuation models (AVMs), \
                (3) neural network architectures applied to property price prediction, \
                (4) spatial features and their role in valuation accuracy, \
                (5) history and evolution of mass appraisal from regression to deep learning. \
                Find seminal and recent papers on ML-based property valuation, AVM accuracy studies, \
                and feature engineering for real estate (2018-2026). {ctx}"
            ),
            preamble: "You are a real estate valuation researcher specialising in machine learning \
                methods for property price prediction. Produce structured findings in Markdown."
                .into(),
            status: TaskStatus::Pending,
            owner: None,
            dependencies: vec![],
            result: None,
        },
        ResearchTask {
            id: 2,
            subject: "housing-market-forecasting-foundations".into(),
            description: format!(
                "Research foundational approaches to housing market forecasting. Focus on: \
                (1) time-series methods — ARIMA, VAR, GARCH for housing prices, \
                (2) deep learning approaches — LSTM, Transformer-based forecasting, \
                (3) macroeconomic indicators as predictive features (interest rates, employment, GDP), \
                (4) structural breaks and regime changes in housing markets, \
                (5) comparison of econometric vs ML forecasting accuracy. \
                Find papers on housing price forecasting, real estate cycle prediction, \
                and macro-financial linkages (2018-2026). {ctx}"
            ),
            preamble: "You are a housing economics researcher specialising in market forecasting \
                with machine learning. Produce structured findings in Markdown."
                .into(),
            status: TaskStatus::Pending,
            owner: None,
            dependencies: vec![],
            result: None,
        },
        ResearchTask {
            id: 3,
            subject: "cv-property-analysis-foundations".into(),
            description: format!(
                "Research foundational computer vision approaches for property analysis. Focus on: \
                (1) image classification for building type, style, and condition, \
                (2) object detection for property features (pools, garages, roof types), \
                (3) semantic segmentation for building facades and surroundings, \
                (4) CNN and Vision Transformer architectures applied to real estate imagery, \
                (5) transfer learning from ImageNet/COCO to property-specific domains. \
                Find papers on CV for real estate, building image analysis, \
                and visual property assessment (2018-2026). {ctx}"
            ),
            preamble: "You are a computer vision researcher specialising in built environment \
                analysis. Produce structured findings in Markdown."
                .into(),
            status: TaskStatus::Pending,
            owner: None,
            dependencies: vec![],
            result: None,
        },
        ResearchTask {
            id: 4,
            subject: "nlp-listings-foundations".into(),
            description: format!(
                "Research foundational NLP approaches for real estate listings and text. Focus on: \
                (1) text mining and information extraction from property listings, \
                (2) named entity recognition for real estate entities (amenities, features, locations), \
                (3) sentiment analysis applied to property descriptions and reviews, \
                (4) domain-adapted language models for real estate text, \
                (5) structured data extraction from unstructured listing descriptions. \
                Find papers on NLP for real estate, listing analysis, and property text mining (2018-2026). {ctx}"
            ),
            preamble: "You are an NLP researcher specialising in real estate text analysis. \
                Produce structured findings in Markdown."
                .into(),
            status: TaskStatus::Pending,
            owner: None,
            dependencies: vec![],
            result: None,
        },
        ResearchTask {
            id: 5,
            subject: "geospatial-ml-foundations".into(),
            description: format!(
                "Research foundational geospatial ML for real estate. Focus on: \
                (1) spatial statistics — spatial autocorrelation (Moran's I), semivariograms, \
                (2) GIS + ML integration for property analysis, \
                (3) geostatistical methods — kriging, co-kriging for spatial interpolation, \
                (4) geographically weighted regression (GWR) and its ML extensions, \
                (5) point pattern analysis and spatial clustering for real estate markets. \
                Find papers on geospatial ML, spatial econometrics for housing, \
                and GIS-based property analytics (2018-2026). {ctx}"
            ),
            preamble: "You are a geospatial data science researcher specialising in spatial ML \
                for real estate. Produce structured findings in Markdown."
                .into(),
            status: TaskStatus::Pending,
            owner: None,
            dependencies: vec![],
            result: None,
        },
        ResearchTask {
            id: 6,
            subject: "real-estate-finance-ml-foundations".into(),
            description: format!(
                "Research foundational ML approaches in real estate finance. Focus on: \
                (1) asset pricing models for real estate — CAPM extensions, factor models, \
                (2) risk factor identification using ML — liquidity, location, tenant quality, \
                (3) modern portfolio theory applied to real estate portfolios with ML optimization, \
                (4) REIT analysis and prediction using machine learning, \
                (5) mortgage analytics and credit risk modeling foundations. \
                Find papers on ML in real estate finance, property investment analytics, \
                and quantitative real estate research (2018-2026). {ctx}"
            ),
            preamble: "You are a quantitative real estate finance researcher. Produce structured \
                findings in Markdown focusing on ML methods for investment and risk."
                .into(),
            status: TaskStatus::Pending,
            owner: None,
            dependencies: vec![],
            result: None,
        },
        ResearchTask {
            id: 7,
            subject: "iot-smart-building-foundations".into(),
            description: format!(
                "Research foundational IoT and smart building technologies. Focus on: \
                (1) sensor data analytics for building management systems (BMS), \
                (2) edge computing architectures for real-time building monitoring, \
                (3) time-series ML for sensor data — anomaly detection, forecasting, \
                (4) building automation and control system integration, \
                (5) communication protocols and data standards (BACnet, Modbus, MQTT, Haystack). \
                Find papers on IoT for smart buildings, sensor-based building analytics, \
                and intelligent building management (2018-2026). {ctx}"
            ),
            preamble: "You are a smart buildings researcher specialising in IoT and building \
                management systems. Produce structured findings in Markdown."
                .into(),
            status: TaskStatus::Pending,
            owner: None,
            dependencies: vec![],
            result: None,
        },
        ResearchTask {
            id: 8,
            subject: "sustainability-building-science-foundations".into(),
            description: format!(
                "Research foundational sustainability and building science with ML. Focus on: \
                (1) building energy modeling — physics-based vs data-driven approaches, \
                (2) green building standards — LEED, BREEAM, WELL, Passive House and ML applications, \
                (3) lifecycle assessment (LCA) for buildings and ML optimization, \
                (4) embodied vs operational energy and carbon analysis, \
                (5) climate-responsive building design principles and computational methods. \
                Find papers on ML for building sustainability, energy-efficient buildings, \
                and green building performance prediction (2018-2026). {ctx}"
            ),
            preamble: "You are a building science researcher specialising in sustainability \
                and energy performance. Produce structured findings in Markdown."
                .into(),
            status: TaskStatus::Pending,
            owner: None,
            dependencies: vec![],
            result: None,
        },
        ResearchTask {
            id: 9,
            subject: "legal-regulatory-ai-foundations".into(),
            description: format!(
                "Research foundational legal and regulatory AI for real estate. Focus on: \
                (1) legal NLP — contract analysis, clause extraction, document understanding, \
                (2) compliance automation — regulatory change tracking, rule engines, \
                (3) RegTech for real estate — AML, KYC, fair housing, zoning compliance, \
                (4) automated document review and due diligence AI, \
                (5) legal knowledge graphs and ontologies for property law. \
                Find papers on legal AI for real estate, regulatory technology, \
                and compliance automation (2018-2026). {ctx}"
            ),
            preamble: "You are a legal technology researcher specialising in AI for real estate \
                law and compliance. Produce structured findings in Markdown."
                .into(),
            status: TaskStatus::Pending,
            owner: None,
            dependencies: vec![],
            result: None,
        },
        ResearchTask {
            id: 10,
            subject: "generative-models-foundations".into(),
            description: format!(
                "Research foundational generative AI models relevant to real estate. Focus on: \
                (1) GANs for image generation — architectural rendering, virtual staging, \
                (2) diffusion models for building/interior image synthesis, \
                (3) LLMs for structured data generation and property description writing, \
                (4) synthetic data generation for privacy-preserving real estate ML, \
                (5) foundation models and their adaptation to real estate domains. \
                Find papers on generative AI for built environment, synthetic property data, \
                and foundation models for real estate (2020-2026). {ctx}"
            ),
            preamble: "You are a generative AI researcher with focus on built environment \
                applications. Produce structured findings in Markdown."
                .into(),
            status: TaskStatus::Pending,
            owner: None,
            dependencies: vec![],
            result: None,
        },

        // ══════════════════════════════════════════════════════════════════════
        // Tier 2 — Specialized Deep-Dives (70 tasks)
        // ══════════════════════════════════════════════════════════════════════

        // ── Domain A: Property Valuation (IDs 11-17) ────────────────────────
        ResearchTask {
            id: 11,
            subject: "avm-gradient-boosting".into(),
            description: format!(
                "Deep dive into gradient boosting methods for automated valuation models. Focus on: \
                (1) XGBoost, LightGBM, CatBoost architectures and their real estate applications, \
                (2) feature engineering — property attributes, location encodings, temporal features, \
                (3) hyperparameter tuning strategies for AVM accuracy, \
                (4) handling missing data and categorical variables in property datasets, \
                (5) ensemble methods combining multiple boosting models. \
                Find papers on gradient boosting AVMs, feature engineering for property valuation, \
                and comparative AVM studies (2019-2026). {ctx}"
            ),
            preamble: "You are an ML engineer specialising in gradient boosting for property \
                valuation. Produce structured findings in Markdown."
                .into(),
            status: TaskStatus::Pending,
            owner: None,
            dependencies: vec![1],
            result: None,
        },
        ResearchTask {
            id: 12,
            subject: "avm-deep-learning".into(),
            description: format!(
                "Deep dive into deep learning architectures for property valuation. Focus on: \
                (1) feedforward, CNN, and attention-based neural networks for AVMs, \
                (2) multimodal networks combining tabular data with images, \
                (3) embedding layers for categorical features (neighborhoods, property types), \
                (4) attention mechanisms for feature importance in valuation, \
                (5) comparison with gradient boosting — when do neural nets win? \
                Find papers on deep learning AVMs, multimodal property valuation, \
                and neural architecture search for real estate (2019-2026). {ctx}"
            ),
            preamble: "You are a deep learning researcher specialising in property valuation \
                neural architectures. Produce structured findings in Markdown."
                .into(),
            status: TaskStatus::Pending,
            owner: None,
            dependencies: vec![1],
            result: None,
        },
        ResearchTask {
            id: 13,
            subject: "explainable-avm".into(),
            description: format!(
                "Deep dive into explainability for automated valuation models. Focus on: \
                (1) SHAP values for property feature importance and individual explanations, \
                (2) LIME for local AVM interpretability, \
                (3) counterfactual explanations — 'what would change the valuation?', \
                (4) model cards and documentation for AVM transparency, \
                (5) ECOA and Fair Housing Act compliance — preventing discriminatory valuations. \
                Find papers on explainable AVMs, fair lending ML, \
                and regulatory compliance for property valuation AI (2020-2026). {ctx}"
            ),
            preamble: "You are an XAI researcher focused on fair and explainable property \
                valuation. Produce structured findings in Markdown."
                .into(),
            status: TaskStatus::Pending,
            owner: None,
            dependencies: vec![1, 11],
            result: None,
        },
        ResearchTask {
            id: 14,
            subject: "comparable-sales-automation".into(),
            description: format!(
                "Deep dive into automated comparable sales selection. Focus on: \
                (1) similarity metrics for properties — feature-based, location-based, temporal, \
                (2) automated comp selection algorithms and ranking, \
                (3) adjustment models — how to price differences between subject and comps, \
                (4) ML approaches to comp weighting and adjustment, \
                (5) handling thin markets with few comparable transactions. \
                Find papers on automated comparable selection, property similarity, \
                and sales comparison approach automation (2019-2026). {ctx}"
            ),
            preamble: "You are a real estate appraisal researcher focused on automating the \
                sales comparison approach. Produce structured findings in Markdown."
                .into(),
            status: TaskStatus::Pending,
            owner: None,
            dependencies: vec![1],
            result: None,
        },
        ResearchTask {
            id: 15,
            subject: "mass-appraisal-systems".into(),
            description: format!(
                "Deep dive into computer-assisted mass appraisal (CAMA) systems. Focus on: \
                (1) CAMA system architectures and ML integration, \
                (2) assessment ratio studies — COD, PRD, PRB measures, \
                (3) regressivity analysis in property tax assessments, \
                (4) equity in mass appraisal — detecting and correcting racial/ethnic disparities, \
                (5) standards of practice (IAAO) and how ML meets them. \
                Find papers on mass appraisal ML, property tax assessment equity, \
                and CAMA system modernization (2019-2026). {ctx}"
            ),
            preamble: "You are a public finance researcher specialising in mass appraisal \
                systems and assessment equity. Produce structured findings in Markdown."
                .into(),
            status: TaskStatus::Pending,
            owner: None,
            dependencies: vec![1],
            result: None,
        },
        ResearchTask {
            id: 16,
            subject: "spatial-valuation-models".into(),
            description: format!(
                "Deep dive into spatial econometric models for property valuation. Focus on: \
                (1) geographically weighted regression (GWR) for local valuation, \
                (2) spatial lag and spatial error models (SAR, SEM), \
                (3) kriging and geostatistical approaches for price surfaces, \
                (4) multiscale GWR (MGWR) for varying spatial effects, \
                (5) combining spatial models with ML — spatial random forests, GNN for valuation. \
                Find papers on spatial econometrics for housing, GWR property valuation, \
                and spatially-aware ML models (2019-2026). {ctx}"
            ),
            preamble: "You are a spatial econometrics researcher specialising in property \
                valuation. Produce structured findings in Markdown."
                .into(),
            status: TaskStatus::Pending,
            owner: None,
            dependencies: vec![1, 5],
            result: None,
        },
        ResearchTask {
            id: 17,
            subject: "commercial-property-valuation".into(),
            description: format!(
                "Deep dive into ML for commercial property valuation. Focus on: \
                (1) office, retail, industrial, and multifamily AVM approaches, \
                (2) income approach automation — NOI prediction, expense ratio modeling, \
                (3) capitalization rate prediction using ML and market data, \
                (4) lease-by-lease cash flow modeling with ML, \
                (5) commercial property data challenges — limited transactions, heterogeneity. \
                Find papers on commercial real estate ML, cap rate prediction, \
                and income approach automation (2019-2026). {ctx}"
            ),
            preamble: "You are a commercial real estate analytics researcher. Produce structured \
                findings in Markdown."
                .into(),
            status: TaskStatus::Pending,
            owner: None,
            dependencies: vec![1, 6],
            result: None,
        },

        // ── Domain B: Market Forecasting (IDs 18-24) ────────────────────────
        ResearchTask {
            id: 18,
            subject: "lstm-gru-housing-forecasting".into(),
            description: format!(
                "Deep dive into LSTM and GRU networks for housing price forecasting. Focus on: \
                (1) LSTM architectures for housing price time series, \
                (2) GRU variants and bidirectional approaches, \
                (3) sequence-to-sequence models for multi-step price prediction, \
                (4) attention mechanisms in recurrent housing forecasters, \
                (5) comparison with traditional econometric methods on real datasets. \
                Find papers on LSTM housing forecasting, recurrent neural nets for real estate, \
                and multi-step price prediction (2019-2026). {ctx}"
            ),
            preamble: "You are a deep learning time-series researcher applied to housing markets. \
                Produce structured findings in Markdown."
                .into(),
            status: TaskStatus::Pending,
            owner: None,
            dependencies: vec![2],
            result: None,
        },
        ResearchTask {
            id: 19,
            subject: "transformer-housing-forecasting".into(),
            description: format!(
                "Deep dive into Transformer architectures for housing market forecasting. Focus on: \
                (1) Temporal Fusion Transformers (TFT) for real estate, \
                (2) Informer and Autoformer for long-horizon housing prediction, \
                (3) PatchTST and other recent efficient transformer variants, \
                (4) multi-variate vs univariate transformer forecasting for housing, \
                (5) comparison with LSTM/GRU and statistical methods. \
                Find papers on transformer time-series for real estate, attention-based forecasting, \
                and modern time-series architectures applied to housing (2021-2026). {ctx}"
            ),
            preamble: "You are a transformer architecture researcher applied to time-series \
                forecasting for real estate. Produce structured findings in Markdown."
                .into(),
            status: TaskStatus::Pending,
            owner: None,
            dependencies: vec![2],
            result: None,
        },
        ResearchTask {
            id: 20,
            subject: "gnn-spatial-price-spillover".into(),
            description: format!(
                "Deep dive into graph neural networks for spatial price spillover modeling. Focus on: \
                (1) GNN architectures for modeling property price contagion across neighborhoods, \
                (2) spatial graph construction — adjacency, K-nearest, distance-based, \
                (3) spatio-temporal GNNs for dynamic price propagation, \
                (4) graph attention networks (GAT) for heterogeneous property interactions, \
                (5) comparison with traditional spatial econometrics (SAR, SEM). \
                Find papers on GNN for real estate, spatial price spillover modeling, \
                and graph-based property analytics (2020-2026). {ctx}"
            ),
            preamble: "You are a graph neural network researcher specialising in spatial \
                real estate modeling. Produce structured findings in Markdown."
                .into(),
            status: TaskStatus::Pending,
            owner: None,
            dependencies: vec![2, 5],
            result: None,
        },
        ResearchTask {
            id: 21,
            subject: "bubble-detection-regime-switching".into(),
            description: format!(
                "Deep dive into housing bubble detection and regime-switching models. Focus on: \
                (1) explosive root tests — SADF, GSADF for bubble detection, \
                (2) Markov regime-switching models for housing market states, \
                (3) early warning systems for housing market distress, \
                (4) ML approaches to bubble detection — anomaly detection, novelty detection, \
                (5) lessons from 2008 GFC and other housing crises for model design. \
                Find papers on housing bubble detection, regime switching in real estate, \
                and financial crisis early warning (2018-2026). {ctx}"
            ),
            preamble: "You are a financial economics researcher specialising in housing market \
                instability detection. Produce structured findings in Markdown."
                .into(),
            status: TaskStatus::Pending,
            owner: None,
            dependencies: vec![2],
            result: None,
        },
        ResearchTask {
            id: 22,
            subject: "rental-market-forecasting".into(),
            description: format!(
                "Deep dive into rental market prediction and analytics. Focus on: \
                (1) rent price prediction models — hedonic, ML, spatial approaches, \
                (2) vacancy rate forecasting and absorption rate modeling, \
                (3) lease renewal probability prediction, \
                (4) short-term rental (Airbnb) impact modeling and pricing optimization, \
                (5) rent vs buy decision modeling and rental yield forecasting. \
                Find papers on rental market ML, vacancy prediction, \
                and short-term rental analytics (2019-2026). {ctx}"
            ),
            preamble: "You are a rental market analytics researcher. Produce structured findings \
                in Markdown."
                .into(),
            status: TaskStatus::Pending,
            owner: None,
            dependencies: vec![2],
            result: None,
        },
        ResearchTask {
            id: 23,
            subject: "supply-demand-equilibrium".into(),
            description: format!(
                "Deep dive into housing supply-demand equilibrium modeling. Focus on: \
                (1) construction pipeline prediction — permits, starts, completions, \
                (2) absorption rate forecasting for new developments, \
                (3) inventory forecasting — months of supply, new vs existing, \
                (4) land use and zoning impact on supply constraints, \
                (5) developer decision modeling — when and where to build. \
                Find papers on housing supply forecasting, construction activity prediction, \
                and market equilibrium models (2018-2026). {ctx}"
            ),
            preamble: "You are a housing supply researcher specialising in construction and \
                development analytics. Produce structured findings in Markdown."
                .into(),
            status: TaskStatus::Pending,
            owner: None,
            dependencies: vec![2],
            result: None,
        },
        ResearchTask {
            id: 24,
            subject: "macroeconomic-real-estate-nexus".into(),
            description: format!(
                "Deep dive into macroeconomic-real estate linkages with ML. Focus on: \
                (1) interest rate impact models — Fed funds rate, mortgage rates → prices, \
                (2) GDP and employment → housing demand ML models, \
                (3) inflation and construction cost pass-through modeling, \
                (4) global capital flows and foreign investment impact, \
                (5) monetary policy transmission to real estate via ML. \
                Find papers on macro-housing nexus, interest rate real estate impact, \
                and economic indicators for housing prediction (2018-2026). {ctx}"
            ),
            preamble: "You are a macroeconomic real estate researcher. Produce structured \
                findings in Markdown."
                .into(),
            status: TaskStatus::Pending,
            owner: None,
            dependencies: vec![2],
            result: None,
        },

        // ── Domain C: Computer Vision (IDs 25-31) ───────────────────────────
        ResearchTask {
            id: 25,
            subject: "satellite-aerial-urban-analysis".into(),
            description: format!(
                "Deep dive into satellite and aerial imagery for urban/real estate analysis. Focus on: \
                (1) urban sprawl detection and land use classification from satellite imagery, \
                (2) building footprint extraction and change detection, \
                (3) remote sensing for property feature identification, \
                (4) temporal satellite analysis for development tracking, \
                (5) integration of satellite data with property records for valuation. \
                Find papers on satellite imagery for real estate, urban remote sensing, \
                and building detection from aerial photos (2019-2026). {ctx}"
            ),
            preamble: "You are a remote sensing researcher specialising in urban and real estate \
                applications. Produce structured findings in Markdown."
                .into(),
            status: TaskStatus::Pending,
            owner: None,
            dependencies: vec![3],
            result: None,
        },
        ResearchTask {
            id: 26,
            subject: "street-view-quality-scoring".into(),
            description: format!(
                "Deep dive into street-level imagery analysis for neighborhood quality. Focus on: \
                (1) Google Street View analysis for neighborhood quality scoring, \
                (2) curb appeal assessment from street-level photos, \
                (3) urban decay and gentrification detection from streetscape, \
                (4) greenery, sidewalk quality, and maintenance scoring, \
                (5) correlation between street-view features and property values. \
                Find papers on street view property analysis, neighborhood visual quality, \
                and streetscape assessment (2019-2026). {ctx}"
            ),
            preamble: "You are an urban computing researcher specialising in street-level \
                visual analysis. Produce structured findings in Markdown."
                .into(),
            status: TaskStatus::Pending,
            owner: None,
            dependencies: vec![3],
            result: None,
        },
        ResearchTask {
            id: 27,
            subject: "interior-photo-analysis".into(),
            description: format!(
                "Deep dive into interior photo analysis for real estate. Focus on: \
                (1) room type classification from interior photos, \
                (2) property condition assessment — renovation state, quality scoring, \
                (3) renovation detection — before/after analysis, upgrade identification, \
                (4) interior style classification (modern, traditional, industrial, etc.), \
                (5) photo quality assessment for listing optimization. \
                Find papers on interior image analysis, room classification, \
                and property condition CV (2019-2026). {ctx}"
            ),
            preamble: "You are a CV researcher specialising in interior space analysis for \
                real estate. Produce structured findings in Markdown."
                .into(),
            status: TaskStatus::Pending,
            owner: None,
            dependencies: vec![3],
            result: None,
        },
        ResearchTask {
            id: 28,
            subject: "floor-plan-extraction".into(),
            description: format!(
                "Deep dive into floor plan analysis and extraction. Focus on: \
                (1) floor plan vectorization — converting raster images to vector representations, \
                (2) room segmentation and labeling in floor plans, \
                (3) automated area calculation from floor plan images, \
                (4) 3D reconstruction from 2D floor plans, \
                (5) floor plan similarity and retrieval for comparable properties. \
                Find papers on floor plan recognition, architectural drawing analysis, \
                and automated building plan processing (2019-2026). {ctx}"
            ),
            preamble: "You are a document analysis researcher specialising in architectural \
                floor plan recognition. Produce structured findings in Markdown."
                .into(),
            status: TaskStatus::Pending,
            owner: None,
            dependencies: vec![3],
            result: None,
        },
        ResearchTask {
            id: 29,
            subject: "construction-progress-monitoring".into(),
            description: format!(
                "Deep dive into CV for construction progress monitoring. Focus on: \
                (1) drone imagery analysis for construction site monitoring, \
                (2) progress tracking — comparing as-built vs planned (BIM comparison), \
                (3) safety violation detection — PPE, fall hazards, exclusion zones, \
                (4) material and equipment recognition on construction sites, \
                (5) temporal analysis of construction phases. \
                Find papers on construction monitoring CV, drone-based progress tracking, \
                and safety detection on construction sites (2019-2026). {ctx}"
            ),
            preamble: "You are a construction technology researcher specialising in computer \
                vision for site monitoring. Produce structured findings in Markdown."
                .into(),
            status: TaskStatus::Pending,
            owner: None,
            dependencies: vec![3],
            result: None,
        },
        ResearchTask {
            id: 30,
            subject: "building-damage-detection".into(),
            description: format!(
                "Deep dive into building damage detection from imagery. Focus on: \
                (1) disaster damage assessment from satellite/drone imagery, \
                (2) structural deficiency detection from building photos, \
                (3) insurance claims automation using damage CV, \
                (4) xBD dataset and damage classification benchmarks, \
                (5) temporal change detection for progressive deterioration. \
                Find papers on building damage detection, post-disaster assessment, \
                and structural damage CV (2019-2026). {ctx}"
            ),
            preamble: "You are a disaster response and structural assessment researcher \
                using computer vision. Produce structured findings in Markdown."
                .into(),
            status: TaskStatus::Pending,
            owner: None,
            dependencies: vec![3],
            result: None,
        },
        ResearchTask {
            id: 31,
            subject: "virtual-staging-generation".into(),
            description: format!(
                "Deep dive into AI virtual staging and renovation visualization. Focus on: \
                (1) AI-powered virtual staging — furniture placement, room decoration, \
                (2) style transfer for interior design visualization, \
                (3) renovation visualization — showing before/after transformations, \
                (4) 3D scene generation from single images, \
                (5) commercial virtual staging platforms and their underlying technology. \
                Find papers on virtual staging AI, interior design generation, \
                and property visualization (2020-2026). {ctx}"
            ),
            preamble: "You are a generative AI researcher specialising in interior and \
                architectural visualization. Produce structured findings in Markdown."
                .into(),
            status: TaskStatus::Pending,
            owner: None,
            dependencies: vec![3, 10],
            result: None,
        },

        // ── Domain D: NLP & Text Analytics (IDs 32-38) ──────────────────────
        ResearchTask {
            id: 32,
            subject: "listing-information-extraction".into(),
            description: format!(
                "Deep dive into structured information extraction from listings. Focus on: \
                (1) entity extraction — amenities, features, conditions, upgrades from text, \
                (2) attribute-value pair extraction from property descriptions, \
                (3) geocoding and location extraction from listing text, \
                (4) numerical information extraction — prices, areas, room counts, \
                (5) schema mapping — standardizing extracted data across sources. \
                Find papers on real estate information extraction, listing parsing, \
                and property NER (2019-2026). {ctx}"
            ),
            preamble: "You are an information extraction researcher specialising in real \
                estate text. Produce structured findings in Markdown."
                .into(),
            status: TaskStatus::Pending,
            owner: None,
            dependencies: vec![4],
            result: None,
        },
        ResearchTask {
            id: 33,
            subject: "deceptive-listing-detection".into(),
            description: format!(
                "Deep dive into deceptive and fraudulent listing detection. Focus on: \
                (1) fraud detection in property listings — fake listings, bait-and-switch, \
                (2) misleading description identification — euphemisms, omissions, exaggerations, \
                (3) image-text consistency checking for listings, \
                (4) pricing anomaly detection for potential scams, \
                (5) review fraud and fake testimonial detection in real estate. \
                Find papers on real estate fraud detection, deceptive text detection, \
                and listing quality assessment (2019-2026). {ctx}"
            ),
            preamble: "You are a fraud detection researcher applied to real estate markets. \
                Produce structured findings in Markdown."
                .into(),
            status: TaskStatus::Pending,
            owner: None,
            dependencies: vec![4],
            result: None,
        },
        ResearchTask {
            id: 34,
            subject: "sentiment-real-estate-news".into(),
            description: format!(
                "Deep dive into sentiment analysis for real estate news and social media. Focus on: \
                (1) news sentiment → housing market impact modeling, \
                (2) social media signals (Twitter/Reddit) for market sentiment, \
                (3) FOMC and central bank communication text mining for real estate, \
                (4) consumer confidence indices from text data, \
                (5) real-time sentiment dashboards for market monitoring. \
                Find papers on real estate sentiment analysis, news-based market prediction, \
                and social media real estate analytics (2019-2026). {ctx}"
            ),
            preamble: "You are a sentiment analysis researcher applied to real estate markets. \
                Produce structured findings in Markdown."
                .into(),
            status: TaskStatus::Pending,
            owner: None,
            dependencies: vec![4, 2],
            result: None,
        },
        ResearchTask {
            id: 35,
            subject: "lease-contract-analysis".into(),
            description: format!(
                "Deep dive into NLP for lease and contract analysis. Focus on: \
                (1) clause extraction and classification in commercial leases, \
                (2) term comparison across lease agreements, \
                (3) risk identification — unusual clauses, missing protections, \
                (4) lease abstraction automation — extracting key terms into structured data, \
                (5) contract similarity and precedent matching. \
                Find papers on lease NLP, contract analysis AI, \
                and legal document understanding for real estate (2019-2026). {ctx}"
            ),
            preamble: "You are a legal NLP researcher specialising in lease and contract \
                analysis. Produce structured findings in Markdown."
                .into(),
            status: TaskStatus::Pending,
            owner: None,
            dependencies: vec![4, 9],
            result: None,
        },
        ResearchTask {
            id: 36,
            subject: "zoning-regulation-nlp".into(),
            description: format!(
                "Deep dive into NLP for zoning and municipal regulation analysis. Focus on: \
                (1) municipal code parsing and zoning classification from text, \
                (2) automated zoning compliance checking, \
                (3) building code interpretation using NLP, \
                (4) permit requirement extraction and matching, \
                (5) cross-jurisdiction regulatory comparison. \
                Find papers on zoning NLP, building code AI, \
                and regulatory text analysis for real estate (2019-2026). {ctx}"
            ),
            preamble: "You are a regulatory NLP researcher specialising in municipal codes \
                and zoning. Produce structured findings in Markdown."
                .into(),
            status: TaskStatus::Pending,
            owner: None,
            dependencies: vec![4, 9],
            result: None,
        },
        ResearchTask {
            id: 37,
            subject: "multilingual-property-search".into(),
            description: format!(
                "Deep dive into multilingual and cross-lingual property search. Focus on: \
                (1) cross-lingual property search for international buyers, \
                (2) machine translation for property listings across languages, \
                (3) multilingual embeddings for property similarity, \
                (4) cultural adaptation in property description translation, \
                (5) international MLS integration challenges and solutions. \
                Find papers on multilingual information retrieval for real estate, \
                cross-lingual search, and property listing translation (2019-2026). {ctx}"
            ),
            preamble: "You are a multilingual NLP researcher applied to real estate search. \
                Produce structured findings in Markdown."
                .into(),
            status: TaskStatus::Pending,
            owner: None,
            dependencies: vec![4],
            result: None,
        },
        ResearchTask {
            id: 38,
            subject: "conversational-property-agents".into(),
            description: format!(
                "Deep dive into conversational AI agents for real estate. Focus on: \
                (1) chatbots for property search and recommendation, \
                (2) question answering systems for real estate queries, \
                (3) dialogue systems for buyer/renter needs assessment, \
                (4) virtual property tour narration and interaction, \
                (5) agent-based negotiation and offer management. \
                Find papers on real estate chatbots, property QA systems, \
                and conversational agents for housing (2020-2026). {ctx}"
            ),
            preamble: "You are a dialogue systems researcher applied to real estate. \
                Produce structured findings in Markdown."
                .into(),
            status: TaskStatus::Pending,
            owner: None,
            dependencies: vec![4, 10],
            result: None,
        },

        // ── Domain E: Spatial & Urban Analytics (IDs 39-45) ─────────────────
        ResearchTask {
            id: 39,
            subject: "poi-neighborhood-embeddings".into(),
            description: format!(
                "Deep dive into POI-based neighborhood characterization. Focus on: \
                (1) point-of-interest embeddings for neighborhood representation, \
                (2) amenity scoring using POI density and diversity, \
                (3) urban function identification from POI patterns, \
                (4) neighborhood similarity using POI vectors, \
                (5) dynamic POI changes and neighborhood evolution tracking. \
                Find papers on POI embeddings, urban computing, \
                and neighborhood characterization ML (2019-2026). {ctx}"
            ),
            preamble: "You are an urban computing researcher specialising in POI analytics \
                and neighborhood characterization. Produce structured findings in Markdown."
                .into(),
            status: TaskStatus::Pending,
            owner: None,
            dependencies: vec![5],
            result: None,
        },
        ResearchTask {
            id: 40,
            subject: "walkability-transit-scoring".into(),
            description: format!(
                "Deep dive into walkability and transit accessibility scoring. Focus on: \
                (1) Walk Score alternatives and ML-based walkability metrics, \
                (2) transit accessibility modeling — frequency, coverage, reliability, \
                (3) bike infrastructure scoring and cycling accessibility, \
                (4) 15-minute city analysis and completeness metrics, \
                (5) impact of walkability/transit on property values. \
                Find papers on walkability ML, transit scoring, \
                and accessibility impact on real estate (2019-2026). {ctx}"
            ),
            preamble: "You are an urban mobility researcher specialising in accessibility \
                metrics. Produce structured findings in Markdown."
                .into(),
            status: TaskStatus::Pending,
            owner: None,
            dependencies: vec![5],
            result: None,
        },
        ResearchTask {
            id: 41,
            subject: "gentrification-prediction".into(),
            description: format!(
                "Deep dive into gentrification prediction and displacement risk. Focus on: \
                (1) gentrification indicator identification and measurement, \
                (2) ML models for predicting neighborhood gentrification, \
                (3) displacement risk scoring and early warning systems, \
                (4) cultural and demographic change tracking, \
                (5) policy intervention modeling and impact assessment. \
                Find papers on gentrification prediction, displacement ML, \
                and neighborhood change forecasting (2018-2026). {ctx}"
            ),
            preamble: "You are an urban sociology researcher specialising in gentrification \
                analytics. Produce structured findings in Markdown."
                .into(),
            status: TaskStatus::Pending,
            owner: None,
            dependencies: vec![5, 2],
            result: None,
        },
        ResearchTask {
            id: 42,
            subject: "school-district-effects".into(),
            description: format!(
                "Deep dive into school quality effects on property values. Focus on: \
                (1) school quality → property value capitalization studies, \
                (2) boundary discontinuity designs for causal identification, \
                (3) ML models for school rating impact estimation, \
                (4) redistricting effects on property markets, \
                (5) charter school and school choice impacts on housing. \
                Find papers on school district capitalization, education-housing nexus, \
                and causal inference for school effects (2018-2026). {ctx}"
            ),
            preamble: "You are an education economics researcher specialising in housing \
                market effects. Produce structured findings in Markdown."
                .into(),
            status: TaskStatus::Pending,
            owner: None,
            dependencies: vec![5, 1],
            result: None,
        },
        ResearchTask {
            id: 43,
            subject: "noise-environmental-quality".into(),
            description: format!(
                "Deep dive into environmental quality impacts on real estate. Focus on: \
                (1) noise pollution mapping and impact on property values, \
                (2) air quality impact modeling — PM2.5, ozone → housing prices, \
                (3) green space proximity and urban park value effects, \
                (4) light pollution and its emerging impact on property preferences, \
                (5) water quality and view amenity valuation. \
                Find papers on environmental amenity valuation, noise impact on housing, \
                and green space capitalization (2018-2026). {ctx}"
            ),
            preamble: "You are an environmental economics researcher specialising in \
                property value impacts. Produce structured findings in Markdown."
                .into(),
            status: TaskStatus::Pending,
            owner: None,
            dependencies: vec![5],
            result: None,
        },
        ResearchTask {
            id: 44,
            subject: "urban-mobility-property-value".into(),
            description: format!(
                "Deep dive into urban mobility data for property value analysis. Focus on: \
                (1) ride-share data (Uber/Lyft) for neighborhood accessibility scoring, \
                (2) foot traffic data from mobile phones for commercial property valuation, \
                (3) commute pattern analysis → residential property demand, \
                (4) parking data and autonomous vehicle impact modeling, \
                (5) micro-mobility (scooters, bikes) data for urban vitality. \
                Find papers on mobility data for real estate, foot traffic analytics, \
                and commute-housing nexus (2019-2026). {ctx}"
            ),
            preamble: "You are an urban mobility data researcher applied to real estate. \
                Produce structured findings in Markdown."
                .into(),
            status: TaskStatus::Pending,
            owner: None,
            dependencies: vec![5],
            result: None,
        },
        ResearchTask {
            id: 45,
            subject: "demographic-migration-demand".into(),
            description: format!(
                "Deep dive into demographic and migration-based demand forecasting. Focus on: \
                (1) population flow modeling and inter-city migration ML, \
                (2) demographic shift → housing demand type changes, \
                (3) remote work migration patterns and housing impact, \
                (4) aging population and senior housing demand forecasting, \
                (5) immigration and international demand modeling. \
                Find papers on demographic-driven housing demand, migration analytics, \
                and population forecasting for real estate (2018-2026). {ctx}"
            ),
            preamble: "You are a demographic analyst specialising in housing demand \
                forecasting. Produce structured findings in Markdown."
                .into(),
            status: TaskStatus::Pending,
            owner: None,
            dependencies: vec![5, 2],
            result: None,
        },

        // ── Domain F: Investment & Finance (IDs 46-52) ──────────────────────
        ResearchTask {
            id: 46,
            subject: "reit-price-prediction".into(),
            description: format!(
                "Deep dive into REIT price prediction with ML. Focus on: \
                (1) REIT stock price prediction using ML — features, models, accuracy, \
                (2) factor models for REIT returns — traditional and ML-based, \
                (3) sentiment integration from earnings calls and news, \
                (4) sector-specific REIT modeling (office, residential, industrial, data center), \
                (5) REIT NAV estimation and discount/premium prediction. \
                Find papers on REIT prediction ML, real estate securities analytics, \
                and REIT factor models (2019-2026). {ctx}"
            ),
            preamble: "You are a quantitative finance researcher specialising in REIT \
                analytics. Produce structured findings in Markdown."
                .into(),
            status: TaskStatus::Pending,
            owner: None,
            dependencies: vec![6],
            result: None,
        },
        ResearchTask {
            id: 47,
            subject: "portfolio-optimization-ml".into(),
            description: format!(
                "Deep dive into ML-enhanced real estate portfolio optimization. Focus on: \
                (1) mean-variance optimization with ML-estimated inputs, \
                (2) alternative data integration for portfolio decisions, \
                (3) multi-asset allocation including direct and indirect real estate, \
                (4) reinforcement learning for dynamic portfolio rebalancing, \
                (5) risk parity and factor-based allocation for real estate portfolios. \
                Find papers on real estate portfolio optimization ML, asset allocation, \
                and multi-asset real estate investing (2019-2026). {ctx}"
            ),
            preamble: "You are a portfolio management researcher specialising in real estate \
                investment optimization. Produce structured findings in Markdown."
                .into(),
            status: TaskStatus::Pending,
            owner: None,
            dependencies: vec![6],
            result: None,
        },
        ResearchTask {
            id: 48,
            subject: "alternative-data-signals".into(),
            description: format!(
                "Deep dive into alternative data signals for real estate investment. Focus on: \
                (1) satellite imagery — parking lot occupancy, construction activity, \
                (2) foot traffic and geolocation data for retail property assessment, \
                (3) credit card transaction data for commercial property revenue estimation, \
                (4) web scraping signals — listing activity, price changes, days on market, \
                (5) job posting data for office market demand forecasting. \
                Find papers on alternative data for real estate, satellite-based investing, \
                and novel data sources for property analytics (2019-2026). {ctx}"
            ),
            preamble: "You are an alternative data researcher for real estate investment. \
                Produce structured findings in Markdown."
                .into(),
            status: TaskStatus::Pending,
            owner: None,
            dependencies: vec![6],
            result: None,
        },
        ResearchTask {
            id: 49,
            subject: "real-estate-risk-modeling".into(),
            description: format!(
                "Deep dive into risk modeling for real estate. Focus on: \
                (1) Value at Risk (VaR) and CVaR for real estate portfolios, \
                (2) stress testing and scenario analysis with ML, \
                (3) tail risk estimation for property markets, \
                (4) liquidity risk modeling — time-on-market, transaction costs, \
                (5) systemic risk in real estate — interconnectedness with financial system. \
                Find papers on real estate risk ML, property market stress testing, \
                and systemic risk in housing (2018-2026). {ctx}"
            ),
            preamble: "You are a risk management researcher specialising in real estate. \
                Produce structured findings in Markdown."
                .into(),
            status: TaskStatus::Pending,
            owner: None,
            dependencies: vec![6],
            result: None,
        },
        ResearchTask {
            id: 50,
            subject: "mortgage-default-prediction".into(),
            description: format!(
                "Deep dive into mortgage default prediction with ML. Focus on: \
                (1) credit risk ML models — gradient boosting, neural nets for default prediction, \
                (2) survival analysis and competing risks models for mortgage outcomes, \
                (3) loss given default (LGD) estimation with ML, \
                (4) prepayment modeling and mortgage pipeline analytics, \
                (5) stress testing mortgage portfolios under adverse scenarios. \
                Find papers on mortgage default ML, credit risk modeling, \
                and LGD estimation for mortgages (2019-2026). {ctx}"
            ),
            preamble: "You are a credit risk researcher specialising in mortgage analytics. \
                Produce structured findings in Markdown."
                .into(),
            status: TaskStatus::Pending,
            owner: None,
            dependencies: vec![6, 1],
            result: None,
        },
        ResearchTask {
            id: 51,
            subject: "mortgage-fairness-bias".into(),
            description: format!(
                "Deep dive into algorithmic fairness in mortgage lending. Focus on: \
                (1) algorithmic bias in mortgage underwriting ML models, \
                (2) disparate impact testing methodologies for lending, \
                (3) fair lending regulations — ECOA, Fair Housing Act, CFPB guidance, \
                (4) debiasing techniques — pre-processing, in-processing, post-processing, \
                (5) explainability requirements for adverse action notices. \
                Find papers on fair lending AI, mortgage discrimination ML, \
                and algorithmic fairness in credit decisions (2019-2026). {ctx}"
            ),
            preamble: "You are a fairness in AI researcher specialising in lending. \
                Produce structured findings in Markdown."
                .into(),
            status: TaskStatus::Pending,
            owner: None,
            dependencies: vec![50],
            result: None,
        },
        ResearchTask {
            id: 52,
            subject: "blockchain-tokenization".into(),
            description: format!(
                "Deep dive into blockchain and tokenization in real estate. Focus on: \
                (1) tokenized real estate — security tokens, fractional ownership platforms, \
                (2) DeFi lending protocols for real estate collateral, \
                (3) smart contract analysis for property transactions, \
                (4) NFTs for property deeds and title management, \
                (5) regulatory framework for tokenized real estate securities. \
                Find papers on real estate tokenization, blockchain property, \
                and DeFi real estate (2019-2026). {ctx}"
            ),
            preamble: "You are a blockchain/DeFi researcher specialising in real estate \
                tokenization. Produce structured findings in Markdown."
                .into(),
            status: TaskStatus::Pending,
            owner: None,
            dependencies: vec![6],
            result: None,
        },

        // ── Domain G: PropTech & IoT (IDs 53-59) ───────────────────────────
        ResearchTask {
            id: 53,
            subject: "digital-twin-buildings".into(),
            description: format!(
                "Deep dive into digital twins for buildings. Focus on: \
                (1) building digital twin architectures — BIM + IoT + ML, \
                (2) simulation and what-if analysis using digital twins, \
                (3) real-time synchronization between physical and digital building, \
                (4) ML for digital twin model calibration and updating, \
                (5) digital twin platforms and interoperability standards. \
                Find papers on building digital twins, BIM-ML integration, \
                and digital twin simulation (2019-2026). {ctx}"
            ),
            preamble: "You are a digital twin researcher specialising in built environment. \
                Produce structured findings in Markdown."
                .into(),
            status: TaskStatus::Pending,
            owner: None,
            dependencies: vec![7],
            result: None,
        },
        ResearchTask {
            id: 54,
            subject: "predictive-maintenance-buildings".into(),
            description: format!(
                "Deep dive into predictive maintenance for buildings. Focus on: \
                (1) equipment failure prediction for HVAC, elevators, plumbing, \
                (2) sensor-based anomaly detection for building systems, \
                (3) maintenance scheduling optimization with ML, \
                (4) remaining useful life estimation for building components, \
                (5) cost-benefit analysis of predictive vs reactive maintenance. \
                Find papers on building predictive maintenance, facility management ML, \
                and equipment failure prediction (2019-2026). {ctx}"
            ),
            preamble: "You are a predictive maintenance researcher for built environment. \
                Produce structured findings in Markdown."
                .into(),
            status: TaskStatus::Pending,
            owner: None,
            dependencies: vec![7],
            result: None,
        },
        ResearchTask {
            id: 55,
            subject: "occupancy-optimization".into(),
            description: format!(
                "Deep dive into occupancy prediction and space optimization. Focus on: \
                (1) occupancy prediction from sensor data — WiFi, CO2, cameras, badges, \
                (2) space utilization analytics for offices and coworking, \
                (3) hot-desking and flexible workspace optimization, \
                (4) post-COVID hybrid work occupancy modeling, \
                (5) revenue optimization for coworking and flexible spaces. \
                Find papers on occupancy prediction ML, space utilization, \
                and workplace optimization (2019-2026). {ctx}"
            ),
            preamble: "You are a workplace analytics researcher specialising in occupancy \
                and space optimization. Produce structured findings in Markdown."
                .into(),
            status: TaskStatus::Pending,
            owner: None,
            dependencies: vec![7],
            result: None,
        },
        ResearchTask {
            id: 56,
            subject: "indoor-environmental-quality".into(),
            description: format!(
                "Deep dive into indoor environmental quality prediction. Focus on: \
                (1) indoor air quality (IAQ) prediction — CO2, PM2.5, VOCs, \
                (2) thermal comfort modeling — PMV/PPD with ML, personal comfort models, \
                (3) lighting optimization — circadian lighting, daylight harvesting, \
                (4) acoustic quality prediction and noise management, \
                (5) IEQ impact on productivity, health, and property value. \
                Find papers on IEQ prediction ML, thermal comfort, \
                and smart building comfort optimization (2019-2026). {ctx}"
            ),
            preamble: "You are an indoor environment researcher specialising in ML-based \
                comfort and quality prediction. Produce structured findings in Markdown."
                .into(),
            status: TaskStatus::Pending,
            owner: None,
            dependencies: vec![7],
            result: None,
        },
        ResearchTask {
            id: 57,
            subject: "smart-hvac-energy-control".into(),
            description: format!(
                "Deep dive into ML/RL for HVAC and energy control in buildings. Focus on: \
                (1) reinforcement learning for HVAC control — model-free and model-based, \
                (2) demand response optimization — building as grid resource, \
                (3) peak shaving and load shifting strategies with ML, \
                (4) multi-zone HVAC coordination, \
                (5) integration with renewable energy sources and battery storage. \
                Find papers on RL HVAC control, building demand response, \
                and smart grid building interaction (2019-2026). {ctx}"
            ),
            preamble: "You are a building energy systems researcher specialising in ML/RL \
                control. Produce structured findings in Markdown."
                .into(),
            status: TaskStatus::Pending,
            owner: None,
            dependencies: vec![7, 8],
            result: None,
        },
        ResearchTask {
            id: 58,
            subject: "construction-tech-ml".into(),
            description: format!(
                "Deep dive into ML for construction technology. Focus on: \
                (1) construction cost estimation with ML — project-level and elemental, \
                (2) schedule prediction and delay risk modeling, \
                (3) defect detection in construction — visual inspection automation, \
                (4) BIM automation — clash detection, design optimization, generative design, \
                (5) robotics and automation in construction — current state and ML enablers. \
                Find papers on construction ML, cost estimation, schedule prediction, \
                and construction robotics (2019-2026). {ctx}"
            ),
            preamble: "You are a construction technology researcher specialising in ML \
                applications. Produce structured findings in Markdown."
                .into(),
            status: TaskStatus::Pending,
            owner: None,
            dependencies: vec![7, 3],
            result: None,
        },
        ResearchTask {
            id: 59,
            subject: "proptech-platform-architecture".into(),
            description: format!(
                "Deep dive into PropTech platform architecture and MLOps. Focus on: \
                (1) tech stack patterns for PropTech platforms — data lakes, streaming, APIs, \
                (2) MLOps for real estate — model deployment, monitoring, retraining, \
                (3) data pipeline architectures for property data aggregation, \
                (4) real-time vs batch processing trade-offs for property analytics, \
                (5) multi-tenant architecture for PropTech SaaS. \
                Find papers and industry reports on PropTech architecture, real estate MLOps, \
                and data engineering for property platforms (2019-2026). {ctx}"
            ),
            preamble: "You are a software architect specialising in PropTech platform design. \
                Produce structured findings in Markdown."
                .into(),
            status: TaskStatus::Pending,
            owner: None,
            dependencies: vec![7],
            result: None,
        },

        // ── Domain H: Sustainability & Climate (IDs 60-66) ──────────────────
        ResearchTask {
            id: 60,
            subject: "energy-performance-prediction".into(),
            description: format!(
                "Deep dive into building energy performance prediction. Focus on: \
                (1) data-driven building energy consumption models — regression, neural nets, \
                (2) energy retrofit impact prediction and optimization, \
                (3) smart meter analytics for load profiling and disaggregation, \
                (4) benchmarking building energy performance with ML, \
                (5) physics-informed neural networks for energy modeling. \
                Find papers on building energy prediction ML, retrofit analysis, \
                and smart meter analytics (2019-2026). {ctx}"
            ),
            preamble: "You are a building energy researcher specialising in data-driven \
                performance prediction. Produce structured findings in Markdown."
                .into(),
            status: TaskStatus::Pending,
            owner: None,
            dependencies: vec![8],
            result: None,
        },
        ResearchTask {
            id: 61,
            subject: "green-certification-prediction".into(),
            description: format!(
                "Deep dive into green building certification prediction. Focus on: \
                (1) LEED/BREEAM/WELL score prediction using building features, \
                (2) feature importance — which design choices matter most for certification, \
                (3) cost-benefit analysis of green certification with ML, \
                (4) green premium estimation — certified vs non-certified property values, \
                (5) automated compliance checking against certification standards. \
                Find papers on green building certification ML, green premium, \
                and sustainability rating prediction (2019-2026). {ctx}"
            ),
            preamble: "You are a green building researcher specialising in certification \
                analytics. Produce structured findings in Markdown."
                .into(),
            status: TaskStatus::Pending,
            owner: None,
            dependencies: vec![8],
            result: None,
        },
        ResearchTask {
            id: 62,
            subject: "climate-risk-property-value".into(),
            description: format!(
                "Deep dive into climate risk impact on property values. Focus on: \
                (1) flood risk → property value discount modeling, \
                (2) wildfire risk and insurance pricing impact, \
                (3) sea level rise — long-term value impact and coastal property repricing, \
                (4) heat risk — extreme heat events and property market effects, \
                (5) climate risk disclosure requirements and market response. \
                Find papers on climate risk real estate, flood risk property values, \
                and climate adaptation in housing markets (2019-2026). {ctx}"
            ),
            preamble: "You are a climate risk researcher specialising in real estate market \
                impacts. Produce structured findings in Markdown."
                .into(),
            status: TaskStatus::Pending,
            owner: None,
            dependencies: vec![8, 5],
            result: None,
        },
        ResearchTask {
            id: 63,
            subject: "carbon-footprint-real-estate".into(),
            description: format!(
                "Deep dive into carbon footprint analysis for real estate. Focus on: \
                (1) embodied carbon estimation for buildings with ML, \
                (2) operational carbon modeling and reduction strategies, \
                (3) lifecycle assessment (LCA) automation using ML, \
                (4) carbon offset and credit mechanisms for buildings, \
                (5) Net zero building pathways and ML-optimized design. \
                Find papers on building carbon footprint ML, embodied carbon, \
                and net zero building analytics (2019-2026). {ctx}"
            ),
            preamble: "You are a carbon footprint researcher specialising in built environment. \
                Produce structured findings in Markdown."
                .into(),
            status: TaskStatus::Pending,
            owner: None,
            dependencies: vec![8],
            result: None,
        },
        ResearchTask {
            id: 64,
            subject: "renewable-energy-buildings".into(),
            description: format!(
                "Deep dive into renewable energy for buildings. Focus on: \
                (1) solar potential assessment using ML — rooftop analysis, shading, orientation, \
                (2) battery storage optimization for buildings, \
                (3) EV charging infrastructure planning and load management, \
                (4) building-integrated photovoltaics (BIPV) design optimization, \
                (5) community energy sharing and peer-to-peer energy trading ML. \
                Find papers on building solar ML, battery optimization, \
                and renewable energy building integration (2019-2026). {ctx}"
            ),
            preamble: "You are a renewable energy researcher specialising in building \
                applications. Produce structured findings in Markdown."
                .into(),
            status: TaskStatus::Pending,
            owner: None,
            dependencies: vec![8, 7],
            result: None,
        },
        ResearchTask {
            id: 65,
            subject: "circular-economy-construction".into(),
            description: format!(
                "Deep dive into circular economy for construction. Focus on: \
                (1) material reuse prediction and matching platforms, \
                (2) construction waste optimization with ML, \
                (3) deconstruction planning and material recovery, \
                (4) material passports and building as material banks, \
                (5) design for disassembly optimization. \
                Find papers on circular construction ML, material reuse, \
                and waste reduction in building (2019-2026). {ctx}"
            ),
            preamble: "You are a circular economy researcher specialising in construction. \
                Produce structured findings in Markdown."
                .into(),
            status: TaskStatus::Pending,
            owner: None,
            dependencies: vec![8],
            result: None,
        },
        ResearchTask {
            id: 66,
            subject: "resilient-building-design".into(),
            description: format!(
                "Deep dive into climate-resilient building design with ML. Focus on: \
                (1) climate adaptation strategies for buildings — ML-optimized design, \
                (2) extreme weather resilience — hurricane, flood, heat wave resistant design, \
                (3) passive design optimization using simulation and ML, \
                (4) resilience scoring and certification frameworks, \
                (5) cost-benefit of resilience investments using predictive models. \
                Find papers on resilient building ML, climate adaptation design, \
                and passive building optimization (2019-2026). {ctx}"
            ),
            preamble: "You are a resilient design researcher specialising in climate-adapted \
                buildings. Produce structured findings in Markdown."
                .into(),
            status: TaskStatus::Pending,
            owner: None,
            dependencies: vec![8, 3],
            result: None,
        },

        // ── Domain I: Legal & Compliance (IDs 67-73) ────────────────────────
        ResearchTask {
            id: 67,
            subject: "property-title-search-ai".into(),
            description: format!(
                "Deep dive into AI for property title search and analysis. Focus on: \
                (1) automated title search — chain of title analysis with NLP, \
                (2) lien detection and encumbrance identification, \
                (3) title defect classification and risk scoring, \
                (4) OCR and document understanding for recorded documents, \
                (5) title insurance underwriting automation. \
                Find papers on title search AI, property record analysis, \
                and document understanding for real estate (2019-2026). {ctx}"
            ),
            preamble: "You are a legal technology researcher specialising in title and \
                property records automation. Produce structured findings in Markdown."
                .into(),
            status: TaskStatus::Pending,
            owner: None,
            dependencies: vec![9],
            result: None,
        },
        ResearchTask {
            id: 68,
            subject: "aml-real-estate".into(),
            description: format!(
                "Deep dive into anti-money laundering AI for real estate. Focus on: \
                (1) suspicious transaction detection in property purchases, \
                (2) beneficial ownership identification and verification, \
                (3) shell company detection in real estate transactions, \
                (4) cross-border transaction monitoring for real estate, \
                (5) FinCEN GTO and BSA compliance automation. \
                Find papers on real estate AML, money laundering detection in property, \
                and beneficial ownership AI (2019-2026). {ctx}"
            ),
            preamble: "You are a financial crime researcher specialising in real estate \
                AML. Produce structured findings in Markdown."
                .into(),
            status: TaskStatus::Pending,
            owner: None,
            dependencies: vec![9, 6],
            result: None,
        },
        ResearchTask {
            id: 69,
            subject: "fair-housing-ai-audit".into(),
            description: format!(
                "Deep dive into fair housing AI auditing. Focus on: \
                (1) disparate impact testing for property-related AI algorithms, \
                (2) steering detection — discriminatory property recommendations, \
                (3) fair advertising compliance — preventing discriminatory ad targeting, \
                (4) accessibility compliance checking for properties, \
                (5) audit methodologies for real estate AI systems. \
                Find papers on fair housing AI, algorithmic discrimination in housing, \
                and housing discrimination detection (2019-2026). {ctx}"
            ),
            preamble: "You are a fair housing researcher specialising in AI auditing. \
                Produce structured findings in Markdown."
                .into(),
            status: TaskStatus::Pending,
            owner: None,
            dependencies: vec![9, 1],
            result: None,
        },
        ResearchTask {
            id: 70,
            subject: "property-tax-appeal-ml".into(),
            description: format!(
                "Deep dive into ML for property tax appeals. Focus on: \
                (1) assessment challenge prediction — likelihood of successful appeal, \
                (2) optimal appeal strategy — which properties to challenge, \
                (3) valuation dispute analysis — evidence assembly automation, \
                (4) comparative assessment equity analysis, \
                (5) appeal outcome prediction and settlement optimization. \
                Find papers on property tax appeal ML, assessment dispute, \
                and tax valuation challenge analytics (2019-2026). {ctx}"
            ),
            preamble: "You are a property tax analytics researcher. Produce structured \
                findings in Markdown."
                .into(),
            status: TaskStatus::Pending,
            owner: None,
            dependencies: vec![9, 15],
            result: None,
        },
        ResearchTask {
            id: 71,
            subject: "ai-regulation-real-estate".into(),
            description: format!(
                "Deep dive into AI regulation affecting real estate. Focus on: \
                (1) EU AI Act implications for real estate AI — high-risk classification, \
                (2) CFPB guidance on automated valuation and lending models, \
                (3) state-level AVM regulations (Colorado, NYC, etc.), \
                (4) compliance frameworks for deploying AI in real estate, \
                (5) emerging standards — ISO/IEC 42001, NIST AI RMF for real estate. \
                Find papers on AI regulation real estate, AVM compliance, \
                and real estate AI governance (2021-2026). {ctx}"
            ),
            preamble: "You are a regulatory researcher specialising in AI governance for \
                real estate. Produce structured findings in Markdown."
                .into(),
            status: TaskStatus::Pending,
            owner: None,
            dependencies: vec![9],
            result: None,
        },
        ResearchTask {
            id: 72,
            subject: "eminent-domain-just-compensation".into(),
            description: format!(
                "Deep dive into ML for eminent domain and just compensation. Focus on: \
                (1) condemnation valuation using ML — market value estimation under taking, \
                (2) comparable damages and severance damage assessment, \
                (3) relocation cost and impact analysis, \
                (4) before-and-after valuation methodology with ML, \
                (5) litigation support analytics for eminent domain cases. \
                Find papers on eminent domain valuation, condemnation ML, \
                and just compensation analytics (2018-2026). {ctx}"
            ),
            preamble: "You are a property rights researcher specialising in eminent domain \
                valuation. Produce structured findings in Markdown."
                .into(),
            status: TaskStatus::Pending,
            owner: None,
            dependencies: vec![9, 1],
            result: None,
        },
        ResearchTask {
            id: 73,
            subject: "escrow-transaction-automation".into(),
            description: format!(
                "Deep dive into AI for escrow and transaction automation. Focus on: \
                (1) smart escrow systems — automated milestone-based disbursement, \
                (2) closing process ML — document verification, compliance checking, \
                (3) wire fraud detection in real estate transactions, \
                (4) automated closing disclosure review, \
                (5) end-to-end transaction management platforms. \
                Find papers on real estate transaction automation, escrow AI, \
                and closing process optimization (2019-2026). {ctx}"
            ),
            preamble: "You are a fintech researcher specialising in real estate transaction \
                automation. Produce structured findings in Markdown."
                .into(),
            status: TaskStatus::Pending,
            owner: None,
            dependencies: vec![9],
            result: None,
        },

        // ── Domain J: Generative & Emerging AI (IDs 74-80) ──────────────────
        ResearchTask {
            id: 74,
            subject: "text-to-floorplan".into(),
            description: format!(
                "Deep dive into text-to-floor-plan generation. Focus on: \
                (1) generating floor plans from text descriptions using generative models, \
                (2) layout optimization — room arrangement, flow, building code compliance, \
                (3) constraint-based generation — square footage, room count, adjacency, \
                (4) graph-based floor plan generation — room connectivity graphs, \
                (5) interactive editing and refinement of generated plans. \
                Find papers on floor plan generation AI, text-to-layout, \
                and generative architectural design (2020-2026). {ctx}"
            ),
            preamble: "You are a generative design researcher specialising in architectural \
                layout generation. Produce structured findings in Markdown."
                .into(),
            status: TaskStatus::Pending,
            owner: None,
            dependencies: vec![10, 3],
            result: None,
        },
        ResearchTask {
            id: 75,
            subject: "automated-listing-generation".into(),
            description: format!(
                "Deep dive into automated property listing generation. Focus on: \
                (1) LLM-generated property descriptions — quality, accuracy, engagement, \
                (2) multilingual listing generation and localization, \
                (3) SEO optimization for property listings with AI, \
                (4) personalized listing descriptions for different buyer personas, \
                (5) factual grounding — ensuring generated descriptions match property data. \
                Find papers on automated listing generation, property description NLG, \
                and real estate content AI (2021-2026). {ctx}"
            ),
            preamble: "You are an NLG researcher specialising in real estate content \
                generation. Produce structured findings in Markdown."
                .into(),
            status: TaskStatus::Pending,
            owner: None,
            dependencies: vec![10, 4],
            result: None,
        },
        ResearchTask {
            id: 76,
            subject: "synthetic-training-data".into(),
            description: format!(
                "Deep dive into synthetic data generation for real estate ML. Focus on: \
                (1) synthetic property data generation — tabular, image, text, \
                (2) privacy-preserving data augmentation techniques, \
                (3) GANs and diffusion models for synthetic property images, \
                (4) data quality and utility metrics for synthetic real estate data, \
                (5) federated approaches to synthetic data generation. \
                Find papers on synthetic data for real estate, privacy-preserving ML, \
                and data augmentation for property analytics (2020-2026). {ctx}"
            ),
            preamble: "You are a synthetic data researcher applied to real estate ML. \
                Produce structured findings in Markdown."
                .into(),
            status: TaskStatus::Pending,
            owner: None,
            dependencies: vec![10, 1],
            result: None,
        },
        ResearchTask {
            id: 77,
            subject: "multimodal-property-search".into(),
            description: format!(
                "Deep dive into multimodal property search and understanding. Focus on: \
                (1) image + text + location multimodal search for properties, \
                (2) CLIP-based property matching and similarity, \
                (3) visual question answering for real estate — 'Does this have a pool?', \
                (4) cross-modal retrieval — find properties by sketch, photo, or description, \
                (5) multimodal embeddings for property representation. \
                Find papers on multimodal property search, CLIP for real estate, \
                and cross-modal property retrieval (2021-2026). {ctx}"
            ),
            preamble: "You are a multimodal ML researcher applied to real estate search. \
                Produce structured findings in Markdown."
                .into(),
            status: TaskStatus::Pending,
            owner: None,
            dependencies: vec![10, 3, 4],
            result: None,
        },
        ResearchTask {
            id: 78,
            subject: "federated-learning-real-estate".into(),
            description: format!(
                "Deep dive into federated learning for real estate. Focus on: \
                (1) multi-brokerage federated learning — training on distributed MLS data, \
                (2) differential privacy for property data protection, \
                (3) secure multi-party computation for valuation models, \
                (4) federated AVM training across jurisdictions, \
                (5) privacy-utility trade-offs in federated real estate ML. \
                Find papers on federated learning real estate, privacy-preserving property ML, \
                and distributed learning for housing data (2020-2026). {ctx}"
            ),
            preamble: "You are a federated learning researcher applied to real estate. \
                Produce structured findings in Markdown."
                .into(),
            status: TaskStatus::Pending,
            owner: None,
            dependencies: vec![10, 1],
            result: None,
        },
        ResearchTask {
            id: 79,
            subject: "transfer-learning-cross-market".into(),
            description: format!(
                "Deep dive into transfer learning across real estate markets. Focus on: \
                (1) cross-city transfer learning for property valuation, \
                (2) domain adaptation techniques for different property markets, \
                (3) few-shot learning for emerging or data-sparse markets, \
                (4) multi-task learning across real estate prediction tasks, \
                (5) knowledge distillation for lightweight property models. \
                Find papers on transfer learning real estate, cross-market adaptation, \
                and few-shot property ML (2020-2026). {ctx}"
            ),
            preamble: "You are a transfer learning researcher applied to real estate markets. \
                Produce structured findings in Markdown."
                .into(),
            status: TaskStatus::Pending,
            owner: None,
            dependencies: vec![10, 1, 2],
            result: None,
        },
        ResearchTask {
            id: 80,
            subject: "foundation-models-real-estate".into(),
            description: format!(
                "Deep dive into foundation models for real estate. Focus on: \
                (1) pre-trained property embeddings — location, features, text, images, \
                (2) domain-specific LLMs for real estate — fine-tuning, RAG approaches, \
                (3) vision-language models for property understanding, \
                (4) real estate GPT-like assistants — capabilities and limitations, \
                (5) foundation model adaptation strategies for property domains. \
                Find papers on foundation models real estate, property embeddings, \
                and domain LLMs for housing (2022-2026). {ctx}"
            ),
            preamble: "You are a foundation model researcher specialising in real estate \
                domain adaptation. Produce structured findings in Markdown."
                .into(),
            status: TaskStatus::Pending,
            owner: None,
            dependencies: vec![10],
            result: None,
        },

        // ══════════════════════════════════════════════════════════════════════
        // Tier 3 — Domain Synthesis (12 tasks)
        // ══════════════════════════════════════════════════════════════════════
        ResearchTask {
            id: 81,
            subject: "valuation-intelligence-synthesis".into(),
            description: format!(
                "Synthesise ALL property valuation research (tasks 11-17) into a unified \
                Valuation Intelligence report. Produce: \
                (1) comparative analysis of AVM approaches — gradient boosting vs deep learning vs spatial, \
                (2) explainability and fairness requirements for production AVMs, \
                (3) commercial vs residential valuation method differences, \
                (4) state-of-the-art accuracy benchmarks and remaining gaps, \
                (5) recommended architecture for a next-generation AVM system. {ctx}"
            ),
            preamble: "You are a senior real estate AI researcher. Produce a comprehensive \
                synthesis report in Markdown integrating all valuation domain findings."
                .into(),
            status: TaskStatus::Pending,
            owner: None,
            dependencies: vec![11, 12, 13, 14, 15, 16, 17],
            result: None,
        },
        ResearchTask {
            id: 82,
            subject: "forecasting-analytics-synthesis".into(),
            description: format!(
                "Synthesise ALL market forecasting research (tasks 18-24) into a unified \
                Forecasting Analytics report. Produce: \
                (1) comparative analysis of forecasting architectures — LSTM vs Transformer vs GNN, \
                (2) bubble detection and early warning integration strategy, \
                (3) supply-demand equilibrium modeling approach, \
                (4) macro-financial linkage framework, \
                (5) recommended forecasting system architecture. {ctx}"
            ),
            preamble: "You are a senior housing market researcher. Produce a comprehensive \
                synthesis report in Markdown integrating all forecasting domain findings."
                .into(),
            status: TaskStatus::Pending,
            owner: None,
            dependencies: vec![18, 19, 20, 21, 22, 23, 24],
            result: None,
        },
        ResearchTask {
            id: 83,
            subject: "visual-intelligence-synthesis".into(),
            description: format!(
                "Synthesise ALL computer vision research (tasks 25-31) into a unified \
                Visual Intelligence report. Produce: \
                (1) multi-scale visual analysis pipeline — satellite → street → interior, \
                (2) damage detection and condition assessment integration, \
                (3) generative capabilities — staging, renovation visualization, \
                (4) construction monitoring and progress tracking, \
                (5) recommended CV platform architecture for real estate. {ctx}"
            ),
            preamble: "You are a senior CV researcher. Produce a comprehensive synthesis \
                report in Markdown integrating all visual intelligence findings."
                .into(),
            status: TaskStatus::Pending,
            owner: None,
            dependencies: vec![25, 26, 27, 28, 29, 30, 31],
            result: None,
        },
        ResearchTask {
            id: 84,
            subject: "text-intelligence-synthesis".into(),
            description: format!(
                "Synthesise ALL NLP research (tasks 32-38) into a unified Text Intelligence \
                report. Produce: \
                (1) information extraction pipeline for real estate text, \
                (2) fraud and deception detection framework, \
                (3) sentiment and market signal integration, \
                (4) multilingual and conversational capabilities, \
                (5) recommended NLP platform for real estate text processing. {ctx}"
            ),
            preamble: "You are a senior NLP researcher. Produce a comprehensive synthesis \
                report in Markdown integrating all text intelligence findings."
                .into(),
            status: TaskStatus::Pending,
            owner: None,
            dependencies: vec![32, 33, 34, 35, 36, 37, 38],
            result: None,
        },
        ResearchTask {
            id: 85,
            subject: "spatial-urban-synthesis".into(),
            description: format!(
                "Synthesise ALL spatial and urban analytics research (tasks 39-45) into a \
                unified Spatial Urban Intelligence report. Produce: \
                (1) neighborhood characterization and scoring framework, \
                (2) mobility and accessibility integration, \
                (3) gentrification and demographic change modeling, \
                (4) environmental quality and amenity valuation, \
                (5) recommended spatial analytics platform architecture. {ctx}"
            ),
            preamble: "You are a senior urban analytics researcher. Produce a comprehensive \
                synthesis report in Markdown integrating all spatial domain findings."
                .into(),
            status: TaskStatus::Pending,
            owner: None,
            dependencies: vec![39, 40, 41, 42, 43, 44, 45],
            result: None,
        },
        ResearchTask {
            id: 86,
            subject: "investment-risk-synthesis".into(),
            description: format!(
                "Synthesise ALL investment and finance research (tasks 46-52) into a unified \
                Investment Risk Intelligence report. Produce: \
                (1) REIT and portfolio analytics framework, \
                (2) alternative data signal integration strategy, \
                (3) risk modeling and stress testing approach, \
                (4) mortgage analytics and fairness framework, \
                (5) blockchain and tokenization landscape assessment. {ctx}"
            ),
            preamble: "You are a senior quantitative real estate finance researcher. Produce \
                a comprehensive synthesis report in Markdown."
                .into(),
            status: TaskStatus::Pending,
            owner: None,
            dependencies: vec![46, 47, 48, 49, 50, 51, 52],
            result: None,
        },
        ResearchTask {
            id: 87,
            subject: "proptech-iot-synthesis".into(),
            description: format!(
                "Synthesise ALL PropTech and IoT research (tasks 53-59) into a unified \
                PropTech IoT Intelligence report. Produce: \
                (1) digital twin and BIM integration architecture, \
                (2) predictive maintenance and occupancy optimization framework, \
                (3) indoor environment quality control strategy, \
                (4) construction technology integration, \
                (5) recommended PropTech platform and MLOps architecture. {ctx}"
            ),
            preamble: "You are a senior PropTech architect. Produce a comprehensive \
                synthesis report in Markdown integrating all PropTech/IoT findings."
                .into(),
            status: TaskStatus::Pending,
            owner: None,
            dependencies: vec![53, 54, 55, 56, 57, 58, 59],
            result: None,
        },
        ResearchTask {
            id: 88,
            subject: "sustainability-climate-synthesis".into(),
            description: format!(
                "Synthesise ALL sustainability and climate research (tasks 60-66) into a \
                unified Sustainability Climate Intelligence report. Produce: \
                (1) energy performance and carbon footprint framework, \
                (2) green certification and premium analysis, \
                (3) climate risk assessment and resilience strategy, \
                (4) renewable energy and circular economy integration, \
                (5) recommended sustainability analytics platform. {ctx}"
            ),
            preamble: "You are a senior sustainability researcher. Produce a comprehensive \
                synthesis report in Markdown integrating all sustainability findings."
                .into(),
            status: TaskStatus::Pending,
            owner: None,
            dependencies: vec![60, 61, 62, 63, 64, 65, 66],
            result: None,
        },
        ResearchTask {
            id: 89,
            subject: "legal-compliance-synthesis".into(),
            description: format!(
                "Synthesise ALL legal and compliance research (tasks 67-73) into a unified \
                Legal Compliance Intelligence report. Produce: \
                (1) title search and due diligence automation framework, \
                (2) AML and fair housing compliance strategy, \
                (3) AI regulation compliance roadmap, \
                (4) transaction automation and fraud prevention, \
                (5) recommended legal tech integration architecture. {ctx}"
            ),
            preamble: "You are a senior legal technology researcher. Produce a comprehensive \
                synthesis report in Markdown integrating all legal/compliance findings."
                .into(),
            status: TaskStatus::Pending,
            owner: None,
            dependencies: vec![67, 68, 69, 70, 71, 72, 73],
            result: None,
        },
        ResearchTask {
            id: 90,
            subject: "emerging-ai-synthesis".into(),
            description: format!(
                "Synthesise ALL generative and emerging AI research (tasks 74-80) into a \
                unified Emerging AI Intelligence report. Produce: \
                (1) generative design capabilities — floor plans, staging, listings, \
                (2) synthetic data and privacy-preserving ML strategy, \
                (3) multimodal search and foundation model opportunities, \
                (4) federated and transfer learning framework, \
                (5) recommended emerging AI adoption roadmap for real estate. {ctx}"
            ),
            preamble: "You are a senior emerging AI researcher. Produce a comprehensive \
                synthesis report in Markdown integrating all generative/emerging AI findings."
                .into(),
            status: TaskStatus::Pending,
            owner: None,
            dependencies: vec![74, 75, 76, 77, 78, 79, 80],
            result: None,
        },
        ResearchTask {
            id: 91,
            subject: "cross-domain-techniques-synthesis".into(),
            description: format!(
                "Synthesise cross-cutting techniques that span multiple domains. Focus on: \
                (1) multimodal learning — how CV, NLP, spatial, and tabular data combine, \
                (2) graph neural networks across domains — spatial, social, knowledge graphs, \
                (3) transformer architectures — time-series, NLP, vision for real estate, \
                (4) reinforcement learning applications — HVAC, portfolio, pricing, negotiation, \
                (5) foundation models and transfer learning across property domains. \
                Draw from tasks: 16, 17, 20, 30, 77, 79, 80. {ctx}"
            ),
            preamble: "You are a senior ML researcher. Produce a cross-cutting techniques \
                synthesis identifying methods that bridge multiple real estate domains."
                .into(),
            status: TaskStatus::Pending,
            owner: None,
            dependencies: vec![16, 17, 20, 30, 77, 79, 80],
            result: None,
        },
        ResearchTask {
            id: 92,
            subject: "data-infrastructure-synthesis".into(),
            description: format!(
                "Synthesise data infrastructure, datasets, and MLOps findings. Focus on: \
                (1) key real estate datasets and benchmarks across all domains, \
                (2) data pipeline architectures for property analytics, \
                (3) MLOps patterns for real estate model lifecycle, \
                (4) synthetic data strategies for data-sparse domains, \
                (5) data governance and privacy frameworks. \
                Draw from tasks: 8, 59, 76, 78. {ctx}"
            ),
            preamble: "You are a senior data engineering architect. Produce a data \
                infrastructure synthesis report for real estate AI/ML."
                .into(),
            status: TaskStatus::Pending,
            owner: None,
            dependencies: vec![8, 59, 76, 78],
            result: None,
        },

        // ══════════════════════════════════════════════════════════════════════
        // Tier 4 — Grand Synthesis (8 tasks)
        // ══════════════════════════════════════════════════════════════════════
        ResearchTask {
            id: 93,
            subject: "top-100-papers-compilation".into(),
            description: format!(
                "Compile and rank the TOP 100 most important papers across ALL domains. \
                For each paper provide: title, authors, year, venue, citation count, \
                domain(s), key contribution, and relevance score (1-10). \
                Organize by domain and overall ranking. Include seminal works and \
                recent breakthroughs. {ctx}"
            ),
            preamble: "You are a senior research bibliographer. Produce a ranked compilation \
                of the 100 most important papers in real estate AI/ML."
                .into(),
            status: TaskStatus::Pending,
            owner: None,
            dependencies: vec![81, 82, 83, 84, 85, 86, 87, 88, 89, 90, 91, 92],
            result: None,
        },
        ResearchTask {
            id: 94,
            subject: "research-gaps-analysis".into(),
            description: format!(
                "Identify research gaps and open problems across ALL domains. Produce: \
                (1) underexplored areas in each domain, \
                (2) methodological gaps — techniques not yet applied to real estate, \
                (3) data gaps — missing datasets and benchmarks, \
                (4) interdisciplinary opportunities — unexplored domain combinations, \
                (5) high-impact research directions for the next 3-5 years. {ctx}"
            ),
            preamble: "You are a research strategy advisor. Produce a comprehensive \
                research gaps analysis for real estate AI/ML."
                .into(),
            status: TaskStatus::Pending,
            owner: None,
            dependencies: vec![81, 82, 83, 84, 85, 86, 87, 88, 89, 90, 91, 92],
            result: None,
        },
        ResearchTask {
            id: 95,
            subject: "open-datasets-benchmarks-catalog".into(),
            description: format!(
                "Create a comprehensive catalog of open datasets, benchmarks, and competitions. \
                For each entry: name, URL, size, format, domain, license, key features. \
                Organize by domain. Include: \
                (1) property transaction datasets, (2) image datasets, (3) text corpora, \
                (4) geospatial data, (5) financial data, (6) IoT/sensor data, \
                (7) benchmarks and leaderboards, (8) competitions (Kaggle, etc.). {ctx}"
            ),
            preamble: "You are a data catalog researcher. Produce a comprehensive catalog \
                of open datasets and benchmarks for real estate AI/ML."
                .into(),
            status: TaskStatus::Pending,
            owner: None,
            dependencies: vec![81, 82, 83, 84, 85, 86, 87, 88, 89, 90, 91, 92],
            result: None,
        },
        ResearchTask {
            id: 96,
            subject: "cross-market-comparison".into(),
            description: format!(
                "Compare AI/ML adoption and research across global real estate markets. \
                Cover: (1) North America — US, Canada, (2) Europe — UK, Germany, Nordics, \
                (3) Asia-Pacific — China, Singapore, Australia, Japan, \
                (4) MENA — UAE, Saudi Arabia, (5) Latin America — Brazil, Mexico. \
                For each: maturity level, key players, regulatory environment, \
                unique challenges, and emerging opportunities. {ctx}"
            ),
            preamble: "You are a global real estate technology analyst. Produce a \
                cross-market comparison of AI/ML adoption in real estate."
                .into(),
            status: TaskStatus::Pending,
            owner: None,
            dependencies: vec![81, 82, 83, 84, 85, 86, 87, 88, 89, 90, 91, 92],
            result: None,
        },
        ResearchTask {
            id: 97,
            subject: "industry-startup-landscape".into(),
            description: format!(
                "Map the PropTech industry and startup landscape. Produce: \
                (1) PropTech startup map by domain and function, \
                (2) venture funding trends — total raised, top deals, investor profiles, \
                (3) acquisition trends and consolidation patterns, \
                (4) key corporate players — Zillow, CoStar, Redfin, etc., \
                (5) emerging startups to watch in each domain. {ctx}"
            ),
            preamble: "You are a PropTech industry analyst. Produce a comprehensive \
                industry and startup landscape report."
                .into(),
            status: TaskStatus::Pending,
            owner: None,
            dependencies: vec![81, 82, 83, 84, 85, 86, 87, 88, 89, 90, 91, 92],
            result: None,
        },
        ResearchTask {
            id: 98,
            subject: "ethical-societal-implications".into(),
            description: format!(
                "Analyse ethical and societal implications of real estate AI/ML. Produce: \
                (1) bias and fairness — racial, socioeconomic, geographic discrimination, \
                (2) displacement and gentrification acceleration risks, \
                (3) surveillance and privacy — smart buildings, tracking, data collection, \
                (4) algorithmic governance — who decides, accountability, transparency, \
                (5) digital divide — access to AI tools and data equity. {ctx}"
            ),
            preamble: "You are an AI ethics researcher specialising in real estate. Produce \
                a comprehensive ethical analysis of real estate AI/ML."
                .into(),
            status: TaskStatus::Pending,
            owner: None,
            dependencies: vec![81, 82, 83, 84, 85, 86, 87, 88, 89, 90, 91, 92],
            result: None,
        },
        ResearchTask {
            id: 99,
            subject: "implementation-roadmap".into(),
            description: format!(
                "Create a production implementation roadmap for real estate AI/ML. Produce: \
                (1) production readiness assessment by domain — what's ready now vs future, \
                (2) recommended tech stacks for each domain, \
                (3) build vs buy analysis for key capabilities, \
                (4) phased implementation roadmap — quick wins, medium-term, long-term, \
                (5) team composition and hiring recommendations. {ctx}"
            ),
            preamble: "You are a senior technology strategist. Produce a comprehensive \
                implementation roadmap for real estate AI/ML."
                .into(),
            status: TaskStatus::Pending,
            owner: None,
            dependencies: vec![93, 94, 95, 96, 97, 98],
            result: None,
        },
        ResearchTask {
            id: 100,
            subject: "agentic-ai-autonomous-real-estate".into(),
            description: format!(
                "Write a deep-dive research article on Agentic AI & Autonomous Real Estate Systems. \
                Cover: (1) foundations of agentic AI — ReAct, Reflexion, tool-use paradigms, \
                (2) property search agents — autonomous browsing, filtering, scheduling viewings, \
                (3) automated due diligence — title search, zoning checks, environmental reports, \
                (4) negotiation orchestration — multi-party offer/counter-offer agents, \
                (5) autonomous property management — maintenance dispatch, tenant communication, rent optimization, \
                (6) multi-agent platforms — agent-to-agent coordination, shared memory, task decomposition, \
                (7) agent architectures — planning (LLM-based), memory (RAG + vector stores), tool integration (MCP, function calling), \
                (8) evaluation & safety — hallucination in high-stakes transactions, human-in-the-loop guardrails, \
                (9) case studies & industry adoption — startups, enterprise platforms, regulatory considerations. {ctx}"
            ),
            preamble: "You are a research scientist specializing in LLM-based autonomous agents \
                and their applications in real estate. Produce a rigorous, technically detailed article."
                .into(),
            status: TaskStatus::Pending,
            owner: None,
            dependencies: vec![38, 59, 80],
            result: None,
        },
    ]
}

#[tokio::main]
async fn main() -> Result<()> {
    tracing_subscriber::fmt::init();
    dotenvy::dotenv().ok();

    let api_key =
        std::env::var("DEEPSEEK_API_KEY").context("DEEPSEEK_API_KEY must be set")?;
    let base_url = std::env::var("DEEPSEEK_BASE_URL")
        .unwrap_or_else(|_| DEFAULT_BASE_URL.to_string());
    let scholar_key = std::env::var("SEMANTIC_SCHOLAR_API_KEY").ok();

    std::fs::create_dir_all(OUT_DIR)
        .with_context(|| format!("creating output dir {OUT_DIR}"))?;

    let tasks = research_tasks();
    let team_size = 100;
    eprintln!(
        "Launching real estate AI/ML research team: {team_size} workers, {} tasks\n",
        tasks.len()
    );

    let lead = TeamLead::new(TeamConfig {
        team_size,
        provider: LlmProvider::DeepSeek { api_key, base_url },
        scholar_key,
        code_root: None,
        synthesis_preamble: Some(
            "You are a world-class research director producing the definitive landscape \
            report on AI/ML in real estate. Synthesise all findings into a coherent, \
            actionable executive report."
                .into(),
        ),
        synthesis_prompt_template: Some(
            "You have received {count} research reports from domain-specialist agents \
            covering all aspects of AI/ML in real estate. Synthesise them into a single \
            comprehensive report with the following sections:\n\n\
            # Real Estate AI/ML — Deep Research Synthesis\n\n\
            ## Executive Summary\n\
            High-level landscape overview, key findings, and strategic implications.\n\n\
            ## Cross-Cutting Themes\n\
            Techniques, architectures, and patterns that span multiple domains.\n\n\
            ## Top 100 Papers\n\
            The most important papers across all domains with citations.\n\n\
            ## Emerging Trends (2026-2030)\n\
            What's coming next in real estate AI/ML.\n\n\
            ## Datasets & Benchmarks\n\
            Essential open datasets, benchmarks, and competitions.\n\n\
            ## Research Gaps\n\
            Highest-impact open problems and underexplored areas.\n\n\
            ## Cross-Market Analysis\n\
            Global adoption patterns across US, EU, APAC, MENA, LatAm.\n\n\
            ## Ethics & Governance\n\
            Bias, fairness, privacy, displacement, regulatory compliance.\n\n\
            ## Implementation Roadmap\n\
            From research to production — phased plan, tech stacks, build vs buy.\n\n\
            ## Market Opportunity\n\
            Industry landscape, startups, hiring, investment thesis.\n\n\
            ---\n\n\
            Individual agent reports:\n\n{combined}"
                .into(),
        ),
        tool_config: Some(SearchToolConfig {
            default_limit: 10,
            abstract_max_chars: 500,
            max_authors: 5,
            include_fields_of_study: true,
            include_venue: true,
            search_description: None,
            detail_description: None,
        }),
        scholar_concurrency: Some(1),
        mailto: std::env::var("RESEARCH_MAILTO").ok(),
        output_dir: Some(OUT_DIR.into()),
        synthesis_provider: None,
    });

    let result = lead.run(tasks).await?;

    for (id, subject, content) in &result.findings {
        let path = format!("{OUT_DIR}/agent-{id:03}-{subject}.md");
        std::fs::write(&path, content)
            .with_context(|| format!("writing {path}"))?;
        eprintln!("  wrote {path} ({} bytes)", content.len());
    }

    let synthesis_path = format!("{OUT_DIR}/synthesis.md");
    std::fs::write(&synthesis_path, &result.synthesis)
        .with_context(|| format!("writing {synthesis_path}"))?;
    eprintln!("  wrote {synthesis_path} ({} bytes)", result.synthesis.len());

    let mut combined = String::from(
        "# Real Estate AI/ML Deep Research — Complete Report (100 Agents)\n\n",
    );
    for (id, subject, content) in &result.findings {
        combined.push_str(&format!(
            "## Agent {id}: {subject}\n\n{content}\n\n---\n\n"
        ));
    }
    combined.push_str("## Grand Synthesis\n\n");
    combined.push_str(&result.synthesis);

    let combined_path =
        format!("{OUT_DIR}/real-estate-ai-research-complete.md");
    std::fs::write(&combined_path, &combined)
        .with_context(|| format!("writing {combined_path}"))?;
    eprintln!("  wrote {combined_path} ({} bytes)", combined.len());

    eprintln!("\nDone — {} agent reports + synthesis + combined.", result.findings.len());
    Ok(())
}
