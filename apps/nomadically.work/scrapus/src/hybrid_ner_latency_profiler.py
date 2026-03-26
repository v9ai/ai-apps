import time
from typing import Dict

class PerformanceBenchmark:
    """Measure latency and memory for each pipeline stage."""
    
    def __init__(self, pipeline: HybridNERPipeline):
        self.pipeline = pipeline
        self.results = {}
    
    def benchmark_latency(self, texts: list, num_runs: int = 3) -> Dict:
        """Measure end-to-end latency."""
        
        latencies = []
        for _ in range(num_runs):
            start_time = time.time()
            for text in texts:
                _ = self.pipeline.process(text)
            elapsed = time.time() - start_time
            latencies.append(elapsed / len(texts))  # Per-text latency
        
        avg_latency = np.mean(latencies)
        std_latency = np.std(latencies)
        
        print(f"\nLatency: {avg_latency*1000:.1f}ms ± {std_latency*1000:.1f}ms per document")
        
        return {
            "avg_ms": avg_latency * 1000,
            "std_ms": std_latency * 1000,
            "throughput_per_sec": 1 / avg_latency,
        }
    
    def benchmark_memory(self) -> Dict:
        """Measure peak memory during pipeline execution."""
        
        mem_before = self.pipeline.mem_manager.get_memory_usage()
        
        # Simulate processing
        test_text = "Acme Corp, founded in 2020 by John Smith, is a SF-based AI company. " * 10
        entities = self.pipeline.process(test_text)
        
        mem_peak = self.pipeline.mem_manager.current_memory_mb
        mem_after = self.pipeline.mem_manager.get_memory_usage()
        
        print(f"\nMemory Usage:")
        print(f"  Peak: {mem_peak:.1f}MB")
        print(f"  After cleanup: {mem_after:.1f}MB")
        print(f"  Headroom: {self.pipeline.mem_manager.max_memory_mb - mem_peak:.1f}MB")
        
        return {
            "peak_mb": mem_peak,
            "after_cleanup_mb": mem_after,
            "headroom_mb": self.pipeline.mem_manager.max_memory_mb - mem_peak,
        }
