# =============================================================================
# SCHOLARLY VOICE SERVICE — Test Fixtures
# =============================================================================

from __future__ import annotations

import pytest
from httpx import ASGITransport, AsyncClient

from app.config import Settings
from app.dependencies import get_settings


@pytest.fixture
def test_settings() -> Settings:
    """Settings configured for testing — no GPU, no external services."""
    return Settings(
        environment="development",
        log_level="DEBUG",
        tts={"kokoro_device": "cpu"},
        storage={"backend": "local_fs", "local_storage_path": "/tmp/svs-test-storage"},
        cache={"backend": "memory"},
        auth={"enabled": False},
        server={"port": 8100, "workers": 1},
    )


@pytest.fixture
def app(test_settings: Settings):
    """Create a test FastAPI app with settings override."""
    from app.main import create_app
    from app.dependencies import get_settings as _get_settings

    # Clear cached settings so test settings take effect
    _get_settings.cache_clear()

    test_app = create_app()

    # Override the settings dependency
    test_app.dependency_overrides[_get_settings] = lambda: test_settings

    yield test_app

    # Cleanup
    test_app.dependency_overrides.clear()
    _get_settings.cache_clear()


@pytest.fixture
async def client(app) -> AsyncClient:
    """Async HTTP client for testing API endpoints."""
    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://test",
    ) as ac:
        yield ac
