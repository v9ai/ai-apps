ROOT := $(dir $(abspath $(lastword $(MAKEFILE_LIST))))
VENV := $(ROOT).venv/bin

.PHONY: dev test install

install:
	python3.12 -m venv $(ROOT).venv
	$(VENV)/pip install --upgrade pip
	$(VENV)/pip install -e "$(ROOT)[dev]"

dev:
	cd $(ROOT).. && $(ROOT).venv/bin/uvicorn salescue.server:app --reload --port 8000

test:
	cd $(ROOT).. && $(VENV)/python -m pytest salescue/tests/ -v
