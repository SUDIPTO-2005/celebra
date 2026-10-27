# ADR-003: PostgreSQL Exclusion Constraints for Booking Overlap Prevention

## Status
Accepted

## Context
Vendor bookings must not overlap in time. Concurrent booking requests could create conflicting reservations if only checked at the application level.

## Decision
Use PostgreSQL exclusion constraints with the `btree_gist` extension to prevent overlapping active bookings at the database level, combined with application-level validation for user-friendly error messages.

## Rationale
- **Atomicity**: Database constraints prevent race conditions that application-level checks alone cannot handle.
- **Correctness**: Exclusion constraints with `tstzrange` properly handle all overlap scenarios including edge cases.
- **Defence in depth**: Application validates first (good error messages), database enforces (correctness guarantee).

## Consequences
- Requires PostgreSQL (not portable to SQLite for testing — use PostgreSQL in CI too).
- Requires `btree_gist` extension.
- Cancellation must update booking status to release the slot.
- Only confirmed/active bookings participate in the constraint.
