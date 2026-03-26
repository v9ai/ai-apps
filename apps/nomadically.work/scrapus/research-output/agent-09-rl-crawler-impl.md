Based on my research, I'll now provide comprehensive implementation best practices for the RL-based crawler. Let me synthesize the key findings from the literature.

# Implementation Best Practices for RL-Based Web Crawler

Based on prior literature research, here are actionable implementation guidelines for your RL-based focused web crawler:

## 1. DQN Hyperparameter Tuning for Crawl Environments

### Epsilon Schedule Design
**Research-based recommendation:** Use a decaying epsilon-greedy strategy with careful annealing:

```python
class EpsilonScheduler:
    def __init__(self, start=1.0, end=0.01, decay_steps=100000):
        self.start = start
        self.end = end
        self.decay_steps = decay_steps
        self.decay_rate = (start - end) / decay_steps
    
    def get_epsilon(self, step):
        # Linear decay
        epsilon = max(self.end, self.start - step * self.decay_rate)
        # Or exponential decay: epsilon = self.end + (self.start - self.end) * exp(-step/self.decay_steps)
        return epsilon
```

**Key insights from literature:**
- **Mnih et al. (2015)** [Human-level control through deep reinforcement learning](https://doi.org/10.1038/nature14236) used ε annealed from 1.0 to 0.1 over 1M steps
- For web crawling, start with ε=1.0 (full exploration), decay to ε=0.01 over 50K-100K pages
- Consider adaptive ε based on reward variance: increase exploration when rewards become inconsistent

### Replay Buffer Configuration
**Optimal sizing based on research:**

```python
# LanceDB replay buffer configuration
REPLAY_BUFFER_SIZE = 100000  # Mnih et al. used 1M, but 100K sufficient for web crawling
BATCH_SIZE = 64              # Standard from DQN literature
MIN_REPLAY_SIZE = 1000       # Start training after buffer has minimum samples

# Prioritized Experience Replay (PER) implementation
class PrioritizedReplayBuffer:
    def __init__(self, capacity, alpha=0.6, beta=0.4):
        self.capacity = capacity
        self.alpha = alpha  # controls prioritization (0 = uniform)
        self.beta = beta    # importance sampling correction
        self.priorities = np.zeros(capacity)
        self.position = 0
    
    def add(self, experience, td_error):
        priority = (abs(td_error) + 1e-6) ** self.alpha
        self.priorities[self.position] = priority
        # Store in LanceDB with priority field
        replay_table.add([{
            **experience,
            "priority": float(priority),
            "timestamp": time.time()
        }])
```

**Research findings:**
- **Schaul et al. (2015)** [Prioritized Experience Replay](https://arxiv.org/abs/1511.05952) shows PER improves sample efficiency by 2x
- Use α=0.6 for moderate prioritization, β annealed from 0.4 to 1.0 during training
- Store TD-error alongside experiences in LanceDB for efficient priority updates

### Network Architecture
```python
class DQNNetwork(nn.Module):
    def __init__(self, state_dim=448, action_dim=10):
        super().__init__()
        # Three-layer architecture based on DQN literature
        self.fc1 = nn.Linear(state_dim, 512)
        self.fc2 = nn.Linear(512, 256)
        self.fc3 = nn.Linear(256, action_dim)
        
    def forward(self, x):
        x = F.relu(self.fc1(x))
        x = F.relu(self.fc2(x))
        return self.fc3(x)
```

**Hyperparameter recommendations:**
- Learning rate: 1e-4 to 1e-3 (Adam optimizer)
- Discount factor γ: 0.99 (standard for long-horizon tasks)
- Target network update frequency: Every 1000 steps
- Gradient clipping: Norm of 10 to prevent explosion

## 2. MAB Algorithm Selection for Domain Scheduling

### UCB1 vs Thompson Sampling Analysis

```python
class DomainScheduler:
    def __init__(self, algorithm="ucb1"):
        self.algorithm = algorithm
        self.domain_stats = {}  # SQLite-backed
        
    def select_domain(self):
        if self.algorithm == "ucb1":
            return self._ucb1_selection()
        elif self.algorithm == "thompson":
            return self._thompson_sampling()
        elif self.algorithm == "contextual":
            return self._contextual_bandit()
    
    def _ucb1_selection(self):
        """Upper Confidence Bound 1 algorithm"""
        total_pages = sum(stats["pages_crawled"] for stats in self.domain_stats.values())
        
        best_domain = None
        best_score = -float('inf')
        
        for domain, stats in self.domain_stats.items():
            if stats["pages_crawled"] == 0:
                score = float('inf')  # Force exploration of new domains
            else:
                avg_reward = stats["reward_sum"] / stats["pages_crawled"]
                exploration = math.sqrt(2 * math.log(total_pages) / stats["pages_crawled"])
                score = avg_reward + exploration
            
            if score > best_score:
                best_score = score
                best_domain = domain
        
        return best_domain
    
    def _thompson_sampling(self):
        """Thompson Sampling for Bernoulli rewards"""
        best_domain = None
        best_sample = -float('inf')
        
        for domain, stats in self.domain_stats.items():
            # Beta distribution parameters
            alpha = stats["leads_found"] + 1  # +1 for prior
            beta = stats["pages_crawled"] - stats["leads_found"] + 1
            
            # Sample from Beta distribution
            sample = np.random.beta(alpha, beta)
            
            if sample > best_sample:
                best_sample = sample
                best_domain = domain
        
        return best_domain
    
    def _contextual_bandit(self):
        """Contextual bandit using LinUCB"""
        # Use page embeddings as context
        # Implement LinUCB algorithm for domain selection
        pass
```

**Algorithm selection guidance:**
- **UCB1**: Best for deterministic exploration, proven optimal regret bounds
- **Thompson Sampling**: Better for stochastic environments, adapts faster to changing rewards
- **Contextual Bandits**: Use when domain features (industry, size, location) are available

**Recommendation**: Start with UCB1 for simplicity, transition to Thompson Sampling if reward variance is high.

## 3. Politeness and Rate Limiting Implementation

### Adaptive Rate Limiting System

```python
class PolitenessManager:
    def __init__(self):
        self.domain_delays = {}  # SQLite-backed
        self.robots_cache = {}
        self.failure_counts = {}
        
    def get_delay(self, domain):
        """Calculate adaptive delay for domain"""
        base_delay = self._get_robots_delay(domain)
        
        # Adaptive component based on performance
        if domain in self.failure_counts:
            failure_rate = self.failure_counts[domain] / 100  # Last 100 requests
            if failure_rate > 0.1:  # >10% failure rate
                base_delay *= (1 + failure_rate * 5)  # Increase delay
        
        # Success-based reduction
        if domain in self.domain_stats and self.domain_stats[domain]["success_rate"] > 0.95:
            base_delay = max(1.0, base_delay * 0.8)  # Reduce delay for reliable domains
        
        return base_delay
    
    def _get_robots_delay(self, domain):
        """Parse robots.txt and extract crawl-delay"""
        if domain not in self.robots_cache:
            try:
                robots_url = f"http://{domain}/robots.txt"
                response = requests.get(robots_url, timeout=5)
                if response.status_code == 200:
                    # Parse crawl-delay directive
                    for line in response.text.split('\n'):
                        if line.lower().startswith('crawl-delay:'):
                            delay = float(line.split(':')[1].strip())
                            self.robots_cache[domain] = delay
                            break
            except:
                pass
            
            # Default delay if not specified
            self.robots_cache[domain] = self.robots_cache.get(domain, 2.0)
        
        return self.robots_cache[domain]
    
    def update_performance(self, domain, success):
        """Update failure counts and adjust delays"""
        if domain not in self.failure_counts:
            self.failure_counts[domain] = deque(maxlen=100)
        
        self.failure_counts[domain].append(0 if success else 1)
```

**Best practices from literature:**
- Always respect `robots.txt` and `Crawl-delay` directives
- Implement exponential backoff for failed requests (1s, 2s, 4s, 8s...)
- Monitor HTTP status codes: 429 (Too Many Requests) and 503 (Service Unavailable) trigger backoff
- Maintain separate delay pools for different TLDs (.com, .gov, .edu)

## 4. Frontier Queue Data Structures

### Optimized Priority Queue with Bloom Filters

```python
class FrontierQueue:
    def __init__(self, max_size=1000000):
        self.priority_queue = []  # Min-heap for SQLite integration
        self.url_set = set()      # In-memory for fast lookups
        self.bloom_filter = BloomFilter(max_size, error_rate=0.001)
        self.domain_queues = {}   # Per-domain subqueues
        
    def add_url(self, url, priority, domain):
        """Add URL to frontier with deduplication"""
        url_hash = hashlib.md5(url.encode()).hexdigest()
        
        # Bloom filter check (fast, probabilistic)
        if self.bloom_filter.check(url_hash):
            # Possible false positive, check exact set
            if url in self.url_set:
                return False  # Duplicate
        
        # Add to all structures
        self.bloom_filter.add(url_hash)
        self.url_set.add(url)
        
        # Add to SQLite frontier table
        self._sqlite_add(url, domain, priority)
        
        # Maintain in-memory heap for quick access
        heapq.heappush(self.priority_queue, (-priority, url, domain))
        
        return True
    
    def get_next_url(self):
        """Get highest priority URL using MAB-informed selection"""
        # Combine DQN Q-values with domain UCB scores
        candidates = []
        for _ in range(min(100, len(self.priority_queue))):
            priority, url, domain = heapq.heappop(self.priority_queue)
            domain_score = self.domain_scheduler.get_score(domain)
            combined_score = -priority * 0.7 + domain_score * 0.3
            candidates.append((combined_score, url, domain))
        
        # Select best candidate
        if candidates:
            candidates.sort(reverse=True)
            best_score, best_url, best_domain = candidates[0]
            
            # Return remaining candidates to heap
            for score, url, domain in candidates[1:]:
                heapq.heappush(self.priority_queue, (-score, url, domain))
            
            return best_url, best_domain
        
        return None, None
    
    def _sqlite_add(self, url, domain, priority):
        """SQLite integration with atomic operations"""
        with self.connection:
            self.cursor.execute("""
                INSERT OR IGNORE INTO frontier 
                (url, domain, q_value, status, created_at)
                VALUES (?, ?, ?, 'pending', ?)
            """, (url, domain, priority, time.time()))
```

**Data structure recommendations:**
- **Primary storage**: SQLite with WAL mode for concurrent access
- **In-memory cache**: Heapq for priority queue, set for exact deduplication
- **Probabilistic filter**: Bloom filter (pybloom-live) for memory-efficient URL seen-check
- **Per-domain queues**: Separate queues to enforce domain-level rate limiting

## 5. Training Stability Enhancements

### Double DQN Implementation

```python
class DoubleDQNAgent:
    def __init__(self, state_dim, action_dim):
        self.q_network = DQNNetwork(state_dim, action_dim)
        self.target_network = DQNNetwork(state_dim, action_dim)
        self.target_network.load_state_dict(self.q_network.state_dict())
        
        self.optimizer = optim.Adam(self.q_network.parameters(), lr=1e-4)
        self.update_counter = 0
        
    def compute_td_loss(self, batch):
        """Double DQN loss calculation"""
        states, actions, rewards, next_states, dones = batch
        
        # Current Q values
        current_q = self.q_network(states).gather(1, actions.unsqueeze(1))
        
        # Double DQN: use online network to select actions
        with torch.no_grad():
            next_actions = self.q_network(next_states).argmax(1, keepdim=True)
            next_q = self.target_network(next_states).gather(1, next_actions)
            target_q = rewards + (1 - dones) * self.gamma * next_q
        
        # Huber loss for stability
        loss = F.smooth_l1_loss(current_q, target_q)
        
        return loss
    
    def update_target_network(self):
        """Soft or hard target update"""
        # Option 1: Hard update every N steps
        if self.update_counter % self.target_update_freq == 0:
            self.target_network.load_state_dict(self.q_network.state_dict())
        
        # Option 2: Soft update (Polyak averaging)
        # tau = 0.005
        # for target_param, param in zip(self.target_network.parameters(), 
        #                                self.q_network.parameters()):
        #     target_param.data.copy_(tau * param.data + (1 - tau) * target_param.data)
        
        self.update_counter += 1
```

### Prioritized Experience Replay for LanceDB

```python
class LanceDBPrioritizedReplay:
    def __init__(self, db_path, capacity=100000, alpha=0.6):
        self.db = lancedb.connect(db_path)
        self.table = self.db.open_table("replay_buffer")
        self.capacity = capacity
        self.alpha = alpha
        self.beta = 0.4
        self.beta_increment = 0.001
        
    def sample_batch(self, batch_size=64):
        """Sample batch using priority weights"""
        # Get total priority sum
        total_priority = self._get_total_priority()
        
        # Sample indices based on priority
        probabilities = self._get_priorities() / total_priority
        indices = np.random.choice(len(self.table), batch_size, p=probabilities)
        
        # Importance sampling weights
        weights = (len(self.table) * probabilities[indices]) ** -self.beta
        weights /= weights.max()  # Normalize
        
        # Update beta
        self.beta = min(1.0, self.beta + self.beta_increment)
        
        # Fetch batch from LanceDB
        batch = self.table.take(indices).to_pandas()
        
        return batch, indices, weights
    
    def update_priorities(self, indices, td_errors):
        """Update priorities in LanceDB"""
        new_priorities = (np.abs(td_errors) + 1e-6) ** self.alpha
        
        # Update in LanceDB (batch update)
        update_data = pd.DataFrame({
            'index': indices,
            'priority': new_priorities,
            'updated_at': time.time()
        })
        
        # LanceDB update operation
        self.table.merge(update_data, on='index')
```

## 6. Complete Training Loop Integration

```python
class RLCrawlerTrainingSystem:
    def __init__(self):
        # Core components
        self.agent = DoubleDQNAgent(state_dim=448, action_dim=10)
        self.replay_buffer = LanceDBPrioritizedReplay("scrapus_data/lancedb")
        self.frontier = FrontierQueue()
        self.scheduler = DomainScheduler(algorithm="thompson")
        self.politeness = PolitenessManager()
        
        # Training parameters
        self.batch_size = 64
        self.gamma = 0.99
        self.target_update_freq = 1000
        self.learning_starts = 1000
        
    def training_loop(self):
        """Main training loop for crawler"""
        step = 0
        
        while True:
            # Actor: Select and crawl URL
            url, domain = self.frontier.get_next_url()
            if url:
                # Apply politeness delay
                delay = self.politeness.get_delay(domain)
                time.sleep(delay)
                
                # Crawl page
                state, links, success = self.crawl_page(url)
                
                # Select action using epsilon-greedy
                epsilon = self.epsilon_scheduler.get_epsilon(step)
                if random.random() < epsilon:
                    action = random.randint(0, len(links)-1)
                else:
                    with torch.no_grad():
                        state_tensor = torch.FloatTensor(state).unsqueeze(0)
                        q_values = self.agent.q_network(state_tensor)
                        action = q_values.argmax().item()
                
                # Follow link and get next state
                next_url = links[action]
                next_state, reward, done = self.process_page(next_url)
                
                # Store experience in replay buffer
                experience = {
                    "state_vector": state,
                    "action_index": action,
                    "reward": reward,
                    "next_state_vector": next_state,
                    "done": done,
                    "priority": 1.0  # Initial priority
                }
                self.replay_buffer.add(experience)
                
                # Update frontier with new links
                for link in links:
                    self.frontier.add_url(link, q_values.max().item(), domain)
            
            # Learner: Training step
            if step > self.learning_starts and step % 4 == 0:
                batch, indices, weights = self.replay_buffer.sample_batch(self.batch_size)
                
                # Convert to tensors
                states = torch.FloatTensor(batch["state_vector"].tolist())
                actions = torch.LongTensor(batch["action_index"].values)
                rewards =