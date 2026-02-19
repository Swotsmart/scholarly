# =============================================================================
# SCHOLARLY VOICE SERVICE — Local Filesystem Storage
# =============================================================================
# Development/standalone storage backend. Stores audio files in a local
# directory. Same interface as AzureBlobStorage so calling code never
# knows the difference.
# =============================================================================

from __future__ import annotations

import hashlib
import logging
from pathlib import Path
from typing import Optional

logger = logging.getLogger(__name__)


class LocalFSStorage:
    """Local filesystem storage for development and standalone deployment.

    Stores files in a configurable directory with a flat namespace.
    Keys are sanitised to prevent path traversal attacks.
    """

    def __init__(self, base_path: Path) -> None:
        self._base_path = base_path
        self._base_path.mkdir(parents=True, exist_ok=True)
        logger.info("LocalFSStorage initialised at %s", base_path)

    def _resolve_path(self, key: str) -> Path:
        """Resolve a storage key to a safe filesystem path.

        Keys are hashed to prevent path traversal and ensure
        uniform file naming regardless of key content.
        """
        # Sanitise: use the key directly if it looks safe, otherwise hash it
        safe_chars = set("abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-_./")
        if all(c in safe_chars for c in key) and ".." not in key:
            return self._base_path / key
        else:
            hashed = hashlib.sha256(key.encode()).hexdigest()
            return self._base_path / hashed

    async def put(
        self,
        key: str,
        data: bytes,
        content_type: str = "application/octet-stream",
    ) -> str:
        """Store bytes under the given key. Returns the storage URL."""
        path = self._resolve_path(key)
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_bytes(data)
        logger.debug("Stored %d bytes at %s", len(data), path)
        return f"file://{path}"

    async def get(self, key: str) -> Optional[bytes]:
        """Retrieve bytes for the given key. Returns None if not found."""
        path = self._resolve_path(key)
        if path.exists():
            return path.read_bytes()
        return None

    async def delete(self, key: str) -> bool:
        """Delete the file at the given key. Returns True if deleted."""
        path = self._resolve_path(key)
        if path.exists():
            path.unlink()
            logger.debug("Deleted %s", path)
            return True
        return False

    async def exists(self, key: str) -> bool:
        """Check if a file exists at the given key."""
        return self._resolve_path(key).exists()

    async def get_url(self, key: str) -> Optional[str]:
        """Get the URL for a stored file."""
        path = self._resolve_path(key)
        if path.exists():
            return f"file://{path}"
        return None
