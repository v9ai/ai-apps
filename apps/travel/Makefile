CRATE = crates/travel-ml

.PHONY: start

start:
	cd $(CRATE) && cargo test --lib --bin travel-discover --bin travel-sanitize
	cd $(CRATE) && RUST_LOG=info cargo run --bin travel-discover
	cd $(CRATE) && RUST_LOG=info cargo run --bin travel-sanitize
	vercel --prod --yes
