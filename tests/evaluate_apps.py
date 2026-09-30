import json
import os
import sys
import time
from types import SimpleNamespace

import numpy as np
import mteb
from sentence_transformers import SentenceTransformer


# ---------------------------------------------------------
# PATHS
# ---------------------------------------------------------

PROJECT_ROOT = os.path.dirname(
    os.path.dirname(os.path.abspath(__file__))
)

BACKEND_DIR = os.path.join(
    PROJECT_ROOT,
    "backend",
)

sys.path.insert(0, BACKEND_DIR)

from retriever import SemanticIndex, MODEL_NAME


# ---------------------------------------------------------
# SETTINGS
# ---------------------------------------------------------

SAMPLE_SIZE = 100
TOP_K = 10


# ---------------------------------------------------------
# METRICS
# ---------------------------------------------------------

def ndcg_at_10(retrieved_ids, relevant_ids):
    """Binary relevance NDCG@10."""

    dcg = 0.0

    for rank, doc_id in enumerate(retrieved_ids[:10], start=1):
        if doc_id in relevant_ids:
            dcg += 1.0 / np.log2(rank + 1)

    ideal_hits = min(len(relevant_ids), 10)

    if ideal_hits == 0:
        return 0.0

    idcg = sum(
        1.0 / np.log2(rank + 1)
        for rank in range(1, ideal_hits + 1)
    )

    return dcg / idcg


def reciprocal_rank(retrieved_ids, relevant_ids):
    """Reciprocal rank for first relevant result."""

    for rank, doc_id in enumerate(
        retrieved_ids[:TOP_K],
        start=1,
    ):
        if doc_id in relevant_ids:
            return 1.0 / rank

    return 0.0


# ---------------------------------------------------------
# BUILD BENCHMARK INDEX
# ---------------------------------------------------------

def build_benchmark_index(index, corpus):

    print("Loading embedding model...")
    index.model = SentenceTransformer(MODEL_NAME)

    chunks = []

    print("Preparing benchmark corpus...")

    for row in corpus:

        doc_id = str(row["id"])
        text = str(row["text"])
        title = str(row["title"] or "")

        chunks.append(
            SimpleNamespace(
                file=f"apps/{doc_id}.py",
                function=title if title else doc_id,
                start_line=1,
                end_line=max(
                    1,
                    len(text.splitlines()),
                ),
                code=text,
                docstring=title,
            )
        )

    index.chunks = chunks

    print(f"Preparing embeddings for {len(chunks)} documents...")

    texts = [
        f"{chunk.function}\n"
        f"{chunk.docstring}\n"
        f"{chunk.code}"
        for chunk in chunks
    ]

    raw_embeddings = index.model.encode(
        texts,
        convert_to_numpy=True,
        show_progress_bar=True,
    )

    index.embeddings = index._l2_normalize(
        raw_embeddings
    )

    print("Building BM25 index...")
    index._build_bm25_index()

    print("Benchmark index ready.")


# ---------------------------------------------------------
# MAIN
# ---------------------------------------------------------

def main():

    print("=" * 70)
    print("CodeLens - AppsRetrieval 100-Query Evaluation")
    print("=" * 70)

    # -----------------------------------------------------
    # Load benchmark
    # -----------------------------------------------------

    print("\nLoading MTEB AppsRetrieval...")
    task = mteb.get_task("AppsRetrieval")
    task.load_data()

    data = task.dataset["default"]["test"]

    corpus = data["corpus"]
    queries = data["queries"]
    relevant_docs = data["relevant_docs"]

    print(f"Full corpus : {len(corpus)}")
    print(f"Full queries: {len(queries)}")

    # -----------------------------------------------------
    # Build index
    # -----------------------------------------------------

    index = SemanticIndex(root_dir="")

    # Prevent normal repository indexing.
    index.build = lambda: None

    print("\nBuilding CodeLens benchmark index...")
    build_benchmark_index(index, corpus)

    # -----------------------------------------------------
    # Deterministic 100-query sample
    # Spread throughout the test set instead of taking
    # only the first 100 queries.
    # -----------------------------------------------------

    sample_positions = np.linspace(
        0,
        len(queries) - 1,
        SAMPLE_SIZE,
        dtype=int,
    )

    sample_queries = [
        queries[int(position)]
        for position in sample_positions
    ]

    print(
        f"\nRunning deterministic subset: "
        f"{len(sample_queries)} queries"
    )

    print("-" * 70)

    # -----------------------------------------------------
    # Evaluation
    # -----------------------------------------------------

    result_json = {}
    ndcg_values = []
    rr_values = []
    latencies = []

    for count, query_row in enumerate(
        sample_queries,
        start=1,
    ):

        query_id = str(query_row["id"])
        query_text = str(query_row["text"])

        started = time.perf_counter()

        outcome = index.agentic_search(
            query=query_text,
            top_k=TOP_K,
        )

        elapsed_ms = (
            time.perf_counter() - started
        ) * 1000

        latencies.append(elapsed_ms)

        retrieved_results = outcome["results"]

        retrieved_ids = []

        for item in retrieved_results[:TOP_K]:

            file_name = str(
                item.get("file", "")
            )

            if (
                file_name.startswith("apps/")
                and file_name.endswith(".py")
            ):
                doc_id = file_name[
                    len("apps/"):-3
                ]
                retrieved_ids.append(doc_id)

        relevant_ids = set(
            str(doc_id)
            for doc_id in relevant_docs.get(
                query_id,
                {}
            ).keys()
        )

        query_ndcg = ndcg_at_10(
            retrieved_ids,
            relevant_ids,
        )

        query_rr = reciprocal_rank(
            retrieved_ids,
            relevant_ids,
        )

        ndcg_values.append(query_ndcg)
        rr_values.append(query_rr)

        # Save scores in a simple retrieval-results format.
        result_json[query_id] = {
            doc_id: float(
                TOP_K - rank + 1
            )
            for rank, doc_id in enumerate(
                retrieved_ids,
                start=1,
            )
        }

        if count % 10 == 0:

            print(
                f"Processed "
                f"{count}/{SAMPLE_SIZE}"
                f" | NDCG@10: "
                f"{np.mean(ndcg_values):.4f}"
                f" | MRR: "
                f"{np.mean(rr_values):.4f}"
                f" | Avg latency: "
                f"{np.mean(latencies):.1f} ms"
            )

    # -----------------------------------------------------
    # Final metrics
    # -----------------------------------------------------

    mean_ndcg = float(
        np.mean(ndcg_values)
    )

    mean_mrr = float(
        np.mean(rr_values)
    )

    mean_latency = float(
        np.mean(latencies)
    )

    p95_latency = float(
        np.percentile(
            latencies,
            95,
        )
    )

    # -----------------------------------------------------
    # Save retrieval JSON
    # -----------------------------------------------------

    results_path = os.path.join(
        PROJECT_ROOT,
        "appsretrieval_results_subset100.json",
    )

    with open(
        results_path,
        "w",
        encoding="utf-8",
    ) as f:
        json.dump(
            result_json,
            f,
            indent=2,
        )

    # -----------------------------------------------------
    # Save summary JSON
    # -----------------------------------------------------

    summary = {
        "benchmark": "AppsRetrieval",
        "evaluation_scope": "deterministic_100_query_subset",
        "sample_size": SAMPLE_SIZE,
        "full_test_queries": len(queries),
        "corpus_documents": len(corpus),
        "top_k": TOP_K,
        "metrics": {
            "ndcg_at_10": mean_ndcg,
            "mrr": mean_mrr,
            "average_latency_ms": mean_latency,
            "p95_latency_ms": p95_latency,
        },
        "model": MODEL_NAME,
        "retrieval": "agentic",
    }

    summary_path = os.path.join(
        PROJECT_ROOT,
        "appsretrieval_subset100_summary.json",
    )

    with open(
        summary_path,
        "w",
        encoding="utf-8",
    ) as f:
        json.dump(
            summary,
            f,
            indent=2,
        )

    # -----------------------------------------------------
    # Print final result
    # -----------------------------------------------------

    print("\n")
    print("=" * 70)
    print("SUBSET EVALUATION COMPLETE")
    print("=" * 70)

    print(
        f"Queries evaluated : {SAMPLE_SIZE}"
    )

    print(
        f"Full test set     : {len(queries)}"
    )

    print(
        f"NDCG@10           : {mean_ndcg:.4f}"
    )

    print(
        f"MRR               : {mean_mrr:.4f}"
    )

    print(
        f"Average latency   : {mean_latency:.2f} ms"
    )

    print(
        f"P95 latency       : {p95_latency:.2f} ms"
    )

    print(
        f"\nResults file      : {results_path}"
    )

    print(
        f"Summary file      : {summary_path}"
    )

    print("=" * 70)

    print(
        "\nIMPORTANT: These metrics are from a "
        "100-query deterministic subset, "
        "NOT the full 3,765-query benchmark."
    )


if __name__ == "__main__":
    main()