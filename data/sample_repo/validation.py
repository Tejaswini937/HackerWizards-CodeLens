"""Validation rules applied to raw records before they are normalized."""


def validate_input(data):
    """
    Validate that input data meets the minimum shape required for processing.

    Checks for required keys, rejects empty payloads, and raises a
    ValueError with a descriptive message when validation fails.
    """
    if data is None:
        raise ValueError("Input data cannot be None.")

    if isinstance(data, dict):
        if len(data) == 0:
            raise ValueError("Input dictionary cannot be empty.")
        required_keys = {"id", "value"}
        missing = required_keys - data.keys()
        if missing:
            raise ValueError(f"Missing required keys: {sorted(missing)}")
        return True

    if isinstance(data, str) and not data.strip():
        raise ValueError("Input string cannot be blank.")

    return True


def validate_batch(records):
    """
    Validate a whole batch of records at once.

    Returns a list of (index, error_message) tuples for every record that
    fails validate_input, so a caller can decide how to handle bad rows
    without stopping at the first failure.
    """
    problems = []
    for i, record in enumerate(records):
        try:
            validate_input(record)
        except ValueError as exc:
            problems.append((i, str(exc)))
    return problems
