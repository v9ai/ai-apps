"""salescue/display.py — CardRenderer for visual output.

Produces rich terminal cards (via `rich`) and HTML cards for each module's
output. Cards show confidence bars, signal breakdowns, and evidence spans.
"""

from __future__ import annotations

import html as html_mod
from typing import Any


def _bar(value: float, width: int = 20, fill: str = "\u2588", empty: str = "\u2591") -> str:
    """Render a text-based progress bar."""
    filled = int(value * width)
    return fill * filled + empty * (width - filled)


def _color_for_score(score: float) -> str:
    """Map a 0-1 score to a color name."""
    if score >= 0.75:
        return "green"
    if score >= 0.5:
        return "yellow"
    if score >= 0.25:
        return "red"
    return "#cc0000"


class CardRenderer:
    """Renders module output as rich terminal cards or HTML."""

    @staticmethod
    def render_terminal(module_name: str, result: dict[str, Any]) -> str:
        """Render a plain-text card for terminal output."""
        lines = [
            f"\u250c\u2500\u2500 {module_name.upper()} \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2510",
        ]

        for key, value in result.items():
            if isinstance(value, float):
                bar = _bar(value)
                lines.append(f"\u2502 {key:<20} {bar} {value:.3f} \u2502")
            elif isinstance(value, dict):
                lines.append(f"\u2502 {key}:{'':>20} \u2502")
                for k, v in value.items():
                    lines.append(f"\u2502   {k:<18} {str(v):<12} \u2502")
            elif isinstance(value, list) and len(value) > 0:
                lines.append(f"\u2502 {key}: ({len(value)} items){'':>10} \u2502")
                for item in value[:3]:
                    text = str(item)[:35]
                    lines.append(f"\u2502   {text:<36} \u2502")
            else:
                lines.append(f"\u2502 {key:<20} {str(value):<18} \u2502")

        lines.append(f"\u2514\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2518")
        return "\n".join(lines)

    @staticmethod
    def render_rich(module_name: str, result: dict[str, Any]) -> None:
        """Render using the `rich` library if available."""
        try:
            from rich.console import Console
            from rich.panel import Panel
            from rich.table import Table

            console = Console()
            table = Table(show_header=False, box=None, padding=(0, 1))
            table.add_column("Key", style="bold cyan", width=22)
            table.add_column("Value", width=40)

            for key, value in result.items():
                if isinstance(value, float):
                    color = _color_for_score(value)
                    bar = _bar(value)
                    table.add_row(key, f"[{color}]{bar}[/] {value:.3f}")
                elif isinstance(value, (dict, list)):
                    import json
                    table.add_row(key, json.dumps(value, indent=2)[:80])
                else:
                    table.add_row(key, str(value))

            console.print(Panel(table, title=f"[bold]{module_name.upper()}[/bold]", border_style="blue"))

        except ImportError:
            # fallback to plain text
            print(CardRenderer.render_terminal(module_name, result))

    @staticmethod
    def render_html(module_name: str, result: dict[str, Any]) -> str:
        """Render as an HTML card."""
        rows = []
        for key, value in result.items():
            if isinstance(value, float):
                pct = int(value * 100)
                color = _color_for_score(value)
                bar_html = (
                    f'<div style="background:#eee;border-radius:4px;height:12px;width:150px;display:inline-block">'
                    f'<div style="background:{color};height:100%;width:{pct}%;border-radius:4px"></div>'
                    f'</div> {value:.3f}'
                )
                rows.append(f"<tr><td><b>{html_mod.escape(str(key))}</b></td><td>{bar_html}</td></tr>")
            else:
                rows.append(f"<tr><td><b>{html_mod.escape(str(key))}</b></td><td>{html_mod.escape(str(value))}</td></tr>")

        return (
            f'<div style="border:1px solid #ccc;border-radius:8px;padding:12px;margin:8px 0;font-family:monospace">'
            f'<h3 style="margin:0 0 8px">{html_mod.escape(module_name.upper())}</h3>'
            f'<table>{"".join(rows)}</table>'
            f'</div>'
        )
