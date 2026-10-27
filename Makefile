.PHONY: help setup dev stop test lint format clean seed

PYTHON := python
PIP := pip
PNPM := pnpm

help: ## Show this help
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-20s\033[0m %s\n", $$1, $$2}'

# --- Setup ---
setup: setup-env setup-db setup-backend setup-frontend ## Full project setup

setup-env: ## Create .env from example
	@if not exist .env copy .env.example .env

setup-db: ## Start PostgreSQL via Docker
	docker compose up -d db
	@echo Waiting for database...
	@timeout /t 5 /nobreak >nul 2>&1 || true

setup-backend: ## Install Python dependencies and run migrations
	cd apps\api && $(PIP) install -r requirements.txt
	cd apps\api && $(PYTHON) manage.py migrate

setup-frontend: ## Install frontend dependencies
	cd apps\web && $(PNPM) install

# --- Development ---
dev-api: ## Start Django dev server
	cd apps\api && $(PYTHON) manage.py runserver 0.0.0.0:8000

dev-web: ## Start Next.js dev server
	cd apps\web && $(PNPM) run dev

# --- Database ---
migrate: ## Run Django migrations
	cd apps\api && $(PYTHON) manage.py migrate

makemigrations: ## Create new migrations
	cd apps\api && $(PYTHON) manage.py makemigrations

seed: ## Seed demo data
	cd apps\api && $(PYTHON) manage.py seed_demo

# --- Testing ---
test: test-backend test-frontend ## Run all tests

test-backend: ## Run backend tests
	cd apps\api && $(PYTHON) -m pytest --cov --cov-report=term-missing

test-frontend: ## Run frontend tests
	cd apps\web && $(PNPM) run test

test-e2e: ## Run E2E tests
	cd apps\web && $(PNPM) run e2e

# --- Linting & Formatting ---
lint: lint-backend lint-frontend ## Run all linters

lint-backend: ## Lint Python code
	cd apps\api && $(PYTHON) -m ruff check .
	cd apps\api && $(PYTHON) -m black --check .

lint-frontend: ## Lint frontend code
	cd apps\web && $(PNPM) run lint
	cd apps\web && $(PNPM) run type-check

format: ## Format all code
	cd apps\api && $(PYTHON) -m ruff check --fix .
	cd apps\api && $(PYTHON) -m black .
	cd apps\web && $(PNPM) exec prettier --write "src/**/*.{ts,tsx,css}"

# --- Docker ---
up: ## Start all services
	docker compose up -d

down: ## Stop all services
	docker compose down

stop: down ## Alias for down

clean: ## Remove volumes and cached data
	docker compose down -v
	cd apps\web && if exist .next rmdir /s /q .next
	cd apps\web && if exist node_modules rmdir /s /q node_modules

# --- Security ---
audit: ## Run dependency audits
	cd apps\api && $(PIP) audit 2>nul || echo "pip-audit not installed"
	cd apps\web && $(PNPM) audit
