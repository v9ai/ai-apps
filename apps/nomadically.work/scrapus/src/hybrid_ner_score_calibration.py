import numpy as np
from scipy.optimize import minimize
import torch

class TemperatureCalibrator:
    """Calibrate confidence scores across different NER models."""
    
    def __init__(self):
        self.temperatures = {
            "distilbert": 1.0,
            "gliner": 1.0,
            "spacy_rule": 1.0,  # Rules are deterministic: 0.99 or 0.01
        }
        self.min_logit = -20.0
        self.max_logit = 20.0
    
    def calibrate_model_temp(self, logits: np.ndarray, labels: np.ndarray, 
                             model_name: str, lr=0.01, max_iter=1000):
        """Find optimal temperature T via ECE minimization.
        
        ECE = Expected Calibration Error = sum_i n_i/n * |acc_i - conf_i|
        where acc_i = accuracy in confidence bin i
              conf_i = average confidence in bin i
        """
        # Initialize temperature
        T = self.temperatures.get(model_name, 1.0)
        
        def expected_calibration_error(T):
            # Scale logits by temperature
            scaled_logits = logits / max(T, 0.1)
            probs = torch.softmax(torch.tensor(scaled_logits), dim=-1).numpy()
            
            # Bin predictions by confidence
            confidences = np.max(probs, axis=-1)
            predictions = np.argmax(probs, axis=-1)
            correct = predictions == labels
            
            # ECE with 10 bins
            ece = 0.0
            for bin_idx in range(10):
                bin_lower = bin_idx / 10.0
                bin_upper = (bin_idx + 1) / 10.0
                in_bin = (confidences >= bin_lower) & (confidences < bin_upper)
                
                if np.sum(in_bin) == 0:
                    continue
                
                acc_in_bin = np.mean(correct[in_bin])
                conf_in_bin = np.mean(confidences[in_bin])
                ece += np.sum(in_bin) / len(labels) * np.abs(acc_in_bin - conf_in_bin)
            
            return ece
        
        # Optimize temperature
        result = minimize(
            expected_calibration_error,
            x0=[T],
            bounds=[(0.1, 5.0)],
            method='L-BFGS-B'
        )
        
        optimal_T = result.x[0]
        self.temperatures[model_name] = optimal_T
        print(f"Calibrated {model_name}: T={optimal_T:.3f}, ECE={result.fun:.4f}")
        
        return optimal_T
    
    def scale_confidence(self, logit: float, model_name: str) -> float:
        """Apply temperature scaling to a single confidence score."""
        T = self.temperatures.get(model_name, 1.0)
        clipped = np.clip(logit, self.min_logit, self.max_logit)
        scaled = clipped / max(T, 0.1)
        prob = 1.0 / (1.0 + np.exp(-scaled))  # Sigmoid
        return float(np.clip(prob, 0.001, 0.999))
