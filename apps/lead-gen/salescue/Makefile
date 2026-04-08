.PHONY: dev test install

dev:
	uvicorn salescue.server:app --reload --port 8000

test:
	python -m pytest tests/ -v

install:
	pip install -e ".[dev]"
