# ADR-004: Decimal Arithmetic for Money

## Status
Accepted

## Context
Financial calculations require precision. Floating-point arithmetic (IEEE 754) introduces rounding errors that are unacceptable for budget tracking.

## Decision
Use `DecimalField(max_digits=12, decimal_places=2)` for all monetary values. Use Python's `decimal.Decimal` for calculations. Store currency explicitly per event.

## Rationale
- **Precision**: Decimal arithmetic avoids floating-point rounding errors.
- **Database support**: PostgreSQL `numeric` type stores exact decimal values.
- **Explicit currency**: Prevents accidental mixed-currency arithmetic.
- **Constraints**: Database `CHECK` constraints enforce non-negative amounts.

## Consequences
- Must use `Decimal` consistently, never `float` for money.
- JSON serialization requires explicit handling (DRF handles this).
- Mixed-currency operations are rejected with clear error messages.
- Cost-per-guest with zero guests returns a documented sentinel value.
