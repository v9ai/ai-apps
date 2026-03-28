# ML Improvement Loop — Ralph Loop for Model Quality

> Iterative eval-diagnose-improve-test loop for ML components. Claude works on the same task repeatedly, seeing prior metrics until convergence.

## Role

You are the **ML Loop Operator** — you run an iterative improvement loop over the Rust ML pipeline. Each iteration: measure model quality, diagnose the weakest component, apply an optimization, re-measure, and repeat.

## Commands

| Invocation | Action |
|---|---|
| `/ml-loop` | Full auto loop (max 10 iterations, all components) |
| `/ml-loop scoring` | Focus on ICP weight optimization only |
| `/ml-loop thresholds` | Focus on threshold tuning only |
| `/ml-loop datagen` | Generate training data only (no loop) |
| `/ml-loop status` | Show metrics dashboard from latest report |

## State File

`~/.claude/state/ml-loop-state.json`

```json
{
  "version": 1,
  "iteration": 0,
  "max_iterations": 10,
  "convergence_threshold": 0.01,
  "consecutive_no_improvement": 0,
  "phase": "INITIALIZING",
  "history": [],
  "current_best": {}
}
```

## Paths

| Path | Purpose |
|---|---|
| `crates/metal/data/eval_labels.jsonl` | Labeled training data |
| `crates/metal/data/reports/eval_iter_N.json` | Per-iteration eval reports |
| `crates/metal/data/models/icp_weights.json` | Optimized ICP weights |
| `crates/metal/data/models/logistic_scorer.json` | Trained LogisticScorer |
| `crates/metal/src/kernel/scoring.rs` | IcpProfile, LogisticScorer, IsotonicCalibrator |
| `crates/metal/src/kernel/ml_eval.rs` | Eval harness (metrics) |
| `crates/metal/src/kernel/weight_optimizer.rs` | Grid search + SGD + calibration |
| `crates/metal/src/kernel/data_gen.rs` | Training data generator |

## Process — Full Loop (`/ml-loop`)

### 0. Bootstrap (first run only)

If `crates/metal/data/eval_labels.jsonl` does not exist or has < 50 lines:

```bash
make ml-datagen
```

This generates ~330 labeled samples (200 positive, 130 hard negatives).

Initialize state:
```json
{
  "version": 1,
  "iteration": 0,
  "max_iterations": 10,
  "convergence_threshold": 0.01,
  "consecutive_no_improvement": 0,
  "phase": "INITIALIZING",
  "history": [],
  "current_best": {}
}
```

### 1. Evaluate

```bash
make ml-eval
```

Parse the latest `eval_iter_N.json` from `crates/metal/data/reports/`. Extract:
- `scoring.f1`, `scoring.precision`, `scoring.recall`, `scoring.auc_roc`
- `scoring.weights`, `scoring.bias`, `scoring.threshold`

### 2. Diagnose

Rank components by improvement potential:

```
icp_scoring_priority  = (1.0 - f1) * (sample_count / 100.0).min(1.0)
threshold_priority    = abs(precision - recall) * 0.5
calibration_priority  = (1.0 - auc_roc) * 0.4
```

Pick the highest-priority component. If multiple are tied, prefer: `icp_scoring` > `threshold` > `calibration`.

### 3. Improve

Based on target:

**icp_scoring** (weights need learning):
```bash
make ml-optimize
```
Runs grid search (4^6 = 4096 combos) + SGD refinement + isotonic calibration. Writes best weights to `crates/metal/data/models/`.

**threshold** (precision-recall imbalanced):
The optimizer already includes threshold sweep. If targeting threshold only, run `make ml-optimize` and read the `best_threshold` from output.

**calibration** (raw scores poorly calibrated):
Run `make ml-optimize` — isotonic calibration is part of the pipeline.

### 4. Test

```bash
make ml-eval
```

Parse new eval report. Compare against prior iteration.

### 5. Assess Convergence

```python
delta_f1 = new_f1 - old_f1

if delta_f1 > convergence_threshold:
    phase = "IMPROVING"
    consecutive_no_improvement = 0
elif delta_f1 >= -0.05:
    phase = "PLATEAU"
    consecutive_no_improvement += 1
else:
    phase = "DEGRADED"
    # STOP — revert to best known weights
```

**Stop conditions** (any triggers exit):
1. `consecutive_no_improvement >= 2` → CONVERGED
2. `iteration >= max_iterations` → BUDGET_EXHAUSTED
3. Any component F1 drops > 5% from best-ever → DEGRADED (revert)

### 6. Update State

Write to `~/.claude/state/ml-loop-state.json`:

```json
{
  "iteration": N,
  "phase": "IMPROVING|PLATEAU|CONVERGED|DEGRADED|BUDGET_EXHAUSTED",
  "history": [
    {
      "iteration": 1,
      "component": "icp_scoring",
      "action": "grid_search_sgd_calibrate",
      "metrics_before": {"f1": 0.62, "precision": 0.71, "recall": 0.55, "auc_roc": 0.68},
      "metrics_after": {"f1": 0.74, "precision": 0.78, "recall": 0.71, "auc_roc": 0.81},
      "delta_f1": 0.12
    }
  ],
  "current_best": {
    "f1": 0.74,
    "weights_path": "crates/metal/data/models/icp_weights.json",
    "scorer_path": "crates/metal/data/models/logistic_scorer.json"
  }
}
```

### 7. Loop or Exit

- If phase is `IMPROVING` or `PLATEAU` with `consecutive_no_improvement < 2`: go to step 1
- Otherwise: print final summary and exit

## Process — Single Commands

### `/ml-loop datagen`

```bash
make ml-datagen
```

Report sample count and class balance.

### `/ml-loop status`

```bash
make ml-report
```

Also read `~/.claude/state/ml-loop-state.json` and show:
- Current iteration and phase
- Best F1 achieved
- History of improvements
- Convergence status

### `/ml-loop scoring`

Run the full loop but skip threshold/calibration diagnosis — always target `icp_scoring`.

### `/ml-loop thresholds`

Run the full loop but skip weight optimization — only sweep thresholds.

## Output Format

After each iteration, report:

```
=== ML Loop Iteration {N} ===
Target:    {component}
Action:    {action_taken}
F1:        {old_f1:.3} → {new_f1:.3} (Δ{delta:+.3})
Precision: {old_p:.3} → {new_p:.3}
Recall:    {old_r:.3} → {new_r:.3}
AUC-ROC:   {old_auc:.3} → {new_auc:.3}
Phase:     {phase}
```

After loop completes:

```
=== ML Loop Complete ===
Iterations: {N}
Phase:      {final_phase}
Best F1:    {best_f1:.3}
Weights:    {weights_path}
Scorer:     {scorer_path}
```

## Safety

- Never overwrite `eval_labels.jsonl` without backing up first
- Keep all eval reports (never delete `eval_iter_*.json`)
- On DEGRADED, revert by copying best known model files back
- Max 3 weight changes per loop (grid search counts as 1)
- Always run `cargo test --lib --features kernel-eval` after modifying Rust code
