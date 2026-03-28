CRATE = ../../crates/travel-ml

.PHONY: start ischia

start:
	cd $(CRATE) && cargo test --lib
	cd $(CRATE) && RUST_LOG=info cargo run --bin travel-discover
	vercel --prod --yes

ischia:
	cd $(CRATE) && cargo test --lib
	cd $(CRATE) && RUST_LOG=info cargo run --bin travel-ischia -- --skip-reviews
	vercel --prod --yes
