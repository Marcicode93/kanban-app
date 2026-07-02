FROM node:22-slim AS frontend-build

WORKDIR /app/frontend

COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci

COPY frontend/ ./
RUN npm run build

FROM python:3.12-slim

WORKDIR /app

COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/

COPY backend/pyproject.toml backend/uv.lock backend/
RUN uv sync --directory backend --frozen --no-dev --no-install-project

COPY backend/app backend/app
COPY --from=frontend-build /app/frontend/out backend/static
RUN uv sync --directory backend --frozen --no-dev

EXPOSE 8000

CMD ["uv", "run", "--directory", "backend", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
