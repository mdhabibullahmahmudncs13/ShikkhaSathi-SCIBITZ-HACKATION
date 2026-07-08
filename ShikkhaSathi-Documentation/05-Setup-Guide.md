# 05 - Setup Guide

**Complete Development Environment Setup**

---

## 📖 Table of Contents

1. [Prerequisites](#prerequisites)
2. [System Requirements](#system-requirements)
3. [Installation Steps](#installation-steps)
4. [Database Setup](#database-setup)
5. [Backend Setup](#backend-setup)
6. [Frontend Setup](#frontend-setup)
7. [AI Setup (Ollama)](#ai-setup-ollama)
8. [Verification](#verification)
9. [Troubleshooting](#troubleshooting)

---

## ✅ Prerequisites

### Required Software

**1. Python 3.9+**
```bash
# Check Python version
python --version
# or
python3 --version

# Should output: Python 3.9.x or higher
```

**2. Node.js 18+**
```bash
# Check Node version
node --version

# Should output: v18.x.x or higher
```

**3. Git**
```bash
# Check Git version
git --version

# Should output: git version 2.x.x
```

**4. Docker & Docker Compose**
```bash
# Check Docker
docker --version

# Check Docker Compose
docker-compose --version
```

### Optional but Recommended

- **VS Code** - Code editor with extensions
- **Postman** - API testing
- **pgAdmin** - PostgreSQL GUI
- **MongoDB Compass** - MongoDB GUI

---

## 💻 System Requirements

### Minimum Requirements
- **CPU:** 4 cores
- **RAM:** 8 GB
- **Storage:** 20 GB free space
- **OS:** Linux, macOS, or Windows 10+

### Recommended Requirements
- **CPU:** 8 cores
- **RAM:** 16 GB
- **Storage:** 50 GB SSD
- **OS:** Linux (Ubuntu 20.04+) or macOS

### For AI Features (Ollama)
- **RAM:** 16 GB minimum (32 GB recommended)
- **Storage:** 30 GB for models
- **GPU:** Optional but improves performance

---

## 📥 Installation Steps

### Step 1: Clone Repository

```bash
# Clone the repository
git clone https://github.com/yourusername/ShikkhaSathi.git

# Navigate to project directory
cd ShikkhaSathi

# Check project structure
ls -la
```

**Expected Output:**
```
backend/
frontend/
docker-compose.yml
README.md
...
```

### Step 2: Install Python Dependencies

```bash
# Navigate to backend
cd backend

# Create virtual environment
python -m venv venv

# Activate virtual environment
# On Linux/macOS:
source venv/bin/activate

# On Windows:
venv\Scripts\activate

# Upgrade pip
pip install --upgrade pip

# Install dependencies
pip install -r requirements.txt

# Verify installation
pip list
```

**Key Packages Installed:**
- fastapi
- uvicorn
- sqlalchemy
- pydantic
- langchain
- chromadb
- pymongo
- redis
- bcrypt
- python-jose

### Step 3: Install Node.js Dependencies

```bash
# Navigate to frontend
cd ../frontend

# Install dependencies
npm install

# Verify installation
npm list --depth=0
```

**Key Packages Installed:**
- react
- typescript
- vite
- tailwindcss
- axios
- react-router-dom

---

## 🗄️ Database Setup

### Using Docker Compose (Recommended)

**Step 1: Start Databases**
```bash
# From project root
cd ShikkhaSathi

# Start all databases
docker-compose up -d

# Check status
docker-compose ps
```

**Expected Output:**
```
NAME                STATUS
postgres            Up
mongodb             Up
redis               Up
```

**Step 2: Verify Connections**

**PostgreSQL:**
```bash
# Connect to PostgreSQL
docker exec -it postgres psql -U shikkhasathi -d shikkhasathi_db

# Test query
SELECT version();

# Exit
\q
```

**MongoDB:**
```bash
# Connect to MongoDB
docker exec -it mongodb mongosh -u shikkhasathi -p shikkhasathi

# Test query
show dbs

# Exit
exit
```

**Redis:**
```bash
# Connect to Redis
docker exec -it redis redis-cli

# Test command
PING

# Should output: PONG

# Exit
exit
```

### Manual Installation (Alternative)

#### PostgreSQL

**On Ubuntu/Debian:**
```bash
# Install PostgreSQL
sudo apt update
sudo apt install postgresql postgresql-contrib

# Start service
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Create database and user
sudo -u postgres psql
CREATE DATABASE shikkhasathi_db;
CREATE USER shikkhasathi WITH PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE shikkhasathi_db TO shikkhasathi;
\q
```

**On macOS:**
```bash
# Install via Homebrew
brew install postgresql

# Start service
brew services start postgresql

# Create database
createdb shikkhasathi_db
```

#### MongoDB

**On Ubuntu/Debian:**
```bash
# Import MongoDB public key
wget -qO - https://www.mongodb.org/static/pgp/server-6.0.asc | sudo apt-key add -

# Add repository
echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu focal/mongodb-org/6.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-6.0.list

# Install MongoDB
sudo apt update
sudo apt install -y mongodb-org

# Start service
sudo systemctl start mongod
sudo systemctl enable mongod
```

**On macOS:**
```bash
# Install via Homebrew
brew tap mongodb/brew
brew install mongodb-community

# Start service
brew services start mongodb-community
```

#### Redis

**On Ubuntu/Debian:**
```bash
# Install Redis
sudo apt update
sudo apt install redis-server

# Start service
sudo systemctl start redis-server
sudo systemctl enable redis-server
```

**On macOS:**
```bash
# Install via Homebrew
brew install redis

# Start service
brew services start redis
```

---

## 🔧 Backend Setup

### Step 1: Environment Configuration

```bash
# Navigate to backend
cd backend

# Copy example environment file
cp .env.example .env

# Edit .env file
nano .env
```

**Configure .env:**
```bash
# Database URLs
DATABASE_URL=postgresql://shikkhasathi:password@localhost:5432/shikkhasathi_db
MONGODB_URL=mongodb://shikkhasathi:password@localhost:27017/shikkhasathi
REDIS_URL=redis://localhost:6379/0

# JWT Secret (generate a secure random string)
SECRET_KEY=your-secret-key-here-change-this

# Ollama Configuration
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MATH_MODEL=phi3:mini
OLLAMA_BANGLA_MODEL=llama3.2:3b
OLLAMA_GENERAL_MODEL=llama3.2:1b

# ChromaDB
CHROMA_PERSIST_DIRECTORY=./chroma_db

# Environment
ENVIRONMENT=development
DEBUG=True
```

### Step 2: Database Migrations

```bash
# Activate virtual environment
source venv/bin/activate

# Run migrations
alembic upgrade head

# Verify tables created
python -c "from app.db.session import engine; from sqlalchemy import inspect; print(inspect(engine).get_table_names())"
```

**Expected Output:**
```
['users', 'student_progress', 'quiz_attempts', 'gamification', 'classes', ...]
```

### Step 3: Load NCTB Data

```bash
# Load NCTB textbooks into ChromaDB
python load_nctb_txt_documents.py

# Verify loading
python test_rag_status.py
```

**Expected Output:**
```
✅ ChromaDB connected
✅ Collection 'nctb_textbooks' found
✅ 3,482 documents loaded
✅ RAG system ready
```

### Step 4: Start Backend Server

```bash
# Start development server
python run_dev_with_ollama.py

# Or use uvicorn directly
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

**Expected Output:**
```
INFO:     Uvicorn running on http://0.0.0.0:8000
INFO:     Application startup complete
```

**Verify Backend:**
```bash
# Test health endpoint
curl http://localhost:8000/health

# Should output: {"status":"healthy"}

# Open API docs
# Visit: http://localhost:8000/docs
```

---

## 🎨 Frontend Setup

### Step 1: Environment Configuration

```bash
# Navigate to frontend
cd frontend

# Copy example environment file
cp .env.example .env

# Edit .env file
nano .env
```

**Configure .env:**
```bash
# API URL
VITE_API_URL=http://localhost:8000

# WebSocket URL
VITE_WS_URL=ws://localhost:8000

# Environment
VITE_ENVIRONMENT=development
```

### Step 2: Build Configuration

**Verify vite.config.ts:**
```typescript
export default defineConfig({
  server: {
    host: '0.0.0.0',
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true
      }
    }
  }
})
```

### Step 3: Start Frontend Server

```bash
# Start development server
npm run dev

# Or with specific host
npm run dev -- --host 0.0.0.0
```

**Expected Output:**
```
VITE v4.x.x  ready in xxx ms

➜  Local:   http://localhost:5173/
➜  Network: http://192.168.x.x:5173/
```

**Verify Frontend:**
- Open browser: http://localhost:5173
- Should see ShikkhaSathi homepage
- Check browser console for errors

---

## 🤖 AI Setup (Ollama)

### Step 1: Install Ollama

**On Linux:**
```bash
# Download and install
curl -fsSL https://ollama.com/install.sh | sh

# Verify installation
ollama --version
```

**On macOS:**
```bash
# Download from https://ollama.com/download
# Or use Homebrew
brew install ollama

# Verify installation
ollama --version
```

**On Windows:**
- Download installer from https://ollama.com/download
- Run installer
- Verify in PowerShell: `ollama --version`

### Step 2: Start Ollama Service

```bash
# Start Ollama server
ollama serve

# Should output: Ollama is running on http://localhost:11434
```

**Run in background:**
```bash
# Linux/macOS
nohup ollama serve > ollama.log 2>&1 &

# Or use systemd (Linux)
sudo systemctl start ollama
sudo systemctl enable ollama
```

### Step 3: Pull Required Models

```bash
# Pull math model (phi3:mini - 2.3GB)
ollama pull phi3:mini

# Pull Bangla/quiz model (llama3.2:3b - 2GB)
ollama pull llama3.2:3b

# Pull general model (llama3.2:1b - 1.3GB)
ollama pull llama3.2:1b

# Verify models
ollama list
```

**Expected Output:**
```
NAME              SIZE      MODIFIED
phi3:mini         2.3 GB    X minutes ago
llama3.2:3b       2.0 GB    X minutes ago
llama3.2:1b       1.3 GB    X minutes ago
```

### Step 4: Test Models

```bash
# Test phi3:mini (math)
ollama run phi3:mini "What is 2+2?"

# Test llama3.2:3b (Bangla)
ollama run llama3.2:3b "বাংলাদেশের রাজধানী কোথায়?"

# Test llama3.2:1b (general)
ollama run llama3.2:1b "Hello, how are you?"
```

### Step 5: Verify AI Integration

```bash
# From backend directory
cd backend
source venv/bin/activate

# Test LLM connections
python test_llm_connections.py
```

**Expected Output:**
```
✅ Ollama service running
✅ phi3:mini model available
✅ llama3.2:3b model available
✅ llama3.2:1b model available
✅ All AI models ready
```

---

## ✅ Verification

### Complete System Check

**Run verification script:**
```bash
# From project root
./verify-setup.sh
```

**Or manually verify each component:**

**1. Databases:**
```bash
# PostgreSQL
docker exec postgres pg_isready

# MongoDB
docker exec mongodb mongosh --eval "db.adminCommand('ping')"

# Redis
docker exec redis redis-cli ping
```

**2. Backend:**
```bash
# Health check
curl http://localhost:8000/health

# API docs
curl http://localhost:8000/docs
```

**3. Frontend:**
```bash
# Check if running
curl http://localhost:5173
```

**4. Ollama:**
```bash
# Check service
curl http://localhost:11434/api/tags

# Should return list of models
```

### Test Complete Flow

**1. Create Test User:**
```bash
# Use API docs: http://localhost:8000/docs
# POST /api/v1/auth/signup
{
  "email": "test@example.com",
  "password": "testpass123",
  "full_name": "Test User",
  "role": "student"
}
```

**2. Login:**
```bash
# POST /api/v1/auth/login
{
  "email": "test@example.com",
  "password": "testpass123"
}

# Save the returned token
```

**3. Generate Quiz:**
```bash
# POST /api/v1/quiz/generate
# Include Authorization: Bearer <token>
{
  "subject": "Mathematics",
  "topic": "Algebra",
  "question_count": 5,
  "difficulty": "medium"
}
```

**4. Chat with AI:**
```bash
# POST /api/v1/chat/message
# Include Authorization: Bearer <token>
{
  "message": "Explain quadratic equations",
  "subject": "Mathematics"
}
```

---

## 🔧 Troubleshooting

### Common Issues

#### Issue 1: Port Already in Use

**Error:**
```
Error: Port 8000 is already in use
```

**Solution:**
```bash
# Find process using port
lsof -i :8000

# Kill process
kill -9 <PID>

# Or use different port
uvicorn app.main:app --port 8001
```

#### Issue 2: Database Connection Failed

**Error:**
```
sqlalchemy.exc.OperationalError: could not connect to server
```

**Solution:**
```bash
# Check if PostgreSQL is running
docker-compose ps

# Restart databases
docker-compose restart postgres

# Check logs
docker-compose logs postgres
```

#### Issue 3: Ollama Models Not Found

**Error:**
```
Error: model 'phi3:mini' not found
```

**Solution:**
```bash
# Pull missing model
ollama pull phi3:mini

# Verify
ollama list

# Restart backend
```

#### Issue 4: Frontend Can't Connect to Backend

**Error:**
```
Network Error: Failed to fetch
```

**Solution:**
```bash
# Check backend is running
curl http://localhost:8000/health

# Check CORS settings in backend
# Verify VITE_API_URL in frontend/.env

# Clear browser cache
# Restart frontend server
```

#### Issue 5: ChromaDB Collection Not Found

**Error:**
```
Collection 'nctb_textbooks' not found
```

**Solution:**
```bash
# Load NCTB documents
cd backend
python load_nctb_txt_documents.py

# Verify
python test_rag_status.py
```

### Getting Help

**Check Logs:**
```bash
# Backend logs
tail -f backend/logs/app.log

# Docker logs
docker-compose logs -f

# Ollama logs
tail -f ollama.log
```

**Debug Mode:**
```bash
# Backend with debug
DEBUG=True python run_dev_with_ollama.py

# Frontend with debug
npm run dev -- --debug
```

**Community Support:**
- GitHub Issues
- Community Forum
- Email: support@shikkhasathi.com

---

## 🚀 Quick Start Script

**Create start-dev.sh:**
```bash
#!/bin/bash

echo "🚀 Starting ShikkhaSathi Development Environment"

# Start databases
echo "📦 Starting databases..."
docker-compose up -d

# Wait for databases
sleep 5

# Start Ollama
echo "🤖 Starting Ollama..."
ollama serve > ollama.log 2>&1 &

# Start backend
echo "⚙️  Starting backend..."
cd backend
source venv/bin/activate
python run_dev_with_ollama.py > backend.log 2>&1 &
cd ..

# Start frontend
echo "🎨 Starting frontend..."
cd frontend
npm run dev > frontend.log 2>&1 &
cd ..

echo "✅ All services started!"
echo "📱 Frontend: http://localhost:5173"
echo "⚙️  Backend: http://localhost:8000"
echo "📖 API Docs: http://localhost:8000/docs"
```

**Make executable and run:**
```bash
chmod +x start-dev.sh
./start-dev.sh
```

---

**Next:** [[06-Backend-Development]] - Backend implementation guide

**শিক্ষাসাথী** - Setup complete! 🇧🇩
