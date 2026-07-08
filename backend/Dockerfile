# Backend Dockerfile for ShikkhaSathi
# Multi-stage build for development and production

# Base stage with common dependencies
FROM python:3.11-slim AS base

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV DEBIAN_FRONTEND=noninteractive

# Install system dependencies
RUN apt-get update && apt-get install -y \
    build-essential \
    curl \
    git \
    libpq-dev \
    libffi-dev \
    libssl-dev \
    pkg-config \
    && rm -rf /var/lib/apt/lists/*

# Set work directory
WORKDIR /app

# Development stage
FROM base AS development

# Copy requirements
COPY requirements.txt requirements_minimal.txt ./

# Install all Python dependencies (including dev dependencies)
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Create necessary directories
RUN mkdir -p /app/uploads /app/data /app/logs

# Expose port
EXPOSE 8000

# Development command (with auto-reload)
CMD ["python", "-m", "uvicorn", "run_dev:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]

# Production stage
FROM base AS production

# Copy requirements first for better caching
COPY requirements.txt requirements_minimal.txt ./

# Install Python dependencies (production only)
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Create necessary directories
RUN mkdir -p /app/uploads /app/data /app/logs

# Create non-root user
RUN useradd --create-home --shell /bin/bash shikkhasathi && \
    chown -R shikkhasathi:shikkhasathi /app

# Switch to non-root user
USER shikkhasathi

# Expose port
EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8000/health || exit 1

# Run the application
CMD ["python", "-m", "uvicorn", "run_production:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "4"]