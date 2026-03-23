"""Tests for rrf.py — Reciprocal Rank Fusion."""

import pytest

from rrf import reciprocal_rank_fusion


# ---------------------------------------------------------------------------
# Basic fusion
# ---------------------------------------------------------------------------

class TestRRF:
    def _make_list(self, labels: list[str]) -> list[tuple[str, dict, float]]:
        """Create a ranked list from labels. Position = rank."""
        return [
            (label, {"iteration": i, "chunk_index": 0}, float(i))
            for i, label in enumerate(labels)
        ]

    def test_single_list_preserves_order(self):
        ranked = self._make_list(["A", "B", "C"])
        fused = reciprocal_rank_fusion([ranked], k=60)
        assert [doc for doc, _, _ in fused] == ["A", "B", "C"]

    def test_empty_input(self):
        assert reciprocal_rank_fusion([]) == []

    def test_empty_lists(self):
        assert reciprocal_rank_fusion([[], []]) == []

    def test_two_agreeing_lists(self):
        """Two lists with the same order should keep that order."""
        list1 = self._make_list(["A", "B", "C"])
        list2 = self._make_list(["A", "B", "C"])
        fused = reciprocal_rank_fusion([list1, list2], k=60)
        labels = [doc for doc, _, _ in fused]
        assert labels[0] == "A"

    def test_two_disagreeing_lists(self):
        """Doc appearing in both lists should rank higher than one-list-only docs."""
        list1 = [
            ("shared", {"iteration": 0, "chunk_index": 0}, 0.1),
            ("only_dense", {"iteration": 1, "chunk_index": 0}, 0.2),
        ]
        list2 = [
            ("shared", {"iteration": 0, "chunk_index": 0}, 5.0),
            ("only_bm25", {"iteration": 2, "chunk_index": 0}, 3.0),
        ]
        fused = reciprocal_rank_fusion([list1, list2], k=60)
        labels = [doc for doc, _, _ in fused]
        # "shared" appears in both lists so should get the highest RRF score
        assert labels[0] == "shared"

    def test_scores_are_positive(self):
        ranked = self._make_list(["A", "B"])
        fused = reciprocal_rank_fusion([ranked], k=60)
        for _, _, score in fused:
            assert score > 0

    def test_scores_descending(self):
        list1 = self._make_list(["A", "B", "C"])
        list2 = self._make_list(["C", "A", "B"])
        fused = reciprocal_rank_fusion([list1, list2], k=60)
        scores = [score for _, _, score in fused]
        assert scores == sorted(scores, reverse=True)

    def test_weights(self):
        """Higher weight on a list should boost its top result."""
        list1 = [("dense_top", {"iteration": 0, "chunk_index": 0}, 0.1)]
        list2 = [("bm25_top", {"iteration": 1, "chunk_index": 0}, 5.0)]

        # Weight list2 heavily
        fused = reciprocal_rank_fusion([list1, list2], k=60, weights=[0.1, 10.0])
        assert fused[0][0] == "bm25_top"

        # Weight list1 heavily
        fused2 = reciprocal_rank_fusion([list1, list2], k=60, weights=[10.0, 0.1])
        assert fused2[0][0] == "dense_top"

    def test_k_parameter_affects_scores(self):
        ranked = self._make_list(["A", "B"])
        fused_small_k = reciprocal_rank_fusion([ranked], k=1)
        fused_large_k = reciprocal_rank_fusion([ranked], k=1000)
        # With small k, score for rank 0 = 1/(1+1) = 0.5
        # With large k, score for rank 0 = 1/(1000+1) ~ 0.001
        assert fused_small_k[0][2] > fused_large_k[0][2]

    def test_dedup_by_metadata_key(self):
        """Same (iteration, chunk_index) from different lists should merge."""
        doc = ("same doc text", {"iteration": 0, "chunk_index": 0}, 0.5)
        list1 = [doc]
        list2 = [("same doc text", {"iteration": 0, "chunk_index": 0}, 3.0)]
        fused = reciprocal_rank_fusion([list1, list2], k=60)
        assert len(fused) == 1
        # Score should be sum of both contributions
        expected = 1.0 / (60 + 1) + 1.0 / (60 + 1)  # rank 0 in both
        assert abs(fused[0][2] - expected) < 1e-9

    def test_many_lists(self):
        """Fusion with 3+ lists should work."""
        list1 = self._make_list(["A", "B"])
        list2 = self._make_list(["B", "C"])
        list3 = self._make_list(["C", "A"])
        fused = reciprocal_rank_fusion([list1, list2, list3], k=60)
        # All three docs should appear
        labels = {doc for doc, _, _ in fused}
        assert labels == {"A", "B", "C"}
