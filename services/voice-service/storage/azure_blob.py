# =============================================================================
# SCHOLARLY VOICE SERVICE — Azure Blob Storage Backend
# =============================================================================
# Production storage for generated audio files. Uses Azure Blob Storage
# with the same interface as LocalFSStorage.
# =============================================================================

from __future__ import annotations

import logging
from typing import Optional

logger = logging.getLogger(__name__)


class AzureBlobStorage:
    """Azure Blob Storage backend for production deployment.

    Stores audio files in an Azure Storage container with blob-level
    access control. Generates SAS URLs for time-limited download access.
    """

    def __init__(
        self,
        connection_string: str,
        container_name: str = "voice-assets",
    ) -> None:
        self._connection_string = connection_string
        self._container_name = container_name
        self._client = None

        if connection_string:
            try:
                from azure.storage.blob.aio import BlobServiceClient
                self._client = BlobServiceClient.from_connection_string(connection_string)
                logger.info("AzureBlobStorage connected to container '%s'", container_name)
            except ImportError:
                logger.warning(
                    "azure-storage-blob not installed. "
                    "Install with: pip install azure-storage-blob"
                )
            except Exception as e:
                logger.error("Failed to connect to Azure Blob Storage: %s", e)

    async def _ensure_container(self) -> None:
        """Create the container if it doesn't exist."""
        if self._client is None:
            return
        try:
            container_client = self._client.get_container_client(self._container_name)
            if not await container_client.exists():
                await container_client.create_container()
                logger.info("Created container '%s'", self._container_name)
        except Exception as e:
            logger.error("Failed to ensure container: %s", e)

    async def put(
        self,
        key: str,
        data: bytes,
        content_type: str = "application/octet-stream",
    ) -> str:
        """Upload bytes to Azure Blob Storage. Returns the blob URL."""
        if self._client is None:
            raise RuntimeError("Azure Blob Storage client not initialised")

        await self._ensure_container()
        blob_client = self._client.get_blob_client(
            container=self._container_name, blob=key
        )
        await blob_client.upload_blob(
            data,
            overwrite=True,
            content_settings={"content_type": content_type},
        )
        logger.debug("Uploaded %d bytes to blob '%s'", len(data), key)
        return blob_client.url

    async def get(self, key: str) -> Optional[bytes]:
        """Download bytes from Azure Blob Storage."""
        if self._client is None:
            return None
        try:
            blob_client = self._client.get_blob_client(
                container=self._container_name, blob=key
            )
            stream = await blob_client.download_blob()
            return await stream.readall()
        except Exception:
            return None

    async def delete(self, key: str) -> bool:
        """Delete a blob. Returns True if deleted."""
        if self._client is None:
            return False
        try:
            blob_client = self._client.get_blob_client(
                container=self._container_name, blob=key
            )
            await blob_client.delete_blob()
            return True
        except Exception:
            return False

    async def exists(self, key: str) -> bool:
        """Check if a blob exists."""
        if self._client is None:
            return False
        try:
            blob_client = self._client.get_blob_client(
                container=self._container_name, blob=key
            )
            await blob_client.get_blob_properties()
            return True
        except Exception:
            return False

    async def get_url(self, key: str) -> Optional[str]:
        """Get the URL for a blob (without SAS token — use for internal refs)."""
        if self._client is None:
            return None
        blob_client = self._client.get_blob_client(
            container=self._container_name, blob=key
        )
        return blob_client.url

    async def close(self) -> None:
        """Close the Azure client connection."""
        if self._client is not None:
            await self._client.close()
