const TECHNIQUES = [
  {
    label: "Gradient Boosting",
    items: ["XGBoost", "LightGBM", "CatBoost", "SHAP explanations"],
  },
  {
    label: "Deep Learning",
    items: ["CNNs", "Autoencoders", "Multi-task learning", "Transfer learning"],
  },
  {
    label: "Transformers",
    items: ["Attention mechanisms", "BERT/GPT for text", "Vision Transformers", "Time-series Transformers"],
  },
  {
    label: "Graph Neural Networks",
    items: ["Spatial price spillover", "Knowledge graphs", "Node embeddings"],
  },
  {
    label: "Computer Vision",
    items: ["Object detection", "Semantic segmentation", "Image quality scoring", "Floor plan extraction"],
  },
  {
    label: "NLP & LLMs",
    items: ["Named entity recognition", "Sentiment analysis", "Document QA", "Listing generation"],
  },
  {
    label: "Geospatial ML",
    items: ["POI embeddings", "Spatial autocorrelation", "Satellite imagery", "Walkability scoring"],
  },
  {
    label: "Generative AI",
    items: ["Virtual staging", "Synthetic data", "Text-to-floorplan", "Diffusion models"],
  },
  {
    label: "Reinforcement Learning",
    items: ["HVAC optimization", "Portfolio rebalancing", "Dynamic pricing"],
  },
  {
    label: "Federated Learning",
    items: ["Privacy-preserving valuation", "Cross-market transfer", "Differential privacy"],
  },
];

export function TechGrid() {
  return (
    <section className="tech-grid-section">
      <div className="section-header">
        <p className="section-label">Methodologies & Techniques</p>
        <div className="accent-divider" />
      </div>
      <div className="tech-grid">
        {TECHNIQUES.map((t) => (
          <div key={t.label} className="tech-card">
            <div className="tech-card-label">{t.label}</div>
            <ul className="tech-card-list">
              {t.items.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}
