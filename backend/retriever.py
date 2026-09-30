"""
Hybrid + agentic code retrieval.

Combines:
1. Semantic retrieval using sentence-transformers
2. BM25 lexical retrieval for exact code terms
3. An agentic multi-pass loop built on top of the hybrid retriever:
   analyze -> retrieve -> inspect -> refine -> retrieve -> merge/re-rank

No hardcoded or fabricated results. No external LLM/API.
"""

import math
import os
import re
from collections import Counter

import numpy as np
from sentence_transformers import SentenceTransformer

from indexer import build_chunks, embedding_text


MODEL_NAME = "all-MiniLM-L6-v2"


# ---------------------------------------------------------
# AGENTIC CONFIGURATION
# ---------------------------------------------------------

MAX_PASSES = 2                 # retrieval passes the agent may perform
INSPECT_TOP_N = 3              # how many pass-1 snippets the agent inspects
MAX_EXPANSION_TERMS = 4        # terms appended to the query on refinement

CONFIDENT_COSINE = 0.60        # top hit cosine needed to skip refinement
CONFIDENT_MARGIN = 0.05        # cosine gap between rank 1 and rank 2

PASS1_WEIGHT = 0.6             # original query keeps more weight (avoids drift)
PASS2_WEIGHT = 0.4

SEMANTIC_WEIGHT = 0.65         # same blend as the existing hybrid mode
BM25_WEIGHT = 0.35

STOPWORDS = {
    "a", "an", "the", "how", "do", "does", "did", "i", "we", "you", "to",
    "in", "of", "on", "for", "and", "or", "with", "from", "is", "are", "be",
    "what", "where", "which", "that", "this", "it", "find", "show", "get",
    "me", "my", "code", "function", "functions", "method", "used", "using",
    "can", "should", "when", "why", "any", "all",
}

# Tokens that appear in almost all Python code and carry no concept.
CODE_NOISE = {
    "def", "return", "self", "cls", "import", "from", "none", "true",
    "false", "else", "elif", "for", "while", "try", "except", "raise",
    "pass", "class", "lambda", "with", "assert", "not", "and", "or", "the",
    "str", "int", "float", "dict", "list", "bool", "len", "isinstance",
    "args", "kwargs", "yield", "del", "global", "in", "is", "as", "if",
    "any", "all", "set", "tuple", "print", "range", "type", "async",
    "await", "finally", "continue", "break",
}

CATEGORY_KEYWORDS = {
    "validation / checking": {
        "validate", "validation", "check", "verify", "valid", "invalid",
        "ensure", "sanitize", "assert",
    },
    "file / data I/O": {
        "read", "write", "load", "save", "file", "open", "path", "json",
        "csv", "export", "import", "dump",
    },
    "parsing / text processing": {
        "parse", "parsing", "split", "tokenize", "extract", "regex", "clean",
        "normalize", "format", "text", "string", "strip",
    },
    "error handling": {
        "error", "exception", "retry", "fail", "failure", "fallback",
        "handle", "raise", "timeout",
    },
    "data transformation": {
        "convert", "transform", "map", "filter", "sort", "merge",
        "aggregate", "group", "scale", "encode",
    },
    "network / API": {
        "request", "response", "http", "api", "url", "endpoint", "fetch",
        "client", "server",
    },
}


class SemanticIndex:
    def __init__(self, root_dir: str, model_name: str = MODEL_NAME):
        self.root_dir = root_dir
        self.model_name = model_name

        self.model = None
        self.chunks = []

        # Semantic embeddings
        self.embeddings = None

        # BM25 data
        self.tokenized_documents = []
        self.document_frequencies = Counter()
        self.doc_lengths = []
        self.avg_doc_length = 0.0

        # BM25 parameters
        self.k1 = 1.5
        self.b = 0.75

    # ---------------------------------------------------------
    # BUILD INDEX
    # ---------------------------------------------------------

    def build(self):
        """Load the model, index the repository, and build both indexes."""

        self.model = SentenceTransformer(self.model_name)

        self.chunks = build_chunks(self.root_dir)

        if not self.chunks:
            self.embeddings = np.zeros((0, 0), dtype=np.float32)
            return

        # -------------------------
        # Semantic index
        # -------------------------

        texts = [embedding_text(chunk) for chunk in self.chunks]

        raw_embeddings = self.model.encode(
            texts,
            convert_to_numpy=True,
            show_progress_bar=False,
        )

        self.embeddings = self._l2_normalize(raw_embeddings)

        # -------------------------
        # BM25 index
        # -------------------------

        self._build_bm25_index()

    # ---------------------------------------------------------
    # TOKENIZATION
    # ---------------------------------------------------------

    @staticmethod
    def _tokenize(text: str):
        """
        Convert code/text into searchable tokens.

        camelCase and snake_case are split so that queries such as
        'normalize input' can match normalize_input().
        """

        text = str(text)

        # Split camelCase:
        # normalizeInput -> normalize Input
        text = re.sub(r"([a-z])([A-Z])", r"\1 \2", text)

        # Replace non-alphanumeric characters with spaces.
        text = re.sub(r"[^a-zA-Z0-9_]+", " ", text)

        # Split underscores as well.
        text = text.replace("_", " ")

        return [
            token.lower()
            for token in text.split()
            if token.strip()
        ]

    # ---------------------------------------------------------
    # BM25 INDEX
    # ---------------------------------------------------------

    def _build_bm25_index(self):
        """Build the in-memory BM25 lexical index."""

        self.tokenized_documents = []
        self.document_frequencies = Counter()
        self.doc_lengths = []

        for chunk in self.chunks:

            # Include several useful code-aware fields.
            searchable_text = " ".join(
                [
                    str(chunk.file),
                    str(chunk.function),
                    str(chunk.code),
                ]
            )

            tokens = self._tokenize(searchable_text)

            self.tokenized_documents.append(tokens)
            self.doc_lengths.append(len(tokens))

            # BM25 document frequency counts each term once per document.
            for token in set(tokens):
                self.document_frequencies[token] += 1

        if self.doc_lengths:
            self.avg_doc_length = sum(self.doc_lengths) / len(self.doc_lengths)
        else:
            self.avg_doc_length = 0.0

    # ---------------------------------------------------------
    # BM25 SCORING
    # ---------------------------------------------------------

    def _bm25_score(self, query_tokens, document_tokens, document_length):
        """Calculate BM25 score for one document."""

        if not query_tokens or not document_tokens:
            return 0.0

        document_counts = Counter(document_tokens)

        number_of_documents = len(self.tokenized_documents)

        score = 0.0

        for term in query_tokens:

            if term not in document_counts:
                continue

            document_frequency = self.document_frequencies.get(term, 0)

            if document_frequency == 0:
                continue

            # BM25 IDF
            idf = math.log(
                1
                + (
                    number_of_documents - document_frequency + 0.5
                )
                / (document_frequency + 0.5)
            )

            term_frequency = document_counts[term]

            denominator = (
                term_frequency
                + self.k1
                * (
                    1
                    - self.b
                    + self.b
                    * (
                        document_length
                        / max(self.avg_doc_length, 1e-8)
                    )
                )
            )

            score += (
                idf
                * (
                    term_frequency
                    * (self.k1 + 1)
                )
                / denominator
            )

        return score

    # ---------------------------------------------------------
    # NORMALIZATION
    # ---------------------------------------------------------

    @staticmethod
    def _normalize_scores(scores):
        """
        Min-max normalize scores to [0, 1].

        This allows semantic and BM25 scores to be combined.
        """

        scores = np.asarray(scores, dtype=np.float32)

        if len(scores) == 0:
            return scores

        minimum = scores.min()
        maximum = scores.max()

        if maximum - minimum < 1e-8:
            return np.zeros_like(scores)

        return (scores - minimum) / (maximum - minimum)

    # ---------------------------------------------------------
    # SEMANTIC SEARCH
    # ---------------------------------------------------------

    def _semantic_scores(self, query: str):
        """Return semantic cosine similarity scores."""

        query_vec = self.model.encode(
            [query],
            convert_to_numpy=True,
            show_progress_bar=False,
        )

        query_vec = self._l2_normalize(query_vec)[0]

        return self.embeddings @ query_vec

    # ---------------------------------------------------------
    # BM25 SEARCH
    # ---------------------------------------------------------

    def _bm25_scores(self, query: str):
        """Return BM25 lexical scores."""

        query_tokens = self._tokenize(query)

        scores = []

        for tokens, length in zip(
            self.tokenized_documents,
            self.doc_lengths,
        ):
            score = self._bm25_score(
                query_tokens,
                tokens,
                length,
            )

            scores.append(score)

        return np.asarray(scores, dtype=np.float32)

    # ---------------------------------------------------------
    # SEARCH (semantic / hybrid) -- unchanged behaviour
    # ---------------------------------------------------------

    def search(
        self,
        query: str,
        top_k: int = 10,
        strategy: str = "semantic",
    ):
        """
        Search the indexed repository.

        strategy:
            semantic -> semantic embeddings only
            hybrid   -> semantic + BM25

        (Agentic search lives in agentic_search().)
        """

        if self.model is None:
            raise RuntimeError(
                "SemanticIndex.build() must be called before search()."
            )

        if len(self.chunks) == 0:
            return []

        # -------------------------
        # Semantic scores
        # -------------------------

        semantic_scores = self._semantic_scores(query)

        # -------------------------
        # Semantic-only mode
        # -------------------------

        if strategy == "semantic":

            final_scores = semantic_scores
            reasons = [
                (
                    "Ranked by cosine similarity between the query "
                    "embedding and this function's docstring + code embedding."
                )
                for _ in self.chunks
            ]

        # -------------------------
        # Hybrid mode
        # -------------------------

        else:

            bm25_scores = self._bm25_scores(query)

            normalized_semantic = self._normalize_scores(
                semantic_scores
            )

            normalized_bm25 = self._normalize_scores(
                bm25_scores
            )

            # Semantic meaning gets slightly more weight.
            semantic_weight = 0.65
            bm25_weight = 0.35

            final_scores = (
                semantic_weight * normalized_semantic
                + bm25_weight * normalized_bm25
            )

            reasons = []

            for i in range(len(self.chunks)):

                if bm25_scores[i] > 0:
                    reason = (
                        "Hybrid ranking using semantic similarity "
                        "and BM25 keyword matching."
                    )
                else:
                    reason = (
                        "Hybrid ranking primarily supported by "
                        "semantic similarity."
                    )

                reasons.append(reason)

        # -------------------------
        # Rank
        # -------------------------

        top_k = min(top_k, len(self.chunks))

        top_indices = np.argsort(-final_scores)[:top_k]

        results = []

        for rank, idx in enumerate(top_indices, start=1):

            chunk = self.chunks[idx]

            results.append(
                {
                    "rank": rank,
                    "score": float(
                        round(float(final_scores[idx]), 4)
                    ),
                    "file": chunk.file,
                    "function": chunk.function,
                    "start_line": chunk.start_line,
                    "end_line": chunk.end_line,
                    "code": chunk.code,
                    "reason": reasons[idx],
                }
            )

        return results

    # =========================================================
    # AGENTIC RETRIEVAL
    # =========================================================

    # ---------------------------------------------------------
    # Step 0: analyze / categorize the query
    # ---------------------------------------------------------

    def _analyze_query(self, query: str):
        """
        Deterministic query analysis:
        - keywords (query tokens without filler words)
        - category (from a small keyword map)
        - exact_functions: indexed function names the query mentions
        """

        tokens = self._tokenize(query)

        keywords = []
        for token in tokens:
            if token not in STOPWORDS and token not in keywords:
                keywords.append(token)
        if not keywords:
            keywords = list(dict.fromkeys(tokens))

        # Category = keyword group with the most overlap with the query.
        best_category = "general concept search"
        best_hits = 0
        for category, vocabulary in CATEGORY_KEYWORDS.items():
            hits = sum(
                1
                for k in keywords
                if k in vocabulary or k.rstrip("s") in vocabulary
            )
            if hits > best_hits:
                best_category, best_hits = category, hits

        # Does the query literally name a function in the index?
        function_names = {c.function.lower() for c in self.chunks}
        candidates = {
            w.lower() for w in re.findall(r"[A-Za-z_][A-Za-z0-9_]*", query)
        }
        candidates.add("_".join(tokens))  # "normalize input" -> normalize_input
        exact_functions = sorted(candidates & function_names)

        return {
            "keywords": keywords,
            "category": best_category,
            "exact_functions": exact_functions,
        }

    # ---------------------------------------------------------
    # One hybrid retrieval pass (same blend as hybrid mode)
    # ---------------------------------------------------------

    def _hybrid_pass(self, query: str):
        semantic = self._semantic_scores(query)
        bm25 = self._bm25_scores(query)

        final = (
            SEMANTIC_WEIGHT * self._normalize_scores(semantic)
            + BM25_WEIGHT * self._normalize_scores(bm25)
        )

        # Deterministic ordering: score descending, then chunk index.
        order = np.lexsort((np.arange(len(final)), -final)).tolist()

        return {
            "final": final,
            "semantic": semantic,
            "bm25": bm25,
            "order": order,
        }

    # ---------------------------------------------------------
    # Step 3: inspect results and choose expansion terms
    # ---------------------------------------------------------

    def _expansion_terms(self, top_indices, query_tokens):
        """
        Pseudo-relevance feedback: pick informative terms from the
        actual top-ranked snippets of pass 1.

        Term score = rank weight * (1 + log tf) * IDF, doubled for terms
        found in the function name / docstring / file name. Terms already
        in the query, generic code tokens, terms unique to one chunk, and
        terms found in most chunks are skipped.
        """

        n_docs = len(self.chunks)
        query_set = set(query_tokens)
        scores = Counter()

        for rank, idx in enumerate(top_indices, start=1):
            chunk = self.chunks[idx]
            rank_weight = 1.0 / rank

            focus = set(self._tokenize(chunk.function))
            focus |= set(self._tokenize(chunk.docstring))
            focus |= set(
                self._tokenize(os.path.splitext(chunk.file)[0])
            )

            term_counts = Counter(self.tokenized_documents[idx])

            for term, count in term_counts.items():
                if len(term) < 3 or term.isdigit():
                    continue
                if term in CODE_NOISE or term in STOPWORDS:
                    continue
                if term in query_set:
                    continue

                df = self.document_frequencies.get(term, 0)

                # Unique to one chunk: cannot help find *other* evidence.
                if df < 2:
                    continue
                # Too common to be informative.
                if n_docs >= 5 and df / n_docs > 0.4:
                    continue

                idf = math.log(1 + (n_docs - df + 0.5) / (df + 0.5))
                term_score = rank_weight * (1 + math.log(count)) * idf
                if term in focus:
                    term_score *= 2

                scores[term] += term_score

        ranked = sorted(scores.items(), key=lambda kv: (-kv[1], kv[0]))
        return [term for term, _ in ranked[:MAX_EXPANSION_TERMS]]

    # ---------------------------------------------------------
    # Full agentic loop
    # ---------------------------------------------------------

    def agentic_search(self, query: str, top_k: int = 10):
        """
        Multi-pass retrieval.

        Returns:
            {
              "results": [...],
              "iterations": <number of retrieval passes actually run>,
              "trace": [<human-readable log of each agent step>],
            }
        """

        if self.model is None:
            raise RuntimeError(
                "SemanticIndex.build() must be called before search()."
            )

        if len(self.chunks) == 0:
            return {
                "results": [],
                "iterations": 0,
                "trace": ["Index is empty; nothing to retrieve."],
            }

        top_k = min(top_k, len(self.chunks))
        trace = []
        iterations = 0

        # ---- Step 1: analyze the query ----------------------------
        analysis = self._analyze_query(query)
        query_tokens = self._tokenize(query)

        trace.append(
            f"Analysis: category='{analysis['category']}', "
            f"keywords={analysis['keywords']}, "
            f"exact function match={analysis['exact_functions'] or 'none'}."
        )

        # ---- Step 2: pass 1 (hybrid, original query) --------------
        pass1 = self._hybrid_pass(query)
        iterations += 1
        order1 = pass1["order"]
        top1 = order1[0]

        trace.append(
            f"Pass 1 (hybrid, original query): top result = "
            f"{self.chunks[top1].file}::{self.chunks[top1].function} "
            f"(cosine={float(pass1['semantic'][top1]):.3f}, "
            f"BM25={float(pass1['bm25'][top1]):.3f})."
        )

        # ---- Step 3: inspect and decide ---------------------------
        top_cosine = float(pass1["semantic"][top1])
        top_bm25 = float(pass1["bm25"][top1])
        if len(order1) > 1:
            margin = top_cosine - float(pass1["semantic"][order1[1]])
        else:
            margin = top_cosine

        exact_hit = (
            self.chunks[top1].function.lower()
            in analysis["exact_functions"]
        )
        confident = exact_hit or (
            top_cosine >= CONFIDENT_COSINE
            and top_bm25 > 0
            and margin >= CONFIDENT_MARGIN
        )

        stop_reason = None
        expansion_terms = []

        if confident:
            if exact_hit:
                stop_reason = (
                    "the top result's function name exactly matches the query"
                )
            else:
                stop_reason = (
                    f"pass 1 was confident (cosine {top_cosine:.3f}, "
                    f"lexical match present, margin {margin:.3f})"
                )
            trace.append(f"Inspection: no refinement needed - {stop_reason}.")
        elif MAX_PASSES < 2:
            stop_reason = "maximum passes reached"
            trace.append("Inspection: pass limit reached.")
        else:
            inspected = order1[:INSPECT_TOP_N]
            expansion_terms = self._expansion_terms(
                inspected, query_tokens
            )
            inspected_names = [
                f"{self.chunks[i].file}::{self.chunks[i].function}"
                for i in inspected
            ]
            if expansion_terms:
                trace.append(
                    f"Inspection: pass 1 not confident (cosine "
                    f"{top_cosine:.3f}, BM25 {top_bm25:.3f}, margin "
                    f"{margin:.3f}). Inspected {inspected_names}; "
                    f"useful terms found: {expansion_terms}."
                )
            else:
                stop_reason = (
                    "no informative expansion terms were found in the "
                    "pass-1 snippets"
                )
                trace.append(
                    f"Inspection: pass 1 not confident, but {stop_reason}."
                )

        # ---- Single-pass exit ------------------------------------
        if not expansion_terms:
            results = []
            for rank, idx in enumerate(order1[:top_k], start=1):
                chunk = self.chunks[idx]
                reason = self._reason(
                    idx=idx,
                    analysis=analysis,
                    terms=[],
                    rank1=rank,
                    rank2=None,
                    iterations=iterations,
                    stop_reason=stop_reason,
                )
                results.append(
                    self._result(
                        rank, idx, float(pass1["final"][idx]), reason
                    )
                )
            trace.append(
                f"Final: returned top {len(results)} from the single "
                f"retrieval pass."
            )
            return {
                "results": results,
                "iterations": iterations,
                "trace": trace,
            }

        # ---- Step 4: refine the query -----------------------------
        refined_query = f"{query} {' '.join(expansion_terms)}"
        trace.append(
            f"Refinement: original query + learned terms -> "
            f"'{refined_query}'."
        )

        # ---- Step 5: pass 2 (hybrid, refined query) ---------------
        pass2 = self._hybrid_pass(refined_query)
        iterations += 1
        order2 = pass2["order"]
        top2 = order2[0]

        trace.append(
            f"Pass 2 (hybrid, refined query): top result = "
            f"{self.chunks[top2].file}::{self.chunks[top2].function} "
            f"(cosine={float(pass2['semantic'][top2]):.3f}, "
            f"BM25={float(pass2['bm25'][top2]):.3f})."
        )

        # ---- Step 6: merge, deduplicate, re-rank ------------------
        rank_map1 = {idx: r for r, idx in enumerate(order1, start=1)}
        rank_map2 = {idx: r for r, idx in enumerate(order2, start=1)}

        pool = max(top_k * 2, 10)
        pool1 = order1[:pool]
        pool2 = order2[:pool]

        candidates = list(dict.fromkeys(pool1 + pool2))  # dedupe, keep order

        combined = {
            idx: (
                PASS1_WEIGHT * float(pass1["final"][idx])
                + PASS2_WEIGHT * float(pass2["final"][idx])
            )
            for idx in candidates
        }

        ranked = sorted(candidates, key=lambda i: (-combined[i], i))[:top_k]

        new_from_pass2 = len(set(pool2) - set(pool1))
        trace.append(
            f"Merge: {len(candidates)} unique candidates from both passes "
            f"({new_from_pass2} only surfaced by pass 2). Re-ranked with "
            f"{PASS1_WEIGHT} x pass-1 score + {PASS2_WEIGHT} x pass-2 score."
        )

        results = []
        for rank, idx in enumerate(ranked, start=1):
            reason = self._reason(
                idx=idx,
                analysis=analysis,
                terms=expansion_terms,
                rank1=rank_map1[idx],
                rank2=rank_map2[idx],
                iterations=iterations,
                stop_reason=None,
                in_pool1=idx in pool1,
                in_pool2=idx in pool2,
            )
            results.append(self._result(rank, idx, combined[idx], reason))

        trace.append(f"Final: returned top {len(results)} merged results.")

        return {
            "results": results,
            "iterations": iterations,
            "trace": trace,
        }

    # ---------------------------------------------------------
    # Agentic helpers
    # ---------------------------------------------------------

    def _result(self, rank, idx, score, reason):
        chunk = self.chunks[idx]
        return {
            "rank": rank,
            "score": float(round(score, 4)),
            "file": chunk.file,
            "function": chunk.function,
            "start_line": chunk.start_line,
            "end_line": chunk.end_line,
            "code": chunk.code,
            "reason": reason,
        }

    def _reason(
        self,
        idx,
        analysis,
        terms,
        rank1,
        rank2,
        iterations,
        stop_reason,
        in_pool1=True,
        in_pool2=False,
    ):
        """Build an explanation from the real retrieval data."""

        chunk = self.chunks[idx]
        doc_tokens = set(self.tokenized_documents[idx])

        matched_query = [k for k in analysis["keywords"] if k in doc_tokens]
        matched_learned = [t for t in terms if t in doc_tokens]

        parts = [
            f"Agentic retrieval ({iterations} "
            f"pass{'es' if iterations != 1 else ''}, query type: "
            f"{analysis['category']})."
        ]

        if rank2 is None:
            parts.append(
                f"Ranked #{rank1} by hybrid score (semantic + BM25) on the "
                f"original query; stopped after 1 pass because "
                f"{stop_reason}."
            )
        else:
            parts.append(f"Pass 1 rank: #{rank1}. Pass 2 rank: #{rank2}.")
            if in_pool1 and in_pool2:
                parts.append("Found by both passes.")
            elif in_pool2:
                parts.append(
                    "Surfaced only after query refinement using terms "
                    "learned from pass-1 results."
                )
            else:
                parts.append(
                    "Found by pass 1 on the original query and kept "
                    "after re-ranking."
                )

        if chunk.function.lower() in analysis["exact_functions"]:
            parts.append("Function name exactly matches the query.")
        if matched_query:
            parts.append(
                f"Matches query terms: {', '.join(matched_query)}."
            )
        if matched_learned:
            parts.append(
                f"Matches terms learned from pass 1: "
                f"{', '.join(matched_learned)}."
            )

        return " ".join(parts)

    # ---------------------------------------------------------
    # UTILITY
    # ---------------------------------------------------------

    @staticmethod
    def _l2_normalize(matrix):
        norms = np.linalg.norm(
            matrix,
            axis=1,
            keepdims=True,
        )

        norms[norms == 0] = 1e-8

        return matrix / norms