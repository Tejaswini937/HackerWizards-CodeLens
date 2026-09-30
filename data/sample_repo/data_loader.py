"""Loading raw records from disk before they enter preprocessing."""

import csv
import json
import os


def load_data(path):
    """
    Load raw records from a JSON or CSV file on disk.

    Picks the parser based on the file extension, reads the whole file
    into memory, and returns a list of dict records. Raises FileNotFoundError
    if the path does not exist and ValueError for unsupported extensions.
    """
    if not os.path.exists(path):
        raise FileNotFoundError(f"No such file: {path}")

    ext = os.path.splitext(path)[1].lower()

    if ext == ".json":
        with open(path, "r", encoding="utf-8") as f:
            return json.load(f)

    if ext == ".csv":
        with open(path, "r", encoding="utf-8", newline="") as f:
            reader = csv.DictReader(f)
            return [row for row in reader]

    raise ValueError(f"Unsupported data file extension: {ext}")


def load_batches(path, batch_size=32):
    """
    Load records from disk and yield them in fixed-size batches.

    Useful for streaming large datasets into training without holding
    every record in memory as a single pass.
    """
    records = load_data(path)
    for start in range(0, len(records), batch_size):
        yield records[start:start + batch_size]
