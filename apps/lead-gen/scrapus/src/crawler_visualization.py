"""
Module 1: ASCII-based visualization and reporting for the RL crawler.

Provides terminal-friendly charts, tables, dashboards, and reports
with zero external dependencies (no matplotlib, streamlit, etc.).

Components:
1. ASCIIChart: Line chart with multi-series support
2. ASCIIHistogram: Horizontal bar histogram with ANSI colour
3. ASCIITable: Formatted table with alignment and truncation
4. TrainingDashboard: Real-time 80x24 terminal dashboard
5. CrawlSummaryReport: End-of-crawl markdown report
6. ProgressBar: Terminal progress bar with ETA
7. DomainMap: ASCII tree/graph of domain relationships

Integration points:
- CrawlerPipeline: dashboard.update(pipeline.get_stats())
- CrawlSummaryReport: report.generate(pipeline.get_stats())
- ProgressBar: wrap any iterable or manual update loop

Memory: <1 MB (string buffers only).
Target: Apple M1 16GB, zero cloud dependency.
"""

import io
import math
import sys
import time
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional, Sequence, Tuple, Union
from urllib.parse import urlparse


# ======================= ANSI Escape Helpers =================================

class _ANSI:
    """ANSI escape code constants for terminal colouring and cursor control."""

    RESET = "\033[0m"
    BOLD = "\033[1m"
    DIM = "\033[2m"

    # Foreground colours
    RED = "\033[31m"
    GREEN = "\033[32m"
    YELLOW = "\033[33m"
    BLUE = "\033[34m"
    MAGENTA = "\033[35m"
    CYAN = "\033[36m"
    WHITE = "\033[37m"
    GREY = "\033[90m"

    # Background colours
    BG_RED = "\033[41m"
    BG_GREEN = "\033[42m"
    BG_YELLOW = "\033[43m"
    BG_BLUE = "\033[44m"

    # Cursor control
    CLEAR_SCREEN = "\033[2J"
    CURSOR_HOME = "\033[H"
    CLEAR_LINE = "\033[2K"
    HIDE_CURSOR = "\033[?25l"
    SHOW_CURSOR = "\033[?25h"

    @staticmethod
    def move_to(row: int, col: int) -> str:
        return f"\033[{row};{col}H"

    @staticmethod
    def colour_bar(fraction: float) -> str:
        """Return ANSI colour code based on a 0.0-1.0 fraction (green->yellow->red)."""
        if fraction >= 0.7:
            return _ANSI.GREEN
        elif fraction >= 0.4:
            return _ANSI.YELLOW
        return _ANSI.RED


# Ordered palette for multi-series charts
_SERIES_COLOURS = [
    _ANSI.GREEN, _ANSI.CYAN, _ANSI.YELLOW, _ANSI.MAGENTA,
    _ANSI.RED, _ANSI.BLUE, _ANSI.WHITE,
]
_SERIES_CHARS = ["*", "#", "+", "o", "x", "~", "^"]

# Bar fill characters (full -> partial)
_BAR_CHARS = ["\u2588", "\u2589", "\u258a", "\u258b", "\u258c", "\u258d", "\u258e", "\u258f"]


def _strip_ansi(text: str) -> str:
    """Remove ANSI escape sequences to compute visible length."""
    import re
    return re.sub(r"\033\[[0-9;]*[A-Za-z]", "", text)


def _visible_len(text: str) -> int:
    """Return visible (non-ANSI) length of a string."""
    return len(_strip_ansi(text))


def _format_duration(seconds: float) -> str:
    """Format seconds into human-readable duration."""
    if seconds < 60:
        return f"{seconds:.1f}s"
    minutes = int(seconds // 60)
    secs = seconds % 60
    if minutes < 60:
        return f"{minutes}m {secs:04.1f}s"
    hours = minutes // 60
    mins = minutes % 60
    return f"{hours}h {mins:02d}m {secs:04.1f}s"


def _format_number(n: Union[int, float]) -> str:
    """Format a number with SI suffixes for compact display."""
    if isinstance(n, float) and n != int(n):
        if abs(n) < 0.01:
            return f"{n:.4f}"
        return f"{n:.2f}"
    n = int(n)
    if abs(n) < 1_000:
        return str(n)
    if abs(n) < 1_000_000:
        return f"{n / 1_000:.1f}K"
    return f"{n / 1_000_000:.1f}M"


# ======================= ASCII Line Chart ====================================

class ASCIIChart:
    """Simple ASCII line chart for terminal output.

    Supports multiple series plotted on the same axes with different
    marker characters and optional ANSI colours.

    Usage:
        chart = ASCIIChart()
        print(chart.plot([1, 4, 2, 8, 5, 7]))
        print(chart.plot_multi({"loss": losses, "reward": rewards}))
    """

    def plot(
        self,
        values: Sequence[float],
        width: int = 60,
        height: int = 15,
        title: str = "",
        marker: str = "*",
        colour: str = _ANSI.GREEN,
    ) -> str:
        """Plot a single series as an ASCII line chart.

        Args:
            values: sequence of numeric values.
            width: chart width in characters (excluding Y-axis labels).
            height: chart height in rows.
            title: optional title above the chart.
            marker: character used for data points.
            colour: ANSI colour code for the marker.

        Returns:
            Multi-line string with the rendered chart.
        """
        if not values:
            return "(no data)"

        return self.plot_multi(
            {"": values},
            width=width,
            height=height,
            title=title,
            markers=[marker],
            colours=[colour],
        )

    def plot_multi(
        self,
        series: Dict[str, Sequence[float]],
        width: int = 60,
        height: int = 15,
        title: str = "",
        markers: Optional[List[str]] = None,
        colours: Optional[List[str]] = None,
    ) -> str:
        """Plot multiple series on the same axes.

        Args:
            series: mapping of series_name -> values.
            width: chart width in characters (excluding Y-axis).
            height: chart height in rows.
            title: optional title.
            markers: per-series marker characters (defaults to _SERIES_CHARS).
            colours: per-series ANSI colours (defaults to _SERIES_COLOURS).

        Returns:
            Multi-line string with the rendered chart.
        """
        if not series:
            return "(no data)"

        markers = markers or _SERIES_CHARS
        colours = colours or _SERIES_COLOURS
        names = list(series.keys())

        # Compute global min/max across all series
        all_vals: List[float] = []
        max_len = 0
        for vals in series.values():
            all_vals.extend(vals)
            max_len = max(max_len, len(vals))

        if not all_vals:
            return "(no data)"

        y_min = min(all_vals)
        y_max = max(all_vals)
        if y_min == y_max:
            y_max = y_min + 1.0

        # Determine step size for down/upsampling X to fit width
        x_step = max(1, max_len / width)

        # Y-axis label width
        y_label_width = max(
            len(f"{y_max:.2f}"),
            len(f"{y_min:.2f}"),
        ) + 1

        buf = io.StringIO()

        # Title
        if title:
            buf.write(f"{_ANSI.BOLD}{title}{_ANSI.RESET}\n")

        # Build the grid: grid[row][col] = (marker_char, colour)
        grid: List[List[Optional[Tuple[str, str]]]] = [
            [None] * width for _ in range(height)
        ]

        for s_idx, name in enumerate(names):
            vals = list(series[name])
            m = markers[s_idx % len(markers)]
            c = colours[s_idx % len(colours)]

            for col in range(width):
                # Map column to value index
                vi = int(col * x_step)
                if vi >= len(vals):
                    break
                v = vals[vi]
                # Map value to row (0 = top = y_max, height-1 = bottom = y_min)
                row = int((1.0 - (v - y_min) / (y_max - y_min)) * (height - 1))
                row = max(0, min(height - 1, row))
                grid[row][col] = (m, c)

        # Render rows with Y-axis labels
        for row in range(height):
            # Y label for top, middle, bottom
            if row == 0:
                label = f"{y_max:.2f}"
            elif row == height - 1:
                label = f"{y_min:.2f}"
            elif row == height // 2:
                mid = (y_max + y_min) / 2
                label = f"{mid:.2f}"
            else:
                label = ""

            buf.write(f"{label:>{y_label_width}} {_ANSI.DIM}|{_ANSI.RESET}")

            for col in range(width):
                cell = grid[row][col]
                if cell:
                    m_char, m_colour = cell
                    buf.write(f"{m_colour}{m_char}{_ANSI.RESET}")
                else:
                    buf.write(" ")
            buf.write("\n")

        # X-axis
        buf.write(" " * y_label_width + " " + _ANSI.DIM + "+" + "-" * width + _ANSI.RESET + "\n")

        # X-axis labels (start, middle, end step numbers)
        x_start = "0"
        x_mid = str(max_len // 2)
        x_end = str(max_len)
        x_label_line = " " * (y_label_width + 2) + x_start
        mid_pos = width // 2 - len(x_mid) // 2
        end_pos = width - len(x_end)
        x_label_line += " " * max(0, mid_pos - len(x_start)) + x_mid
        x_label_line += " " * max(0, end_pos - mid_pos - len(x_mid)) + x_end
        buf.write(f"{_ANSI.DIM}{x_label_line}{_ANSI.RESET}\n")

        # Legend (if multiple named series)
        named = [n for n in names if n]
        if len(named) > 1:
            legend_parts = []
            for s_idx, name in enumerate(named):
                m = markers[s_idx % len(markers)]
                c = colours[s_idx % len(colours)]
                legend_parts.append(f"  {c}{m}{_ANSI.RESET} {name}")
            buf.write("".join(legend_parts) + "\n")

        return buf.getvalue()


# ======================= ASCII Histogram =====================================

class ASCIIHistogram:
    """Horizontal bar histogram with ANSI colour-coded bars.

    Bars are sorted by value (descending) and use Unicode block
    characters for sub-character precision.

    Usage:
        hist = ASCIIHistogram()
        print(hist.plot(["alpha", "beta", "gamma"], [42, 17, 89]))
    """

    def plot(
        self,
        labels: Sequence[str],
        values: Sequence[float],
        width: int = 40,
        title: str = "",
        max_items: int = 30,
        show_values: bool = True,
        colour_by_rank: bool = True,
    ) -> str:
        """Render a horizontal bar histogram.

        Args:
            labels: category labels.
            values: corresponding numeric values.
            width: max bar width in characters.
            title: optional title.
            max_items: maximum number of items to display.
            show_values: whether to show numeric values after bars.
            colour_by_rank: colour bars green->yellow->red by rank.

        Returns:
            Multi-line string with the rendered histogram.
        """
        if not labels or not values:
            return "(no data)"

        # Sort descending by value
        pairs = sorted(zip(labels, values), key=lambda x: -x[1])
        pairs = pairs[:max_items]

        max_val = max(v for _, v in pairs) if pairs else 1.0
        if max_val == 0:
            max_val = 1.0

        label_width = max(len(str(lab)) for lab, _ in pairs)
        label_width = min(label_width, 25)  # truncate long labels

        buf = io.StringIO()

        if title:
            buf.write(f"{_ANSI.BOLD}{title}{_ANSI.RESET}\n")

        total = len(pairs)
        for rank, (label, val) in enumerate(pairs):
            # Truncate label
            display_label = str(label)[:label_width]

            # Fraction of max
            frac = val / max_val
            bar_float = frac * width
            bar_full = int(bar_float)
            bar_partial_idx = int((bar_float - bar_full) * 8)

            # Colour selection
            if colour_by_rank:
                rank_frac = 1.0 - (rank / max(total - 1, 1))
                colour = _ANSI.colour_bar(rank_frac)
            else:
                colour = _ANSI.colour_bar(frac)

            # Build bar string
            bar = _BAR_CHARS[0] * bar_full
            if bar_partial_idx > 0 and bar_full < width:
                bar += _BAR_CHARS[bar_partial_idx]

            # Value suffix
            val_str = f" {_format_number(val)}" if show_values else ""

            buf.write(
                f"  {display_label:>{label_width}} "
                f"{_ANSI.DIM}|{_ANSI.RESET}"
                f"{colour}{bar}{_ANSI.RESET}"
                f"{_ANSI.DIM}{val_str}{_ANSI.RESET}\n"
            )

        return buf.getvalue()


# ======================= ASCII Table =========================================

class ASCIITable:
    """Formatted table output with column alignment, truncation, and separators.

    Usage:
        table = ASCIITable()
        print(table.render(
            headers=["Domain", "Pages", "Reward"],
            rows=[["example.com", 42, 3.14], ["test.org", 7, 0.5]],
            alignment=["left", "right", "right"],
        ))
    """

    def render(
        self,
        headers: List[str],
        rows: List[List[Any]],
        alignment: Optional[List[str]] = None,
        max_col_width: int = 30,
        separator: bool = True,
    ) -> str:
        """Render a formatted table.

        Args:
            headers: column header labels.
            rows: list of row data (each row is a list of values).
            alignment: per-column alignment ("left", "right", "center").
                       Defaults to left for strings, right for numbers.
            max_col_width: maximum column width before truncation.
            separator: whether to draw separator lines.

        Returns:
            Multi-line string with the rendered table.
        """
        if not headers:
            return "(no data)"

        n_cols = len(headers)

        # Stringify all cells
        str_rows: List[List[str]] = []
        for row in rows:
            str_row = []
            for i, cell in enumerate(row):
                s = str(cell) if cell is not None else ""
                if len(s) > max_col_width:
                    s = s[: max_col_width - 1] + "\u2026"
                str_row.append(s)
            # Pad short rows
            while len(str_row) < n_cols:
                str_row.append("")
            str_rows.append(str_row[:n_cols])

        # Auto-detect alignment if not provided
        if alignment is None:
            alignment = []
            for col_idx in range(n_cols):
                # Check if most values in this column are numeric
                numeric_count = 0
                for row in str_rows:
                    try:
                        float(row[col_idx])
                        numeric_count += 1
                    except (ValueError, IndexError):
                        pass
                if numeric_count > len(str_rows) / 2:
                    alignment.append("right")
                else:
                    alignment.append("left")

        # Pad alignment list
        while len(alignment) < n_cols:
            alignment.append("left")

        # Compute column widths
        col_widths: List[int] = []
        for col_idx in range(n_cols):
            header_w = len(headers[col_idx])
            data_w = max((len(row[col_idx]) for row in str_rows), default=0)
            col_widths.append(min(max(header_w, data_w), max_col_width))

        buf = io.StringIO()

        def _sep_line() -> str:
            return "+" + "+".join("-" * (w + 2) for w in col_widths) + "+"

        def _format_row(cells: List[str], bold: bool = False) -> str:
            parts = []
            for col_idx, cell in enumerate(cells):
                w = col_widths[col_idx]
                align = alignment[col_idx]
                if align == "right":
                    formatted = cell.rjust(w)
                elif align == "center":
                    formatted = cell.center(w)
                else:
                    formatted = cell.ljust(w)
                if bold:
                    formatted = f"{_ANSI.BOLD}{formatted}{_ANSI.RESET}"
                parts.append(f" {formatted} ")
            return "|" + "|".join(parts) + "|"

        # Header
        if separator:
            buf.write(_sep_line() + "\n")
        buf.write(_format_row(headers, bold=True) + "\n")
        if separator:
            buf.write(_sep_line() + "\n")

        # Data rows
        for str_row in str_rows:
            buf.write(_format_row(str_row) + "\n")

        # Footer
        if separator:
            buf.write(_sep_line() + "\n")

        return buf.getvalue()


# ======================= Training Dashboard ==================================

@dataclass
class _DashboardSection:
    """A named section within the terminal dashboard."""
    title: str
    lines: List[str] = field(default_factory=list)


class TrainingDashboard:
    """Real-time terminal dashboard that updates in-place.

    Fits within an 80x24 terminal. Uses ANSI escape codes for
    cursor positioning and in-place updates.

    Usage:
        dashboard = TrainingDashboard()
        while training:
            stats = pipeline.get_stats()
            dashboard.update(stats)
    """

    TERMINAL_WIDTH = 80
    TERMINAL_HEIGHT = 24

    def __init__(self, stream: Any = None) -> None:
        self._stream = stream or sys.stderr
        self._first_render = True
        self._last_update: float = 0.0
        self._min_interval: float = 0.5  # rate-limit redraws to 2 fps

    def update(self, pipeline_stats: Dict[str, Any]) -> None:
        """Re-render the dashboard with fresh stats.

        Args:
            pipeline_stats: dict from CrawlerPipeline._collect_stats().
        """
        now = time.monotonic()
        if now - self._last_update < self._min_interval:
            return
        self._last_update = now

        sections = self._build_sections(pipeline_stats)
        output = self._render_sections(sections)

        # Move cursor to home and overwrite
        if self._first_render:
            self._stream.write(_ANSI.HIDE_CURSOR)
            self._stream.write(_ANSI.CLEAR_SCREEN)
            self._first_render = False

        self._stream.write(_ANSI.CURSOR_HOME)
        self._stream.write(output)
        self._stream.flush()

    def close(self) -> None:
        """Restore terminal state."""
        self._stream.write(_ANSI.SHOW_CURSOR)
        self._stream.flush()

    def _build_sections(
        self, stats: Dict[str, Any]
    ) -> List[_DashboardSection]:
        """Build dashboard sections from pipeline stats."""
        sections: List[_DashboardSection] = []

        # --- Header ---
        header = _DashboardSection(title="SCRAPUS RL CRAWLER")
        step = stats.get("global_step", 0)
        header.lines.append(
            f"  Step: {_ANSI.BOLD}{_format_number(step)}{_ANSI.RESET}"
            f"  |  {time.strftime('%H:%M:%S')}"
        )
        sections.append(header)

        # --- Training Progress ---
        dqn = stats.get("dqn", {})
        if dqn:
            training = _DashboardSection(title="Training")
            loss = dqn.get("avg_loss", 0.0)
            epsilon = dqn.get("epsilon", 1.0)
            q_mean = dqn.get("mean_q", 0.0)
            train_step = dqn.get("train_step", 0)

            training.lines.append(
                f"  Loss: {_ANSI.YELLOW}{loss:.4f}{_ANSI.RESET}"
                f"  Epsilon: {epsilon:.3f}"
                f"  Mean Q: {q_mean:.3f}"
                f"  Train#: {_format_number(train_step)}"
            )

            # Epsilon progress bar
            eps_bar = self._mini_bar(1.0 - epsilon, 20)
            training.lines.append(f"  Exploration: [{eps_bar}] {epsilon:.3f}")

            convergence = dqn.get("convergence_status", "")
            if convergence:
                colour = _ANSI.GREEN if convergence == "converged" else _ANSI.YELLOW
                training.lines.append(
                    f"  Status: {colour}{convergence}{_ANSI.RESET}"
                )

            sections.append(training)

        # --- Frontier Stats ---
        crawler = stats.get("crawler", {})
        frontier = crawler.get("frontier", {})
        if frontier:
            fstat = _DashboardSection(title="Frontier")
            pending = frontier.get("pending", 0)
            completed = frontier.get("completed", 0)
            failed = frontier.get("failed", 0)
            total = pending + completed + failed

            fstat.lines.append(
                f"  Pending: {_ANSI.CYAN}{_format_number(pending)}{_ANSI.RESET}"
                f"  Done: {_ANSI.GREEN}{_format_number(completed)}{_ANSI.RESET}"
                f"  Failed: {_ANSI.RED}{_format_number(failed)}{_ANSI.RESET}"
                f"  Total: {_format_number(total)}"
            )
            sections.append(fstat)

        # --- Domain Top-10 ---
        domain_stats = crawler.get("domain_stats", [])
        if domain_stats:
            dtop = _DashboardSection(title="Top Domains")
            for d in domain_stats[:10]:
                domain = d.get("domain", "?")[:25]
                pages = d.get("pages_crawled", 0)
                avg_r = d.get("avg_reward", 0.0)
                leads = d.get("leads_found", 0)
                colour = _ANSI.GREEN if avg_r > 0 else _ANSI.RED
                dtop.lines.append(
                    f"  {domain:<25} "
                    f"pg:{pages:>5} "
                    f"r:{colour}{avg_r:>6.3f}{_ANSI.RESET} "
                    f"L:{leads}"
                )
            sections.append(dtop)

        # --- Rewards ---
        rewards = stats.get("rewards", {})
        if rewards:
            rsec = _DashboardSection(title="Rewards")
            mean_r = rewards.get("mean", 0.0)
            harvest = rewards.get("harvest_rate", 0.0)
            positive = rewards.get("positive_count", 0)
            total_r = rewards.get("total", 0)

            harvest_bar = self._mini_bar(harvest, 20)
            colour = _ANSI.GREEN if harvest > 0.1 else _ANSI.YELLOW
            rsec.lines.append(
                f"  Mean: {mean_r:.4f}"
                f"  Positive: {positive}/{total_r}"
                f"  Harvest: {colour}[{harvest_bar}] {harvest:.1%}{_ANSI.RESET}"
            )
            sections.append(rsec)

        # --- Replay Buffer ---
        replay = stats.get("replay", {})
        if replay:
            rbuf = _DashboardSection(title="Replay Buffer")
            size = replay.get("size", 0)
            capacity = replay.get("capacity", 1)
            unresolved = replay.get("unresolved_rewards", 0)
            util = size / max(capacity, 1)

            util_bar = self._mini_bar(util, 20)
            rbuf.lines.append(
                f"  Size: {_format_number(size)}/{_format_number(capacity)}"
                f"  [{util_bar}] {util:.0%}"
                f"  Unresolved: {unresolved}"
            )
            sections.append(rbuf)

        return sections

    def _render_sections(
        self, sections: List[_DashboardSection]
    ) -> str:
        """Render sections into a fixed-size terminal frame."""
        buf = io.StringIO()
        lines_used = 0
        max_lines = self.TERMINAL_HEIGHT

        # Top border
        border = "=" * self.TERMINAL_WIDTH
        buf.write(f"{_ANSI.DIM}{border}{_ANSI.RESET}\n")
        lines_used += 1

        for section in sections:
            if lines_used >= max_lines - 1:
                break

            # Section header
            header = f" {section.title} "
            pad = self.TERMINAL_WIDTH - len(header) - 4
            buf.write(
                f"{_ANSI.DIM}--{_ANSI.RESET}"
                f"{_ANSI.BOLD}{header}{_ANSI.RESET}"
                f"{_ANSI.DIM}{'-' * max(0, pad)}{_ANSI.RESET}\n"
            )
            lines_used += 1

            for line in section.lines:
                if lines_used >= max_lines - 1:
                    break
                # Pad/truncate line to terminal width
                visible = _visible_len(line)
                if visible < self.TERMINAL_WIDTH:
                    line += " " * (self.TERMINAL_WIDTH - visible)
                buf.write(f"{_ANSI.CLEAR_LINE}{line}\n")
                lines_used += 1

        # Fill remaining lines
        while lines_used < max_lines - 1:
            buf.write(f"{_ANSI.CLEAR_LINE}\n")
            lines_used += 1

        # Bottom border
        buf.write(f"{_ANSI.DIM}{border}{_ANSI.RESET}")

        return buf.getvalue()

    @staticmethod
    def _mini_bar(fraction: float, width: int) -> str:
        """Render a small inline progress bar."""
        fraction = max(0.0, min(1.0, fraction))
        filled = int(fraction * width)
        colour = _ANSI.colour_bar(fraction)
        return (
            f"{colour}{'=' * filled}{_ANSI.RESET}"
            f"{_ANSI.DIM}{'-' * (width - filled)}{_ANSI.RESET}"
        )


# ======================= Crawl Summary Report ================================

class CrawlSummaryReport:
    """End-of-crawl summary report in markdown format.

    Generates a comprehensive report with ASCII charts for domain
    diversity and reward distribution.

    Usage:
        report = CrawlSummaryReport()
        print(report.generate(pipeline.get_stats()))
    """

    def __init__(self) -> None:
        self._chart = ASCIIChart()
        self._hist = ASCIIHistogram()
        self._table = ASCIITable()

    def generate(
        self,
        final_stats: Dict[str, Any],
        start_time: Optional[float] = None,
        end_time: Optional[float] = None,
    ) -> str:
        """Generate the full summary report.

        Args:
            final_stats: dict from CrawlerPipeline._collect_stats().
            start_time: crawl start timestamp (epoch).
            end_time: crawl end timestamp (epoch).

        Returns:
            Markdown-formatted report string.
        """
        buf = io.StringIO()

        buf.write("# Scrapus Crawl Summary Report\n\n")

        # --- Overview ---
        buf.write("## Overview\n\n")
        buf.write(self._section_overview(final_stats, start_time, end_time))

        # --- Training ---
        buf.write("\n## Training\n\n")
        buf.write(self._section_training(final_stats))

        # --- Top 20 Domains by Reward ---
        buf.write("\n## Top 20 Domains by Reward\n\n")
        buf.write(self._section_top_domains(final_stats))

        # --- Frontier Health ---
        buf.write("\n## Frontier Health\n\n")
        buf.write(self._section_frontier(final_stats))

        # --- Replay Buffer ---
        buf.write("\n## Replay Buffer\n\n")
        buf.write(self._section_replay(final_stats))

        # --- Domain Diversity Chart ---
        buf.write("\n## Domain Diversity\n\n")
        buf.write("```\n")
        buf.write(self._section_domain_diversity(final_stats))
        buf.write("```\n")

        # --- Reward Distribution ---
        buf.write("\n## Reward Distribution\n\n")
        buf.write("```\n")
        buf.write(self._section_reward_distribution(final_stats))
        buf.write("```\n")

        # --- Recommendations ---
        buf.write("\n## Recommendations for Next Run\n\n")
        buf.write(self._section_recommendations(final_stats))

        return buf.getvalue()

    def _section_overview(
        self,
        stats: Dict[str, Any],
        start_time: Optional[float],
        end_time: Optional[float],
    ) -> str:
        """Generate the overview section."""
        step = stats.get("global_step", 0)
        rewards = stats.get("rewards", {})
        harvest = rewards.get("harvest_rate", 0.0)
        positive = rewards.get("positive_count", 0)
        total_rewards = rewards.get("total", 0)

        duration = ""
        if start_time and end_time:
            duration = f"- **Duration:** {_format_duration(end_time - start_time)}\n"

        pages_per_sec = ""
        if start_time and end_time and end_time > start_time:
            pps = step / (end_time - start_time)
            pages_per_sec = f"- **Throughput:** {pps:.1f} pages/sec\n"

        return (
            f"- **Pages crawled:** {_format_number(step)}\n"
            f"- **Leads found:** {positive}\n"
            f"- **Harvest rate:** {harvest:.2%}\n"
            f"{duration}"
            f"{pages_per_sec}"
            f"- **Mean reward:** {rewards.get('mean', 0.0):.4f}\n"
        )

    def _section_training(self, stats: Dict[str, Any]) -> str:
        """Generate the training section."""
        dqn = stats.get("dqn", {})
        if not dqn:
            return "_No training data available (inference-only mode)._\n"

        loss = dqn.get("avg_loss", 0.0)
        q_mean = dqn.get("mean_q", 0.0)
        epsilon = dqn.get("epsilon", 1.0)
        train_step = dqn.get("train_step", 0)
        convergence = dqn.get("convergence_status", "unknown")

        return (
            f"- **Final loss:** {loss:.6f}\n"
            f"- **Mean Q-value:** {q_mean:.4f}\n"
            f"- **Final epsilon:** {epsilon:.4f}\n"
            f"- **Training steps:** {_format_number(train_step)}\n"
            f"- **Convergence:** {convergence}\n"
        )

    def _section_top_domains(self, stats: Dict[str, Any]) -> str:
        """Generate the top-20 domains table."""
        crawler = stats.get("crawler", {})
        domain_stats = crawler.get("domain_stats", [])

        if not domain_stats:
            return "_No domain data available._\n"

        top = domain_stats[:20]
        headers = ["Domain", "Pages", "Avg Reward", "Leads", "Total Reward"]
        rows = [
            [
                d.get("domain", "?"),
                d.get("pages_crawled", 0),
                f"{d.get('avg_reward', 0.0):.4f}",
                d.get("leads_found", 0),
                f"{d.get('reward_sum', 0.0):.2f}",
            ]
            for d in top
        ]

        return "```\n" + self._table.render(
            headers, rows,
            alignment=["left", "right", "right", "right", "right"],
        ) + "```\n"

    def _section_frontier(self, stats: Dict[str, Any]) -> str:
        """Generate the frontier health section."""
        crawler = stats.get("crawler", {})
        frontier = crawler.get("frontier", {})

        if not frontier:
            return "_No frontier data available._\n"

        pending = frontier.get("pending", 0)
        completed = frontier.get("completed", 0)
        failed = frontier.get("failed", 0)
        total = pending + completed + failed
        success_rate = completed / max(total, 1)

        return (
            f"- **Pending URLs:** {_format_number(pending)}\n"
            f"- **Completed:** {_format_number(completed)}\n"
            f"- **Failed:** {_format_number(failed)}\n"
            f"- **Total:** {_format_number(total)}\n"
            f"- **Success rate:** {success_rate:.1%}\n"
        )

    def _section_replay(self, stats: Dict[str, Any]) -> str:
        """Generate the replay buffer section."""
        replay = stats.get("replay", {})

        if not replay:
            return "_No replay buffer data available._\n"

        size = replay.get("size", 0)
        capacity = replay.get("capacity", 1)
        unresolved = replay.get("unresolved_rewards", 0)
        utilisation = size / max(capacity, 1)

        return (
            f"- **Size:** {_format_number(size)} / {_format_number(capacity)}\n"
            f"- **Utilisation:** {utilisation:.1%}\n"
            f"- **Unresolved rewards:** {_format_number(unresolved)}\n"
        )

    def _section_domain_diversity(self, stats: Dict[str, Any]) -> str:
        """Generate ASCII histogram of domain diversity."""
        crawler = stats.get("crawler", {})
        domain_stats = crawler.get("domain_stats", [])

        if not domain_stats:
            return "(no domain data)\n"

        labels = [d.get("domain", "?")[:20] for d in domain_stats[:15]]
        values = [d.get("pages_crawled", 0) for d in domain_stats[:15]]

        return self._hist.plot(
            labels, values,
            width=35,
            title="Pages per Domain (top 15)",
        )

    def _section_reward_distribution(self, stats: Dict[str, Any]) -> str:
        """Generate ASCII histogram of reward distribution."""
        rewards = stats.get("rewards", {})
        if not rewards:
            return "(no reward data)\n"

        # Build histogram buckets from available stats
        total = rewards.get("total", 0)
        positive = rewards.get("positive_count", 0)
        negative = total - positive

        labels = ["negative (< 0)", "zero", "positive (> 0)"]
        # Approximate: we only have total, mean, and positive_count
        mean = rewards.get("mean", 0.0)
        if mean < 0 and positive == 0:
            values = [total, 0, 0]
        else:
            values = [negative, 0, positive]

        return self._hist.plot(
            labels, values,
            width=35,
            title="Reward Distribution",
        )

    def _section_recommendations(self, stats: Dict[str, Any]) -> str:
        """Generate recommendations based on final stats."""
        recs: List[str] = []

        # Check harvest rate
        rewards = stats.get("rewards", {})
        harvest = rewards.get("harvest_rate", 0.0)
        if harvest < 0.05:
            recs.append(
                "- **Low harvest rate** ({:.1%}): Consider adding more targeted "
                "seed URLs or adjusting reward thresholds.".format(harvest)
            )

        # Check training convergence
        dqn = stats.get("dqn", {})
        convergence = dqn.get("convergence_status", "")
        if convergence and convergence != "converged":
            recs.append(
                f"- **Not converged** ({convergence}): Consider increasing "
                "max_pages or adjusting learning rate."
            )

        # Check epsilon
        epsilon = dqn.get("epsilon", 1.0)
        if epsilon > 0.3:
            recs.append(
                f"- **High epsilon** ({epsilon:.3f}): The agent is still "
                "exploring heavily. Longer runs or faster epsilon decay recommended."
            )

        # Check frontier health
        crawler = stats.get("crawler", {})
        frontier = crawler.get("frontier", {})
        pending = frontier.get("pending", 0)
        if pending == 0:
            recs.append(
                "- **Frontier exhausted**: Add more seed URLs or increase "
                "max_links_per_page to discover more URLs."
            )
        failed = frontier.get("failed", 0)
        completed = frontier.get("completed", 0)
        if completed > 0 and failed / max(completed, 1) > 0.3:
            recs.append(
                "- **High failure rate** ({:.0%}): Check network connectivity, "
                "rate limiting, or robots.txt compliance.".format(
                    failed / max(completed, 1)
                )
            )

        # Check replay buffer utilisation
        replay = stats.get("replay", {})
        size = replay.get("size", 0)
        capacity = replay.get("capacity", 1)
        if size / max(capacity, 1) > 0.95:
            recs.append(
                "- **Replay buffer near capacity** ({:.0%}): Consider increasing "
                "buffer capacity or more aggressive pruning.".format(
                    size / max(capacity, 1)
                )
            )

        unresolved = replay.get("unresolved_rewards", 0)
        if unresolved > size * 0.3:
            recs.append(
                f"- **Many unresolved rewards** ({_format_number(unresolved)}): "
                "Extraction pipeline may be lagging. Check Module 2 health."
            )

        # Check Q-value overestimation
        q_mean = dqn.get("mean_q", 0.0)
        if q_mean > 20.0:
            recs.append(
                f"- **Q-value overestimation** (mean={q_mean:.1f}): "
                "Consider lower learning rate or stronger target network updates."
            )

        if not recs:
            recs.append(
                "- Pipeline looks healthy. No immediate action items."
            )

        return "\n".join(recs) + "\n"


# ======================= Progress Bar ========================================

class ProgressBar:
    """Terminal progress bar with ETA and speed tracking.

    Displays: [====>     ] 42% 4200/10000 [12:34<17:05, 5.67 pages/s]

    Usage:
        bar = ProgressBar(total=10000, desc="Crawling")
        for page in pages:
            process(page)
            bar.update()
        bar.close()
    """

    def __init__(
        self,
        total: int,
        desc: str = "",
        width: int = 40,
        stream: Any = None,
        unit: str = "pages",
    ) -> None:
        self._total = total
        self._desc = desc
        self._width = width
        self._stream = stream or sys.stderr
        self._unit = unit

        self._n: int = 0
        self._start_time: float = time.monotonic()
        self._last_print_time: float = 0.0
        self._min_interval: float = 0.1  # rate-limit to 10 fps
        self._closed = False

    def update(self, n: int = 1) -> None:
        """Advance the progress bar by n steps."""
        self._n += n
        now = time.monotonic()
        if now - self._last_print_time < self._min_interval:
            if self._n < self._total:
                return
        self._last_print_time = now
        self._render()

    def _render(self) -> None:
        """Render the progress bar to the stream."""
        elapsed = time.monotonic() - self._start_time
        fraction = self._n / max(self._total, 1)
        fraction = min(fraction, 1.0)

        # Bar
        filled = int(fraction * self._width)
        arrow = ">" if filled < self._width else ""
        bar = "=" * max(0, filled - 1) + arrow + " " * (self._width - filled)

        # Percentage
        pct = f"{fraction:>6.1%}"

        # Count
        count = f"{self._n}/{self._total}"

        # Speed
        speed = self._n / max(elapsed, 0.001)
        speed_str = f"{speed:.2f} {self._unit}/s"

        # ETA
        if speed > 0 and self._n < self._total:
            remaining = (self._total - self._n) / speed
            eta_str = _format_duration(remaining)
        else:
            eta_str = "0s"

        elapsed_str = _format_duration(elapsed)

        # Description prefix
        desc = f"{self._desc}: " if self._desc else ""

        line = (
            f"\r{desc}[{bar}] {pct} {count}"
            f" [{elapsed_str}<{eta_str}, {speed_str}]"
        )

        self._stream.write(f"{_ANSI.CLEAR_LINE}{line}")
        self._stream.flush()

    def close(self) -> None:
        """Finalise the progress bar (print newline, show cursor)."""
        if self._closed:
            return
        self._closed = True
        # Force a final render
        self._last_print_time = 0.0
        self._render()
        self._stream.write("\n")
        self._stream.flush()

    def __enter__(self) -> "ProgressBar":
        return self

    def __exit__(self, *exc: Any) -> None:
        self.close()


# ======================= Domain Map ==========================================

class DomainMap:
    """ASCII visualization of domain relationships as a tree.

    Groups pages under their parent domain and shows the hierarchy
    with crawl statistics per branch.

    Usage:
        dmap = DomainMap()
        print(dmap.render(domain_stats))
    """

    def render(
        self,
        domain_stats: List[Dict[str, Any]],
        max_domains: int = 20,
    ) -> str:
        """Render a tree/graph of domain relationships.

        Args:
            domain_stats: list of domain stat dicts from DomainScheduler.get_all_stats().
            max_domains: maximum number of domains to display.

        Returns:
            Multi-line string with the rendered tree.
        """
        if not domain_stats:
            return "(no domain data)"

        # Sort by total reward descending
        sorted_stats = sorted(
            domain_stats,
            key=lambda d: d.get("reward_sum", 0.0),
            reverse=True,
        )[:max_domains]

        # Group by parent domain (second-level domain)
        groups: Dict[str, List[Dict[str, Any]]] = {}
        for d in sorted_stats:
            domain = d.get("domain", "")
            parent = self._extract_parent_domain(domain)
            groups.setdefault(parent, []).append(d)

        buf = io.StringIO()
        buf.write(f"{_ANSI.BOLD}Domain Relationship Map{_ANSI.RESET}\n")
        buf.write(f"{_ANSI.DIM}{'=' * 60}{_ANSI.RESET}\n")

        group_list = sorted(
            groups.items(),
            key=lambda kv: sum(d.get("reward_sum", 0.0) for d in kv[1]),
            reverse=True,
        )

        for g_idx, (parent, children) in enumerate(group_list):
            is_last_group = g_idx == len(group_list) - 1
            group_prefix = "\u2514" if is_last_group else "\u251c"
            child_prefix_cont = " " if is_last_group else "\u2502"

            total_pages = sum(c.get("pages_crawled", 0) for c in children)
            total_reward = sum(c.get("reward_sum", 0.0) for c in children)
            total_leads = sum(c.get("leads_found", 0) for c in children)

            colour = _ANSI.GREEN if total_reward > 0 else _ANSI.RED
            buf.write(
                f"{group_prefix}\u2500\u2500 {_ANSI.BOLD}{parent}{_ANSI.RESET}"
                f"  {_ANSI.DIM}("
                f"pg:{total_pages}"
                f"  r:{colour}{total_reward:.2f}{_ANSI.RESET}{_ANSI.DIM}"
                f"  L:{total_leads}"
                f"){_ANSI.RESET}\n"
            )

            for c_idx, child in enumerate(children):
                is_last_child = c_idx == len(children) - 1
                node = "\u2514" if is_last_child else "\u251c"
                domain = child.get("domain", "?")
                pages = child.get("pages_crawled", 0)
                avg_r = child.get("avg_reward", 0.0)
                leads = child.get("leads_found", 0)

                r_colour = _ANSI.GREEN if avg_r > 0 else _ANSI.RED
                bar = self._micro_bar(pages, total_pages, 10)

                buf.write(
                    f"{child_prefix_cont}   {node}\u2500 {domain:<30}"
                    f" {bar}"
                    f" pg:{pages:>4}"
                    f" r:{r_colour}{avg_r:>6.3f}{_ANSI.RESET}"
                    f" L:{leads}\n"
                )

        buf.write(f"{_ANSI.DIM}{'=' * 60}{_ANSI.RESET}\n")
        buf.write(
            f"{_ANSI.DIM}"
            f"Showing {len(sorted_stats)} domains in {len(groups)} groups"
            f"{_ANSI.RESET}\n"
        )

        return buf.getvalue()

    @staticmethod
    def _extract_parent_domain(domain: str) -> str:
        """Extract the registrable (parent) domain from a subdomain.

        e.g. "careers.example.com" -> "example.com"
             "example.com" -> "example.com"
             "a.b.example.co.uk" -> "example.co.uk"
        """
        parts = domain.split(".")

        # Handle known two-part TLDs
        two_part_tlds = {
            "co.uk", "com.au", "co.jp", "co.nz", "com.br",
            "co.za", "com.cn", "org.uk", "net.au", "co.in",
        }
        if len(parts) >= 3:
            candidate_tld = ".".join(parts[-2:])
            if candidate_tld in two_part_tlds:
                return ".".join(parts[-3:])

        if len(parts) >= 2:
            return ".".join(parts[-2:])
        return domain

    @staticmethod
    def _micro_bar(value: int, total: int, width: int) -> str:
        """Tiny inline bar showing proportion."""
        if total == 0:
            return _ANSI.DIM + "\u2500" * width + _ANSI.RESET
        frac = value / total
        filled = int(frac * width)
        filled = max(0, min(width, filled))
        colour = _ANSI.colour_bar(frac)
        return (
            f"{colour}{_BAR_CHARS[0] * filled}{_ANSI.RESET}"
            f"{_ANSI.DIM}{'\u2500' * (width - filled)}{_ANSI.RESET}"
        )
