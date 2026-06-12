.PHONY: help up down restart build rebuild seed-reset test-backend build-frontend logs ps clean backend-dev frontend-dev backend-install frontend-install

COMPOSE = docker compose

help:
	@echo "Available targets:"
	@echo "  help              - Show this help message"
	@echo "  up                - Start all services (detached)"
	@echo "  down              - Stop and remove all services"
	@echo "  restart           - Restart all services"
	@echo "  build             - Build images without cache"
	@echo "  rebuild           - Rebuild images and restart services"
	@echo "  seed-reset        - Reset database seed data (stop, remove volume, restart)"
	@echo "  test-backend      - Run backend unit tests (pytest)"
	@echo "  build-frontend    - Build frontend production bundle locally"
	@echo "  logs              - View all service logs (follow)"
	@echo "  ps                - Show running service status"
	@echo "  clean             - Stop services and remove all volumes/images"
	@echo "  backend-dev       - Start backend in local dev mode (requires venv)"
	@echo "  frontend-dev      - Start frontend in local dev mode (requires npm)"
	@echo "  backend-install   - Install backend dependencies into venv"
	@echo "  frontend-install  - Install frontend dependencies via npm"

up:
	$(COMPOSE) up -d

down:
	$(COMPOSE) down

restart:
	$(COMPOSE) restart

build:
	$(COMPOSE) build --no-cache

rebuild:
	$(COMPOSE) up -d --build

seed-reset:
	$(COMPOSE) down -v
	$(COMPOSE) up -d

test-backend:
	cd backend && python -m pytest -v || (cd backend && pip install pytest && python -m pytest -v)

build-frontend:
	cd frontend && npm run build

logs:
	$(COMPOSE) logs -f

ps:
	$(COMPOSE) ps

clean:
	$(COMPOSE) down -v --rmi all

backend-dev:
	cd backend && uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

frontend-dev:
	cd frontend && npm start

backend-install:
	cd backend && pip install -r requirements.txt

frontend-install:
	cd frontend && npm install
