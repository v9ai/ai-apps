"""Tests for task_history.py — persistent cross-session ChromaDB store."""

import os

import pytest

import task_history
from task_history import record_start, record_end, find_similar, format_similar


@pytest.fixture(autouse=True)
def isolate_history(tmp_path, monkeypatch):
    """Redirect HISTORY_PATH to a temp dir for each test."""
    history_path = str(tmp_path / "history" / "chroma")
    monkeypatch.setenv("ITERATE_HISTORY_PATH", history_path)
    monkeypatch.setattr(task_history, "HISTORY_PATH", history_path)
    # Reset embedding cache to avoid cross-test contamination
    import embeddings
    embeddings._reset_cache()
    yield history_path
    embeddings._reset_cache()


# ---------------------------------------------------------------------------
# record_start
# ---------------------------------------------------------------------------

class TestRecordStart:
    def test_records_without_error(self):
        record_start("build auth system", "session-abc", "/projects/myapp")

    def test_persists_to_chroma(self):
        record_start("build auth", "sess-xyz", "/cwd")
        import chromadb
        client = chromadb.PersistentClient(path=task_history.HISTORY_PATH)
        col = client.get_or_create_collection("task_history")
        assert col.count() >= 1


# ---------------------------------------------------------------------------
# record_end
# ---------------------------------------------------------------------------

class TestRecordEnd:
    def test_records_completion(self):
        record_end("build auth", "sess-123", iterations=5, final_score=0.85)

    def test_status_completed_when_score_high(self):
        import chromadb
        record_end("build auth", "sess-456", iterations=3, final_score=0.9)
        client = chromadb.PersistentClient(path=task_history.HISTORY_PATH)
        col = client.get_or_create_collection("task_history")
        doc = col.get(ids=["session-sess-456-end"])
        assert doc["metadatas"][0]["status"] == "completed"

    def test_status_stopped_when_score_low(self):
        import chromadb
        record_end("build auth", "sess-789", iterations=2, final_score=0.4)
        client = chromadb.PersistentClient(path=task_history.HISTORY_PATH)
        col = client.get_or_create_collection("task_history")
        doc = col.get(ids=["session-sess-789-end"])
        assert doc["metadatas"][0]["status"] == "stopped"

    def test_stores_stop_reason(self):
        import chromadb
        record_end("task", "sess-aaa", iterations=1, final_score=0.3, stop_reason="plateau")
        client = chromadb.PersistentClient(path=task_history.HISTORY_PATH)
        col = client.get_or_create_collection("task_history")
        doc = col.get(ids=["session-sess-aaa-end"])
        assert doc["metadatas"][0]["stop_reason"] == "plateau"

    def test_stores_iterations(self):
        import chromadb
        record_end("task", "sess-bbb", iterations=7, final_score=0.7)
        client = chromadb.PersistentClient(path=task_history.HISTORY_PATH)
        col = client.get_or_create_collection("task_history")
        doc = col.get(ids=["session-sess-bbb-end"])
        assert doc["metadatas"][0]["iterations"] == 7

    def test_stores_files_changed(self):
        import chromadb
        record_end("task", "sess-fc1", iterations=3, final_score=0.6, files_changed=12)
        client = chromadb.PersistentClient(path=task_history.HISTORY_PATH)
        col = client.get_or_create_collection("task_history")
        doc = col.get(ids=["session-sess-fc1-end"])
        assert doc["metadatas"][0]["files_changed"] == 12

    def test_files_changed_defaults_to_zero(self):
        import chromadb
        record_end("task", "sess-fc2", iterations=1, final_score=0.5)
        client = chromadb.PersistentClient(path=task_history.HISTORY_PATH)
        col = client.get_or_create_collection("task_history")
        doc = col.get(ids=["session-sess-fc2-end"])
        assert doc["metadatas"][0]["files_changed"] == 0

    def test_files_changed_in_document_text(self):
        record_end("task", "sess-fc3", iterations=2, final_score=0.7, files_changed=5)
        import chromadb
        client = chromadb.PersistentClient(path=task_history.HISTORY_PATH)
        col = client.get_or_create_collection("task_history")
        doc = col.get(ids=["session-sess-fc3-end"])
        assert "Files changed: 5" in doc["documents"][0]


# ---------------------------------------------------------------------------
# find_similar
# ---------------------------------------------------------------------------

class TestFindSimilar:
    def test_empty_history_returns_empty_list(self):
        result = find_similar("build auth system")
        assert result == []

    def test_finds_after_recording(self):
        record_end("build auth system with JWT", "sess-1", 5, 0.85)
        result = find_similar("build auth system")
        assert len(result) >= 1

    def test_result_has_expected_keys(self):
        record_end("add user authentication", "sess-2", 3, 0.7)
        results = find_similar("user auth")
        assert len(results) >= 1
        r = results[0]
        for key in ("task", "status", "iterations", "final_score", "files_changed", "similarity"):
            assert key in r, f"missing key: {key}"

    def test_similarity_is_between_0_and_1(self):
        record_end("build payment system", "sess-3", 4, 0.8)
        results = find_similar("payment processing")
        for r in results:
            assert 0.0 <= r["similarity"] <= 1.0

    def test_files_changed_returned_in_results(self):
        record_end("build API endpoints", "sess-fc4", 4, 0.75, files_changed=8)
        results = find_similar("build API")
        assert len(results) >= 1
        assert results[0]["files_changed"] == 8

    def test_n_limits_results(self):
        for i in range(5):
            record_end(f"task {i}", f"sess-{i+10}", i, 0.6)
        results = find_similar("task", n=2)
        assert len(results) <= 2

    def test_similar_tasks_rank_higher_than_dissimilar(self):
        record_end("build authentication JWT system", "sess-10", 5, 0.9)
        record_end("deploy kubernetes cluster", "sess-11", 3, 0.8)
        results = find_similar("build auth with JWT", n=5)
        # The auth task should appear and rank higher
        auth_result = next((r for r in results if "authentication" in r["task"].lower()), None)
        k8s_result = next((r for r in results if "kubernetes" in r["task"].lower()), None)
        if auth_result and k8s_result:
            assert auth_result["similarity"] >= k8s_result["similarity"]


# ---------------------------------------------------------------------------
# format_similar
# ---------------------------------------------------------------------------

class TestFormatSimilar:
    def test_empty_returns_empty_string(self):
        assert format_similar([]) == ""

    def test_contains_task_name(self):
        similar = [{"task": "build auth", "status": "completed", "iterations": 5,
                    "final_score": 0.9, "similarity": 0.85, "timestamp": ""}]
        result = format_similar(similar)
        assert "build auth" in result

    def test_contains_status(self):
        similar = [{"task": "task", "status": "stopped", "iterations": 2,
                    "final_score": 0.3, "similarity": 0.7, "timestamp": ""}]
        result = format_similar(similar)
        assert "stopped" in result

    def test_contains_similarity(self):
        similar = [{"task": "task", "status": "completed", "iterations": 1,
                    "final_score": 0.8, "similarity": 0.92, "timestamp": ""}]
        result = format_similar(similar)
        assert "0.92" in result

    def test_multiple_entries(self):
        similar = [
            {"task": "task A", "status": "completed", "iterations": 3,
             "final_score": 0.9, "similarity": 0.9, "timestamp": ""},
            {"task": "task B", "status": "stopped", "iterations": 1,
             "final_score": 0.4, "similarity": 0.7, "timestamp": ""},
        ]
        result = format_similar(similar)
        assert "task A" in result
        assert "task B" in result
