CRATE = crates/travel-ml
BIN = $(CRATE)/target/debug/travel-ml

.PHONY: start ischia ischia-fast long-stay reviews-store reviews-search reviews-stats build

build:
	cd $(CRATE) && cargo build --bin travel-ml

start: build
	cd $(CRATE) && cargo test --lib
	RUST_LOG=info $(BIN) discover
	vercel --prod --yes

ischia: build
	cd $(CRATE) && cargo test --lib
	RUST_LOG=info $(BIN) discover
	vercel --prod --yes

ischia-fast: build
	cd $(CRATE) && cargo test --lib
	RUST_LOG=info $(BIN) discover -- --skip-reviews
	vercel --prod --yes

long-stay: build
	cd $(CRATE) && cargo test --lib
	RUST_LOG=info $(BIN) discover-long-stay
	vercel --prod --yes

reviews-store: build
	RUST_LOG=info $(BIN) reviews-store --input src/data/hotels_2026.json --db data/reviews.lance
	cp -r $(CRATE)/data/reviews.lance data/reviews.lance
	@echo "✅ Reviews stored in data/reviews.lance"

reviews-search: build
	$(BIN) reviews-search --query "$(QUERY)" --db data/reviews.lance --top-k $(or $(TOP_K),10)

reviews-stats: build
	$(BIN) reviews-stats --db data/reviews.lance

reviews-list: build
	$(BIN) reviews-list --db data/reviews.lance --limit $(or $(LIMIT),50) $(if $(HOTEL),--hotel-id $(HOTEL),) $(if $(FULL),--full,)
