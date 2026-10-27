# Celebra — Event Planning Platform

An accessible, secure event-planning web platform for managing events, guests, RSVPs, budgets, tasks, schedules, vendor quotes, and AI planning assistance.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 14, React 18, TypeScript, Tailwind CSS |
| Backend | Python 3.13, Django 5.1, Django REST Framework |
| Database | PostgreSQL 16 |
| Infrastructure | Docker Compose |
| Testing | pytest, Vitest, Playwright |

## Prerequisites

- Node.js 22.x
- pnpm 11.x
- Python 3.13.x
- pip
- Docker and Docker Compose
- Git

## Quick Start

### 1. Clone and configure

```bash
git clone <repository-url>
cd celebra
cp .env.example .env
# Edit .env with your values (defaults work for development)
```

### 2. Start PostgreSQL

```bash
docker compose up -d db
```

### 3. Set up the backend

```bash
cd apps/api
pip install -r requirements.txt
python manage.py migrate
python manage.py seed_demo  # Optional: seed demo data
python manage.py runserver 0.0.0.0:8000
```

### 4. Set up the frontend

```bash
cd apps/web
pnpm install
pnpm run dev
```

### 5. Open the application

- Frontend: http://localhost:3000
- API: http://localhost:8000/api/
- API Docs: http://localhost:8000/api/docs/

### Demo Account (after seeding)

- Email: `demo@celebra.test`
- Password: `CelebraDemo2024!`

## Development Commands

| Command | Description |
|---------|-------------|
| `docker compose up -d db` | Start PostgreSQL |
| `cd apps/api && python manage.py runserver` | Start API server |
| `cd apps/web && pnpm dev` | Start frontend dev server |
| `cd apps/api && python -m pytest` | Run backend tests |
| `cd apps/web && pnpm test` | Run frontend tests |
| `cd apps/web && pnpm e2e` | Run E2E tests |
| `cd apps/api && ruff check .` | Lint Python |
| `cd apps/api && black --check .` | Check Python formatting |
| `cd apps/web && pnpm lint` | Lint frontend |
| `cd apps/web && pnpm type-check` | TypeScript check |
| `cd apps/api && python manage.py seed_demo` | Seed demo data |

## Environment Variables

See [`.env.example`](.env.example) for all available environment variables.

Required for development:
- `DJANGO_SECRET_KEY` — Django secret key
- `POSTGRES_*` — Database connection settings

Optional:
- `AI_PROVIDER`, `AI_API_KEY` — AI assistant integration
- `EMAIL_HOST`, etc. — SMTP email settings for production

## Project Structure

```
celebra/
├── apps/
│   ├── api/              # Django backend
│   │   ├── config/       # Django settings and URL config
│   │   ├── apps/         # Domain applications
│   │   │   ├── accounts/ # User auth and profiles
│   │   │   ├── events/   # Event management
│   │   │   ├── guests/   # Guest and RSVP management
│   │   │   ├── budget/   # Budget tracking
│   │   │   ├── tasks/    # Tasks and scheduling
│   │   │   ├── vendors/  # Vendor directory and bookings
│   │   │   ├── ai/       # AI assistant integration
│   │   │   └── notifications/ # In-app and email notifications
│   │   └── tests/        # Shared test utilities
│   └── web/              # Next.js frontend
│       ├── src/
│       │   ├── app/      # Next.js App Router pages
│       │   ├── components/ # Shared UI components
│       │   ├── features/ # Feature-specific components
│       │   └── lib/      # Utilities and API client
│       └── e2e/          # Playwright E2E tests
├── docs/                 # Documentation
├── infra/                # Infrastructure configs
├── scripts/              # Utility scripts
├── load-tests/           # Performance tests
├── compose.yaml          # Docker Compose
├── Makefile              # Development commands
└── .env.example          # Environment template
```

## Features

1. **Authentication** — Registration, login, logout, password reset with secure sessions
2. **Event Management** — Create, edit, duplicate, cancel events with lifecycle rules
3. **Guest Management & RSVP** — Add guests, CSV import, secure invitation links, RSVP
4. **Budget Management** — Track categories, expenses, and budget utilization
5. **Tasks & Timeline** — Task management with due dates, priorities, schedule conflicts
6. **Collaboration** — Event owner and co-host roles with permission enforcement
7. **Vendor Directory** — Search vendors, request quotes, manage bookings
8. **AI Planning Assistant** — Optional LLM integration for event planning suggestions
9. **Dashboard** — Overview of events, tasks, budget, and pending RSVPs
10. **Notifications** — In-app notifications and email delivery

## Out of Scope (Future Work)

- Real payment processing
- SMS notifications
- Push notifications
- Google OAuth / social login
- Multi-factor authentication
- Kubernetes deployment
- Microservices architecture
- Vector search or RAG
- Image uploads
- Multi-tenant organizations
- Real-time WebSocket connections

## Documentation

- [Architecture Overview](docs/architecture.md)
- [Threat Model](docs/threat-model.md)
- [Evidence Report](docs/evidence-report.md)

## License

Private — All rights reserved.
