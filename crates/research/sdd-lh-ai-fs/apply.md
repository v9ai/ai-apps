I'll implement the BS Detector pipeline following the specifications and design. Let me start by creating the project structure and implementing the core components.

## Phase 1: Foundation & Core Infrastructure

### Task 1.1: Create project structure and base schemas

**File:** `backend/schemas/__init__.py`

```python
# backend/schemas/__init__.py
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any, Literal
from enum import Enum
from datetime import datetime

class Citation(BaseModel):
    """Represents a legal citation extracted from the MSJ"""
    id: str = Field(..., description="Unique identifier for the citation")
    raw_text: str = Field(..., description="Raw citation text as found in document")
    normalized_form: str = Field(..., description="Normalized citation format")
    context: str = Field(..., description="500 chars around citation for context")
    proposition: str = Field(..., description="What claim it supports")
    is_direct_quote: bool = Field(default=False, description="Whether citation contains direct quote")
    quoted_text: Optional[str] = Field(default=None, description="Exact quoted text if present")
    confidence: float = Field(default=1.0, ge=0.0, le=1.0, description="Extraction confidence")

class Evidence(BaseModel):
    """Evidence from supporting documents"""
    document_type: Literal["police_report", "medical_records", "witness_statement"]
    text: str = Field(..., description="Relevant text from document")
    page_or_location: Optional[str] = Field(default=None, description="Location in document")

class DiscrepancyType(str, Enum):
    DATE = "date"
    PPE = "ppe"
    CONDITION = "condition"
    ACTION = "action"
    CITATION = "citation"
    QUOTE = "quote"
    OTHER = "other"

class Discrepancy(BaseModel):
    """A discrepancy found between MSJ and supporting documents"""
    id: str = Field(..., description="Unique identifier for discrepancy")
    type: DiscrepancyType = Field(..., description="Type of discrepancy")
    msj_claim: str = Field(..., description="Claim as stated in MSJ")
    actual_value: Optional[str] = Field(default=None, description="Actual value from supporting docs")
    confidence: float = Field(default=0.8, ge=0.0, le=1.0, description="Confidence in discrepancy")
    evidence_sources: List[str] = Field(default_factory=list, description="Documents supporting discrepancy")
    description: str = Field(..., description="Detailed description of discrepancy")

class FactClaim(BaseModel):
    """A factual claim extracted from MSJ"""
    id: str = Field(..., description="Unique identifier")
    text: str = Field(..., description="Claim text")
    source_document: str = Field(default="msj", description="Document containing claim")
    supporting_evidence: List[Evidence] = Field(default_factory=list, description="Supporting evidence")
    discrepancies: List[Discrepancy] = Field(default_factory=list, description="Discrepancies found")
    verification_status: Literal["verified", "contradicted", "unverifiable"] = Field(default="unverifiable")

class QuoteVerification(BaseModel):
    """Verification result for a quoted citation"""
    citation_id: str = Field(..., description="ID of related citation")
    quoted_text: str = Field(..., description="Text quoted in MSJ")
    is_accurate: bool = Field(..., description="Whether quote is accurate")
    alterations: List[str] = Field(default_factory=list, description="List of alterations found")
    missing_context: Optional[str] = Field(default=None, description="Missing context if quote is truncated")
    confidence: float = Field(default=0.8, ge=0.0, le=1.0, description="Confidence in verification")

class AnalysisRequest(BaseModel):
    """Request schema for /analyze endpoint"""
    msj_text: str = Field(..., description="Motion for Summary Judgment text")
    police_report_text: str = Field(..., description="Police report text")
    medical_records_text: str = Field(..., description="Medical records text")
    witness_statement_text: str = Field(..., description="Witness statement text")

class ResponseMetadata(BaseModel):
    """Metadata about the analysis"""
    timestamp: datetime = Field(default_factory=datetime.now)
    processing_time_ms: Optional[float] = Field(default=None, description="Processing time in milliseconds")
    agents_executed: List[str] = Field(default_factory=list, description="List of agents that ran")
    document_sizes: Dict[str, int] = Field(default_factory=dict, description="Character counts per document")

class ConfidenceBreakdown(BaseModel):
    """Breakdown of confidence scores"""
    average_confidence: float = Field(..., ge=0.0, le=1.0)
    citation_extraction_confidence: float = Field(..., ge=0.0, le=1.0)
    fact_verification_confidence: float = Field(..., ge=0.0, le=1.0)
    quote_verification_confidence: float = Field(..., ge=0.0, le=1.0)

class ExecutiveSummary(BaseModel):
    """Executive summary of findings"""
    top_findings: List[str] = Field(..., description="Top 3-5 findings")
    overall_verdict: str = Field(..., description="Overall assessment")
    recommendations: List[str] = Field(default_factory=list, description="Recommendations for review")

class AnalysisResponse(BaseModel):
    """Response schema for /analyze endpoint"""
    metadata: ResponseMetadata
    citations: List[Citation] = Field(default_factory=list, description="Extracted citations")
    fact_discrepancies: List[Discrepancy] = Field(default_factory=list, description="Factual discrepancies found")
    quote_inaccuracies: List[QuoteVerification] = Field(default_factory=list, description="Inaccurate quotes found")
    summary: ExecutiveSummary
    confidence_scores: ConfidenceBreakdown
    evaluation_metrics: Optional[Dict[str, Any]] = Field(default=None, description="Evaluation metrics for internal use")

class Message(BaseModel):
    """Message for agent communication"""
    message_type: str = Field(..., description="Type of message")
    payload: Dict[str, Any] = Field(..., description="Message payload")
    sender: str = Field(..., description="Sender agent ID")
    timestamp: datetime = Field(default_factory=datetime.now)
```

**Verification:** Run `python -c "from schemas.models import Citation; print(Citation.schema())"` - should output JSON schema

### Task 1.2: Implement base agent interface and message bus

**File:** `backend/agents/base_agent.py`

```python
# backend/agents/base_agent.py
from abc import ABC, abstractmethod
from typing import List, Dict, Any, Optional
import logging
from schemas import Message

logger = logging.getLogger(__name__)

class Agent(ABC):
    """Abstract base class for all agents"""
    
    def __init__(self, agent_id: str):
        self.agent_id = agent_id
        self.logger = logging.getLogger(f"agent.{agent_id}")
    
    @abstractmethod
    async def process(self, message: Message) -> Message:
        """Process incoming message and return response"""
        pass
    
    @abstractmethod
    def get_subscribed_topics(self) -> List[str]:
        """Return list of message types this agent handles"""
        pass
    
    def create_response(self, message_type: str, payload: Dict[str, Any]) -> Message:
        """Helper to create response message"""
        return Message(
            message_type=message_type,
            payload=payload,
            sender=self.agent_id
        )
    
    async def handle_error(self, error: Exception, context: str = "") -> Message:
        """Handle errors gracefully"""
        self.logger.error(f"Error in {self.agent_id}: {error} - {context}")
        return self.create_response(
            message_type="ERROR",
            payload={
                "error": str(error),
                "context": context,
                "agent": self.agent_id
            }
        )
```

**File:** `backend/orchestration/message_bus.py`

```python
# backend/orchestration/message_bus.py
from typing import Dict, List, Callable, Any
import asyncio
import logging
from schemas import Message

logger = logging.getLogger(__name__)

class MessageBus:
    """Simple message bus for agent communication"""
    
    def __init__(self):
        self.subscribers: Dict[str, List[Callable]] = {}
        self.message_history: List[Message] = []
        
    def subscribe(self, message_type: str, callback: Callable):
        """Subscribe callback to message type"""
        if message_type not in self.subscribers:
            self.subscribers[message_type] = []
        self.subscribers[message_type].append(callback)
        logger.debug(f"Subscribed to {message_type}")
    
    async def publish(self, message: Message):
        """Publish message to all subscribers"""
        self.message_history.append(message)
        logger.debug(f"Publishing {message.message_type} from {message.sender}")
        
        # Get subscribers for this message type
        callbacks = self.subscribers.get(message.message_type, [])
        
        # Also check for wildcard subscribers
        wildcard_callbacks = self.subscribers.get("*", [])
        
        all_callbacks = callbacks + wildcard_callbacks
        
        if not all_callbacks:
            logger.warning(f"No subscribers for message type: {message.message_type}")
            return
        
        # Execute callbacks
        tasks = []
        for callback in all_callbacks:
            try:
                task = asyncio.create_task(callback(message))
                tasks.append(task)
            except Exception as e:
                logger.error(f"Error creating task for callback: {e}")
        
        # Wait for all callbacks to complete
        if tasks:
            await asyncio.gather(*tasks, return_exceptions=True)
    
    def get_message_history(self) -> List[Message]:
        """Get all messages published"""
        return self.message_history.copy()
```

**Verification:** Create test agent that inherits from base - should compile without errors

### Task 1.3: Set up LLM client wrapper

**File:** `backend/utils/llm_client.py`

```python
# backend/utils/llm_client.py
import os
import json
import asyncio
from typing import Dict, Any, Optional, List
import logging
from openai import AsyncOpenAI
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)

class LLMClient:
    """Wrapper for OpenAI API calls with retry logic"""
    
    def __init__(self, model: str = "gpt-4o-mini", max_retries: int = 3):
        self.model = model
        self.max_retries = max_retries
        self.client = AsyncOpenAI(api_key=os.getenv("OPENAI_API_KEY"))
        self.total_tokens_used = 0
        
    async def call_with_retry(self, messages: List[Dict[str, str]], 
                            temperature: float = 0.1,
                            max_tokens: int = 2000,
                            response_format: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """Make LLM call with exponential backoff retry"""
        for attempt in range(self.max_retries):
            try:
                kwargs = {
                    "model": self.model,
                    "messages": messages,
                    "temperature": temperature,
                    "max_tokens": max_tokens,
                }
                
                if response_format:
                    kwargs["response_format"] = response_format
                
                response = await self.client.chat.completions.create(**kwargs)
                
                # Track token usage
                self.total_tokens_used += response.usage.total_tokens
                
                return {
                    "content": response.choices[0].message.content,
                    "finish_reason": response.choices[0].finish_reason,
                    "usage": {
                        "prompt_tokens": response.usage.prompt_tokens,
                        "completion_tokens": response.usage.completion_tokens,
                        "total_tokens": response.usage.total_tokens
                    }
                }
                
            except Exception as e:
                if attempt == self.max_retries - 1:
                    logger.error(f"LLM call failed after {self.max_retries} attempts: {e}")
                    raise
                
                wait_time = 2 ** attempt  # Exponential backoff
                logger.warning(f"LLM call failed (attempt {attempt + 1}), retrying in {wait_time}s: {e}")
                await asyncio.sleep(wait_time)
    
    async def extract_structured_data(self, prompt: str, schema: Dict[str, Any]) -> Dict[str, Any]:
        """Extract structured data using function calling"""
        messages = [
            {"role": "system", "content": "You are a precise legal document analyzer. Extract structured information as requested."},
            {"role": "user", "content": prompt}
        ]
        
        response = await self.call_with_retry(
            messages=messages,
            temperature=0.1,
            response_format={"type": "json_object"}
        )
        
        try:
            return json.loads(response["content"])
        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse JSON response: {e}")
            # Try to extract JSON from text
            import re
            json_match = re.search(r'\{.*\}', response["content"], re.DOTALL)
            if json_match:
                try:
                    return json.loads(json_match.group())
                except:
                    pass
            return {"error": "Failed to parse JSON response", "raw_response": response["content"][:500]}
    
    def get_model(self) -> str:
        """Get the model name"""
        return self.model
    
    def get_token_usage(self) -> int:
        """Get total tokens used"""
        return self.total_tokens_used
    
    def reset_token_count(self):
        """Reset token counter"""
        self.total_tokens_used = 0
```

**Verification:** Run `python -c "from utils.llm_client import LLMClient; client = LLMClient(); print(client.get_model())"` - should print model name

### Task 1.4: Create document parser utility

**File:** `backend/utils/document_parser.py`

```python
# backend/utils/document_parser.py
import re
from typing import List, Dict, Any, Optional, Tuple
import logging

logger = logging.getLogger(__name__)

class DocumentParser:
    """Utility for parsing legal documents"""
    
    # Common legal citation patterns
    CITATION_PATTERNS = [
        # Case citations
        r'\b\d+\s+[A-Z]\.\s*\d+\s+\d+\s*\(\d{4}\)',  # 123 U.S. 456 (2023)
        r'\b[A-Z][a-z]+\.?\s+v\.\s+[A-Z][a-z]+\.?',  # Smith v. Jones
        r'\b\d+\s+[A-Z]{2,}\.\s*\d+',  # 123 Cal.App.4th 456
        r'\b[A-Z]+\s+Reg\.\s+\d+',  # Cal. Reg. 1234
        # Statute citations
        r'\b\d+\s+U\.S\.C\.\s+§\s*\d+',  # 42 U.S.C. § 1983
        r'\bCal\.\s+[A-Za-z]+\s+Code\s+§\s*\d+',  # Cal. Labor Code § 6400
        r'\bOSHA\s+Regulation\s+\d+',  # OSHA Regulation 1926.451
    ]
    
    def __init__(self):
        self.compiled_patterns = [re.compile(pattern, re.IGNORECASE) for pattern in self.CITATION_PATTERNS]
    
    def extract_citations(self, text: str, context_chars: int = 500) -> List[Dict[str, Any]]:
        """Extract citations from text with context"""
        citations = []
        
        for pattern in self.compiled_patterns:
            for match in pattern.finditer(text):
                citation_text = match.group()
                
                # Get context around citation
                start = max(0, match.start() - context_chars // 2)
                end = min(len(text), match.end() + context_chars // 2)
                context = text[start:end]
                
                # Try to extract proposition (the claim being supported)
                proposition = self._extract_proposition(text, match.start(), match.end())
                
                # Check if this is a direct quote
                is_direct_quote = self._is_direct_quote(context, citation_text)
                quoted_text = self._extract_quoted_text(context) if is_direct_quote else None
                
                citations.append({
                    "raw_text": citation_text,
                    "normalized_form": self._normalize_citation(citation_text),
                    "context": context,
                    "proposition": proposition,
                    "is_direct_quote": is_direct_quote,
                    "quoted_text": quoted_text
                })
        
        # Remove duplicates
        unique_citations = []
        seen = set()
        for citation in citations:
            key = citation["normalized_form"]
            if key not in seen:
                seen.add(key)
                unique_citations.append(citation)
        
        return unique_citations
    
    def _extract_proposition(self, text: str, start: int, end: int) -> str:
        """Extract the proposition that the citation supports"""
        # Look backward for the start of the sentence
        sentence_start = text.rfind('.', 0, start)
        if sentence_start == -1:
            sentence_start = 0
        else:
            sentence_start += 1  # Skip the period
        
        # Look forward for the end of the sentence
        sentence_end = text.find('.', end)
        if sentence_end == -1:
            sentence_end = len(text)
        else:
            sentence_end += 1  # Include the period
        
        sentence = text[sentence_start:sentence_end].strip()
        
        # Clean up the sentence
        sentence = re.sub(r'\s+', ' ', sentence)  # Normalize whitespace
        return sentence[:500]  # Limit length
    
    def _is_direct_quote(self, context: str, citation: str) -> bool:
        """Check if citation appears within quotation marks"""
        # Look for quotes around the citation in the context
        quote_patterns = [
            rf'["\'«»"]([^"\']*{re.escape