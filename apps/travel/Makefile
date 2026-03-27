CRATE = crates/travel-ml

.PHONY: start

start:
	cd $(CRATE) && cargo test --lib --bin travel-ml
	cd $(CRATE) && RUST_LOG=info cargo run --bin travel-ml -- discover
	vercel --prod --yes
