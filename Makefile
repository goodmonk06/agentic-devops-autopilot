.PHONY: help install dev build start test clean docker-dev docker-up docker-down db-setup db-migrate db-seed db-reset

help: ## Show this help message
	@echo 'Usage: make [target]'
	@echo ''
	@echo 'Available targets:'
	@awk 'BEGIN {FS = ":.*?## "} /^[a-zA-Z_-]+:.*?## / {printf "  %-15s %s\n", $$1, $$2}' $(MAKEFILE_LIST)

install: ## Install dependencies
	npm install

dev: ## Start development servers (requires docker-dev to be running)
	@echo "Starting development servers..."
	@echo "Run 'make docker-dev' first if you haven't already"
	npm run dev

dev-worker: ## Start worker in development mode
	npm run dev:worker

build: ## Build the application
	npm run build

start: ## Start production server
	npm run start

test: ## Run tests
	npm run test:run

test-watch: ## Run tests in watch mode
	npm run test

lint: ## Run linter
	npm run lint

lint-fix: ## Fix linting issues
	npm run lint:fix

typecheck: ## Run TypeScript type checking
	npm run typecheck

clean: ## Clean build artifacts
	rm -rf dist node_modules

# Docker commands
docker-dev: ## Start PostgreSQL and Redis for local development
	docker compose -f docker-compose.dev.yml up -d
	@echo "✓ PostgreSQL and Redis started"
	@echo "  PostgreSQL: localhost:5432"
	@echo "  Redis: localhost:6379"

docker-dev-down: ## Stop development databases
	docker compose -f docker-compose.dev.yml down

docker-up: ## Start full application stack in Docker
	docker compose up --build -d

docker-down: ## Stop full application stack
	docker compose down

docker-logs: ## View Docker logs
	docker compose logs -f

docker-clean: ## Remove all containers and volumes
	docker compose down -v
	docker compose -f docker-compose.dev.yml down -v

# Database commands
db-setup: ## Setup database (migrate and seed)
	npm run db:push
	npm run db:generate
	npm run db:seed

db-migrate: ## Run database migrations
	npm run db:migrate

db-seed: ## Seed the database with demo data
	npm run db:seed

db-reset: ## Reset database (WARNING: deletes all data)
	npm run db:reset

db-studio: ## Open Prisma Studio
	npx prisma studio

# Quick start commands
quick-start: docker-dev db-setup ## Quick start for first time setup
	@echo ""
	@echo "✅ Setup complete!"
	@echo ""
	@echo "Next steps:"
	@echo "  1. Copy .env.example to .env and configure"
	@echo "  2. Run 'make dev' to start the API server"
	@echo "  3. Run 'make dev-worker' in another terminal"
	@echo "  4. Visit http://localhost:3000"
	@echo ""

status: ## Show status of services
	@echo "Docker services:"
	@docker compose -f docker-compose.dev.yml ps
	@echo ""
	@echo "Application:"
	@curl -s http://localhost:3000/health | jq . || echo "API not running"
