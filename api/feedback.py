"""
feedback.py — Lightweight feedback storage and model metadata.

PURPOSE:
  Stores user feedback from policymakers/analysts about simulation runs.
  Uses a simple JSON file for persistence so the system works without
  a database.  Exposes helper functions for recording feedback and
  querying model health.
"""

from __future__ import annotations

import json
import os
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional

import pydantic

_FEEDBACK_FILE = Path(__file__).parent / "data" / "feedback.json"
_METADATA_FILE = Path(__file__).parent / "data" / "model_metadata.json"
_FEEDBACK_THRESHOLD = 20

# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------

def _ensure_data_dir() -> None:
    """Create the data directory and JSON files if they don't exist."""
    _FEEDBACK_FILE.parent.mkdir(parents=True, exist_ok=True)
    if not _FEEDBACK_FILE.exists():
        _FEEDBACK_FILE.write_text(json.dumps([]), encoding="utf-8")
    if not _METADATA_FILE.exists():
        _METADATA_FILE.write_text(
            json.dumps({"last_updated": datetime.now(timezone.utc).isoformat()}),
            encoding="utf-8",
        )


def _load_feedback_entries() -> List[Dict[str, Any]]:
    _ensure_data_dir()
    try:
        data = json.loads(_FEEDBACK_FILE.read_text(encoding="utf-8"))
        return data if isinstance(data, list) else []
    except (json.JSONDecodeError, FileNotFoundError):
        return []


def _save_feedback_entries(entries: List[Dict[str, Any]]) -> None:
    _ensure_data_dir()
    _FEEDBACK_FILE.write_text(json.dumps(entries, indent=2), encoding="utf-8")

# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def record_feedback(
    simulation_request: Dict[str, Any],
    rating_params: int,
    rating_plausible: int,
    notes: str = "",
) -> Dict[str, Any]:
    """
    Store a single feedback entry.

    Returns the entry with its assigned id and the new total count.
    """
    entries = _load_feedback_entries()
    entry_id = entries[-1]["id"] + 1 if entries else 1
    entry = {
        "id": entry_id,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "simulation_request": simulation_request,
        "rating_params": rating_params,
        "rating_plausible": rating_plausible,
        "notes": notes,
    }
    entries.append(entry)
    _save_feedback_entries(entries)

    _update_last_accessed()

    return {
        "success": True,
        "id": entry_id,
        "total_feedback": len(entries),
        "threshold_met": len(entries) >= _FEEDBACK_THRESHOLD,
    }


def get_feedback_count() -> int:
    """Return the total number of feedback entries."""
    return len(_load_feedback_entries())


def get_feedback_volume() -> Dict[str, Any]:
    """Return volume info for the admin endpoint."""
    count = get_feedback_count()
    return {
        "total_feedback": count,
        "threshold": _FEEDBACK_THRESHOLD,
        "threshold_met": count >= _FEEDBACK_THRESHOLD,
    }


def get_model_metadata() -> Dict[str, Any]:
    """Return model health metadata."""
    _ensure_data_dir()
    try:
        data = json.loads(_METADATA_FILE.read_text(encoding="utf-8"))
    except (json.JSONDecodeError, FileNotFoundError):
        data = {"last_updated": datetime.now(timezone.utc).isoformat()}

    count = get_feedback_count()
    return {
        "last_updated": data.get("last_updated", datetime.now(timezone.utc).isoformat()),
        "total_feedback": count,
        "threshold_met": count >= _FEEDBACK_THRESHOLD,
        "threshold": _FEEDBACK_THRESHOLD,
    }


def update_last_updated() -> None:
    """Update the 'model last updated' timestamp to now."""
    _ensure_data_dir()
    _METADATA_FILE.write_text(
        json.dumps({"last_updated": datetime.now(timezone.utc).isoformat()}, indent=2),
        encoding="utf-8",
    )


def _update_last_accessed() -> None:
    """Bump the last_accessed timestamp in metadata (for tracking activity)."""
    _ensure_data_dir()
    try:
        data = json.loads(_METADATA_FILE.read_text(encoding="utf-8"))
    except (json.JSONDecodeError, FileNotFoundError):
        data = {}
    data["last_accessed"] = datetime.now(timezone.utc).isoformat()
    _METADATA_FILE.write_text(json.dumps(data, indent=2), encoding="utf-8")
