# Research Brief: WebAssembly's Quiet Rise in Server-Side Computing

## Summary
WebAssembly (Wasm) is expanding beyond the browser into server-side computing. Fermyon's Spin framework processes cold starts in under 1ms, compared to 200-500ms for traditional containers. Fastly's Compute@Edge processes 18 billion Wasm requests daily, demonstrating production viability.

## Key Facts
- Fermyon Spin achieves <1ms cold starts — Source: Fermyon blog, February 2026
- Fastly processes 18 billion Wasm requests/day on Compute@Edge — Source: Fastly engineering blog, January 2026
- Bytecode Alliance has 30+ member organizations including Microsoft, Google, Intel — Source: bytecodealliance.org
- WASI Preview 2 reached Phase 3 standardization in Q4 2025 — Source: W3C WASI proposal tracker
- Docker now supports Wasm containers via containerd-wasm-shims — Source: Docker blog, March 2025

## Data Points
| Metric | Value | Source | Date |
|---|---|---|---|
| Spin cold start | <1ms | Fermyon benchmarks | Feb 2026 |
| Container cold start | 200-500ms | Cloud benchmarks | 2025 |
| Fastly daily Wasm requests | 18B | Fastly eng blog | Jan 2026 |
| Bytecode Alliance members | 30+ | bytecodealliance.org | 2026 |
| Wasm binary size (typical) | 1-5MB | Various benchmarks | 2025 |

## Sources
1. Fermyon Engineering Blog — https://fermyon.com/blog — Spin performance data
2. Fastly Engineering Blog — https://fastly.com/blog — Compute@Edge metrics
3. Bytecode Alliance — https://bytecodealliance.org — WASI standardization updates
4. Docker Blog — https://docker.com/blog — Wasm container support

## Recommended Angle
Position Wasm as the "third wave" of server compute (VMs → containers → Wasm), using Fermyon's cold start data as the hook. Challenge the assumption that Docker solved the deployment problem.

## Counterarguments / Nuances
- Wasm's language support is still limited — Rust and C/C++ have first-class support, but Python/JS toolchains lag
- Debugging Wasm in production is harder than containers — tooling ecosystem is immature
- Large stateful applications don't benefit much from sub-millisecond cold starts

## Needs Verification
- Claim that "70% of edge computing workloads will use Wasm by 2028" — this appeared in analyst reports but source is unclear
- Memory overhead comparisons need apples-to-apples benchmarks with same workloads

## Suggested Structure
1. Open with the cold start comparison (hook)
2. How Wasm differs from containers architecturally
3. Production case studies (Fastly, Fermyon)
4. The WASI standardization story
5. What's holding it back (honest assessment)
6. Decision framework: when to use Wasm vs containers
