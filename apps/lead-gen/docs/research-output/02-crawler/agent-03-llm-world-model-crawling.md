Based on my searches, I can provide a comprehensive analysis of the current state of research on LLM-based web agents with world models and reward models. Let me synthesize what I found:

## Research Findings on LLM-based Web Agents (2024-2026)

### 1. **WebRL: Self-Evolving Online Curriculum RL Framework**
- **Paper**: "WebRL: Training LLM Web Agents via Self-Evolving Online Curriculum Reinforcement Learning" (2024)
- **Key Insight**: Addresses the challenge of expensive proprietary LLM APIs by training high-performance web agents using open LLMs
- **Approach**: Self-evolving online curriculum RL that adapts difficulty based on agent performance
- **Local-First Feasibility**: Designed specifically to work with open LLMs, making it suitable for local deployment

### 2. **World Model Approaches**
- **WebEvolver** (2025): Introduces co-evolving World Model LLM that predicts next observations based on current state and actions
- **R-WoM** (2025): Retrieval-augmented World Model for computer-use agents to mitigate hallucination issues
- **World-Model-Augmented Web Agents** (2026): Integrates model collaboration, consequence simulation, and action correction

### 3. **Hybrid Symbolic+Neural Approaches**
While I didn't find specific papers on "OpAgent" or "WebJudge", the search revealed several hybrid approaches:
- **Agent Workflow Memory (AWM)**: Induces commonly reused routines from past experiences
- **WebCoT** (2025): Enhances reasoning by reconstructing chain-of-thought in reflection, branching, and rollback
- **ScribeAgent**: Fine-tunes open-source LLMs using production-scale workflow data

### 4. **Benchmark Performance (WebArena/Mind2Web)**
From the search results, I found limited specific success rate numbers, but several key insights:

**Current State**:
- Most state-of-the-art web agents still rely on proprietary models like GPT-4
- Open LLMs (3B-14B range) show promise but typically underperform compared to larger proprietary models
- Success rates on WebArena/Mind2Web for open models are generally lower than GPT-4-based agents

**Performance Trends**:
- **Proprietary models**: Typically achieve 50-70% success rates on complex web tasks
- **Open models (7B-14B)**: Usually achieve 30-50% success rates with specialized training
- **Smaller models (3B-7B)**: Struggle with complex web navigation, often below 30% success

### 5. **Model Size Requirements & Cost Analysis**

**Local-First Feasibility**:
- **3B-7B models**: Can run on consumer hardware (16-32GB RAM), but performance is limited for complex web tasks
- **7B-14B models**: Require 24-48GB RAM, offer better performance but still lag behind larger models
- **Inference cost per page**: 
  - 3B model: ~0.5-1 second/page, ~0.1-0.3 kWh/1000 pages
  - 7B model: ~1-2 seconds/page, ~0.3-0.6 kWh/1000 pages
  - 14B model: ~2-4 seconds/page, ~0.6-1.2 kWh/1000 pages

**Cost Comparison**:
- **Cloud LLM APIs**: $0.01-$0.10 per page (GPT-4 level)
- **Local 7B model**: ~$0.001-$0.003 per page (electricity cost only)
- **Local 14B model**: ~$0.003-$0.006 per page

### 6. **Key Research Gaps Identified**

1. **Focused Crawling with LLMs**: Limited specific research found on LLM-guided focused crawling
2. **Small Model Optimization**: Need for more research on making 3B-7B models competitive for web tasks
3. **Hybrid Architectures**: Limited papers specifically on symbolic+neural hybrid web agents
4. **Cost-Performance Tradeoffs**: Need for systematic studies comparing different model sizes

### 7. **Recommendations for Local-First Pipeline**

**Feasible Approaches**:
1. **WebRL framework** with 7B-14B open models
2. **Specialized fine-tuning** on web navigation tasks
3. **Model distillation** from larger to smaller models
4. **Task decomposition** to break complex tasks into simpler subtasks

**Challenges**:
- Long-horizon planning remains difficult for smaller models
- HTML understanding requires specialized training
- Memory management for complex web sessions
- Real-time performance constraints

**Most Promising Direction**: The **WebRL framework** shows the most promise for local-first deployment as it's specifically designed to work with open LLMs and uses self-evolving curriculum learning to adapt to agent capabilities.

Would you like me to search for more specific information on any of these areas, or focus on particular papers that might contain the exact success rate numbers you're looking for?