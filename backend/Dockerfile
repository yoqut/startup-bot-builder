FROM python:3.12-slim AS base

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

WORKDIR /app

# ── Builder stage ────────────────────────────────────────────────
FROM base AS builder

RUN pip install hatch

COPY pyproject.toml .
RUN pip install --prefix=/install .

# ── Runtime stage ────────────────────────────────────────────────
FROM base AS runtime

COPY --from=builder /install /usr/local

COPY src/ ./src/

RUN addgroup --system app && adduser --system --group app
USER app

EXPOSE 8000

CMD ["uvicorn", "src.app:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "4", "--no-access-log"]
