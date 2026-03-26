class ScoreNormalizer:
    """Normalize and merge confidence scores from 3 NER systems."""
    
    def __init__(self):
        self.calibrator = TemperatureCalibrator()
        
    def normalize_scores(self, predictions: dict) -> dict:
        """Convert raw scores to calibrated probabilities [0, 1].
        
        Input format:
        {
            "rule": [{"text": "john@example.com", "conf": 0.99, "type": "EMAIL"}],
            "distilbert": [{"text": "Acme Corp", "conf": 0.85, "type": "ORG"}],
            "gliner": [{"text": "AI Technology", "conf": 0.62, "type": "TECHNOLOGY"}]
        }
        """
        normalized = {}
        
        # Stage 1: Apply temperature scaling
        for model_name, entities in predictions.items():
            normalized[model_name] = []
            for entity in entities:
                raw_conf = entity.get("confidence", 0.5)
                
                # Apply model-specific calibration
                if model_name == "rule":
                    # Rules are deterministic
                    calibrated = raw_conf
                else:
                    calibrated = self.calibrator.scale_confidence(
                        np.log(raw_conf + 1e-10), 
                        model_name
                    )
                
                normalized[model_name].append({
                    **entity,
                    "calibrated_conf": calibrated
                })
        
        # Stage 2: Length normalization
        # Longer sequences may have naturally lower confidence
        for model_name, entities in normalized.items():
            for entity in entities:
                text = entity["text"]
                length_norm = 1.0 - (0.02 * (len(text) - 1))  # Reduce by 2% per extra token
                entity["length_normalized_conf"] = entity["calibrated_conf"] * max(0.5, length_norm)
        
        return normalized
