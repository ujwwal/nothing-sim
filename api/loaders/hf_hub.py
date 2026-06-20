"""
hf_hub.py — Hugging Face Hub dataset resolver.

All loaders call `resolve_dataset_file()` to get a local path to a dataset
file.  Resolution order:
  1. Local datasets/ directory (works during local development, no download).
  2. Hugging Face Hub (download to /tmp cache on Railway / Vercel-serverless).

Set the env-var HF_DATASETS_REPO to override the default repo id.
Set HF_TOKEN if the repo is private.
"""

from __future__ import annotations

import logging
import os
from pathlib import Path

logger = logging.getLogger(__name__)

# ── Configuration ─────────────────────────────────────────────────────────────
HF_REPO_ID: str = os.getenv("HF_DATASETS_REPO", "ujwwal/quietcost-datasets")
HF_CACHE_DIR: str = os.getenv("HF_CACHE_DIR", "/tmp/quietcost-hf-cache")

# Project-root datasets/ folder (works locally)
_LOCAL_DATASETS_DIR: Path = Path(__file__).parent.parent.parent / "datasets"


def resolve_dataset_file(relative_path: str) -> Path:
    """
    Return a local Path to the requested dataset file.

    Parameters
    ----------
    relative_path : str
        Path relative to the datasets/ directory, e.g.
        ``"hud pit count_/2007-2024-PIT-Counts-by-CoC.xlsb"``
        or ``"System-Performance-Measures-Data.xlsx"``.

    Returns
    -------
    Path
        Absolute local path (guaranteed to exist).

    Raises
    ------
    FileNotFoundError
        If the file cannot be found locally or downloaded from HF Hub.
    """
    # ── 1. Try local datasets/ first ─────────────────────────────────────────
    local_path = _LOCAL_DATASETS_DIR / relative_path
    if local_path.exists():
        logger.debug("HF resolver: using local file %s", local_path)
        return local_path

    # ── 2. Download from Hugging Face Hub ────────────────────────────────────
    try:
        from huggingface_hub import hf_hub_download

        token = os.getenv("HF_TOKEN")  # None → public repo, fine
        logger.info(
            "HF resolver: downloading %s from %s …", relative_path, HF_REPO_ID
        )

        # hf_hub_download expects filename + optional subfolder
        # Split off any subdirectory from relative_path
        rel = Path(relative_path)
        subfolder = str(rel.parent) if rel.parent != Path(".") else None
        filename = rel.name

        cached = hf_hub_download(
            repo_id=HF_REPO_ID,
            filename=filename,
            subfolder=subfolder,
            repo_type="dataset",
            cache_dir=HF_CACHE_DIR,
            token=token,
        )
        logger.info("HF resolver: cached at %s", cached)
        return Path(cached)

    except Exception as exc:
        raise FileNotFoundError(
            f"Dataset file '{relative_path}' not found locally at {local_path} "
            f"and could not be downloaded from HF Hub ({HF_REPO_ID}): {exc}"
        ) from exc
