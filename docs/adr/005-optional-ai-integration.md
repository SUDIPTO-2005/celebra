# ADR-005: Optional AI Integration with Strict Validation

## Status
Accepted

## Context
The AI planning assistant provides suggestions for event planning but must not compromise application security or data integrity.

## Decision
The AI integration is fully optional — configured via environment variables. When not configured, the application works normally without AI features. All AI output is validated against strict schemas, labelled as estimates/suggestions, and requires explicit user confirmation before creating records.

## Rationale
- **Graceful degradation**: No dependency on external AI services for core functionality.
- **Security**: AI output is treated as untrusted input. No secrets in prompts. No chain-of-thought exposure.
- **Cost control**: Per-user daily rate limits prevent abuse.
- **User trust**: Generated content is clearly labelled. Actions require confirmation.

## Consequences
- Frontend must check AI availability and show/hide features accordingly.
- AI-suggested budgets and timelines are estimates that may not be accurate.
- Rate limits may frustrate heavy users (configurable via env vars).
- Provider failures are handled gracefully with user-facing error messages.
