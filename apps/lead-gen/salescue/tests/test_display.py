"""Tests for salescue.display — CardRenderer output."""

from salescue.display import CardRenderer, _bar, _color_for_score


class TestBar:
    def test_full_bar(self):
        bar = _bar(1.0, width=10)
        assert len(bar) == 10
        assert bar.count("\u2588") == 10

    def test_empty_bar(self):
        bar = _bar(0.0, width=10)
        assert bar.count("\u2591") == 10

    def test_half_bar(self):
        bar = _bar(0.5, width=10)
        assert bar.count("\u2588") == 5
        assert bar.count("\u2591") == 5


class TestColorForScore:
    def test_high_score_green(self):
        assert _color_for_score(0.9) == "green"

    def test_medium_score_yellow(self):
        assert _color_for_score(0.6) == "yellow"

    def test_low_score_red(self):
        assert _color_for_score(0.3) == "red"

    def test_very_low_score(self):
        assert _color_for_score(0.1) == "#cc0000"


class TestCardRenderer:
    def test_terminal_renders_string(self):
        result = {"score": 0.85, "label": "hot"}
        output = CardRenderer.render_terminal("score", result)
        assert isinstance(output, str)
        assert "SCORE" in output

    def test_terminal_handles_dict_values(self):
        result = {"details": {"a": 1, "b": 2}}
        output = CardRenderer.render_terminal("test", result)
        assert "details" in output

    def test_terminal_handles_list_values(self):
        result = {"items": ["one", "two", "three"]}
        output = CardRenderer.render_terminal("test", result)
        assert "3 items" in output

    def test_html_renders_string(self):
        result = {"score": 0.7, "label": "warm"}
        html = CardRenderer.render_html("score", result)
        assert "<div" in html
        assert "SCORE" in html
        assert "70%" in html

    def test_html_escapes_values(self):
        result = {"label": "<script>alert('xss')</script>"}
        html = CardRenderer.render_html("test", result)
        assert "<script>" not in html
        assert "&lt;script&gt;" in html
