# 09 - Deployment Guide

**Production Deployment Instructions**

---

## 📖 Table of Contents

1. [Deployment Overview](#deployment-overview)
2. [Prerequisites](#prerequisites)
3. [Docker Deployment](#docker-deployment)
4. [Manual Deployment](#manual-deployment)
5. [Database Setup](#database-setup)
6. [Environment Configuration](#environment-configuration)
7. [SSL/HTTPS Setup](#ssl-https-setup)
8. [Monitoring](#monitoring)
9. [Backup Strategy](#backup-strategy)

---

## 🎯 Deployment Overview

### Architecture

```
┌─────────────────────────────────────┐
│         Load Balancer/Nginx         │
│         (SSL Termination)           │
└─────────────────────────────────────┘
              ↓
┌─────────────────────────────────────┐
│         Frontend (React)            │
│         Static Files                │
└─────────────────────────────────────┘
              ↓
┌─────────────────────────────────────┐
│         Backend (FastAPI)           │
│         Uvicorn Workers             │
└─────────────────────────────────────┘
              ↓
┌─────────────────────────────────────┐
│         Databases                   │
│  PostgreSQL | MongoDB | Redis       │
└─────────────────────────────────────┘
              ↓
┌─────────────────────────────────────┐
│         Ollama (AI Models)          │
└─────────────────────────────────────┘
```

### Deployment Options

1. **Docker Compose** (Recommended for small-medium scale)
2. **Kubernetes** (For large scale)
3. **Manual** (Traditional server setup)

---

## ✅ Prerequisites

### Server Requirements

**Minimum:**
- CPU: 4 cores
- RAM: 16 GB
- Storage: 100 GB SSD
- OS: Ubuntu 20.04+ or Debian 11+

**Recommended:**
- CPU: 8 cores
- RAM: 32 GB
- Storage: 200 GB SSD
- OS: Ubuntu 22.04 LTS

### Software Requirements

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Install Docker Compose
sudo apt install docker-compose -y

# Install Nginx
sudo apt install nginx -y

# Install Certbot (for SSL)
sudo apt install certbot python3-certbot-nginx -y
```

---

## 🐳 Docker Deployment

### Docker Compose Configuration

```yaml
# docker-compose.prod.yml
version: '3.8'

services:
  # PostgreSQL Database
  postgres:
    image: postgres:15
    container_name: shikkhasathi_postgres
    environment:
      POSTGRES_DB: shikkhasathi_db
      POSTGRES_USER: shikkhasathi
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./backend/init-db.sql:/docker-entrypoint-initdb.d/init.sql
    ports:
      - "5432:5432"
    restart: unless-stopped
    networks:
      - shikkhasathi_network

  # MongoDB
  mongodb:
    image: mongo:6.0
    container_name: shikkhasathi_mongodb
    environment:
      MONGO_INITDB_ROOT_USERNAME: shikkhasathi
      MONGO_INITDB_ROOT_PASSWORD: ${MONGO_PASSWORD}
      MONGO_INITDB_DATABASE: shikkhasathi
    volumes:
      - mongodb_data:/data/db
      - ./backend/init-mongo.js:/docker-entrypoint-initdb.d/init.js
    ports:
      - "27017:27017"
    restart: unless-stopped
    networks:
      - shikkhasathi_network

  # Redis
  redis:
    image: redis:7-alpine
    container_name: shikkhasathi_redis
    command: redis-server --requirepass ${REDIS_PASSWORD}
    volumes:
      - redis_data:/data
    ports:
      - "6379:6379"
    restart: unless-stopped
    networks:
      - shikkhasathi_network

  # Backend
  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile.prod
    container_name: shikkhasathi_backend
    environment:
      DATABASE_URL: postgresql://shikkhasathi:${POSTGRES_PASSWORD}@postgres:5432/shikkhasathi_db
      MONGODB_URL: mongodb://shikkhasathi:${MONGO_PASSWORD}@mongodb:27017/shikkhasathi
      REDIS_URL: redis://:${REDIS_PASSWORD}@redis:6379/0
      SECRET_KEY: ${SECRET_KEY}
      ENVIRONMENT: production
      DEBUG: "False"
    volumes:
      - ./backend/chroma_db:/app/chroma_db
      - ./backend/data:/app/data
    ports:
      - "8000:8000"
    depends_on:
      - postgres
      - mongodb
      - redis
    restart: unless-stopped
    networks:
      - shikkhasathi_network

  # Frontend
  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile.prod
    container_name: shikkhasathi_frontend
    environment:
      VITE_API_URL: https://api.yourdomain.com
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf
      - ./nginx/ssl:/etc/nginx/ssl
    depends_on:
      - backend
    restart: unless-stopped
    networks:
      - shikkhasathi_network

volumes:
  postgres_data:
  mongodb_data:
  redis_data:

networks:
  shikkhasathi_network:
    driver: bridge
```

### Backend Dockerfile

```dockerfile
# backend/Dockerfile.prod
FROM python:3.9-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    postgresql-client \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements
COPY requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy application
COPY . .

# Create non-root user
RUN useradd -m -u 1000 appuser && chown -R appuser:appuser /app
USER appuser

# Expose port
EXPOSE 8000

# Run with Gunicorn
CMD ["gunicorn", "app.main:app", \
     "--workers", "4", \
     "--worker-class", "uvicorn.workers.UvicornWorker", \
     "--bind", "0.0.0.0:8000", \
     "--timeout", "120"]
```

### Frontend Dockerfile

```dockerfile
# frontend/Dockerfile.prod
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source
COPY . .

# Build
RUN npm run build

# Production stage
FROM nginx:alpine

# Copy built files
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy nginx config
COPY nginx.conf /etc/nginx/nginx.conf

EXPOSE 80 443

CMD ["nginx", "-g", "daemon off;"]
```

### Deployment Steps

```bash
# 1. Clone repository
git clone https://github.com/yourusername/ShikkhaSathi.git
cd ShikkhaSathi

# 2. Create .env file
cat > .env << EOF
POSTGRES_PASSWORD=your_secure_password
MONGO_PASSWORD=your_secure_password
REDIS_PASSWORD=your_secure_password
SECRET_KEY=your_secret_key_here
EOF

# 3. Build and start services
docker-compose -f docker-compose.prod.yml up -d

# 4. Check status
docker-compose -f docker-compose.prod.yml ps

# 5. View logs
docker-compose -f docker-compose.prod.yml logs -f
```

---

## 🔧 Manual Deployment

### Backend Deployment

```bash
# 1. Setup Python environment
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# 2. Run database migrations
alembic upgrade head

# 3. Load NCTB data
python load_nctb_txt_documents.py

# 4. Create systemd service
sudo nano /etc/systemd/system/shikkhasathi-backend.service
```

**Service file:**
```ini
[Unit]
Description=ShikkhaSathi Backend
After=network.target

[Service]
Type=notify
User=www-data
Group=www-data
WorkingDirectory=/var/www/ShikkhaSathi/backend
Environment="PATH=/var/www/ShikkhaSathi/backend/venv/bin"
ExecStart=/var/www/ShikkhaSathi/backend/venv/bin/gunicorn \
    app.main:app \
    --workers 4 \
    --worker-class uvicorn.workers.UvicornWorker \
    --bind 0.0.0.0:8000 \
    --timeout 120

[Install]
WantedBy=multi-user.target
```

```bash
# 5. Start service
sudo systemctl daemon-reload
sudo systemctl enable shikkhasathi-backend
sudo systemctl start shikkhasathi-backend
sudo systemctl status shikkhasathi-backend
```

### Frontend Deployment

```bash
# 1. Build frontend
cd frontend
npm install
npm run build

# 2. Copy to web root
sudo mkdir -p /var/www/shikkhasathi
sudo cp -r dist/* /var/www/shikkhasathi/

# 3. Set permissions
sudo chown -R www-data:www-data /var/www/shikkhasathi
```

---

## 🌐 Nginx Configuration

```nginx
# /etc/nginx/sites-available/shikkhasathi
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;
    
    # Redirect to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name yourdomain.com www.yourdomain.com;
    
    # SSL Configuration
    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    
    # Frontend
    location / {
        root /var/www/shikkhasathi;
        index index.html;
        try_files $uri $uri/ /index.html;
    }
    
    # Backend API
    location /api {
        proxy_pass http://localhost:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # WebSocket support
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        
        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
    
    # Static files caching
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        root /var/www/shikkhasathi;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

```bash
# Enable site
sudo ln -s /etc/nginx/sites-available/shikkhasathi /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

---

## 🔒 SSL/HTTPS Setup

### Using Let's Encrypt

```bash
# 1. Install Certbot
sudo apt install certbot python3-certbot-nginx -y

# 2. Obtain certificate
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com

# 3. Test auto-renewal
sudo certbot renew --dry-run

# 4. Setup auto-renewal cron
sudo crontab -e
# Add: 0 0 * * * certbot renew --quiet
```

---

## 📊 Monitoring

### Setup Monitoring Stack

```yaml
# monitoring/docker-compose.yml
version: '3.8'

services:
  prometheus:
    image: prom/prometheus
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml
      - prometheus_data:/prometheus
    ports:
      - "9090:9090"
    restart: unless-stopped

  grafana:
    image: grafana/grafana
    volumes:
      - grafana_data:/var/lib/grafana
    ports:
      - "3000:3000"
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=admin
    restart: unless-stopped

volumes:
  prometheus_data:
  grafana_data:
```

### Application Monitoring

```python
# backend/app/monitoring.py
from prometheus_client import Counter, Histogram, generate_latest
from fastapi import Response

# Metrics
request_count = Counter('http_requests_total', 'Total HTTP requests')
request_duration = Histogram('http_request_duration_seconds', 'HTTP request duration')

@app.get("/metrics")
async def metrics():
    """Prometheus metrics endpoint"""
    return Response(
        content=generate_latest(),
        media_type="text/plain"
    )
```

---

## 💾 Backup Strategy

### Database Backups

```bash
#!/bin/bash
# backup.sh

DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/backups"

# PostgreSQL backup
docker exec shikkhasathi_postgres pg_dump \
    -U shikkhasathi shikkhasathi_db \
    > $BACKUP_DIR/postgres_$DATE.sql

# MongoDB backup
docker exec shikkhasathi_mongodb mongodump \
    --username shikkhasathi \
    --password $MONGO_PASSWORD \
    --out $BACKUP_DIR/mongodb_$DATE

# Compress
tar -czf $BACKUP_DIR/backup_$DATE.tar.gz \
    $BACKUP_DIR/postgres_$DATE.sql \
    $BACKUP_DIR/mongodb_$DATE

# Cleanup old backups (keep 7 days)
find $BACKUP_DIR -name "backup_*.tar.gz" -mtime +7 -delete

echo "Backup completed: backup_$DATE.tar.gz"
```

```bash
# Setup daily backup cron
sudo crontab -e
# Add: 0 2 * * * /path/to/backup.sh
```

---

## 🚀 Deployment Checklist

### Pre-Deployment

- [ ] Update all dependencies
- [ ] Run all tests
- [ ] Build production assets
- [ ] Review environment variables
- [ ] Backup current production data
- [ ] Test deployment in staging

### Deployment

- [ ] Deploy database migrations
- [ ] Deploy backend
- [ ] Deploy frontend
- [ ] Update Nginx configuration
- [ ] Restart services
- [ ] Verify SSL certificates

### Post-Deployment

- [ ] Test all critical features
- [ ] Check error logs
- [ ] Monitor performance
- [ ] Verify backups working
- [ ] Update documentation
- [ ] Notify team

---

## 🔧 Troubleshooting

### Common Issues

**Issue: Backend not starting**
```bash
# Check logs
docker-compose logs backend

# Check database connection
docker exec shikkhasathi_backend python -c "from app.db.session import engine; print(engine)"
```

**Issue: Frontend 502 error**
```bash
# Check backend status
curl http://localhost:8000/health

# Check Nginx logs
sudo tail -f /var/log/nginx/error.log
```

**Issue: Database connection failed**
```bash
# Test PostgreSQL
docker exec shikkhasathi_postgres psql -U shikkhasathi -d shikkhasathi_db -c "SELECT 1"

# Test MongoDB
docker exec shikkhasathi_mongodb mongosh --eval "db.adminCommand('ping')"
```

---

**Next:** [[10-Glossary]] - Technical terms explained

**শিক্ষাসাথী** - Ready for production 🇧🇩
