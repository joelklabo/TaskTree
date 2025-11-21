# Minimal container for TaskTree backend (FastAPI) with static frontend assets.
FROM python:3.11-slim AS base
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PATH="/usr/local/bin:${PATH}"

WORKDIR /app
RUN apt-get update && apt-get install -y curl && rm -rf /var/lib/apt/lists/*
RUN pip install uv

# Install backend deps and app
COPY backend/ /app/backend/
WORKDIR /app/backend
RUN uv pip install --system .

# Build frontend
FROM node:20-slim AS frontend
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# Final image
FROM base AS final
WORKDIR /app/backend
COPY --from=frontend /app/frontend/dist /app/frontend-dist
COPY backend/ /app/backend/

EXPOSE 8000
ENV HOST=0.0.0.0 PORT=8000
CMD ["uv", "run", "uvicorn", "tasktree.api.app:app", "--host", "0.0.0.0", "--port", "8000"]
