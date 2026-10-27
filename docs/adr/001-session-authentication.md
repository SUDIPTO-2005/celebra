# ADR-001: Session-Based Authentication Over JWT

## Status
Accepted

## Context
We need to choose an authentication mechanism for the API. The two main options are:
1. JWT (JSON Web Tokens) stored in localStorage or httpOnly cookies
2. Server-managed sessions with httpOnly cookies

## Decision
Use Django's built-in session authentication with httpOnly, SameSite=Lax cookies.

## Rationale
- **Security**: Sessions are server-managed and revocable. JWTs in localStorage are vulnerable to XSS. JWTs in cookies lose their stateless advantage.
- **Simplicity**: Django's session framework is mature and well-tested.
- **CSRF protection**: Django's CSRF middleware works naturally with session cookies.
- **Revocation**: Sessions can be invalidated server-side immediately (logout, password change).

## Consequences
- Server stores session data (minimal overhead with database backend).
- Cannot use the API from non-browser clients without session cookies (acceptable for this MVP).
- Horizontal scaling requires shared session store (future concern, not MVP).
