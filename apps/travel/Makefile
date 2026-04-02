CRATE = ../../crates/travel-ml

.PHONY: start ischia ischia-fast long-stay

start:
	cd $(CRATE) && cargo test --lib
	cd $(CRATE) && RUST_LOG=info cargo run --bin travel-discover
	vercel --prod --yes

# Full pipeline: scrape → Candle ML → review analysis → export → deploy
ischia:
	cd $(CRATE) && cargo test --lib
	cd $(CRATE) && RUST_LOG=info cargo run --bin travel-ischia
	vercel --prod --yes

# Fast variant: skip review analysis (no sentiment/aspect scores)
ischia-fast:
	cd $(CRATE) && cargo test --lib
	cd $(CRATE) && RUST_LOG=info cargo run --bin travel-ischia -- --skip-reviews
	vercel --prod --yes

# Long-stay rental discovery: scrape → ML score → export → deploy
long-stay:
	cd $(CRATE) && cargo test --lib
	cd $(CRATE) && RUST_LOG=info cargo run --bin travel-ml -- discover-long-stay
	vercel --prod --yes
