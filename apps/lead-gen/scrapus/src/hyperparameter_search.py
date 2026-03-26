# File: scrapus/module-3-entity-resolution/hyperparameter_search.py
"""
Optuna-based hyperparameter optimization for M1.
Searches: learning rate, warmup steps, epochs, batch size.
"""

import optuna
from optuna.trial import Trial
from optuna.samplers import TPESampler
from optuna.pruners import MedianPruner
import logging
from typing import List, Tuple
import json
from pathlib import Path

logger = logging.getLogger(__name__)


class EntityMatchingObjective:
    """Optuna objective function for entity matching."""
    
    def __init__(
        self,
        train_pairs: List[Tuple[str, str]],
        train_labels: List[int],
        val_pairs: List[Tuple[str, str]],
        val_labels: List[int],
        test_pairs: List[Tuple[str, str]],
        test_labels: List[int],
        trainer_class,
        output_dir: str = "scrapus_data/hpo"
    ):
        self.train_pairs = train_pairs
        self.train_labels = train_labels
        self.val_pairs = val_pairs
        self.val_labels = val_labels
        self.test_pairs = test_pairs
        self.test_labels = test_labels
        self.trainer_class = trainer_class
        self.output_dir = Path(output_dir)
        self.output_dir.mkdir(parents=True, exist_ok=True)
    
    def __call__(self, trial: Trial) -> float:
        """Objective function: minimize validation loss."""
        
        # Hyperparameters to tune
        learning_rate = trial.suggest_float('learning_rate', 1e-5, 1e-3, log=True)
        warmup_steps = trial.suggest_int('warmup_steps', 100, 2000, step=100)
        epochs = trial.suggest_int('epochs', 3, 30, step=1)
        batch_size = trial.suggest_categorical('batch_size', [8, 16, 32])
        gradient_accumulation = trial.suggest_categorical('gradient_accumulation', [2, 4, 8])
        weight_decay = trial.suggest_float('weight_decay', 1e-5, 1e-1, log=True)
        
        logger.info(f"Trial {trial.number}: LR={learning_rate:.2e}, "
                   f"warmup={warmup_steps}, epochs={epochs}, "
                   f"batch_size={batch_size}")
        
        try:
            # Initialize trainer
            trainer = self.trainer_class(
                output_dir=str(self.output_dir / f"trial_{trial.number}")
            )
            
            # Train
            history = trainer.train(
                train_pairs=self.train_pairs,
                train_labels=self.train_labels,
                val_pairs=self.val_pairs,
                val_labels=self.val_labels,
                batch_size=batch_size,
                gradient_accumulation_steps=gradient_accumulation,
                epochs=epochs,
                learning_rate=learning_rate,
                warmup_steps=warmup_steps,
                weight_decay=weight_decay,
                early_stopping_patience=3
            )
            
            # Report intermediate values for pruning
            for epoch, val_loss in enumerate(history['val_loss']):
                trial.report(val_loss, step=epoch)
                
                # Prune if not promising
                if trial.should_prune():
                    logger.info(f"Trial pruned at epoch {epoch}")
                    raise optuna.TrialPruned()
            
            # Return best validation loss
            best_val_loss = min(history['val_loss'])
            
            # Save trial results
            results = {
                'trial_number': trial.number,
                'params': trial.params,
                'best_val_loss': float(best_val_loss),
                'history': {
                    'train_loss': history['train_loss'],
                    'val_loss': history['val_loss'],
                }
            }
            
            with open(self.output_dir / f"trial_{trial.number}_results.json", 'w') as f:
                json.dump(results, f, indent=2)
            
            return best_val_loss
        
        except Exception as e:
            logger.error(f"Trial {trial.number} failed: {e}")
            raise optuna.TrialError()


def run_hyperparameter_search(
    train_pairs: List[Tuple[str, str]],
    train_labels: List[int],
    val_pairs: List[Tuple[str, str]],
    val_labels: List[int],
    test_pairs: List[Tuple[str, str]],
    test_labels: List[int],
    trainer_class,
    n_trials: int = 20,
    output_dir: str = "scrapus_data/hpo"
):
    """
    Run hyperparameter optimization with Optuna.
    
    Uses M1-friendly settings:
    - TPESampler: Bayesian optimization
    - MedianPruner: Prune unpromising trials early
    """
    
    # Create objective
    objective = EntityMatchingObjective(
        train_pairs, train_labels,
        val_pairs, val_labels,
        test_pairs, test_labels,
        trainer_class,
        output_dir
    )
    
    # Create study
    sampler = TPESampler(
        n_startup_trials=5,
        seed=42
    )
    
    pruner = MedianPruner(
        n_startup_trials=3,
        n_warmup_trials=2
    )
    
    study = optuna.create_study(
        direction='minimize',
        sampler=sampler,
        pruner=pruner
    )
    
    # Optimize
    logger.info(f"Starting hyperparameter search: {n_trials} trials")
    study.optimize(
        objective,
        n_trials=n_trials,
        show_progress_bar=True,
        gc_after_trial=True  # Important for M1 memory management
    )
    
    # Print results
    logger.info("\n" + "="*60)
    logger.info("HYPERPARAMETER OPTIMIZATION RESULTS")
    logger.info("="*60)
    
    best_trial = study.best_trial
    logger.info(f"\nBest Trial: #{best_trial.number}")
    logger.info(f"Best Value: {best_trial.value:.4f}")
    logger.info("\nBest Parameters:")
    for key, value in best_trial.params.items():
        logger.info(f"  {key}: {value}")
    
    # Save study results
    study_results = {
        'best_trial_number': best_trial.number,
        'best_value': float(best_trial.value),
        'best_params': best_trial.params,
        'all_trials': [
            {
                'number': t.number,
                'value': float(t.value) if t.value is not None else None,
                'params': t.params
            }
            for t in study.trials
        ]
    }
    
    with open(Path(output_dir) / "study_results.json", 'w') as f:
        json.dump(study_results, f, indent=2)
    
    return study
