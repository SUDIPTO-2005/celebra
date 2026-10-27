# Celebra STRIDE Threat Model

## System Overview

Celebra is a multi-user event planning platform with session-based authentication, role-based access control at the event level, and optional AI integration. Users manage events, guests, budgets, tasks, vendor bookings, and receive notifications.

## Trust Boundaries

1. **Browser ↔ Next.js Server**: User-controlled input enters the system
2. **Next.js ↔ Django API**: Frontend communicates with backend over HTTP
3. **Django ↔ PostgreSQL**: Application queries the database
4. **Django ↔ External AI Provider**: Optional LLM API calls
5. **Public RSVP**: Unauthenticated users access invitation links

## Threat Analysis

| # | Category | Threat | Impact | Mitigation | Test/Verification |
|---|----------|--------|--------|------------|-------------------|
| T1 | Spoofing | Credential stuffing on login | Account takeover | Rate limiting (5/min on login), strong password validators, generic error messages | `test_auth.py::test_login_throttling` |
| T2 | Spoofing | Session fixation | Account takeover | Django regenerates session ID on login (`request.session.cycle_key()`) | `test_auth.py::test_session_regeneration` |
| T3 | Tampering | CSRF on state-changing requests | Unauthorized actions | Django CSRF middleware, SameSite=Lax cookies, CSRF token in headers | `test_auth.py::test_csrf_required` |
| T4 | Tampering | Direct object reference — accessing other users' events by guessing UUID | Data breach | Object-level permission checks (`IsEventMember`) on every endpoint | `test_permissions.py::test_cross_user_access_denied` |
| T5 | Repudiation | User denies sending RSVP | Dispute | RSVP records include timestamp, IP not logged (privacy), token-based verification | `test_rsvp.py::test_rsvp_recorded` |
| T6 | Information Disclosure | Error responses leak stack traces or DB info | Information leakage | `DEBUG=False` in production, DRF exception handler returns generic messages | Production settings verification |
| T7 | Information Disclosure | Account enumeration via login/register responses | User discovery | Generic "invalid credentials" message, same response time for valid/invalid emails | `test_auth.py::test_no_account_enumeration` |
| T8 | Information Disclosure | AI prompt/response leaks sensitive data in logs | Data breach | Prompt summary only in AI request logs, no full prompts/responses stored, secrets excluded from prompts | `test_ai.py::test_no_secrets_in_logs` |
| T9 | Denial of Service | AI endpoint abuse | Resource exhaustion, cost | Per-user daily rate limit (configurable), request timeout, bounded retries | `test_ai.py::test_rate_limiting` |
| T10 | Denial of Service | CSV upload with millions of rows | Memory exhaustion | Row limit (10,000), file size limit (5MB), streaming parser | `test_csv_import.py::test_row_limit` |
| T11 | Elevation of Privilege | Invite token grants owner access | Privilege escalation | Invite tokens create guest-level RSVP only, never grant EventMember role | `test_invite.py::test_token_no_owner_access` |
| T12 | Elevation of Privilege | Manipulating role field in API requests | Privilege escalation | Role assignment only by event owner, role field not in guest/public serializers | `test_permissions.py::test_role_escalation_denied` |
| T13 | Tampering | Invite token replay after expiry | Unauthorized RSVP | Token expiry check, token hash comparison, revocation support | `test_invite.py::test_expired_token_rejected` |
| T14 | Information Disclosure | Sensitive data in notification emails | Data breach | Email templates use minimal info, no guest details in notification body | Email template review |
| T15 | Tampering | Concurrent booking creates double-booking | Data integrity | PostgreSQL exclusion constraint + transaction isolation | `test_booking.py::test_concurrent_booking` |

## Data Classification

| Classification | Examples | Controls |
|----------------|----------|----------|
| Secret | Django SECRET_KEY, AI API key, DB password | Environment variables only, never in code/logs |
| Confidential | User passwords, invite tokens | Hashed at rest (PBKDF2, SHA-256) |
| Internal | Event details, guest info, budget data | Object-level access control, authenticated endpoints |
| Public | Vendor sample data, RSVP form (via token) | Rate limiting, input validation |

## Residual Risks

1. **No MFA**: Password-only authentication. Documented as out of scope.
2. **No WAF**: Application-level protections only. A production deployment should use a WAF.
3. **Console email in dev**: Email delivery not verified in development. Production uses real SMTP.
4. **AI provider trust**: LLM output is validated but could contain misleading content. All AI output is labelled as estimates/suggestions.
5. **No audit log**: Actions are not logged for forensic analysis beyond standard Django logging. Future work.
