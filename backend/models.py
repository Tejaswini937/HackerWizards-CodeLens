from typing import Literal

from pydantic import BaseModel, Field


class SearchRequest(BaseModel):
    query: str = Field(..., min_length=1)
    top_k: int = Field(default=10, ge=1, le=50)
    strategy: Literal["semantic", "hybrid", "agentic"] = "semantic"


class SearchResult(BaseModel):
    rank: int
    score: float
    file: str
    function: str
    start_line: int
    end_line: int
    code: str
    reason: str


class SearchResponse(BaseModel):
    query: str
    strategy: str
    agent_iterations: int
    latency_ms: int
    results: list[SearchResult]
    # Step-by-step log of the agent (empty for semantic/hybrid).
    agent_trace: list[str] = Field(default_factory=list)