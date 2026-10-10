SHELL := /bin/bash

PNPM        := pnpm
COMPOSE_DIR := ../../infra/docker
# -f makes the compose file's own folder the project directory, so its .env, relative build
# contexts and `include:` all resolve exactly as they do when you cd there by hand.
COMPOSE       := docker compose -f $(COMPOSE_DIR)/docker-compose.yml
COMPOSE_INFRA := docker compose -f $(COMPOSE_DIR)/docker-compose.infra.yml
MIGRATIONS  := src/infrastructure/persistence/migrations
SERVICE     := auth-service

## ─── Setup ───────────────────────────────────────────────────────────────────
.PHONY: bootstrap
bootstrap: env install infra-up migrate ## First-time setup: .env, deps, infra containers, migrations
	@echo "$(SERVICE): ready — run 'make dev'"

.PHONY: env
env: ## Create .env from .env.example (never overwrites an existing .env)
	@if [ -f .env ]; then \
		echo "$(SERVICE): .env already exists — left untouched"; \
	else \
		cp .env.example .env && echo "$(SERVICE): .env created from .env.example"; \
	fi

.PHONY: install
install: ## Install dependencies from the lockfile
	$(PNPM) install --frozen-lockfile

## ─── Develop ─────────────────────────────────────────────────────────────────

.PHONY: dev
dev: ## Run the service in watch mode on :3001 (expects infra up)
	$(PNPM) start:dev

.PHONY: start
start: ## Run the compiled server from dist/
	$(PNPM) start

## ─── Quality gates ───────────────────────────────────────────────────────────

.PHONY: verify
verify: lint format typecheck test build ## Every gate that must pass before work is done

.PHONY: lint
lint: ## ESLint over src/ and test/
	$(PNPM) lint

.PHONY: lint-fix
lint-fix: ## ESLint with --fix
	$(PNPM) lint --fix

.PHONY: format
format: ## Prettier --write over src/ and test/
	$(PNPM) format

.PHONY: typecheck
typecheck: ## tsc --noEmit
	$(PNPM) typecheck

## ─── Tests ───────────────────────────────────────────────────────────────────

.PHONY: test
test: ## Unit tests — zero I/O, fast
	$(PNPM) test

.PHONY: test-cov
test-cov: ## Unit tests with coverage
	$(PNPM) test:cov

.PHONY: test-all
test-all: ## Every jest project (unit + integration + e2e)
	$(PNPM) test:all


## ─── Migrations (forward-only — CONSTITUTION Art. III) ───────────────────────

.PHONY: migrate
migrate: ## Run pending migrations against DATABASE_URL
	$(PNPM) migration:run

.PHONY: migrate-generate
migrate-generate: ## Generate a migration from entity diff — make migrate-generate NAME=AddFoo
	@if [ -z "$(NAME)" ]; then echo "usage: make migrate-generate NAME=AddFoo"; exit 1; fi
	$(PNPM) migration:generate $(MIGRATIONS)/$(NAME)

## ─── Docker ──────────────────────────────────────────────────────────────────

.PHONY: compose-env
compose-env: # internal — the stack's .env must exist or compose silently substitutes blanks
	@[ -f $(COMPOSE_DIR)/.env ] || { \
		cp $(COMPOSE_DIR)/.env.example $(COMPOSE_DIR)/.env; \
		echo "stack: created $(COMPOSE_DIR)/.env from .env.example"; \
	}

.PHONY: infra-up
infra-up: compose-env ## Start infra only (Postgres) — for the host dev loop
	$(COMPOSE_INFRA) up -d

.PHONY: infra-down
infra-down: compose-env ## Stop the infra containers (keeps the pgdata volume)
	$(COMPOSE_INFRA) down

.PHONY: up
up: compose-env ## Start the whole central stack (Postgres + Kong :8000 + services), rebuilding images
	$(COMPOSE) up -d --build

.PHONY: down
down: compose-env ## Stop the central stack (keeps the pgdata volume)
	$(COMPOSE) down

.PHONY: docker-build
docker-build: compose-env ## Build this service's image only
	$(COMPOSE) build $(SERVICE)

## ─── Housekeeping ────────────────────────────────────────────────────────────
.PHONY: clean-all
clean-all: clean ## Also remove node_modules
	rm -rf node_modules dist coverage