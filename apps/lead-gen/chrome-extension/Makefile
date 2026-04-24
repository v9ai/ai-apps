BACKEND_DIR := ../backend
ENV_FILE    := ../.env.local

.PHONY: dev start server build clean

# Extract NEON_DATABASE_URL from the Next.js env file (value contains & so must be quoted)
load_env = export NEON_DATABASE_URL="$$(grep '^NEON_DATABASE_URL=' $(ENV_FILE) | cut -d= -f2-)"

# Run both LinkedIn posts server (Python) + Chrome extension dev in parallel
dev:
	@trap 'kill 0' EXIT; \
	($(load_env) && cd $(BACKEND_DIR) && uv run uvicorn scripts.linkedin_posts_server:app --host 127.0.0.1 --port 9876) & \
	pnpm dev & \
	wait

# Alias for dev
start: dev

# Python server only
server:
	$(load_env) && cd $(BACKEND_DIR) && uv run uvicorn scripts.linkedin_posts_server:app --host 127.0.0.1 --port 9876

# Build the extension (the Python server has no compile step)
build:
	pnpm build

clean:
	rm -rf dist_chrome
