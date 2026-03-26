"""Simple CLI entry point — delegates to cli.py.

Usage:
    python main.py process --limit 5
    python main.py classify --limit 200
    python main.py match --skills react,typescript
    python main.py cleanup --dry-run
"""

from cli import main

if __name__ == "__main__":
    main()
