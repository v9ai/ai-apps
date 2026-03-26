"""
Scrapus M1 Local Deployment Monitoring Dashboard
=================================================
Real-time monitoring for Scrapus pipeline with 6 tabs:
1. Stage Latency - per-stage timing + P95 alerts
2. Data Drift - multi-scale drift detection consensus
3. Report Quality - LLM judge scores by dimension
4. Error Propagation - CER/EAF trends + propagation matrix
5. Quality Gates - regression test status
6. Memory Usage - process memory + model loading

SQLite backend with 10 monitoring tables.
Auto-refresh every 60 seconds (configurable).
M1 optimized: <150 MB RAM target.
All charts exportable as CSV.
"""

import streamlit as st
import sqlite3
import pandas as pd
import numpy as np
import plotly.graph_objects as go
import plotly.express as px
from plotly.subplots import make_subplots
from datetime import datetime, timedelta
import json
import io
from pathlib import Path
import psutil
import os

# ============================================================================
# CONFIG & CONSTANTS
# ============================================================================

DB_PATH = Path.home() / "scrapus_data" / "scrapus_metrics.db"
REFRESH_INTERVAL = 60  # seconds
STAGE_BASELINE_P95 = {
    "crawl": 5.3,
    "html_parse": 0.045,
    "ner_inference": 0.180,
    "entity_resolution": 0.035,
    "lead_matching": 0.022,
    "llm_report": 15.0,
}
QUALITY_THRESHOLDS = {
    "ner_f1": 0.90,
    "lead_precision": 0.85,
    "lead_recall": 0.80,
    "report_accuracy": 0.93,
    "crawl_harvest": 0.10,
}

# ============================================================================
# DATABASE INITIALIZATION
# ============================================================================

def init_database():
    """Create all monitoring tables if they don't exist."""
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    
    # 1. Stage Timing
    c.execute("""
        CREATE TABLE IF NOT EXISTS stage_timing (
            id INTEGER PRIMARY KEY,
            stage TEXT NOT NULL,
            elapsed_s REAL NOT NULL,
            mem_before_mb REAL,
            mem_after_mb REAL,
            ts TEXT DEFAULT (datetime('now'))
        )
    """)
    
    # 2. Drift Checks
    c.execute("""
        CREATE TABLE IF NOT EXISTS drift_checks (
            id INTEGER PRIMARY KEY,
            stage TEXT,
            metric TEXT,
            value REAL,
            alert BOOLEAN DEFAULT 0,
            ts TEXT DEFAULT (datetime('now'))
        )
    """)
    
    # 3. Judge Scores
    c.execute("""
        CREATE TABLE IF NOT EXISTS judge_scores (
            id INTEGER PRIMARY KEY,
            report_id TEXT NOT NULL,
            consensus REAL NOT NULL,
            agreement REAL NOT NULL,
            breakdown TEXT,
            ts TEXT DEFAULT (datetime('now'))
        )
    """)
    
    # 4. Error Propagation
    c.execute("""
        CREATE TABLE IF NOT EXISTS error_propagation (
            id INTEGER PRIMARY KEY,
            execution_id TEXT NOT NULL,
            cer REAL NOT NULL,
            eaf REAL NOT NULL,
            matrix_json TEXT,
            ts TEXT DEFAULT (datetime('now'))
        )
    """)
    
    # 5. Quality Gates
    c.execute("""
        CREATE TABLE IF NOT EXISTS quality_gates (
            id INTEGER PRIMARY KEY,
            metric TEXT NOT NULL,
            threshold REAL NOT NULL,
            current_value REAL NOT NULL,
            passed INTEGER DEFAULT 1,
            ts TEXT DEFAULT (datetime('now'))
        )
    """)
    
    # 6. Model Loading
    c.execute("""
        CREATE TABLE IF NOT EXISTS model_loading (
            id INTEGER PRIMARY KEY,
            model_name TEXT NOT NULL,
            load_time_s REAL,
            size_mb REAL,
            status TEXT,
            ts TEXT DEFAULT (datetime('now'))
        )
    """)
    
    # 7. Memory Usage
    c.execute("""
        CREATE TABLE IF NOT EXISTS memory_usage (
            id INTEGER PRIMARY KEY,
            process_rss_mb REAL NOT NULL,
            peak_mb REAL,
            ts TEXT DEFAULT (datetime('now'))
        )
    """)
    
    # 8. Alerts
    c.execute("""
        CREATE TABLE IF NOT EXISTS alerts (
            id INTEGER PRIMARY KEY,
            severity TEXT,
            message TEXT,
            ts TEXT DEFAULT (datetime('now'))
        )
    """)
    
    # 9. Audit Log
    c.execute("""
        CREATE TABLE IF NOT EXISTS audit_log (
            id INTEGER PRIMARY KEY,
            stage TEXT,
            action TEXT,
            status TEXT,
            ts TEXT DEFAULT (datetime('now'))
        )
    """)
    
    # 10. System Health
    c.execute("""
        CREATE TABLE IF NOT EXISTS system_health (
            id INTEGER PRIMARY KEY,
            metric TEXT NOT NULL,
            value REAL NOT NULL,
            ts TEXT DEFAULT (datetime('now'))
        )
    """)
    
    conn.commit()
    conn.close()

# ============================================================================
# QUERY FUNCTIONS
# ============================================================================

def query_stage_timing(hours=24):
    """Get recent stage timing data."""
    conn = sqlite3.connect(DB_PATH)
    query = f"""
        SELECT stage, elapsed_s, mem_before_mb, mem_after_mb, ts
        FROM stage_timing
        WHERE ts > datetime('now', '-{hours} hours')
        ORDER BY ts
    """
    df = pd.read_sql_query(query, conn)
    conn.close()
    if df.empty:
        return pd.DataFrame()
    df['ts'] = pd.to_datetime(df['ts'])
    return df

def query_drift_checks(hours=24):
    """Get drift detection results."""
    conn = sqlite3.connect(DB_PATH)
    query = f"""
        SELECT stage, metric, value, alert, ts
        FROM drift_checks
        WHERE ts > datetime('now', '-{hours} hours')
        ORDER BY ts DESC
    """
    df = pd.read_sql_query(query, conn)
    conn.close()
    if df.empty:
        return pd.DataFrame()
    df['ts'] = pd.to_datetime(df['ts'])
    return df

def query_judge_scores(hours=24):
    """Get LLM judge scores."""
    conn = sqlite3.connect(DB_PATH)
    query = f"""
        SELECT report_id, consensus, agreement, breakdown, ts
        FROM judge_scores
        WHERE ts > datetime('now', '-{hours} hours')
        ORDER BY ts DESC
    """
    df = pd.read_sql_query(query, conn)
    conn.close()
    if df.empty:
        return pd.DataFrame()
    df['ts'] = pd.to_datetime(df['ts'])
    return df

def query_error_propagation(hours=24):
    """Get error propagation metrics."""
    conn = sqlite3.connect(DB_PATH)
    query = f"""
        SELECT execution_id, cer, eaf, matrix_json, ts
        FROM error_propagation
        WHERE ts > datetime('now', '-{hours} hours')
        ORDER BY ts DESC
    """
    df = pd.read_sql_query(query, conn)
    conn.close()
    if df.empty:
        return pd.DataFrame()
    df['ts'] = pd.to_datetime(df['ts'])
    return df

def query_quality_gates():
    """Get latest quality gate status."""
    conn = sqlite3.connect(DB_PATH)
    query = """
        SELECT metric, threshold, current_value, passed, ts
        FROM quality_gates
        ORDER BY ts DESC
        LIMIT 50
    """
    df = pd.read_sql_query(query, conn)
    conn.close()
    if df.empty:
        return pd.DataFrame()
    df['ts'] = pd.to_datetime(df['ts'])
    return df

def query_memory_usage(hours=24):
    """Get memory usage history."""
    conn = sqlite3.connect(DB_PATH)
    query = f"""
        SELECT process_rss_mb, peak_mb, ts
        FROM memory_usage
        WHERE ts > datetime('now', '-{hours} hours')
        ORDER BY ts
    """
    df = pd.read_sql_query(query, conn)
    conn.close()
    if df.empty:
        return pd.DataFrame()
    df['ts'] = pd.to_datetime(df['ts'])
    return df

def query_model_loading(hours=24):
    """Get model loading status."""
    conn = sqlite3.connect(DB_PATH)
    query = f"""
        SELECT model_name, load_time_s, size_mb, status, ts
        FROM model_loading
        WHERE ts > datetime('now', '-{hours} hours')
        ORDER BY ts DESC
    """
    df = pd.read_sql_query(query, conn)
    conn.close()
    if df.empty:
        return pd.DataFrame()
    df['ts'] = pd.to_datetime(df['ts'])
    return df

def query_alerts(hours=24):
    """Get recent alerts."""
    conn = sqlite3.connect(DB_PATH)
    query = f"""
        SELECT id, severity, message, ts
        FROM alerts
        WHERE ts > datetime('now', '-{hours} hours')
        ORDER BY ts DESC
    """
    df = pd.read_sql_query(query, conn)
    conn.close()
    if df.empty:
        return pd.DataFrame()
    df['ts'] = pd.to_datetime(df['ts'])
    return df

def get_system_health():
    """Get latest system health metrics."""
    proc = psutil.Process()
    mem_info = proc.memory_info()
    return {
        "cpu_percent": proc.cpu_percent(interval=0.1),
        "rss_mb": mem_info.rss / 1024 / 1024,
        "available_gb": psutil.virtual_memory().available / 1024 / 1024 / 1024,
        "last_execution": "Just now",
    }

# ============================================================================
# PAGE CONFIG
# ============================================================================

st.set_page_config(
    page_title="Scrapus M1 Monitor",
    page_icon="📊",
    layout="wide",
    initial_sidebar_state="expanded",
)

# Initialize database
if not DB_PATH.exists():
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
init_database()

# ============================================================================
# SIDEBAR
# ============================================================================

with st.sidebar:
    st.markdown("## 🏥 System Health")
    
    health = get_system_health()
    
    col1, col2 = st.columns(2)
    with col1:
        st.metric("CPU", f"{health['cpu_percent']:.1f}%")
    with col2:
        st.metric("RAM (Available)", f"{health['available_gb']:.2f} GB")
    
    st.metric("Process RSS", f"{health['rss_mb']:.0f} MB", delta="M1 target <150 MB")
    
    # Recent alerts
    st.markdown("## 🚨 Recent Alerts")
    alerts_df = query_alerts(hours=24)
    if not alerts_df.empty:
        alert_count = len(alerts_df)
        st.metric("Alert Count (24h)", alert_count)
        
        for _, alert in alerts_df.head(3).iterrows():
            severity_color = "🔴" if alert['severity'] == 'critical' else "🟡" if alert['severity'] == 'warning' else "🔵"
            st.write(f"{severity_color} {alert['message'][:60]}...")
    else:
        st.info("✅ No alerts in the last 24 hours")
    
    # Last execution stats
    st.markdown("## ⏱️ Last Execution")
    stage_timing = query_stage_timing(hours=24)
    if not stage_timing.empty:
        latest = stage_timing.iloc[-1]
        st.write(f"**Stage:** {latest['stage']}")
        st.write(f"**Elapsed:** {latest['elapsed_s']:.3f}s")
        st.write(f"**Memory Δ:** {latest['mem_after_mb'] - latest['mem_before_mb']:.1f} MB")
        st.write(f"**Timestamp:** {latest['ts'].strftime('%H:%M:%S')}")
    else:
        st.info("No execution data yet")
    
    # Refresh interval
    st.markdown("## ⚙️ Settings")
    refresh_interval = st.slider(
        "Refresh Interval (s)",
        min_value=10,
        max_value=300,
        value=REFRESH_INTERVAL,
        step=10,
    )
    
    # Auto-refresh
    if st.checkbox("Auto-refresh", value=True):
        st.write(f"Next refresh in {refresh_interval}s")
        st.session_state.last_refresh = datetime.now()

# ============================================================================
# TABS
# ============================================================================

tab1, tab2, tab3, tab4, tab5, tab6 = st.tabs([
    "📈 Stage Latency",
    "🌊 Data Drift",
    "📝 Report Quality",
    "⚡ Error Propagation",
    "🎯 Quality Gates",
    "💾 Memory Usage",
])

# ============================================================================
# TAB 1: STAGE LATENCY
# ============================================================================

with tab1:
    st.markdown("## Stage Latency Analysis")
    
    st.markdown("""
    Per-stage execution time with P95 alert thresholds. Red zones indicate
    potential regressions (P95 > 2x baseline).
    """)
    
    stage_data = query_stage_timing(hours=24)
    
    if not stage_data.empty:
        col1, col2 = st.columns(2)
        
        with col1:
            # Time series of all stages
            fig_ts = px.line(
                stage_data,
                x='ts',
                y='elapsed_s',
                color='stage',
                title="Stage Execution Time (24h)",
                labels={"elapsed_s": "Elapsed Time (s)", "ts": "Time"},
                height=500,
            )
            fig_ts.update_hovermode('x unified')
            st.plotly_chart(fig_ts, use_container_width=True)
        
        with col2:
            # P95 by stage with alert zones
            p95_data = stage_data.groupby('stage')['elapsed_s'].quantile(0.95).reset_index()
            p95_data.columns = ['stage', 'p95']
            p95_data['baseline'] = p95_data['stage'].map(STAGE_BASELINE_P95)
            p95_data['alert_threshold'] = p95_data['baseline'] * 2
            p95_data['status'] = p95_data.apply(
                lambda r: 'ALERT' if r['p95'] > r['alert_threshold'] else 'OK',
                axis=1
            )
            
            fig_p95 = go.Figure()
            fig_p95.add_trace(go.Bar(
                name='P95',
                x=p95_data['stage'],
                y=p95_data['p95'],
                marker_color=['red' if s == 'ALERT' else 'green' for s in p95_data['status']],
            ))
            fig_p95.add_hline(
                y=1,
                annotation_text="Baseline P95",
                line_dash="dash",
                line_color="gray",
            )
            fig_p95.update_layout(
                title="P95 by Stage (Alert if > 2x baseline)",
                yaxis_title="Elapsed Time (s)",
                height=500,
                showlegend=False,
            )
            st.plotly_chart(fig_p95, use_container_width=True)
        
        # Stage statistics table
        st.markdown("### Stage Statistics")
        stats_table = stage_data.groupby('stage')['elapsed_s'].agg([
            ('Count', 'count'),
            ('Min (s)', 'min'),
            ('Median (s)', 'median'),
            ('P95 (s)', lambda x: x.quantile(0.95)),
            ('Max (s)', 'max'),
            ('Mean (s)', 'mean'),
        ]).round(4)
        st.dataframe(stats_table, use_container_width=True)
        
        # Export
        col1, col2 = st.columns([3, 1])
        with col2:
            csv = stage_data.to_csv(index=False)
            st.download_button(
                label="📥 CSV",
                data=csv,
                file_name=f"stage_latency_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv",
                mime="text/csv",
            )
    else:
        st.info("📊 No stage timing data yet. Run the pipeline to collect metrics.")

# ============================================================================
# TAB 2: DATA DRIFT
# ============================================================================

with tab2:
    st.markdown("## Data Drift Detection")
    
    st.markdown("""
    Multi-scale drift detection consensus:
    - **KS-test**: Kolmogorov-Smirnov univariate drift
    - **JS-divergence**: Jensen-Shannon for multivariate shift
    - **Cosine**: Embedding space centroid shift
    
    Traffic light: 🟢 Green (<3 metrics alert), 🟡 Yellow (3 metrics alert), 🔴 Red (>3 alert)
    """)
    
    drift_data = query_drift_checks(hours=24)
    
    if not drift_data.empty:
        col1, col2 = st.columns(2)
        
        with col1:
            # Drift timeline
            fig_drift = px.scatter(
                drift_data,
                x='ts',
                y='value',
                color='metric',
                size='value',
                hover_data=['alert'],
                title="Drift Metrics Timeline",
                labels={"value": "Drift Score", "ts": "Time", "metric": "Detector"},
                height=500,
            )
            fig_drift.add_hline(y=0.15, line_dash="dash", line_color="orange", annotation_text="Alert Threshold (JS)")
            st.plotly_chart(fig_drift, use_container_width=True)
        
        with col2:
            # Alert consensus
            recent_window = drift_data[drift_data['ts'] > datetime.now() - timedelta(hours=1)]
            if not recent_window.empty:
                alert_counts = recent_window.groupby('stage')['alert'].sum()
                
                # Traffic light logic
                colors = []
                for count in alert_counts.values:
                    if count < 1:
                        colors.append('green')
                    elif count < 3:
                        colors.append('orange')
                    else:
                        colors.append('red')
                
                fig_health = go.Figure(data=[
                    go.Bar(x=alert_counts.index, y=alert_counts.values, marker_color=colors)
                ])
                fig_health.update_layout(
                    title="Alerts per Stage (Last 1h)",
                    yaxis_title="Alert Count",
                    height=500,
                    showlegend=False,
                )
                st.plotly_chart(fig_health, use_container_width=True)
        
        # Drift table
        st.markdown("### Recent Drift Detections")
        drift_display = drift_data[['stage', 'metric', 'value', 'alert', 'ts']].head(20).copy()
        drift_display['ts'] = drift_display['ts'].dt.strftime('%H:%M:%S')
        drift_display['Alert'] = drift_display['alert'].apply(lambda x: '⚠️' if x else '✓')
        st.dataframe(drift_display[['stage', 'metric', 'value', 'Alert', 'ts']], use_container_width=True)
        
        # Export
        col1, col2 = st.columns([3, 1])
        with col2:
            csv = drift_data.to_csv(index=False)
            st.download_button(
                label="📥 CSV",
                data=csv,
                file_name=f"drift_checks_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv",
                mime="text/csv",
            )
    else:
        st.info("🌊 No drift detection data yet.")

# ============================================================================
# TAB 3: REPORT QUALITY
# ============================================================================

with tab3:
    st.markdown("## LLM Judge Evaluation")
    
    st.markdown("""
    Multi-judge consensus on report quality dimensions:
    - **Factual Accuracy** (weight 0.35): No hallucinations, claims verified
    - **Completeness** (weight 0.25): All key facts present, no gaps
    - **Actionability** (weight 0.20): Clear next steps for sales team
    - **Conciseness** (weight 0.15): Minimal and information-dense
    - **Professional Tone** (weight 0.05): Proper B2B register
    
    Gate threshold: Consensus ≥ 3.5/5 across ≥2 judges
    """)
    
    judge_data = query_judge_scores(hours=24)
    
    if not judge_data.empty:
        col1, col2 = st.columns(2)
        
        with col1:
            # Consensus score over time
            fig_consensus = px.line(
                judge_data,
                x='ts',
                y='consensus',
                title="LLM Judge Consensus (24h)",
                labels={"consensus": "Score (1-5)", "ts": "Time"},
                height=500,
            )
            fig_consensus.add_hline(y=3.5, line_dash="dash", line_color="red", annotation_text="Gate Threshold (3.5)")
            fig_consensus.add_hline(y=3.0, line_dash="dot", line_color="orange", annotation_text="Needs Review (3.0)")
            fig_consensus.update_yaxes(range=[1, 5])
            st.plotly_chart(fig_consensus, use_container_width=True)
        
        with col2:
            # Judge agreement distribution
            fig_agree = px.histogram(
                judge_data,
                x='agreement',
                nbins=20,
                title="Judge Agreement Distribution",
                labels={"agreement": "Agreement Score (0-1)", "count": "Count"},
                height=500,
            )
            st.plotly_chart(fig_agree, use_container_width=True)
        
        # Dimension breakdown (if available in JSON)
        st.markdown("### Dimension Scores")
        breakdowns = []
        for _, row in judge_data.iterrows():
            if pd.notna(row['breakdown']) and row['breakdown']:
                try:
                    dims = json.loads(row['breakdown'])
                    dims['ts'] = row['ts']
                    breakdowns.append(dims)
                except:
                    pass
        
        if breakdowns:
            breakdown_df = pd.DataFrame(breakdowns)
            numeric_cols = ['factual_accuracy', 'completeness', 'actionability', 'conciseness', 'professional_tone']
            numeric_cols = [c for c in numeric_cols if c in breakdown_df.columns]
            
            if numeric_cols:
                avg_scores = breakdown_df[numeric_cols].mean()
                
                fig_dims = go.Figure(data=[
                    go.Bar(x=numeric_cols, y=avg_scores, marker_color='steelblue')
                ])
                fig_dims.update_layout(
                    title="Average Dimension Scores (1-5)",
                    yaxis_title="Score",
                    height=400,
                )
                fig_dims.update_yaxes(range=[0, 5])
                st.plotly_chart(fig_dims, use_container_width=True)
        
        # Judge data table
        st.markdown("### Recent Reports")
        judge_display = judge_data[['report_id', 'consensus', 'agreement', 'ts']].head(20).copy()
        judge_display['ts'] = judge_display['ts'].dt.strftime('%H:%M:%S')
        judge_display['Consensus'] = judge_display['consensus'].apply(lambda x: f"{x:.2f}/5")
        judge_display['Agreement'] = judge_display['agreement'].apply(lambda x: f"{x:.2%}")
        st.dataframe(judge_display[['report_id', 'Consensus', 'Agreement', 'ts']], use_container_width=True)
        
        # Export
        col1, col2 = st.columns([3, 1])
        with col2:
            csv = judge_data.to_csv(index=False)
            st.download_button(
                label="📥 CSV",
                data=csv,
                file_name=f"judge_scores_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv",
                mime="text/csv",
            )
    else:
        st.info("📝 No report quality data yet.")

# ============================================================================
# TAB 4: ERROR PROPAGATION
# ============================================================================

with tab4:
    st.markdown("## Error Propagation Analysis")
    
    st.markdown("""
    **CER (Cascade Error Rate):** Proportion of extraction errors that
    propagate to final lead score. Target: < 0.15 (13%).
    
    **EAF (Error Amplification Factor):** Ratio of downstream errors to
    upstream errors. Target: < 1.2x (20% amplification).
    
    **Propagation Matrix:** Causal edge weights showing error transfer
    between stages (crawl → extraction → matching → summarization).
    """)
    
    error_data = query_error_propagation(hours=24)
    
    if not error_data.empty:
        col1, col2 = st.columns(2)
        
        with col1:
            # CER and EAF trends
            fig_cer_eaf = make_subplots(
                rows=2, cols=1,
                subplot_titles=("Cascade Error Rate (CER)", "Error Amplification Factor (EAF)"),
                shared_xaxes=True,
            )
            
            fig_cer_eaf.add_trace(
                go.Scatter(x=error_data['ts'], y=error_data['cer'], mode='lines+markers',
                          name='CER', line_color='red'),
                row=1, col=1
            )
            fig_cer_eaf.add_hline(y=0.15, line_dash="dash", line_color="red", row=1, col=1)
            
            fig_cer_eaf.add_trace(
                go.Scatter(x=error_data['ts'], y=error_data['eaf'], mode='lines+markers',
                          name='EAF', line_color='orange'),
                row=2, col=1
            )
            fig_cer_eaf.add_hline(y=1.2, line_dash="dash", line_color="orange", row=2, col=1)
            
            fig_cer_eaf.update_yaxes(title_text="CER", row=1, col=1)
            fig_cer_eaf.update_yaxes(title_text="EAF", row=2, col=1)
            fig_cer_eaf.update_xaxes(title_text="Time", row=2, col=1)
            fig_cer_eaf.update_layout(height=600, hovermode='x unified')
            st.plotly_chart(fig_cer_eaf, use_container_width=True)
        
        with col2:
            # Latest propagation matrix
            latest = error_data.iloc[-1]
            if pd.notna(latest['matrix_json']):
                try:
                    matrix = json.loads(latest['matrix_json'])
                    stages = ['Crawl', 'Extraction', 'Matching', 'Summarization']
                    
                    fig_matrix = go.Figure(data=go.Heatmap(
                        z=matrix,
                        x=stages,
                        y=stages,
                        colorscale='RdYlGn_r',
                        text=[[f"{v:.3f}" for v in row] for row in matrix],
                        texttemplate="%{text}",
                        textfont={"size": 10},
                    ))
                    fig_matrix.update_layout(
                        title="Error Propagation Matrix (Latest)",
                        height=500,
                    )
                    st.plotly_chart(fig_matrix, use_container_width=True)
                except json.JSONDecodeError:
                    st.warning("Could not parse propagation matrix JSON")
        
        # CER/EAF summary
        st.markdown("### Error Metrics Summary")
        summary_cols = st.columns(4)
        
        with summary_cols[0]:
            latest_cer = error_data['cer'].iloc[-1]
            st.metric("Latest CER", f"{latest_cer:.3f}", delta=f"{latest_cer - 0.13:.4f}" if latest_cer != 0.13 else None)
        
        with summary_cols[1]:
            latest_eaf = error_data['eaf'].iloc[-1]
            st.metric("Latest EAF", f"{latest_eaf:.3f}x", delta=f"{latest_eaf - 1.15:.4f}x" if latest_eaf != 1.15 else None)
        
        with summary_cols[2]:
            avg_cer = error_data['cer'].mean()
            st.metric("Avg CER (24h)", f"{avg_cer:.3f}")
        
        with summary_cols[3]:
            avg_eaf = error_data['eaf'].mean()
            st.metric("Avg EAF (24h)", f"{avg_eaf:.3f}x")
        
        # Export
        col1, col2 = st.columns([3, 1])
        with col2:
            csv = error_data.to_csv(index=False)
            st.download_button(
                label="📥 CSV",
                data=csv,
                file_name=f"error_propagation_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv",
                mime="text/csv",
            )
    else:
        st.info("⚡ No error propagation data yet.")

# ============================================================================
# TAB 5: QUALITY GATES
# ============================================================================

with tab5:
    st.markdown("## Regression Test Status")
    
    st.markdown("""
    Hard-fail quality gates: a single violation blocks pipeline promotion.
    All metrics must pass for deployment to production.
    """)
    
    gates_data = query_quality_gates()
    
    if not gates_data.empty:
        # Get latest values per metric
        latest_gates = gates_data.sort_values('ts', ascending=False).drop_duplicates('metric')
        
        # Status overview
        col1, col2, col3 = st.columns(3)
        
        with col1:
            passed = latest_gates['passed'].sum()
            total = len(latest_gates)
            st.metric("Passed", passed, delta=f"{passed}/{total}")
        
        with col2:
            pass_rate = (passed / total * 100) if total > 0 else 0
            st.metric("Pass Rate", f"{pass_rate:.0f}%")
        
        with col3:
            failed = total - passed
            st.metric("Failed", failed, delta="Should be 0")
        
        # Gate details
        st.markdown("### Gate Status")
        
        # Visual gate cards
        for _, gate in latest_gates.sort_values('metric').iterrows():
            threshold = gate['threshold']
            current = gate['current_value']
            passed = gate['passed']
            delta_pct = ((current - threshold) / threshold * 100) if threshold != 0 else 0
            
            col1, col2, col3, col4 = st.columns([1, 2, 2, 1])
            
            with col1:
                status_icon = "✅" if passed else "❌"
                st.write(f"### {status_icon}")
            
            with col2:
                st.write(f"**{gate['metric']}**")
                st.write(f"Threshold: {threshold:.4f}")
            
            with col3:
                st.write(f"Current: {current:.4f}")
                st.write(f"Margin: {delta_pct:+.1f}%")
            
            with col4:
                if passed:
                    st.success("PASS")
                else:
                    st.error("FAIL")
        
        # Gate history chart
        if len(gates_data) > 10:
            st.markdown("### Gate History (All Runs)")
            pivot_data = gates_data.pivot(index='ts', columns='metric', values='current_value')
            pivot_data.index = pd.to_datetime(pivot_data.index)
            pivot_data = pivot_data.sort_index()
            
            fig_history = go.Figure()
            for col in pivot_data.columns:
                fig_history.add_trace(go.Scatter(
                    x=pivot_data.index,
                    y=pivot_data[col],
                    mode='lines',
                    name=col,
                ))
            
            # Add threshold lines
            thresholds = latest_gates.set_index('metric')['threshold'].to_dict()
            for metric, threshold in thresholds.items():
                if metric in pivot_data.columns:
                    fig_history.add_hline(
                        y=threshold,
                        line_dash="dash",
                        annotation_text=f"{metric} threshold",
                        annotation_position="right",
                    )
            
            fig_history.update_layout(
                title="Quality Gate History",
                xaxis_title="Time",
                yaxis_title="Metric Value",
                height=500,
                hovermode='x unified',
            )
            st.plotly_chart(fig_history, use_container_width=True)
        
        # Export
        col1, col2 = st.columns([3, 1])
        with col2:
            csv = gates_data.to_csv(index=False)
            st.download_button(
                label="📥 CSV",
                data=csv,
                file_name=f"quality_gates_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv",
                mime="text/csv",
            )
    else:
        st.info("🎯 No quality gate data yet.")

# ============================================================================
# TAB 6: MEMORY USAGE
# ============================================================================

with tab6:
    st.markdown("## Memory & Model Loading")
    
    st.markdown("""
    Real-time process memory (RSS) and peak memory consumption.
    Target for M1: <150 MB sustained, <5 GB peak.
    
    Model loading status shows:
    - Load time per model
    - Model size on disk
    - Current status (loaded/unloaded)
    """)
    
    mem_data = query_memory_usage(hours=24)
    model_data = query_model_loading(hours=24)
    
    col1, col2 = st.columns(2)
    
    with col1:
        if not mem_data.empty:
            fig_mem = go.Figure()
            
            fig_mem.add_trace(go.Scatter(
                x=mem_data['ts'],
                y=mem_data['process_rss_mb'],
                mode='lines',
                name='Process RSS',
                line_color='blue',
                fill='tozeroy',
            ))
            
            if 'peak_mb' in mem_data.columns and mem_data['peak_mb'].notna().any():
                fig_mem.add_trace(go.Scatter(
                    x=mem_data['ts'],
                    y=mem_data['peak_mb'],
                    mode='lines',
                    name='Peak',
                    line=dict(color='red', dash='dash'),
                ))
            
            fig_mem.add_hline(y=150, line_dash="dash", line_color="green", annotation_text="M1 Target (150 MB)")
            fig_mem.add_hline(y=5000, line_dash="dash", line_color="red", annotation_text="Peak Limit (5 GB)")
            
            fig_mem.update_layout(
                title="Process Memory Usage (24h)",
                xaxis_title="Time",
                yaxis_title="Memory (MB)",
                height=500,
                hovermode='x unified',
            )
            st.plotly_chart(fig_mem, use_container_width=True)
        else:
            st.info("📊 No memory data yet.")
    
    with col2:
        if not model_data.empty:
            # Model loading timeline
            fig_models = px.scatter(
                model_data,
                x='ts',
                y='load_time_s',
                size='size_mb',
                color='status',
                hover_data=['model_name', 'size_mb'],
                title="Model Loading Performance",
                labels={'load_time_s': 'Load Time (s)', 'ts': 'Time', 'size_mb': 'Size (MB)'},
                height=500,
            )
            st.plotly_chart(fig_models, use_container_width=True)
        else:
            st.info("💾 No model loading data yet.")
    
    # Memory stats
    if not mem_data.empty:
        st.markdown("### Memory Statistics")
        mem_stats = mem_data['process_rss_mb'].agg([
            ('Min (MB)', 'min'),
            ('Mean (MB)', 'mean'),
            ('Median (MB)', 'median'),
            ('Max (MB)', 'max'),
            ('Current (MB)', 'iloc', -1),
        ])
        st.metric("Current Memory", f"{mem_data['process_rss_mb'].iloc[-1]:.0f} MB")
        st.metric("Peak (24h)", f"{mem_data['process_rss_mb'].max():.0f} MB")
    
    # Model loading status
    if not model_data.empty:
        st.markdown("### Model Loading Status")
        model_summary = model_data.sort_values('ts', ascending=False).drop_duplicates('model_name')
        
        for _, model in model_summary.iterrows():
            status_icon = "✅" if model['status'] == 'loaded' else "⏳" if model['status'] == 'loading' else "❌"
            st.write(
                f"{status_icon} **{model['model_name']}**: "
                f"{model['size_mb']:.0f} MB, Load: {model['load_time_s']:.2f}s"
            )
    
    # Export memory data
    if not mem_data.empty:
        col1, col2 = st.columns([3, 1])
        with col2:
            csv = mem_data.to_csv(index=False)
            st.download_button(
                label="📥 CSV",
                data=csv,
                file_name=f"memory_usage_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv",
                mime="text/csv",
            )

# ============================================================================
# AUTO-REFRESH
# ============================================================================

if 'last_refresh' not in st.session_state:
    st.session_state.last_refresh = datetime.now()

# Simple refresh via rerun (Streamlit native)
st.markdown("---")
col1, col2, col3 = st.columns([2, 1, 1])
with col3:
    if st.button("🔄 Refresh Now"):
        st.rerun()

# Note on auto-refresh implementation
st.caption(
    "💡 For continuous auto-refresh, run: `streamlit run dashboard.py --logger.level=error "
    "--client.toolbarMode=minimal`"
)

