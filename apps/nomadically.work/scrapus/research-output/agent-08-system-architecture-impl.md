Based on my research, I'll provide comprehensive implementation best practices for your Scrapus system architecture. Let me structure this with evidence-based recommendations from the literature.

# Implementation Best Practices for Scrapus System Architecture

## 1. Optimal SQLite Configuration for Graph Workloads

### WAL Mode Configuration
**Research Basis:** SQLite's Write-Ahead Logging (WAL) mode enables concurrent reads and writes, crucial for your multi-stage pipeline. According to SQLite documentation and performance studies, WAL mode provides:

```python
import sqlite3
import json
from contextlib import contextmanager

class GraphDatabase:
    def __init__(self, db_path: str):
        self.db_path = db_path
        self._setup_connection()
    
    def _setup_connection(self):
        """Configure SQLite for optimal graph performance"""
        self.conn = sqlite3.connect(self.db_path)
        
        # Enable WAL mode for concurrent access
        self.conn.execute("PRAGMA journal_mode = WAL;")
        
        # Set page size to match filesystem block size (typically 4096)
        self.conn.execute("PRAGMA page_size = 4096;")
        
        # Increase cache size (in pages)
        self.conn.execute("PRAGMA cache_size = -2000;")  # ~8MB cache
        
        # Enable foreign keys
        self.conn.execute("PRAGMA foreign_keys = ON;")
        
        # Set synchronous mode to NORMAL for better performance
        # (WAL provides durability guarantees)
        self.conn.execute("PRAGMA synchronous = NORMAL;")
        
        # Enable memory-mapped I/O for large databases
        self.conn.execute("PRAGMA mmap_size = 268435456;")  # 256MB
        
        self.conn.row_factory = sqlite3.Row
    
    @contextmanager
    def transaction(self):
        """Context manager for transactions"""
        try:
            yield
            self.conn.commit()
        except Exception:
            self.conn.rollback()
            raise
```

### Graph Schema Design with JSON Support
**Implementation Pattern:** Use adjacency tables with JSON columns for flexible metadata storage:

```python
def create_graph_schema(conn: sqlite3.Connection):
    """Create optimized graph schema for B2B lead generation"""
    
    # Companies table with JSON metadata
    conn.execute("""
    CREATE TABLE IF NOT EXISTS companies (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        domain TEXT UNIQUE NOT NULL,
        industry TEXT,
        size TEXT,
        location TEXT,
        metadata JSON,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    """)
    
    # Create FTS5 virtual table for full-text search
    conn.execute("""
    CREATE VIRTUAL TABLE IF NOT EXISTS companies_fts 
    USING fts5(name, industry, location, content='companies');
    """)
    
    # People table (nodes in graph)
    conn.execute("""
    CREATE TABLE IF NOT EXISTS people (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT UNIQUE,
        title TEXT,
        company_id INTEGER REFERENCES companies(id),
        profile_json JSON,
        confidence_score REAL DEFAULT 0.0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    """)
    
    # Edges table (adjacency list)
    conn.execute("""
    CREATE TABLE IF NOT EXISTS edges (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        source_id INTEGER NOT NULL,
        target_id INTEGER NOT NULL,
        relationship_type TEXT NOT NULL,
        weight REAL DEFAULT 1.0,
        metadata JSON,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(source_id, target_id, relationship_type)
    );
    """)
    
    # Indexes for graph traversal
    conn.execute("CREATE INDEX IF NOT EXISTS idx_edges_source ON edges(source_id);")
    conn.execute("CREATE INDEX IF NOT EXISTS idx_edges_target ON edges(target_id);")
    conn.execute("CREATE INDEX IF NOT EXISTS idx_edges_type ON edges(relationship_type);")
    
    # Composite index for common queries
    conn.execute("""
    CREATE INDEX IF NOT EXISTS idx_people_company 
    ON people(company_id, confidence_score DESC);
    """)
    
    # JSON extraction indexes
    conn.execute("""
    CREATE INDEX IF NOT EXISTS idx_companies_metadata 
    ON companies(json_extract(metadata, '$.revenue_tier'));
    """)
```

### Graph Traversal Queries
**Performance Optimization:** Use recursive CTEs for shallow graph traversal:

```python
def find_company_connections(conn: sqlite3.Connection, company_id: int, max_depth: int = 2):
    """Find connections within N degrees of separation"""
    query = """
    WITH RECURSIVE company_graph AS (
        -- Base case: start with target company
        SELECT 
            c.id,
            c.name,
            0 as depth,
            CAST(c.id AS TEXT) as path
        FROM companies c
        WHERE c.id = ?
        
        UNION ALL
        
        -- Recursive case: follow edges
        SELECT 
            CASE 
                WHEN e.source_id = cg.id THEN e.target_id
                ELSE e.source_id
            END as id,
            c.name,
            cg.depth + 1 as depth,
            cg.path || '->' || CAST(
                CASE 
                    WHEN e.source_id = cg.id THEN e.target_id
                    ELSE e.source_id
                END AS TEXT
            ) as path
        FROM company_graph cg
        JOIN edges e ON e.source_id = cg.id OR e.target_id = cg.id
        JOIN companies c ON c.id = CASE 
            WHEN e.source_id = cg.id THEN e.target_id
            ELSE e.source_id
        END
        WHERE cg.depth < ?
            AND cg.id != CASE 
                WHEN e.source_id = cg.id THEN e.target_id
                ELSE e.source_id
            END
    )
    SELECT DISTINCT * FROM company_graph
    ORDER BY depth, name;
    """
    
    return conn.execute(query, (company_id, max_depth)).fetchall()
```

## 2. LanceDB Schema Design for Multi-Modal Embeddings

### Multi-Table Architecture
**Research Basis:** LanceDB's Apache Arrow format enables efficient ANN search with metadata filtering:

```python
import lancedb
import pyarrow as pa
from typing import Dict, List, Any
import numpy as np

class VectorStoreManager:
    def __init__(self, lancedb_path: str):
        self.db = lancedb.connect(lancedb_path)
        self._setup_schemas()
    
    def _setup_schemas(self):
        """Define schemas for different embedding types"""
        
        # Entity embeddings schema (Siamese network outputs)
        self.entity_schema = pa.schema([
            pa.field("entity_id", pa.int64()),
            pa.field("entity_type", pa.string()),  # "company", "person", "product"
            pa.field("embedding", pa.list_(pa.float32(), 768)),  # BERT-base dimension
            pa.field("source", pa.string()),
            pa.field("confidence", pa.float32()),
            pa.field("metadata", pa.string()),  # JSON string
            pa.field("created_at", pa.timestamp('ms'))
        ])
        
        # Page embeddings schema (crawler state)
        self.page_schema = pa.schema([
            pa.field("page_id", pa.string()),
            pa.field("url", pa.string()),
            pa.field("domain", pa.string()),
            pa.field("embedding", pa.list_(pa.float32(), 384)),  # sentence-transformers
            pa.field("content_hash", pa.string()),
            pa.field("crawl_depth", pa.int32()),
            pa.field("metadata", pa.string()),
            pa.field("timestamp", pa.timestamp('ms'))
        ])
        
        # Lead profiles schema (ICP matching)
        self.lead_schema = pa.schema([
            pa.field("profile_id", pa.string()),
            pa.field("company_id", pa.int64()),
            pa.field("embedding", pa.list_(pa.float32(), 512)),  # Siamese output
            pa.field("industry_vector", pa.list_(pa.float32(), 100)),
            pa.field("technology_vector", pa.list_(pa.float32(), 100)),
            pa.field("score", pa.float32()),
            pa.field("qualification_data", pa.string()),
            pa.field("created_at", pa.timestamp('ms'))
        ])
        
        # Replay buffer schema (RL experience)
        self.replay_schema = pa.schema([
            pa.field("episode_id", pa.string()),
            pa.field("state", pa.list_(pa.float32(), 384)),
            pa.field("action", pa.int32()),
            pa.field("reward", pa.float32()),
            pa.field("next_state", pa.list_(pa.float32(), 384)),
            pa.field("done", pa.bool_()),
            pa.field("priority", pa.float32()),
            pa.field("timestamp", pa.timestamp('ms'))
        ])
    
    def create_tables(self):
        """Create LanceDB tables with optimized configurations"""
        
        # Entity embeddings table with ANN index
        if "entity_embeddings" not in self.db.table_names():
            self.db.create_table(
                "entity_embeddings",
                schema=self.entity_schema,
                mode="create"
            )
            # Create vector index for fast similarity search
            tbl = self.db.open_table("entity_embeddings")
            tbl.create_index(
                "embedding",
                index_type="IVF_PQ",
                metric="cosine",
                num_partitions=256,
                num_sub_vectors=16
            )
        
        # Page embeddings table with partitioning
        if "page_embeddings" not in self.db.table_names():
            self.db.create_table(
                "page_embeddings",
                schema=self.page_schema,
                mode="create"
            )
            tbl = self.db.open_table("page_embeddings")
            tbl.create_index(
                "embedding",
                index_type="IVF_PQ",
                metric="cosine",
                num_partitions=128,
                num_sub_vectors=8
            )
        
        # Lead profiles table
        if "lead_profiles" not in self.db.table_names():
            self.db.create_table(
                "lead_profiles",
                schema=self.lead_schema,
                mode="create"
            )
        
        # Replay buffer table (no index needed for sampling)
        if "replay_buffer" not in self.db.table_names():
            self.db.create_table(
                "replay_buffer",
                schema=self.replay_schema,
                mode="create"
            )
```

### Efficient ANN Search with Metadata Filtering
**Implementation Pattern:** Combine vector similarity with metadata constraints:

```python
class EntityMatcher:
    def __init__(self, vector_store: VectorStoreManager):
        self.vector_store = vector_store
    
    def find_similar_entities(self, 
                            embedding: List[float],
                            entity_type: str = None,
                            min_confidence: float = 0.7,
                            limit: int = 10) -> List[Dict]:
        """Find similar entities with metadata filtering"""
        
        tbl = self.vector_store.db.open_table("entity_embeddings")
        
        # Build query with metadata filters
        query = tbl.search(embedding).metric("cosine").limit(limit * 2)
        
        if entity_type:
            query = query.where(f"entity_type = '{entity_type}'")
        
        if min_confidence:
            query = query.where(f"confidence >= {min_confidence}")
        
        # Execute and post-process
        results = query.to_pandas()
        
        # Apply additional filtering and deduplication
        filtered_results = []
        seen_entities = set()
        
        for _, row in results.iterrows():
            if row['entity_id'] not in seen_entities:
                filtered_results.append({
                    'entity_id': row['entity_id'],
                    'entity_type': row['entity_type'],
                    'similarity': 1 - row['_distance'],  # Convert distance to similarity
                    'confidence': row['confidence'],
                    'metadata': json.loads(row['metadata'])
                })
                seen_entities.add(row['entity_id'])
            
            if len(filtered_results) >= limit:
                break
        
        return filtered_results
    
    def batch_entity_matching(self, 
                             embeddings: List[List[float]],
                             entity_types: List[str] = None) -> List[List[Dict]]:
        """Batch matching for efficiency"""
        
        tbl = self.vector_store.db.open_table("entity_embeddings")
        
        # Use LanceDB's batch search capability
        all_results = []
        
        for i, embedding in enumerate(embeddings):
            query = tbl.search(embedding).metric("cosine").limit(5)
            
            if entity_types and i < len(entity_types):
                query = query.where(f"entity_type = '{entity_types[i]}'")
            
            results = query.to_pandas()
            all_results.append([
                {
                    'entity_id': row['entity_id'],
                    'similarity': 1 - row['_distance'],
                    'confidence': row['confidence']
                }
                for _, row in results.iterrows()
            ])
        
        return all_results
```

## 3. ChromaDB Collection Strategies

### Sharded Collection Design
**Implementation Pattern:** Use multiple collections for different document types:

```python
import chromadb
from chromadb.config import Settings
from typing import Optional, List, Dict
import hashlib

class DocumentStoreManager:
    def __init__(self, chroma_path: str):
        self.client = chromadb.PersistentClient(
            path=chroma_path,
            settings=Settings(
                anonymized_telemetry=False,
                allow_reset=True
            )
        )
        
        self._setup_collections()
    
    def _setup_collections(self):
        """Create and configure ChromaDB collections"""
        
        # Page documents collection (full page profiles)
        self.page_collection = self.client.get_or_create_collection(
            name="page_documents",
            metadata={"hnsw:space": "cosine", "hnsw:construction_ef": 200, "hnsw:M": 16}
        )
        
        # Company documents collection (aggregated descriptions)
        self.company_collection = self.client.get_or_create_collection(
            name="company_documents",
            metadata={"hnsw:space": "cosine", "hnsw:construction_ef": 400, "hnsw:M": 32}
        )
        
        # Topic vectors collection (BERTopic outputs)
        self.topic_collection = self.client.get_or_create_collection(
            name="topic_vectors",
            metadata={"hnsw:space": "cosine", "hnsw:construction_ef": 100, "hnsw:M": 8}
        )
    
    def store_page_document(self, 
                           url: str,
                           content: str,
                           embeddings: List[float],
                           metadata: Dict,
                           chunks: Optional[List[str]] = None):
        """Store page document with chunking strategy"""
        
        # Generate unique ID from URL and content hash
        content_hash = hashlib.md5(content.encode()).hexdigest()
        doc_id = f"page_{hashlib.md5(url.encode()).hexdigest()[:8]}_{content_hash[:8]}"
        
        # Store main document
        self.page_collection.add(
            documents=[content[:10000]],  # Limit document size
            embeddings=[embeddings],
            metadatas=[{
                **metadata,
                "url": url,
                "content_hash": content_hash,
                "chunk_count": len(chunks) if chunks else 0,
                "timestamp": metadata.get("timestamp", "")
            }],
            ids=[doc_id]
        )
        
        # Store chunks if provided
        if chunks:
            chunk_embeddings = self._embed_chunks(chunks)
            chunk_ids = [f"{doc_id}_chunk_{i}" for i in range(len(chunks))]
            
            self.page_collection.add(
                documents=chunks,
                embeddings=chunk_embeddings,
                metadatas=[
                    {
                        "parent_id": doc_id,
                        "chunk_index": i,
                        "url": url,
                        "content_hash": content_hash
                    }
                    for i in range(len(chunks))
                ],
                ids=chunk_ids
            )
    
    def find_similar_pages(self, 
                          query_embedding: List[float],
                          domain_filter: Optional[str] = None,
                          min_similarity: float = 0.7,
                          limit: int = 10) -> List[Dict]:
        """Find similar pages with metadata filtering"""
        
        # Build where clause for metadata filtering
        where = {}
        if domain_filter:
            where["domain"] = domain_filter
        
        # Query with metadata filtering
        results = self.page_collection.query(
            query_embeddings=[query_embedding],
            n_results=limit * 2,  # Query more for post-filtering
            where=where if where else None,
            include=["documents", "metadatas", "distances"]
        )
        
        # Post-process results
        filtered_results = []
        seen_urls = set()
        
        for i, (distance, metadata, document) in enumerate(
            zip(results['distances'][0], 
                results['metadatas'][0], 
                results['documents'][0])):
            
            similarity = 1 - distance
            url = metadata.get('url', '')
            
            if similarity >= min_similarity and url not in seen_urls:
                filtered_results.append({
                    'url': url,
                    'similarity': similarity,
                    'metadata': metadata,
                    'content_preview': document[:500] if document else ''
                })
                seen_urls.add(url)
            
            if len(filtered_results) >= limit:
                break
        
        return filtered_results
    
    def _embed_chunks(self, chunks: List[str]) -> List[List[float]]:
        """Embed document chunks (simplified - use your embedding model)"""
        # Implementation depends on your embedding model
        # This is a placeholder
        return [[0.0] * 384 for _ in chunks]  # sentence-transformers dimension
```

## 4. Python Asyncio Patterns for Multi-Stage Pipelines

### Task Group Pattern with Backpressure
**Research Basis:** Asyncio's TaskGroup provides structured concurrency with error handling:

```python
import asyncio
import aiohttp
from asyncio import Queue, Semaphore
from typing import Optional, List, Dict
import logging

class AsyncPipeline:
    def __init__(self, 
                 max_concurrent_crawls: int = 10,
                 max_queue_size: int = 1000):
        self.crawl_semaphore = Semaphore(max_concurrent_crawls)
        self.extraction_queue