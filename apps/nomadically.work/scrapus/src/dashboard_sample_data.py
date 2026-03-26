"""
Sample data generator for Scrapus monitoring dashboard.
Populates SQLite database with realistic monitoring data for testing.

Usage:
    python generate_sample_data.py
"""

import sqlite3
import json
import numpy as np
import pandas as pd
from pathlib import Path
from datetime import datetime, timedelta
import random

DB_PATH = Path.home() / "scrapus_data" / "scrapus_metrics.db"

def init_database():
    """Create all monitoring tables if they don't exist."""
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    
    tables = [
        """CREATE TABLE IF NOT EXISTS stage_timing (
            id INTEGER PRIMARY KEY,
            stage TEXT NOT NULL,
            elapsed_s REAL NOT NULL,
            mem_before_mb REAL,
            mem_after_mb REAL,
            ts TEXT DEFAULT (datetime('now'))
        )""",
        
        """CREATE TABLE IF NOT EXISTS drift_checks (
            id INTEGER PRIMARY KEY,
            stage TEXT,
            metric TEXT,
            value REAL,
            alert BOOLEAN DEFAULT 0,
            ts TEXT DEFAULT (datetime('now'))
        )""",
        
        """CREATE TABLE IF NOT EXISTS judge_scores (
            id INTEGER PRIMARY KEY,
            report_id TEXT NOT NULL,
            consensus REAL NOT NULL,
            agreement REAL NOT NULL,
            breakdown TEXT,
            ts TEXT DEFAULT (datetime('now'))
        )""",
        
        """CREATE TABLE IF NOT EXISTS error_propagation (
            id INTEGER PRIMARY KEY,
            execution_id TEXT NOT NULL,
            cer REAL NOT NULL,
            eaf REAL NOT NULL,
            matrix_json TEXT,
            ts TEXT DEFAULT (datetime('now'))
        )""",
        
        """CREATE TABLE IF NOT EXISTS quality_gates (
            id INTEGER PRIMARY KEY,
            metric TEXT NOT NULL,
            threshold REAL NOT NULL,
            current_value REAL NOT NULL,
            passed INTEGER DEFAULT 1,
            ts TEXT DEFAULT (datetime('now'))
        )""",
        
        """CREATE TABLE IF NOT EXISTS model_loading (
            id INTEGER PRIMARY KEY,
            model_name TEXT NOT NULL,
            load_time_s REAL,
            size_mb REAL,
            status TEXT,
            ts TEXT DEFAULT (datetime('now'))
        )""",
        
        """CREATE TABLE IF NOT EXISTS memory_usage (
            id INTEGER PRIMARY KEY,
            process_rss_mb REAL NOT NULL,
            peak_mb REAL,
            ts TEXT DEFAULT (datetime('now'))
        )""",
        
        """CREATE TABLE IF NOT EXISTS alerts (
            id INTEGER PRIMARY KEY,
            severity TEXT,
            message TEXT,
            ts TEXT DEFAULT (datetime('now'))
        )""",
    ]
    
    for table_sql in tables:
        try:
            c.execute(table_sql)
        except sqlite3.OperationalError:
            pass
    
    conn.commit()
    conn.close()

def generate_stage_timing(num_records=500):
    """Generate realistic stage timing data."""
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    
    stages = {
        "crawl": (5.3, 0.5),
        "html_parse": (0.045, 0.01),
        "ner_inference": (0.180, 0.03),
        "entity_resolution": (0.035, 0.01),
        "lead_matching": (0.022, 0.005),
        "llm_report": (15.0, 2.0),
    }
    
    now = datetime.now()
    
    for i in range(num_records):
        ts = now - timedelta(hours=24 - (i / num_records) * 24)
        stage = random.choice(list(stages.keys()))
        baseline, stddev = stages[stage]
        
        # 90% normal, 10% outliers
        if random.random() < 0.9:
            elapsed = np.random.normal(baseline, stddev)
        else:
            elapsed = baseline * random.uniform(1.5, 2.5)
        
        elapsed = max(0.001, elapsed)
        
        mem_before = random.uniform(100, 500)
        mem_after = mem_before + random.uniform(-20, 100)
        
        c.execute("""
            INSERT INTO stage_timing (stage, elapsed_s, mem_before_mb, mem_after_mb, ts)
            VALUES (?, ?, ?, ?, ?)
        """, (stage, elapsed, mem_before, mem_after, ts.isoformat()))
    
    conn.commit()
    conn.close()
    print(f"✅ Generated {num_records} stage timing records")

def generate_drift_checks(num_records=300):
    """Generate drift detection results."""
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    
    stages = ["crawling", "extraction", "matching"]
    metrics = ["ks_test", "js_divergence", "cosine_shift"]
    
    now = datetime.now()
    
    for i in range(num_records):
        ts = now - timedelta(hours=24 - (i / num_records) * 24)
        stage = random.choice(stages)
        metric = random.choice(metrics)
        
        # 85% normal, 15% drift detected
        if random.random() < 0.85:
            value = random.uniform(0.02, 0.12)
            alert = 0
        else:
            value = random.uniform(0.16, 0.35)
            alert = 1
        
        c.execute("""
            INSERT INTO drift_checks (stage, metric, value, alert, ts)
            VALUES (?, ?, ?, ?, ?)
        """, (stage, metric, value, alert, ts.isoformat()))
    
    conn.commit()
    conn.close()
    print(f"✅ Generated {num_records} drift check records")

def generate_judge_scores(num_records=100):
    """Generate LLM judge evaluation data."""
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    
    now = datetime.now()
    
    dimensions = {
        'factual_accuracy': 0.35,
        'completeness': 0.25,
        'actionability': 0.20,
        'conciseness': 0.15,
        'professional_tone': 0.05,
    }
    
    for i in range(num_records):
        ts = now - timedelta(hours=24 - (i / num_records) * 24)
        report_id = f"report_{i:05d}"
        
        # Generate dimension scores
        breakdown = {
            dim: np.random.normal(3.8, 0.5) for dim in dimensions.keys()
        }
        breakdown = {k: np.clip(v, 1, 5) for k, v in breakdown.items()}
        
        # Weighted consensus
        consensus = sum(v * dimensions[k] for k, v in breakdown.items())
        
        agreement = np.random.uniform(0.70, 0.95)
        
        c.execute("""
            INSERT INTO judge_scores (report_id, consensus, agreement, breakdown, ts)
            VALUES (?, ?, ?, ?, ?)
        """, (report_id, consensus, agreement, json.dumps(breakdown), ts.isoformat()))
    
    conn.commit()
    conn.close()
    print(f"✅ Generated {num_records} judge score records")

def generate_error_propagation(num_records=150):
    """Generate error propagation metrics."""
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    
    now = datetime.now()
    
    for i in range(num_records):
        ts = now - timedelta(hours=24 - (i / num_records) * 24)
        execution_id = f"exec_{i:06d}"
        
        # Realistic CER and EAF with some variation
        cer = np.random.normal(0.13, 0.02)
        cer = np.clip(cer, 0.08, 0.20)
        
        eaf = np.random.normal(1.15, 0.08)
        eaf = np.clip(eaf, 1.0, 1.4)
        
        # Create 4x4 propagation matrix
        matrix = [
            [0.0, 0.15, 0.02, 0.01],
            [0.0, 0.0, 0.30, 0.10],
            [0.0, 0.0, 0.0, 0.05],
            [0.0, 0.0, 0.0, 0.0],
        ]
        # Add small random noise
        for i in range(4):
            for j in range(i+1, 4):
                matrix[i][j] += np.random.normal(0, 0.02)
                matrix[i][j] = np.clip(matrix[i][j], 0, 0.5)
        
        c.execute("""
            INSERT INTO error_propagation (execution_id, cer, eaf, matrix_json, ts)
            VALUES (?, ?, ?, ?, ?)
        """, (execution_id, cer, eaf, json.dumps(matrix), ts.isoformat()))
    
    conn.commit()
    conn.close()
    print(f"✅ Generated {num_records} error propagation records")

def generate_quality_gates(num_records=200):
    """Generate quality gate results."""
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    
    thresholds = {
        "ner_f1": 0.90,
        "lead_precision": 0.85,
        "lead_recall": 0.80,
        "report_accuracy": 0.93,
        "crawl_harvest": 0.10,
    }
    
    now = datetime.now()
    
    for i in range(num_records):
        ts = now - timedelta(hours=24 - (i / num_records) * 24)
        
        for metric, threshold in thresholds.items():
            # Generate values around threshold with 90% pass rate
            if random.random() < 0.90:
                offset = np.random.normal(0.02, 0.01)
            else:
                offset = -np.random.uniform(0.01, 0.05)
            
            current_value = threshold + offset
            current_value = np.clip(current_value, 0, 1.0)
            
            passed = 1 if current_value >= threshold else 0
            
            c.execute("""
                INSERT INTO quality_gates (metric, threshold, current_value, passed, ts)
                VALUES (?, ?, ?, ?, ?)
            """, (metric, threshold, current_value, passed, ts.isoformat()))
    
    conn.commit()
    conn.close()
    print(f"✅ Generated {num_records} quality gate records")

def generate_model_loading(num_records=50):
    """Generate model loading status."""
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    
    models = {
        "gliner2-base": (0.5, 90),
        "all-minilm": (0.2, 80),
        "deberta-v3": (2.0, 380),
        "lightgbm-ensemble": (0.1, 12),
        "llama-3.1-8b": (8.0, 4700),
    }
    
    now = datetime.now()
    
    for i in range(num_records):
        ts = now - timedelta(hours=24 - (i / num_records) * 24)
        
        for model_name, (load_time_base, size_mb) in models.items():
            load_time = load_time_base * random.uniform(0.8, 1.2)
            status = random.choice(["loaded", "unloaded", "loading"])
            
            c.execute("""
                INSERT INTO model_loading (model_name, load_time_s, size_mb, status, ts)
                VALUES (?, ?, ?, ?, ?)
            """, (model_name, load_time, size_mb, status, ts.isoformat()))
    
    conn.commit()
    conn.close()
    print(f"✅ Generated {num_records} model loading records")

def generate_memory_usage(num_records=500):
    """Generate memory usage data."""
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    
    now = datetime.now()
    
    for i in range(num_records):
        ts = now - timedelta(hours=24 - (i / num_records) * 24)
        
        # Realistic memory curve (low baseline, spike during execution)
        if random.random() < 0.1:
            # Spike (during execution)
            process_rss = random.uniform(800, 2500)
            peak = process_rss
        else:
            # Normal baseline
            process_rss = random.uniform(80, 150)
            peak = random.uniform(200, 500)
        
        c.execute("""
            INSERT INTO memory_usage (process_rss_mb, peak_mb, ts)
            VALUES (?, ?, ?)
        """, (process_rss, peak, ts.isoformat()))
    
    conn.commit()
    conn.close()
    print(f"✅ Generated {num_records} memory usage records")

def main():
    print("🔧 Initializing database...")
    init_database()
    
    print("\n📊 Generating sample monitoring data...")
    generate_stage_timing(500)
    generate_drift_checks(300)
    generate_judge_scores(100)
    generate_error_propagation(150)
    generate_quality_gates(200)
    generate_model_loading(50)
    generate_memory_usage(500)
    
    # Verify
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    
    tables = [
        "stage_timing", "drift_checks", "judge_scores",
        "error_propagation", "quality_gates", "model_loading",
        "memory_usage"
    ]
    
    print("\n✅ Database ready!")
    print(f"   Location: {DB_PATH}\n")
    
    for table in tables:
        count = c.execute(f"SELECT COUNT(*) FROM {table}").fetchone()[0]
        print(f"   {table:25s}: {count:6d} records")
    
    conn.close()
    
    print("\n🚀 Now run: streamlit run dashboard.py")

if __name__ == "__main__":
    main()

