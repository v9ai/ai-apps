# File: scrapus/module-3-entity-resolution/data_augmentation.py
"""
Ditto-style data augmentation for entity matching.
Generates synthetic negative pairs via:
  - String transposition
  - Abbreviation/expansion
  - Field deletion
  - Attribute shuffling
"""

import random
import string
from typing import Dict, Tuple, List
from dataclasses import dataclass

@dataclass
class EntityPair:
    entity1: Dict[str, str]
    entity2: Dict[str, str]
    label: int  # 1 = match, 0 = non-match


class DittoAugmenter:
    """Data augmentation via Ditto techniques."""
    
    def __init__(self, seed: int = 42):
        random.seed(seed)
        self.abbreviations = {
            'incorporated': ['inc.', 'inc', 'corp.'],
            'limited': ['ltd.', 'ltd', 'llc'],
            'gmbh': ['gmbh', 'g.m.b.h'],
            'corporation': ['corp.', 'corp'],
            'company': ['co.', 'co', 'co.,ltd'],
            'group': ['grp.', 'grp'],
        }
    
    def transpose_chars(self, text: str, prob: float = 0.15) -> str:
        """Randomly transpose adjacent characters."""
        chars = list(text)
        for i in range(len(chars) - 1):
            if random.random() < prob and chars[i].isalpha():
                chars[i], chars[i+1] = chars[i+1], chars[i]
        return ''.join(chars)
    
    def abbreviate(self, text: str, prob: float = 0.2) -> str:
        """Replace words with common abbreviations."""
        text_lower = text.lower()
        for word, abbrevs in self.abbreviations.items():
            if word in text_lower and random.random() < prob:
                return text.replace(
                    word, random.choice(abbrevs), 1
                ).replace(
                    word.upper(), random.choice(abbrevs).upper(), 1
                )
        return text
    
    def delete_field(self, entity: Dict[str, str], prob: float = 0.3) -> Dict[str, str]:
        """Randomly delete a field value."""
        aug_entity = entity.copy()
        for field in ['location', 'industry', 'description']:
            if field in aug_entity and random.random() < prob:
                aug_entity[field] = ""
        return aug_entity
    
    def shuffle_attributes(self, entity: Dict[str, str], prob: float = 0.1) -> Dict[str, str]:
        """Randomly reorder attributes."""
        if random.random() > prob:
            return entity
        
        aug_entity = entity.copy()
        fields = [f for f in ['name', 'location', 'industry'] if f in aug_entity]
        random.shuffle(fields)
        return {f: aug_entity[f] for f in fields if aug_entity[f]}
    
    def augment_entity(self, entity: Dict[str, str]) -> Dict[str, str]:
        """Apply random augmentation chain."""
        aug = entity.copy()
        
        # Apply transformations with probability
        if 'name' in aug and random.random() < 0.3:
            aug['name'] = self.transpose_chars(aug['name'])
        if 'name' in aug and random.random() < 0.2:
            aug['name'] = self.abbreviate(aug['name'])
        
        # Field deletion and shuffling
        aug = self.delete_field(aug)
        aug = self.shuffle_attributes(aug)
        
        return aug
    
    def generate_hard_negatives(
        self,
        entity: Dict[str, str],
        candidates: List[Dict[str, str]],
        num_negatives: int = 3
    ) -> List[Dict[str, str]]:
        """
        Generate hard negatives from candidates.
        Hard negatives: entities from same industry but different company.
        """
        same_industry = [
            c for c in candidates
            if c.get('industry') == entity.get('industry')
            and c.get('name') != entity.get('name')
        ]
        
        if not same_industry:
            return random.sample(candidates, min(num_negatives, len(candidates)))
        
        return random.sample(same_industry, min(num_negatives, len(same_industry)))
    
    def create_training_pairs(
        self,
        positive_pairs: List[Tuple[Dict, Dict]],
        negative_pairs: List[Tuple[Dict, Dict]],
        augmentation_ratio: float = 2.0
    ) -> List[EntityPair]:
        """
        Create training dataset with augmentation.
        
        Args:
            positive_pairs: List of (entity1, entity2) tuples where entity1 == entity2
            negative_pairs: List of (entity1, entity2) tuples where entity1 != entity2
            augmentation_ratio: How many augmented versions per original pair
        
        Returns:
            List of EntityPair instances ready for training
        """
        training_pairs = []
        
        # Add original positive pairs
        for e1, e2 in positive_pairs:
            training_pairs.append(EntityPair(e1, e2, label=1))
        
        # Add augmented positive pairs
        for e1, e2 in positive_pairs:
            for _ in range(int(augmentation_ratio)):
                aug_e1 = self.augment_entity(e1)
                aug_e2 = self.augment_entity(e2)
                training_pairs.append(EntityPair(aug_e1, aug_e2, label=1))
        
        # Add original negative pairs
        for e1, e2 in negative_pairs:
            training_pairs.append(EntityPair(e1, e2, label=0))
        
        # Add augmented negative pairs (less than positives to maintain balance)
        for e1, e2 in negative_pairs:
            for _ in range(int(augmentation_ratio * 0.7)):
                aug_e1 = self.augment_entity(e1)
                aug_e2 = self.augment_entity(e2)
                training_pairs.append(EntityPair(aug_e1, aug_e2, label=0))
        
        random.shuffle(training_pairs)
        return training_pairs


def entity_to_text(entity: Dict[str, str], sep: str = " | ") -> str:
    """
    Convert entity dict to Ditto-style text format.
    
    Format: NAME: value | LOCATION: value | INDUSTRY: value
    """
    parts = []
    for field in ['name', 'location', 'industry']:
        if field in entity and entity[field]:
            parts.append(f"{field.upper()}: {entity[field]}")
    return sep.join(parts)


def format_matching_pair(
    entity1: Dict[str, str],
    entity2: Dict[str, str],
    format_type: str = 'ditto'
) -> Tuple[str, str]:
    """Format entity pair for sentence-transformers."""
    if format_type == 'ditto':
        return entity_to_text(entity1), entity_to_text(entity2)
    elif format_type == 'concat':
        # Concatenate all fields
        text1 = ' '.join(str(v) for v in entity1.values() if v)
        text2 = ' '.join(str(v) for v in entity2.values() if v)
        return text1, text2
    else:
        return entity_to_text(entity1), entity_to_text(entity2)
