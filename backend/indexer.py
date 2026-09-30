"""
Walks a directory of Python files and extracts one chunk per top-level
function, using the standard library `ast` module — no hardcoded results.
"""

import ast
import os
from dataclasses import dataclass


@dataclass
class CodeChunk:
    file: str          # path relative to the indexed root, e.g. "preprocess.py"
    function: str       # function name, e.g. "normalize_input"
    start_line: int
    end_line: int
    code: str            # exact source text of the function
    docstring: str        # extracted docstring, "" if none


def _read_lines(path):
    with open(path, "r", encoding="utf-8") as f:
        return f.readlines()


def _extract_functions(path, root_dir):
    """Parse a single .py file and return a CodeChunk per top-level function."""
    lines = _read_lines(path)
    source = "".join(lines)

    try:
        tree = ast.parse(source, filename=path)
    except SyntaxError:
        return []

    rel_path = os.path.relpath(path, root_dir).replace(os.sep, "/")
    chunks = []

    for node in ast.walk(tree):
        if not isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
            continue
        if node.name.startswith("__") and node.name.endswith("__"):
            continue  # skip dunder methods — boilerplate, not searchable logic

        start = node.lineno
        end = getattr(node, "end_lineno", None) or start
        code = "".join(lines[start - 1:end])
        docstring = ast.get_docstring(node) or ""

        chunks.append(
            CodeChunk(
                file=rel_path,
                function=node.name,
                start_line=start,
                end_line=end,
                code=code,
                docstring=docstring,
            )
        )

    return chunks


def build_chunks(root_dir):
    """Walk root_dir and return a CodeChunk list for every function found."""
    chunks = []
    for dirpath, _dirnames, filenames in os.walk(root_dir):
        for name in sorted(filenames):
            if not name.endswith(".py"):
                continue
            full_path = os.path.join(dirpath, name)
            chunks.extend(_extract_functions(full_path, root_dir))
    return chunks


def embedding_text(chunk: CodeChunk) -> str:
    """Text fed to the embedding model: docstring first, code as context."""
    parts = [chunk.function.replace("_", " ")]
    if chunk.docstring:
        parts.append(chunk.docstring)
    parts.append(chunk.code)
    return "\n".join(parts)
