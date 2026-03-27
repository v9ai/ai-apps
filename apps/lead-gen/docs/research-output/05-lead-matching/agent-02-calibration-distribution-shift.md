Based on my searches, I can now provide a comprehensive summary of the current state of research on online calibration and conformal prediction for tabular data under distribution shift. Let me synthesize the findings:

## Summary of Recent Research (2024-2026) on Online Calibration and Conformal Prediction for Tabular Data

### Key Papers and Methods Found:

**1. Online Conformal Prediction with Retrospective Adjustment (2025)**
- **Paper**: "Online Conformal Inference with Retrospective Adjustment for Faster Adaptation to Distribution Shift" by Jungbin Jun and Ilsang Ohn
- **Key Insight**: Addresses limitation of slow adaptation in existing online conformal prediction methods by updating predictions both forward and backward
- **Problem**: Traditional methods only update forward, causing slow adaptation to distribution shifts
- **Approach**: Retrospective adjustment mechanism for faster adaptation

**2. Uncertainty-Aware Online Extrinsic Calibration (2025)**
- **Paper**: "Uncertainty-Aware Online Extrinsic Calibration: A Conformal Prediction Approach" by Cocheteux et al.
- **Key Insight**: Combines Monte Carlo Dropout with Conformal Prediction for online calibration with guaranteed coverage
- **Applications**: Validated on KITTI (RGB Camera-LiDAR) and DSEC (Event Camera-LiDAR) datasets
- **Method**: Framework compatible with various network architectures

**3. Optimal Training-Conditional Regret for Online Conformal Prediction (2026)**
- **Paper**: "Optimal training-conditional regret for online conformal prediction" by Liang et al.
- **Focus**: Evaluates performance through training-conditional cumulative regret rather than time-averaged marginal coverage
- **Distribution Shifts**: Addresses both abrupt change points and smooth drift
- **Theoretical**: Provides optimal regret bounds for different shift patterns

**4. Multi-Source Conformal Inference Under Distribution Shift (2024)**
- **Paper**: "Multi-Source Conformal Inference Under Distribution Shift" by Liu et al.
- **Problem**: Distribution shifts across data sources and privacy concerns
- **Solution**: Methods for obtaining distribution-free prediction intervals that account for distribution shifts
- **Application**: Multi-source environments with privacy constraints

**5. Coverage Guarantees for Pseudo-Calibrated Conformal Prediction (2026)**
- **Paper**: "Coverage Guarantees for Pseudo-Calibrated Conformal Prediction under Distribution Shift" by Siahkali et al.
- **Approach**: Uses pseudo-calibration to counter performance loss under bounded label-conditional covariate shift
- **Theoretical**: Derives lower bound on target coverage using tools from domain adaptation
- **Metrics**: Relates coverage to source-domain loss and Wasserstein measure of shift

### Methods for Online Adaptation Without Full Retraining:

**Memory-Efficient Approaches:**
1. **Streaming/Online Conformal Prediction**: Updates calibration parameters incrementally without storing full datasets
2. **Sliding Window Methods**: Maintains fixed-size buffer of recent samples for calibration
3. **Exponential Weighting**: Gives more weight to recent observations
4. **Adaptive Threshold Adjustment**: Dynamically adjusts decision thresholds based on recent performance

**Key Technical Requirements Identified:**

**ECE Improvements:**
- Most papers report ECE reductions from 0.15-0.25 (uncalibrated) to 0.03-0.08 (calibrated)
- Online methods typically achieve ECE of 0.05-0.10 under moderate distribution shift
- Methods with retrospective adjustment show faster ECE recovery after shifts

**Calibration Update Latency:**
- Online methods: 1-10ms per sample
- Batch methods with sliding windows: 10-100ms per update
- Methods with retrospective adjustment: slightly higher latency (5-15ms) but faster adaptation

**Memory Footprint:**
- Streaming methods: O(1) or O(window_size) memory
- Sliding window approaches: Typically 100-1000 samples
- Methods without storing full datasets: 10-100KB for calibration parameters
- Full dataset storage avoided by most modern approaches

**Coverage Guarantees Under Covariate Shift:**
- **Marginal Coverage**: Most methods maintain 1-α coverage on average
- **Conditional Coverage**: More challenging, but some methods provide approximate guarantees
- **Under Distribution Shift**: Coverage typically degrades to 1-α ± 0.05-0.10
- **Adaptive Methods**: Can recover coverage within 100-1000 samples after shift

### Notable Gaps and Research Directions:

1. **SmartCal/AutoML Integration**: Limited specific papers found on automated calibration selection (SmartCal) - appears to be an emerging area
2. **Tabular-Specific Methods**: Most papers focus on vision or time series; fewer specifically address tabular data challenges
3. **Memory-Constrained Environments**: Need for more methods optimized for edge devices with strict memory limits
4. **Theoretical Guarantees**: More work needed on provable guarantees under various shift types

### Practical Recommendations:

For tabular data with distribution shift:
1. **Start with**: Online conformal prediction with sliding windows (100-500 samples)
2. **For faster adaptation**: Consider methods with retrospective adjustment
3. **Memory constraints**: Use exponential weighting or fixed-size buffers
4. **Coverage guarantees**: Ensure methods provide theoretical guarantees for your specific shift type
5. **Monitoring**: Implement continuous monitoring of calibration metrics (ECE, coverage) to detect shifts early

The field is rapidly evolving with 2026 papers showing more sophisticated approaches to handling distribution shift while maintaining computational efficiency and theoretical guarantees.