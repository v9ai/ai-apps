"""Tests for salescue.data — sample datasets and column mappings."""

import pytest

from salescue.data import (
    sample_dataset,
    column_mapping,
    COLUMN_MAPPINGS,
    _SAMPLE_GENERATORS,
)


class TestSampleDataset:
    def test_all_modules_have_samples(self):
        for name in _SAMPLE_GENERATORS:
            samples = sample_dataset(name)
            assert len(samples) > 0, f"{name} has empty samples"

    def test_unknown_module_raises(self):
        with pytest.raises(ValueError, match="No sample data"):
            sample_dataset("nonexistent")

    def test_score_samples_schema(self):
        samples = sample_dataset("score")
        for s in samples:
            assert "text" in s
            assert "label" in s
            assert "score" in s
            assert s["label"] in ("hot", "warm", "cold", "disqualified")
            assert 0 <= s["score"] <= 100

    def test_intent_samples_schema(self):
        for s in sample_dataset("intent"):
            assert "text" in s
            assert "stage" in s

    def test_reply_samples_have_labels_list(self):
        for s in sample_dataset("reply"):
            assert "text" in s
            assert isinstance(s["labels"], list)
            assert len(s["labels"]) >= 1

    def test_entities_samples_have_spans(self):
        for s in sample_dataset("entities"):
            assert "text" in s
            assert isinstance(s["entities"], list)
            for ent in s["entities"]:
                assert "type" in ent
                assert "start" in ent
                assert "end" in ent
                assert "text" in ent

    def test_call_samples_have_transcript(self):
        for s in sample_dataset("call"):
            assert "transcript" in s
            assert isinstance(s["transcript"], list)
            for turn in s["transcript"]:
                assert "speaker" in turn
                assert "text" in turn

    def test_subject_samples_have_pairs(self):
        for s in sample_dataset("subject"):
            assert "subject_a" in s
            assert "subject_b" in s
            assert s["winner"] in ("a", "b")


class TestColumnMapping:
    def test_all_modules_have_mappings(self):
        for name in COLUMN_MAPPINGS:
            mapping = column_mapping(name)
            assert isinstance(mapping, dict)
            assert len(mapping) > 0

    def test_unknown_module_raises(self):
        with pytest.raises(ValueError, match="No column mapping"):
            column_mapping("nonexistent")

    def test_all_mappings_include_text_column(self):
        text_modules = ["score", "intent", "reply", "entities", "triggers",
                        "objection", "sentiment", "spam"]
        for name in text_modules:
            mapping = column_mapping(name)
            assert "text" in mapping, f"{name} mapping missing 'text'"

    def test_sample_data_matches_column_mapping(self):
        """Every sample dataset should have keys matching the column mapping values."""
        for name in _SAMPLE_GENERATORS:
            if name not in COLUMN_MAPPINGS:
                continue
            mapping = column_mapping(name)
            samples = sample_dataset(name)
            sample_keys = set(samples[0].keys())
            mapping_values = set(mapping.values())
            assert mapping_values.issubset(sample_keys), (
                f"{name}: mapping values {mapping_values - sample_keys} "
                f"not in sample keys {sample_keys}"
            )
