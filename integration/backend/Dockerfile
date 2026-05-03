# syntax=docker/dockerfile:1

FROM python:3.11-slim

WORKDIR /app

# Install system dependencies if needed
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
# Add gunicorn for production
RUN pip install --no-cache-dir -r requirements.txt gunicorn

COPY . .

# Expose the gateway port
EXPOSE 5050

# Run with Gunicorn
CMD ["gunicorn", "--bind", "0.0.0.0:5050", "--workers", "4", "app:app"]
