# =============================================================================
# SCHOLARLY VOICE SERVICE — Provider Registry
# =============================================================================
# The registry is the air traffic controller of the Voice Service. When a
# request comes in asking for TTS synthesis, the registry doesn't just pick
# any provider — it walks through a priority cascade that considers what
# capability is needed, what language is requested, whether a cloned voice
# is involved, what cost tier the tenant is on, and which providers are
# currently healthy.
#
# This mirrors the AIPAL RoutingEngine from the Scholarly TypeScript codebase
# (capability-interfaces.ts, routing-engine.ts), translated into Python
# idioms. The same architecture, the same cascade logic, just a different
# language.
#
# The cascade (from Part 3.3 of the architecture spec):
# 1. Capability — only providers implementing the requested interface
# 2. Language — only providers supporting the requested language
# 3. Clone — if clone profile, only providers with supports_cloning=True
# 4. Cost Tier — match tenant's cost tier
# 5. Health — exclude providers failing health checks (circuit breaker)
# 6. Priority — among remaining, select lowest priority number
# =============================================================================

from __future__ import annotations

import logging
from dataclasses import dataclass, field
from typing import Any, Optional, Union

from providers.base import (
    NoProviderAvailableError,
    ProviderStatus,
    STTProvider,
    TTSProvider,
)

logger = logging.getLogger(__name__)


@dataclass
class RoutingFilters:
    """Filters applied during provider selection.

    Each filter narrows the candidate set. Filters that are None
    are skipped (wildcard). This keeps the routing call clean:
    only specify the constraints that matter for this request.
    """
    language: Optional[str] = None
    requires_cloning: bool = False
    cost_tier: Optional[str] = None  # "economy", "standard", "critical"
    preferred_provider: Optional[str] = None  # Force a specific provider by ID


@dataclass
class ProviderRegistration:
    """Wraps a provider with registration metadata for the registry."""
    provider: Union[TTSProvider, STTProvider]
    enabled: bool = True
    _consecutive_failures: int = field(default=0, init=False)
    _circuit_open: bool = field(default=False, init=False)

    # Circuit breaker: after N consecutive failures, mark unhealthy
    FAILURE_THRESHOLD: int = 3

    def record_success(self) -> None:
        """Reset failure counter on successful request."""
        self._consecutive_failures = 0
        if self._circuit_open:
            self._circuit_open = False
            logger.info(
                "Circuit breaker closed for provider '%s'",
                self.provider.provider_id,
            )

    def record_failure(self) -> None:
        """Increment failure counter. Opens circuit breaker at threshold."""
        self._consecutive_failures += 1
        if self._consecutive_failures >= self.FAILURE_THRESHOLD:
            self._circuit_open = True
            logger.warning(
                "Circuit breaker OPEN for provider '%s' after %d consecutive failures",
                self.provider.provider_id,
                self._consecutive_failures,
            )

    @property
    def is_healthy(self) -> bool:
        """Provider is healthy if circuit is closed and status is good."""
        if self._circuit_open:
            return False
        return self.provider.status in (
            ProviderStatus.HEALTHY,
            ProviderStatus.DEGRADED,
        )


class ProviderRegistry:
    """Registry for TTS and STT providers.

    Manages provider lifecycle (registration, warmup, shutdown) and
    routes requests through the priority cascade. Think of it as a
    staffing agency: it knows every provider's capabilities, availability,
    and pricing, and matches the right provider to each job.

    Usage:
        registry = ProviderRegistry()
        registry.register_tts(KokoroTTSProvider(...))
        registry.register_tts(ElevenLabsProvider(...))  # fallback

        await registry.warmup_all()

        # Route to the best available TTS provider for English
        provider = registry.get_tts(RoutingFilters(language="en-us"))
        result = await provider.synthesize(text, voice_id, "en-us")
    """

    def __init__(self) -> None:
        self._tts_providers: dict[str, ProviderRegistration] = {}
        self._stt_providers: dict[str, ProviderRegistration] = {}

    # -------------------------------------------------------------------------
    # Registration
    # -------------------------------------------------------------------------

    def register_tts(
        self,
        provider: TTSProvider,
        *,
        enabled: bool = True,
    ) -> None:
        """Register a TTS provider. Overwrites any existing provider with
        the same provider_id."""
        reg = ProviderRegistration(provider=provider, enabled=enabled)
        self._tts_providers[provider.provider_id] = reg
        logger.info(
            "Registered TTS provider '%s' (priority=%d, cost_tier=%s, languages=%s, enabled=%s)",
            provider.provider_id,
            provider.priority,
            provider.cost_tier,
            provider.supported_languages[:3],
            enabled,
        )

    def register_stt(
        self,
        provider: STTProvider,
        *,
        enabled: bool = True,
    ) -> None:
        """Register an STT provider."""
        reg = ProviderRegistration(provider=provider, enabled=enabled)
        self._stt_providers[provider.provider_id] = reg
        logger.info(
            "Registered STT provider '%s' (priority=%d, enabled=%s)",
            provider.provider_id,
            provider.priority,
            enabled,
        )

    def unregister_tts(self, provider_id: str) -> None:
        """Remove a TTS provider from the registry."""
        if provider_id in self._tts_providers:
            del self._tts_providers[provider_id]
            logger.info("Unregistered TTS provider '%s'", provider_id)

    def unregister_stt(self, provider_id: str) -> None:
        """Remove an STT provider from the registry."""
        if provider_id in self._stt_providers:
            del self._stt_providers[provider_id]
            logger.info("Unregistered STT provider '%s'", provider_id)

    # -------------------------------------------------------------------------
    # Routing — the priority cascade
    # -------------------------------------------------------------------------

    def get_tts(self, filters: Optional[RoutingFilters] = None) -> TTSProvider:
        """Route to the best available TTS provider.

        Walks the priority cascade:
        1. Start with all enabled TTS providers
        2. Filter by preferred provider (if specified, shortcut)
        3. Filter by language support
        4. Filter by cloning capability
        5. Filter by cost tier
        6. Filter by health status
        7. Sort by priority (lowest number = highest priority)
        8. Return the winner

        Raises NoProviderAvailableError if no provider matches.
        """
        filters = filters or RoutingFilters()
        candidates = self._filter_tts(filters)

        if not candidates:
            raise NoProviderAvailableError(
                capability="tts",
                filters={
                    "language": filters.language,
                    "requires_cloning": filters.requires_cloning,
                    "cost_tier": filters.cost_tier,
                    "preferred_provider": filters.preferred_provider,
                },
            )

        # Sort by priority (lowest wins)
        candidates.sort(key=lambda r: r.provider.priority)
        winner = candidates[0]

        logger.debug(
            "Routed TTS request to '%s' (priority=%d, from %d candidates)",
            winner.provider.provider_id,
            winner.provider.priority,
            len(candidates),
        )

        # Safe to cast because we only put TTSProvider instances in _tts_providers
        assert isinstance(winner.provider, TTSProvider)
        return winner.provider

    def get_stt(self, filters: Optional[RoutingFilters] = None) -> STTProvider:
        """Route to the best available STT provider. Same cascade as get_tts."""
        filters = filters or RoutingFilters()
        candidates = self._filter_stt(filters)

        if not candidates:
            raise NoProviderAvailableError(
                capability="stt",
                filters={
                    "language": filters.language,
                    "cost_tier": filters.cost_tier,
                    "preferred_provider": filters.preferred_provider,
                },
            )

        candidates.sort(key=lambda r: r.provider.priority)
        winner = candidates[0]

        logger.debug(
            "Routed STT request to '%s' (priority=%d)",
            winner.provider.provider_id,
            winner.provider.priority,
        )

        assert isinstance(winner.provider, STTProvider)
        return winner.provider

    def _filter_tts(self, filters: RoutingFilters) -> list[ProviderRegistration]:
        """Apply the priority cascade filters to TTS providers."""
        candidates = [
            reg for reg in self._tts_providers.values()
            if reg.enabled
        ]

        # Step 0: Preferred provider shortcut
        if filters.preferred_provider:
            preferred = [
                c for c in candidates
                if c.provider.provider_id == filters.preferred_provider
            ]
            if preferred:
                # Even with a preferred provider, it must be healthy
                healthy = [c for c in preferred if c.is_healthy]
                if healthy:
                    return healthy
                logger.warning(
                    "Preferred provider '%s' is unhealthy, falling through to cascade",
                    filters.preferred_provider,
                )

        # Step 1: Language filter
        if filters.language:
            candidates = [
                c for c in candidates
                if isinstance(c.provider, TTSProvider)
                and filters.language.lower() in [
                    lang.lower() for lang in c.provider.supported_languages
                ]
            ]

        # Step 2: Cloning filter
        if filters.requires_cloning:
            candidates = [
                c for c in candidates
                if isinstance(c.provider, TTSProvider)
                and c.provider.supports_cloning
            ]

        # Step 3: Cost tier filter
        if filters.cost_tier:
            tier_candidates = [
                c for c in candidates
                if c.provider.cost_tier == filters.cost_tier
            ]
            # If no providers match the cost tier, fall through to all candidates
            # rather than returning nothing — graceful degradation
            if tier_candidates:
                candidates = tier_candidates

        # Step 4: Health filter
        candidates = [c for c in candidates if c.is_healthy]

        return candidates

    def _filter_stt(self, filters: RoutingFilters) -> list[ProviderRegistration]:
        """Apply the priority cascade filters to STT providers."""
        candidates = [
            reg for reg in self._stt_providers.values()
            if reg.enabled
        ]

        if filters.preferred_provider:
            preferred = [
                c for c in candidates
                if c.provider.provider_id == filters.preferred_provider
            ]
            if preferred:
                healthy = [c for c in preferred if c.is_healthy]
                if healthy:
                    return healthy

        if filters.language:
            candidates = [
                c for c in candidates
                if isinstance(c.provider, STTProvider)
                and filters.language.lower() in [
                    lang.lower() for lang in c.provider.supported_languages
                ]
            ]

        if filters.cost_tier:
            tier_candidates = [
                c for c in candidates
                if c.provider.cost_tier == filters.cost_tier
            ]
            if tier_candidates:
                candidates = tier_candidates

        candidates = [c for c in candidates if c.is_healthy]

        return candidates

    # -------------------------------------------------------------------------
    # Circuit breaker feedback
    # -------------------------------------------------------------------------

    def record_success(self, provider_id: str) -> None:
        """Record a successful request for circuit breaker tracking."""
        if provider_id in self._tts_providers:
            self._tts_providers[provider_id].record_success()
        if provider_id in self._stt_providers:
            self._stt_providers[provider_id].record_success()

    def record_failure(self, provider_id: str) -> None:
        """Record a failed request for circuit breaker tracking."""
        if provider_id in self._tts_providers:
            self._tts_providers[provider_id].record_failure()
        if provider_id in self._stt_providers:
            self._stt_providers[provider_id].record_failure()

    # -------------------------------------------------------------------------
    # Lifecycle management
    # -------------------------------------------------------------------------

    async def warmup_all(self) -> dict[str, bool]:
        """Warm up all registered providers. Returns a map of provider_id to success."""
        results: dict[str, bool] = {}

        for provider_id, reg in {**self._tts_providers, **self._stt_providers}.items():
            if not reg.enabled:
                results[provider_id] = False
                continue
            try:
                await reg.provider.warmup()
                results[provider_id] = True
            except Exception as e:
                logger.error("Warmup failed for '%s': %s", provider_id, e)
                results[provider_id] = False

        loaded = sum(1 for v in results.values() if v)
        total = len(results)
        logger.info("Provider warmup complete: %d/%d providers ready", loaded, total)
        return results

    async def shutdown_all(self) -> None:
        """Shut down all providers, releasing resources."""
        for reg in {**self._tts_providers, **self._stt_providers}.values():
            try:
                await reg.provider.shutdown()
            except Exception as e:
                logger.error(
                    "Shutdown error for '%s': %s",
                    reg.provider.provider_id,
                    e,
                )
        logger.info("All providers shut down")

    async def health_check_all(self) -> dict[str, bool]:
        """Run health checks on all providers. Returns provider_id -> healthy."""
        results: dict[str, bool] = {}
        for provider_id, reg in {**self._tts_providers, **self._stt_providers}.items():
            try:
                healthy = await reg.provider.health_check()
                results[provider_id] = healthy
            except Exception:
                results[provider_id] = False
        return results

    # -------------------------------------------------------------------------
    # Introspection
    # -------------------------------------------------------------------------

    def list_tts_providers(self) -> list[dict[str, Any]]:
        """List all registered TTS providers with their status."""
        return [
            {
                "provider_id": reg.provider.provider_id,
                "enabled": reg.enabled,
                "healthy": reg.is_healthy,
                "status": reg.provider.status.value,
                "priority": reg.provider.priority,
                "cost_tier": reg.provider.cost_tier,
                "languages": reg.provider.supported_languages,
                "supports_cloning": reg.provider.supports_cloning
                if isinstance(reg.provider, TTSProvider) else False,
                "supports_streaming": reg.provider.supports_streaming
                if isinstance(reg.provider, TTSProvider) else False,
            }
            for reg in self._tts_providers.values()
        ]

    def list_stt_providers(self) -> list[dict[str, Any]]:
        """List all registered STT providers with their status."""
        return [
            {
                "provider_id": reg.provider.provider_id,
                "enabled": reg.enabled,
                "healthy": reg.is_healthy,
                "status": reg.provider.status.value,
                "priority": reg.provider.priority,
                "cost_tier": reg.provider.cost_tier,
                "languages": reg.provider.supported_languages,
            }
            for reg in self._stt_providers.values()
        ]

    @property
    def tts_provider_count(self) -> int:
        return len(self._tts_providers)

    @property
    def stt_provider_count(self) -> int:
        return len(self._stt_providers)
