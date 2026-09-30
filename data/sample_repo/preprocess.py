"""Input normalization and dataset assembly, run before model training."""

from validation import validate_input


def normalize_input(data):
    """
    Normalize raw user or sensor input before it enters the pipeline.

    Strips whitespace, lowercases text fields, and coerces numeric-looking
    strings into floats so downstream steps receive a consistent shape.
    """
    if isinstance(data, str):
        return data.strip().lower()

    if isinstance(data, dict):
        normalized = {}
        for key, value in data.items():
            if isinstance(value, str):
                value = value.strip()
                try:
                    value = float(value)
                except ValueError:
                    value = value.lower()
            normalized[key.strip().lower()] = value
        return normalized

    return data


def preprocess_data(raw_records):
    """
    Turn a list of raw records into a clean, model-ready dataset.

    Applies validation and normalization to every record, drops records
    that fail validation instead of raising, and returns the surviving
    records along with a count of how many were dropped.
    """
    clean_records = []
    dropped = 0

    for record in raw_records:
        try:
            validate_input(record)
        except ValueError:
            dropped += 1
            continue
        clean_records.append(normalize_input(record))

    return {
        "records": clean_records,
        "dropped": dropped,
        "kept": len(clean_records),
    }
