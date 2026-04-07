"""Tests for salescue.document — Document dataclass and pipe composition."""

import pytest

from salescue.document import Document


class _FakeModule:
    """Minimal module for testing pipe composition."""
    name = "fake"

    def __call__(self, text, **kwargs):
        return {"label": "test", "score": 0.5}


class _FailModule:
    """Module that raises to test error handling."""
    name = "fail"

    def __call__(self, text, **kwargs):
        raise RuntimeError("intentional failure")


class TestDocument:
    def test_init(self):
        doc = Document(text="hello")
        assert doc.text == "hello"
        assert doc.results == {}
        assert doc.errors == []

    def test_pipe_stores_result(self):
        doc = Document(text="test") | _FakeModule()
        assert "fake" in doc.results
        assert doc.results["fake"]["label"] == "test"

    def test_pipe_returns_same_document(self):
        doc = Document(text="test")
        result = doc | _FakeModule()
        assert result is doc

    def test_pipe_chain(self):
        m1 = _FakeModule()
        m1.name = "first"
        m2 = _FakeModule()
        m2.name = "second"
        doc = Document(text="test") | m1 | m2
        assert "first" in doc.results
        assert "second" in doc.results

    def test_pipe_error_handling(self):
        doc = Document(text="test") | _FailModule()
        assert "fail" not in doc.results
        assert len(doc.errors) == 1
        assert doc.errors[0]["module"] == "fail"
        assert "intentional failure" in doc.errors[0]["error"]

    def test_getattr_delegates_to_results(self):
        doc = Document(text="test") | _FakeModule()
        assert doc.fake == {"label": "test", "score": 0.5}

    def test_getattr_missing_module_raises(self):
        doc = Document(text="test")
        with pytest.raises(AttributeError, match="No result for module"):
            _ = doc.nonexistent

    def test_to_dict(self):
        doc = Document(text="hello", metadata={"source": "email"})
        doc = doc | _FakeModule()
        d = doc.to_dict()
        assert d["text"] == "hello"
        assert "fake" in d["results"]
        assert d["metadata"] == {"source": "email"}

    def test_repr(self):
        doc = Document(text="short text")
        r = repr(doc)
        assert "Document" in r
        assert "short text" in r
