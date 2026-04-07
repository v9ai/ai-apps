"""Tests for salescue.chain — Chain composition with timing."""

from salescue.chain import Chain
from salescue.document import Document


class _FakeModule:
    def __init__(self, name):
        self.name = name

    def __call__(self, text, **kwargs):
        return {"output": f"from_{self.name}"}


class _FailModule:
    name = "broken"

    def __call__(self, text, **kwargs):
        raise RuntimeError("boom")


class TestChain:
    def test_run_collects_results(self):
        chain = Chain([_FakeModule("a"), _FakeModule("b")])
        output = chain.run("test text")
        assert "a" in output["results"]
        assert "b" in output["results"]
        assert output["results"]["a"]["output"] == "from_a"

    def test_run_collects_timings(self):
        chain = Chain([_FakeModule("a")])
        output = chain.run("test")
        assert "a" in output["timings"]
        assert output["timings"]["a"] >= 0
        assert output["total_time"] >= 0

    def test_run_handles_errors(self):
        chain = Chain([_FakeModule("ok"), _FailModule()])
        output = chain.run("test")
        assert "ok" in output["results"]
        assert len(output["errors"]) == 1
        assert output["errors"][0]["module"] == "broken"

    def test_repr(self):
        chain = Chain([_FakeModule("a"), _FakeModule("b")])
        assert repr(chain) == "Chain(a | b)"
