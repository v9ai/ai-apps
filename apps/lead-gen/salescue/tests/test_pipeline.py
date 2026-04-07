"""Tests for salescue.pipeline — HF pipeline() integration."""

import pytest

from salescue.pipeline import pipeline, PIPELINE_REGISTRY, _SalesCuePipeline


class TestPipelineRegistry:
    def test_registry_has_aliases(self):
        assert "sales-scoring" in PIPELINE_REGISTRY
        assert "buying-intent" in PIPELINE_REGISTRY
        assert "spam-detection" in PIPELINE_REGISTRY

    def test_aliases_map_to_module_names(self):
        assert PIPELINE_REGISTRY["sales-scoring"] == "score"
        assert PIPELINE_REGISTRY["buying-intent"] == "intent"
        assert PIPELINE_REGISTRY["spam-detection"] == "spam"
        assert PIPELINE_REGISTRY["sales-ner"] == "entities"


class TestPipeline:
    def test_create_by_module_name(self):
        pipe = pipeline("spam")
        assert isinstance(pipe, _SalesCuePipeline)
        assert pipe.name == "spam"

    def test_create_by_alias(self):
        pipe = pipeline("spam-detection")
        assert isinstance(pipe, _SalesCuePipeline)
        assert pipe.name == "spam"

    def test_unknown_task_raises(self):
        with pytest.raises(ValueError, match="Unknown task"):
            pipeline("nonexistent-task")

    def test_single_prediction(self, encoder_loaded):
        pipe = pipeline("spam")
        result = pipe("test email")
        assert isinstance(result, dict)
        assert "spam_score" in result

    def test_batch_prediction(self, encoder_loaded):
        pipe = pipeline("spam")
        results = pipe(["email 1", "email 2"])
        assert isinstance(results, list)
        assert len(results) == 2
        assert "spam_score" in results[0]

    def test_repr(self):
        pipe = pipeline("spam")
        r = repr(pipe)
        assert "SalesCuePipeline" in r
        assert "spam" in r
