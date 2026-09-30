"""
CodeLens backend — Semantic, Hybrid and Agentic retrieval.

GET  /health
POST /search

Search supports:
- semantic retrieval
- hybrid retrieval (semantic + BM25)
- agentic retrieval (multi-pass: retrieve, inspect, refine, retrieve, merge)

No fabricated search results.
"""

import os
import time

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from models import SearchRequest, SearchResponse
from retriever import SemanticIndex


# ---------------------------------------------------------
# PATHS
# ---------------------------------------------------------

BACKEND_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.dirname(BACKEND_DIR)

SAMPLE_REPO_DIR = os.path.join(
    PROJECT_ROOT,
    "data",
    "sample_repo",
)


# ---------------------------------------------------------
# APP
# ---------------------------------------------------------

app = FastAPI(
    title="CodeLens API",
    version="0.3.0",
)


# ---------------------------------------------------------
# CORS
# ---------------------------------------------------------

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:5176",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:5176",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------------------------------------------------------
# RETRIEVAL INDEX
# ---------------------------------------------------------

index = SemanticIndex(
    root_dir=SAMPLE_REPO_DIR
)


# ---------------------------------------------------------
# STARTUP
# ---------------------------------------------------------

@app.on_event("startup")
def load_index():
    """
    Load the embedding model and build the code indexes once
    when the backend starts.
    """

    index.build()


# ---------------------------------------------------------
# HEALTH
# ---------------------------------------------------------

@app.get("/health")
def health():
    return {
        "status": "ok"
    }


# ---------------------------------------------------------
# SEARCH
# ---------------------------------------------------------

@app.post(
    "/search",
    response_model=SearchResponse,
)
def search(request: SearchRequest):

    started = time.perf_counter()

    # -----------------------------------------------------
    # Validate strategy
    # -----------------------------------------------------

    if request.strategy not in {
        "semantic",
        "hybrid",
        "agentic",
    }:
        raise HTTPException(
            status_code=400,
            detail="Unsupported retrieval strategy.",
        )

    # -----------------------------------------------------
    # Run retrieval
    # -----------------------------------------------------

    agent_trace = []

    if request.strategy == "agentic":
        outcome = index.agentic_search(
            query=request.query,
            top_k=request.top_k,
        )
        results = outcome["results"]
        agent_iterations = outcome["iterations"]
        agent_trace = outcome["trace"]
    else:
        results = index.search(
            query=request.query,
            top_k=request.top_k,
            strategy=request.strategy,
        )
        agent_iterations = 1

    # -----------------------------------------------------
    # Latency
    # -----------------------------------------------------

    latency_ms = round(
        (time.perf_counter() - started) * 1000
    )

    # -----------------------------------------------------
    # Response
    # -----------------------------------------------------

    return {
        "query": request.query,
        "strategy": request.strategy,
        "agent_iterations": agent_iterations,
        "latency_ms": latency_ms,
        "results": results,
        "agent_trace": agent_trace,
    }