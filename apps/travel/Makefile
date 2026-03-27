CRATE = crates/travel-ml

.PHONY: sanitize test deploy

sanitize:
	cd $(CRATE) && RUST_LOG=info cargo run --bin travel-sanitize

test:
	cd $(CRATE) && cargo test --lib --bin travel-discover --bin travel-sanitize

deploy: sanitize
	vercel --prod --yes
