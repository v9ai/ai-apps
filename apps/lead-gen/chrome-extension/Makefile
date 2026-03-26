RUST_CRATE := ../crates/linkedin-posts
ENV_FILE   := ../.env.local

.PHONY: dev start server build clean

# Extract NEON_DATABASE_URL from the Next.js env file (value contains & so must be quoted)
load_env = export NEON_DATABASE_URL="$$(grep '^NEON_DATABASE_URL=' $(ENV_FILE) | cut -d= -f2-)"

# Run both Rust server + Chrome extension dev in parallel
dev:
	@trap 'kill 0' EXIT; \
	($(load_env) && cd $(RUST_CRATE) && cargo run --release) & \
	pnpm dev & \
	wait

# Alias for dev
start: dev

# Rust server only
server:
	$(load_env) && cd $(RUST_CRATE) && cargo run --release

# Build both
build:
	cd $(RUST_CRATE) && cargo build --release
	pnpm build

clean:
	cd $(RUST_CRATE) && cargo clean
	rm -rf dist_chrome
