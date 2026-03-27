99% of web crawlers are built wrong. They treat it as a graph traversal problem. It's not—it's a resource allocation problem under extreme uncertainty.

You have finite time and bandwidth to explore an infinite, non-stationary graph. Static BFS/DFS leaves an enormous efficiency gap. A static list of seed paths yields a ~15% harvest rate for lead gen. That's embarrassingly low.

The correct formulation is a multi-armed bandit. Each website is an "arm." Your crawl budget is the coin. The reward is the contacts found. Your goal: maximize reward by learning which domains are currently fruitful and adapting as they change.

Here’s how to build one in ~600 lines of Rust, with zero ML dependencies:

→ Implement a **Discounted UCB** scheduler. It exponentially decays old observations, letting you rapidly deprioritize domains that dry up. A reward from 100 seconds ago can have near-zero weight.

→ Use **Thompson Sampling** for cold starts. Sample from a Beta distribution for each domain to balance exploration/exploitation. Implement the Gamma sampler from scratch—it's just math.

→ Create an **adaptive URL scorer**. When an LLM extracts contacts from `/team/engineering`, boost future URLs containing "team" or "engineering." It's a simple keyword frequency map that learns domain-specific patterns online.

→ Design a **composite reward signal**. Blend contact yield (40%), email yield (25%), content density (20%), and novelty (15%). This prevents the system from obsessing over low-quality sources.

The result? 2-3x better path discovery, finding high-value pages like `/investors/board` that static heuristics miss. Adaptation happens in 3-5 crawl cycles.

The barrier to adaptive intelligence isn't library availability—it's algorithmic understanding. Reframe your crawler from a graph traversal to a resource allocation problem.

See the full implementation, complete with Rust code snippets and the research synthesis: [Link to Blog Post]

#WebCrawling #ReinforcementLearning #MultiArmedBandit #RustLang #SystemsDesign #DataEngineering