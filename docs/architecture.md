# Celebra Architecture Overview

## System Architecture

```mermaid
graph TB
    subgraph "Frontend - Next.js"
        Browser[Browser] --> NextApp[Next.js App Router]
        NextApp --> Components[React Components]
        NextApp --> APIClient[API Client]
    end

    subgraph "Backend - Django"
        APIClient --> DRF[Django REST Framework]
        DRF --> Views[Views/Serializers]
        Views --> Services[Service Layer]
        Services --> Models[Django Models/ORM]
        Services --> AIProvider[AI Provider Client]
    end

    subgraph "Data"
        Models --> PostgreSQL[(PostgreSQL)]
    end

    subgraph "External"
        AIProvider -.->|Optional| LLM[LLM API]
        Services --> Email[Email/Console Backend]
    end
```

## Design Principles

1. **Thin views, thick services**: Business logic lives in `services.py` modules, not in views or serializers.
2. **Object-level permissions**: Every event-scoped endpoint checks membership. No data accessible by guessing IDs.
3. **Server-side validation**: All validation happens on the backend. Frontend validation is for UX only.
4. **Explicit state machines**: Event and booking lifecycles have defined transitions enforced server-side.
5. **Decimal-safe money**: All monetary values use `DecimalField` with explicit precision.
6. **UUID identifiers**: Primary keys use UUIDs to prevent enumeration attacks.
7. **Secure by default**: Production settings enforce HTTPS, secure cookies, CSP, HSTS.

## Data Model

```mermaid
erDiagram
    User ||--o{ EventMember : "has memberships"
    Event ||--o{ EventMember : "has members"
    Event ||--o{ Guest : "has guests"
    Event ||--o{ BudgetCategory : "has budget categories"
    Event ||--o{ Task : "has tasks"
    Event ||--o{ ScheduleItem : "has schedule"
    Event ||--o{ QuoteRequest : "has quote requests"
    Event ||--o{ Booking : "has bookings"
    Event ||--o{ Notification : "generates notifications"
    Guest ||--o| RSVP : "has RSVP"
    Guest ||--o| InviteToken : "has invite token"
    BudgetCategory ||--o{ Expense : "has expenses"
    Task }o--o| User : "assigned to"
    Vendor ||--o{ QuoteRequest : "receives quotes"
    Vendor ||--o{ Booking : "has bookings"
    User ||--o{ AIRequest : "makes AI requests"
    User ||--o{ Notification : "receives notifications"

    User {
        uuid id PK
        string email UK
        string first_name
        string last_name
        datetime date_joined
        boolean is_active
    }

    Event {
        uuid id PK
        string name
        text description
        string event_type
        string venue
        datetime start_date
        datetime end_date
        string timezone
        decimal budget
        string currency
        string status
        datetime created_at
        datetime updated_at
    }

    EventMember {
        uuid id PK
        uuid event_id FK
        uuid user_id FK
        string role
        datetime joined_at
    }

    Guest {
        uuid id PK
        uuid event_id FK
        string name
        string email
        integer plus_ones
        string dietary_requirements
        string accessibility_requirements
        datetime created_at
    }

    RSVP {
        uuid id PK
        uuid guest_id FK
        string response
        text notes
        datetime responded_at
    }

    InviteToken {
        uuid id PK
        uuid guest_id FK
        string token_hash UK
        datetime expires_at
        boolean revoked
        datetime created_at
    }

    BudgetCategory {
        uuid id PK
        uuid event_id FK
        string name
        decimal estimated_amount
    }

    Expense {
        uuid id PK
        uuid category_id FK
        string description
        decimal amount
        string currency
        datetime date
    }

    Task {
        uuid id PK
        uuid event_id FK
        uuid assigned_to FK
        string title
        text description
        string priority
        string status
        datetime due_date
        datetime completed_at
    }

    ScheduleItem {
        uuid id PK
        uuid event_id FK
        string title
        datetime start_time
        datetime end_time
        string timezone
        text notes
    }

    Vendor {
        uuid id PK
        string name
        string category
        text description
        string contact_email
        string phone
        boolean is_sample_data
    }

    QuoteRequest {
        uuid id PK
        uuid event_id FK
        uuid vendor_id FK
        text details
        string status
        decimal quoted_amount
        datetime created_at
    }

    Booking {
        uuid id PK
        uuid event_id FK
        uuid vendor_id FK
        datetime start_time
        datetime end_time
        string status
        decimal amount
    }

    Notification {
        uuid id PK
        uuid user_id FK
        uuid event_id FK
        string notification_type
        string title
        text message
        boolean is_read
        datetime created_at
    }

    AIRequest {
        uuid id PK
        uuid user_id FK
        string request_type
        text prompt_summary
        string status
        datetime created_at
    }
```

## Key Constraints and Invariants

1. **EventMember uniqueness**: `UNIQUE(event_id, user_id)` — a user can only have one role per event.
2. **RSVP uniqueness**: One RSVP per guest (`OneToOneField`).
3. **Invite token security**: Tokens are hashed with SHA-256 before storage. `UNIQUE(token_hash)`.
4. **Money precision**: All monetary fields use `DecimalField(max_digits=12, decimal_places=2)`.
5. **Non-negative amounts**: Database `CHECK` constraints on monetary fields.
6. **Event status transitions**: Enforced via service layer state machine (draft→planning→confirmed→completed; any→cancelled).
7. **Booking overlap prevention**: PostgreSQL exclusion constraint on `(vendor_id, tstzrange(start_time, end_time))` for active bookings.
8. **Currency consistency**: Mixed-currency calculations are rejected.
9. **Token expiry**: Tokens expire after 7 days by default. Expired/revoked tokens are rejected.

## API Design

All endpoints are under `/api/` prefix:

| Prefix | App | Description |
|--------|-----|-------------|
| `/api/auth/` | accounts | Authentication |
| `/api/events/` | events | Event CRUD and lifecycle |
| `/api/events/{id}/guests/` | guests | Guest management |
| `/api/events/{id}/rsvp/` | guests | RSVP via invite token |
| `/api/events/{id}/budget/` | budget | Budget categories and expenses |
| `/api/events/{id}/tasks/` | tasks | Task management |
| `/api/events/{id}/schedule/` | tasks | Schedule items |
| `/api/vendors/` | vendors | Vendor directory |
| `/api/events/{id}/quotes/` | vendors | Quote requests |
| `/api/events/{id}/bookings/` | vendors | Bookings |
| `/api/ai/` | ai | AI assistant |
| `/api/notifications/` | notifications | User notifications |
| `/api/health/` | core | Health check |

## Security Architecture

See [Threat Model](threat-model.md) for detailed analysis.

Key security controls:
- Session-based authentication with secure cookies
- Object-level authorization on all event-scoped endpoints
- CSRF protection for state-changing requests
- Rate limiting on authentication and public endpoints
- Input validation at serializer and service layers
- PostgreSQL parameterized queries (via Django ORM)
- No secrets in version control
- Generic error responses (no stack traces in production)
