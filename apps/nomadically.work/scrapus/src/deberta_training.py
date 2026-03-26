# File: scrapus/module-3-entity-resolution/training.py
"""
DeBERTa adapter fine-tuning for entity matching.
Uses sentence-transformers with CosineSimilarityLoss for M1.
"""

import torch
import torch.nn as nn
from torch.utils.data import Dataset, DataLoader
from sentence_transformers import SentenceTransformer, losses, models
from sentence_transformers.losses import CosineSimilarityLoss
import numpy as np
from typing import List, Tuple, Dict
import logging
from pathlib import Path
import json

logger = logging.getLogger(__name__)


class EntityMatchingDataset(Dataset):
    """PyTorch Dataset for entity matching pairs."""
    
    def __init__(
        self,
        pairs: List[Tuple[str, str]],
        labels: List[int],
        tokenizer,
        max_length: int = 512
    ):
        self.pairs = pairs
        self.labels = labels
        self.tokenizer = tokenizer
        self.max_length = max_length
    
    def __len__(self) -> int:
        return len(self.pairs)
    
    def __getitem__(self, idx: int) -> Dict:
        text1, text2 = self.pairs[idx]
        label = self.labels[idx]
        
        # Encode both texts
        inputs1 = self.tokenizer(
            text1,
            max_length=self.max_length,
            padding='max_length',
            truncation=True,
            return_tensors='pt'
        )
        
        inputs2 = self.tokenizer(
            text2,
            max_length=self.max_length,
            padding='max_length',
            truncation=True,
            return_tensors='pt'
        )
        
        return {
            'input_ids_1': inputs1['input_ids'].squeeze(0),
            'attention_mask_1': inputs1['attention_mask'].squeeze(0),
            'input_ids_2': inputs2['input_ids'].squeeze(0),
            'attention_mask_2': inputs2['attention_mask'].squeeze(0),
            'label': torch.tensor(label, dtype=torch.float32)
        }


class M1AdapterTrainer:
    """
    Fine-tune DeBERTa adapter on M1 with:
    - batch_size=16
    - gradient_accumulation=4
    - FP16 mixed precision via MPS
    - LoRA/adapter layers only
    """
    
    def __init__(
        self,
        model_name: str = "microsoft/deberta-v3-base",
        adapter_name: str = "entity_matching",
        output_dir: str = "scrapus_data/adapters",
        device: str = "mps",  # M1 Metal Performance Shaders
        fp16: bool = True
    ):
        self.model_name = model_name
        self.adapter_name = adapter_name
        self.output_dir = Path(output_dir)
        self.device = device
        self.fp16 = fp16
        
        # Create output directory
        self.output_dir.mkdir(parents=True, exist_ok=True)
        
        # Load base model
        logger.info(f"Loading model: {model_name}")
        self.model = SentenceTransformer(model_name)
        
        # Move to M1 device
        self.model = self.model.to(device)
        
        # Count trainable parameters
        self._log_model_params()
    
    def _log_model_params(self):
        """Log trainable vs frozen parameters."""
        total = sum(p.numel() for p in self.model.parameters())
        trainable = sum(p.numel() for p in self.model.parameters() if p.requires_grad)
        
        logger.info(f"Total parameters: {total:,}")
        logger.info(f"Trainable parameters: {trainable:,} ({100*trainable/total:.1f}%)")
    
    def add_adapter_layers(self, hidden_dim: int = 256):
        """Add lightweight adapter layers to DeBERTa base."""
        # Access the pooling layer and sentence embedding model
        sentence_embedding_dimension = self.model.get_sentence_embedding_dimension()
        
        # Create adapter layer (2-layer bottleneck)
        adapter = nn.Sequential(
            nn.Linear(sentence_embedding_dimension, hidden_dim),
            nn.GELU(),
            nn.Linear(hidden_dim, sentence_embedding_dimension),
        )
        
        # Store original projection
        self._original_sentence_embedding_projection = \
            self.model[-1]  # Dense layer
        
        # Replace with adapter
        self.model[-1] = adapter
        self.model = self.model.to(self.device)
        
        adapter_params = sum(p.numel() for p in adapter.parameters())
        logger.info(f"Adapter parameters: {adapter_params:,} (~{adapter_params/1e6:.1f}MB)")
    
    def freeze_base_model(self):
        """Freeze all layers except adapter."""
        # Freeze all encoder layers
        for name, param in self.model.named_parameters():
            if 'adapter' not in name.lower() and \
               name != f"{len(self.model)-1}" and \
               'dense' not in name.lower():
                param.requires_grad = False
        
        trainable = sum(p.numel() for p in self.model.parameters() if p.requires_grad)
        logger.info(f"After freezing: {trainable:,} trainable parameters")
    
    def train(
        self,
        train_pairs: List[Tuple[str, str]],
        train_labels: List[int],
        val_pairs: List[Tuple[str, str]],
        val_labels: List[int],
        batch_size: int = 16,
        gradient_accumulation_steps: int = 4,
        epochs: int = 20,
        learning_rate: float = 1e-4,
        warmup_steps: int = 500,
        weight_decay: float = 0.01,
        early_stopping_patience: int = 5,
    ):
        """
        Train adapter with M1-specific optimizations.
        
        Args:
            batch_size: M1 sweet spot is 16
            gradient_accumulation_steps: Effective batch = 16 * 4 = 64
            warmup_steps: Linear warmup for stability
            learning_rate: Lower for adapter fine-tuning
        """
        
        logger.info("Starting training loop...")
        logger.info(f"  Batch size: {batch_size}")
        logger.info(f"  Gradient accumulation: {gradient_accumulation_steps}")
        logger.info(f"  Effective batch size: {batch_size * gradient_accumulation_steps}")
        logger.info(f"  Learning rate: {learning_rate}")
        logger.info(f"  FP16: {self.fp16}")
        
        # Create datasets
        train_dataset = EntityMatchingDataset(
            train_pairs, train_labels,
            self.model[0].auto_model.tokenizer,
            max_length=512
        )
        
        val_dataset = EntityMatchingDataset(
            val_pairs, val_labels,
            self.model[0].auto_model.tokenizer,
            max_length=512
        )
        
        train_loader = DataLoader(
            train_dataset,
            batch_size=batch_size,
            shuffle=True,
            pin_memory=True,  # Faster data loading
            num_workers=0     # M1 works better with single process
        )
        
        val_loader = DataLoader(
            val_dataset,
            batch_size=batch_size,
            shuffle=False,
            num_workers=0
        )
        
        # Setup optimizer
        optimizer = torch.optim.AdamW(
            self.model.parameters(),
            lr=learning_rate,
            weight_decay=weight_decay,
            eps=1e-8
        )
        
        # Setup loss function
        loss_fn = CosineSimilarityLoss(
            model=self.model,
            sentence_embedding_dimension=self.model.get_sentence_embedding_dimension()
        )
        
        # Warmup schedule
        total_steps = len(train_loader) * epochs // gradient_accumulation_steps
        
        def lr_lambda(current_step):
            if current_step < warmup_steps:
                return float(current_step) / float(max(1, warmup_steps))
            return max(0.0, float(total_steps - current_step) / 
                      float(max(1, total_steps - warmup_steps)))
        
        scheduler = torch.optim.lr_scheduler.LambdaLR(optimizer, lr_lambda)
        
        # Training loop
        best_val_loss = float('inf')
        patience_counter = 0
        training_history = {
            'train_loss': [],
            'val_loss': [],
            'learning_rate': [],
            'epoch': []
        }
        
        for epoch in range(epochs):
            # Training phase
            self.model.train()
            train_loss = 0
            
            optimizer.zero_grad()
            
            for batch_idx, batch in enumerate(train_loader):
                # Move batch to device
                batch = {k: v.to(self.device) for k, v in batch.items()}
                
                # Forward pass
                embeddings1 = self.model({
                    'input_ids': batch['input_ids_1'],
                    'attention_mask': batch['attention_mask_1']
                })['sentence_embedding']
                
                embeddings2 = self.model({
                    'input_ids': batch['input_ids_2'],
                    'attention_mask': batch['attention_mask_2']
                })['sentence_embedding']
                
                # Compute cosine similarity
                sim = torch.nn.functional.cosine_similarity(embeddings1, embeddings2)
                
                # Loss: MSE between similarity and label
                loss = torch.nn.functional.mse_loss(sim, batch['label'])
                
                # Gradient accumulation
                loss = loss / gradient_accumulation_steps
                loss.backward()
                
                train_loss += loss.item()
                
                # Update weights every N accumulation steps
                if (batch_idx + 1) % gradient_accumulation_steps == 0:
                    torch.nn.utils.clip_grad_norm_(
                        self.model.parameters(), max_norm=1.0
                    )
                    optimizer.step()
                    scheduler.step()
                    optimizer.zero_grad()
            
            train_loss /= len(train_loader)
            
            # Validation phase
            self.model.eval()
            val_loss = 0
            
            with torch.no_grad():
                for batch in val_loader:
                    batch = {k: v.to(self.device) for k, v in batch.items()}
                    
                    embeddings1 = self.model({
                        'input_ids': batch['input_ids_1'],
                        'attention_mask': batch['attention_mask_1']
                    })['sentence_embedding']
                    
                    embeddings2 = self.model({
                        'input_ids': batch['input_ids_2'],
                        'attention_mask': batch['attention_mask_2']
                    })['sentence_embedding']
                    
                    sim = torch.nn.functional.cosine_similarity(embeddings1, embeddings2)
                    loss = torch.nn.functional.mse_loss(sim, batch['label'])
                    
                    val_loss += loss.item()
            
            val_loss /= len(val_loader)
            
            # Logging
            current_lr = optimizer.param_groups[0]['lr']
            logger.info(
                f"Epoch {epoch+1}/{epochs} | "
                f"Train Loss: {train_loss:.4f} | "
                f"Val Loss: {val_loss:.4f} | "
                f"LR: {current_lr:.2e}"
            )
            
            training_history['epoch'].append(epoch + 1)
            training_history['train_loss'].append(train_loss)
            training_history['val_loss'].append(val_loss)
            training_history['learning_rate'].append(current_lr)
            
            # Early stopping
            if val_loss < best_val_loss:
                best_val_loss = val_loss
                patience_counter = 0
                
                # Save checkpoint
                self._save_checkpoint(epoch + 1)
            else:
                patience_counter += 1
                if patience_counter >= early_stopping_patience:
                    logger.info(
                        f"Early stopping at epoch {epoch+1} "
                        f"(val_loss not improved for {early_stopping_patience} epochs)"
                    )
                    break
        
        # Save final model and history
        self.save_model()
        self._save_history(training_history)
        
        return training_history
    
    def _save_checkpoint(self, epoch: int):
        """Save model checkpoint."""
        checkpoint_dir = self.output_dir / f"checkpoint-epoch{epoch}"
        checkpoint_dir.mkdir(parents=True, exist_ok=True)
        
        self.model.save(str(checkpoint_dir / "sentence_transformer"))
        logger.info(f"Saved checkpoint: {checkpoint_dir}")
    
    def _save_history(self, history: Dict):
        """Save training history."""
        history_file = self.output_dir / "training_history.json"
        
        # Convert numpy values to Python native types
        history_serializable = {
            k: [float(v) for v in vs] for k, vs in history.items()
        }
        
        with open(history_file, 'w') as f:
            json.dump(history_serializable, f, indent=2)
        
        logger.info(f"Saved training history: {history_file}")
    
    def save_model(self):
        """Save adapter weights separately."""
        model_dir = self.output_dir / "final_adapter"
        model_dir.mkdir(parents=True, exist_ok=True)
        
        # Save model
        self.model.save(str(model_dir / "sentence_transformer"))
        
        # Save config
        config = {
            'model_name': self.model_name,
            'adapter_name': self.adapter_name,
            'device': self.device,
            'fp16': self.fp16
        }
        
        with open(model_dir / "config.json", 'w') as f:
            json.dump(config, f, indent=2)
        
        logger.info(f"Saved final model: {model_dir}")
