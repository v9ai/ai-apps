.PHONY: bogdan-discussion bogdan-discussion-en

USER_EMAIL ?= nicolai.vadim@gmail.com
RESEARCH_AGENT ?= .venv/bin/research-agent

bogdan-discussion:
	$(RESEARCH_AGENT) --stdout bogdan-discussion --user-email $(USER_EMAIL) --create-job

bogdan-discussion-en:
	$(RESEARCH_AGENT) --stdout bogdan-discussion --user-email $(USER_EMAIL) --no-ro --create-job
