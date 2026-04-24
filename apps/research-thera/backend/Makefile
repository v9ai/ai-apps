.PHONY: bogdan-discussion bogdan-discussion-en

USER_EMAIL ?= nicolai.vadim@gmail.com
RESEARCH_AGENT ?= .venv/bin/research-agent

bogdan-discussion:
	$(RESEARCH_AGENT) bogdan-discussion --user-email $(USER_EMAIL) --create-job --stdout

bogdan-discussion-en:
	$(RESEARCH_AGENT) bogdan-discussion --user-email $(USER_EMAIL) --no-ro --create-job --stdout
