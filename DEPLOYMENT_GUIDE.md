# ShikkhaSathi Deployment Guide

## 🚀 Complete Docker Deployment Guide

This guide covers deploying ShikkhaSathi using Docker for both development and production environments.

## 📋 Prerequisites

### System Requirements
- **Docker**: Version 20.10 or higher
- **Docker Compose**: Version 2.0 or higher (or docker-compose v1.29+)
- **Memory**: Minimum 4GB RAM (8GB recommended for AI features)
- **Storage**: Minimum 10GB free space (20GB recommended)
- **CPU**: 2+ cores recommended

### Installation
```bash
# Install Docker (Ubuntu/Debian)
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Add user to docker group
sudo usermod -aG docker $USER
newgrp docker

# Verify installation
docker --version
docker compose version
```

## 🔧 Quick Start (Development)

### 1. Clone and Setup
```bash
git clone <repository-url>
cd ShikkhaSathi

# Create environment file
cp .env.example .env
# Edit .env with your configuration
```

### 2. Start Development Environment
```bash
# Option 1: Use quick start script
./quick-start.sh

# Option 2: Manual Docker Compose
docker compose up -d postgres mongodb redis chromadb

# Wait for databases to be ready
sleep 15

# Start application services manually
cd backend && python3 run_dev.py &
cd backend && python3 websocket_server.py &
cd frontend && npm run dev &
```

### 3. Access Application
- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:8000
- **API Docs**: http://localhost:8000/docs
- **WebSocket**: ws://localhost:8001

## 🐳 Full Docker Deployment

### 1. Simple Deployment
```bash
# Use the simple deployment script
./deploy-simple.sh
```

This script will:
- Check Docker installation
- Create necessary directories
- Build all images
- Start all services
- Download AI models
- Show service URLs

### 2. Manual Docker Deployment
```bash
# Create environment file
cp .env.example .env

# Edit .env file with your configuration
nano .env

# Build and start all services
docker compose up -d

# Check service status
docker compose ps

# View logs
docker compose logs -f
```

## 🏭 Production Deployment

### 1. Production Configuration
```bash
# Use production compose file
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d

# Or set environment
export COMPOSE_FILE=docker-compose.yml:docker-compose.prod.yml
docker compose up -d
```

### 2. Environment Variables
Create a production `.env` file:
```bash
# Production Environment
ENVIRONMENT=production

# Strong passwords (change these!)
POSTGRES_PASSWORD=your_strong_postgres_password
MONGO_PASSWORD=your_strong_mongo_password
REDIS_PASSWORD=your_strong_redis_password
SECRET_KEY=your-super-secret-key-minimum-32-characters
CHROMA_AUTH_TOKEN=your_chroma_auth_token

# Production URLs
CORS_ORIGINS=https://yourdomain.com
API_BASE_URL=https://api.yourdomain.com
WS_URL=wss://ws.yourdomain.com

# Optional: AI API Keys
OPENAI_API_KEY=your_openai_api_key
ELEVENLABS_API_KEY=your_elevenlabs_api_key
```

### 3. SSL/HTTPS Setup
```bash
# Create SSL directory
mkdir -p nginx/ssl

# Add your SSL certificates
cp your-cert.pem nginx/ssl/cert.pem
cp your-key.pem nginx/ssl/key.pem

# Update nginx.conf to enable HTTPS
# Uncomment the HTTPS server block in nginx/nginx.conf
```

## 🔍 Service Overview

### Core Services
| Service | Port | Description |
|---------|------|-------------|
| **nginx** | 80, 443 | Reverse proxy and load balancer |
| **frontend** | 3000 | React application (internal) |
| **backend** | 8000 | FastAPI server (internal) |
| **websocket** | 8001 | WebRTC signaling server (internal) |

### Database Services
| Service | Port | Description |
|---------|------|-------------|
| **postgres** | 5432 | Primary database |
| **mongodb** | 27017 | Document storage |
| **redis** | 6379 | Cache and sessions |
| **chromadb** | 8001 | Vector database for AI |

### AI Services
| Service | Port | Description |
|---------|------|-------------|
| **ollama** | 11434 | Local LLM server |

### Development Tools (dev only)
| Service | Port | Description |
|---------|------|-------------|
| **adminer** | 8080 | Database admin interface |
| **mongo-express** | 8081 | MongoDB admin interface |

## 🛠️ Management Commands

### Service Management
```bash
# Start all services
docker compose up -d

# Stop all services
docker compose down

# Restart specific service
docker compose restart backend

# View service logs
docker compose logs -f backend

# Scale services (production)
docker compose up -d --scale backend=3

# Update services
docker compose pull
docker compose up -d
```

### Database Management
```bash
# Backup PostgreSQL
docker compose exec postgres pg_dump -U shikkhasathi_user shikkhasathi > backup.sql

# Restore PostgreSQL
docker compose exec -T postgres psql -U shikkhasathi_user shikkhasathi < backup.sql

# Backup MongoDB
docker compose exec mongodb mongodump --uri="mongodb://user:pass@localhost:27017/shikkhasathi"

# Access database shells
docker compose exec postgres psql -U shikkhasathi_user shikkhasathi
docker compose exec mongodb mongosh --username shikkhasathi_user --password
docker compose exec redis redis-cli -a your_redis_password
```

### AI Model Management
```bash
# Download AI models
docker compose exec ollama ollama pull llama3.2:1b
docker compose exec ollama ollama pull llama3.2:3b

# List available models
docker compose exec ollama ollama list

# Remove unused models
docker compose exec ollama ollama rm model_name
```

## 📊 Monitoring and Logs

### Health Checks
```bash
# Check all service health
docker compose ps

# Check specific service health
curl http://localhost:8000/health

# Check frontend
curl http://localhost:3000

# Check WebSocket
wscat -c ws://localhost:8002
```

### Log Management
```bash
# View all logs
docker compose logs

# Follow logs for specific service
docker compose logs -f backend

# View last 100 lines
docker compose logs --tail=100 backend

# Save logs to file
docker compose logs backend > backend.log
```

### Performance Monitoring
```bash
# View resource usage
docker stats

# View specific service stats
docker stats shikkhasathi_backend

# Check disk usage
docker system df

# Clean up unused resources
docker system prune -a
```

## 🔒 Security Considerations

### Production Security Checklist
- [ ] Change all default passwords
- [ ] Use strong, unique passwords (32+ characters)
- [ ] Enable SSL/HTTPS with valid certificates
- [ ] Configure firewall rules
- [ ] Regular security updates
- [ ] Monitor access logs
- [ ] Backup encryption
- [ ] Network isolation

### Environment Security
```bash
# Secure .env file permissions
chmod 600 .env

# Use Docker secrets (production)
echo "your_password" | docker secret create postgres_password -

# Limit container privileges
# (Already configured in Dockerfiles with non-root users)
```

## 🚨 Troubleshooting

### Common Issues

#### Services Won't Start
```bash
# Check Docker daemon
sudo systemctl status docker

# Check port conflicts
sudo netstat -tulpn | grep :8000

# Check disk space
df -h

# Check memory usage
free -h
```

#### Database Connection Issues
```bash
# Check database logs
docker compose logs postgres
docker compose logs mongodb

# Test database connectivity
docker compose exec backend python -c "
from app.db.session import engine
from sqlalchemy import text
with engine.connect() as conn:
    result = conn.execute(text('SELECT 1'))
    print('PostgreSQL OK')
"
```

#### AI Services Not Working
```bash
# Check Ollama status
docker compose logs ollama

# Test Ollama connection
curl http://localhost:11434/api/tags

# Download required models
docker compose exec ollama ollama pull llama3.2:1b
```

#### Performance Issues
```bash
# Check resource usage
docker stats

# Increase memory limits in docker-compose.yml
# Add under service configuration:
deploy:
  resources:
    limits:
      memory: 2G
    reservations:
      memory: 1G
```

### Log Locations
- **Application logs**: `docker compose logs [service]`
- **Nginx logs**: `nginx/logs/` (if volume mounted)
- **Database logs**: Inside containers, accessible via `docker compose logs`

## 🔄 Updates and Maintenance

### Regular Maintenance
```bash
# Update application code
git pull origin main
docker compose build
docker compose up -d

# Update base images
docker compose pull
docker compose up -d

# Clean up old images
docker image prune -a

# Backup databases (weekly)
./scripts/backup.sh

# Update AI models (monthly)
docker compose exec ollama ollama pull llama3.2:1b
```

### Version Upgrades
```bash
# Tag current version
docker compose down
docker tag shikkhasathi_backend:latest shikkhasathi_backend:backup

# Deploy new version
git pull origin main
docker compose build
docker compose up -d

# Rollback if needed
docker compose down
docker tag shikkhasathi_backend:backup shikkhasathi_backend:latest
docker compose up -d
```

## 📞 Support

### Test Accounts
- **Student**: student1@example.com / password123
- **Teacher**: teacher1@example.com / password123
- **Parent**: parent1@example.com / password123
- **Admin**: admin@example.com / password123

### Useful Commands
```bash
# Complete reset (development only)
docker compose down -v
docker system prune -a
./deploy-simple.sh

# Quick health check
curl -s http://localhost:8000/health | jq .

# View all running containers
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
```

---

**🎉 ShikkhaSathi is now fully dockerized and ready for deployment!**

The platform includes comprehensive Docker configuration for development, testing, and production environments with proper security, monitoring, and maintenance procedures.