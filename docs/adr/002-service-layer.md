# ADR-002: Service Layer Pattern

## Status
Accepted

## Context
Django views and serializers can easily become bloated with business logic, making code hard to test and maintain.

## Decision
Each Django domain app has a `services.py` module containing all business logic. Views and serializers remain thin — they handle HTTP concerns (request parsing, response formatting) and delegate to services.

## Rationale
- **Testability**: Services can be tested without HTTP request/response overhead.
- **Single responsibility**: Views handle HTTP, services handle business rules.
- **Reusability**: Services can be called from management commands, Celery tasks, etc.
- **Clarity**: New developers know where to find and add business logic.

## Consequences
- One additional layer of indirection.
- Must resist the temptation to put logic in serializer `validate()` or `create()` methods.
- Services receive validated data and return domain objects or raise domain exceptions.
