#!/usr/bin/env python3
"""
Production server for ShikkhaSathi
Optimized for Docker deployment with real databases
"""

import sys
import os
import logging
from contextlib import asynccontextmanager

# Add the app directory to Python path
sys.path.append(os.path.join(os.path.dirname(__file__), 'app'))

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
import uvicorn

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Import configuration and services
try:
    from app.core.config import settings
    from app.db.session import engine, SessionLocal
    from app.db.mongodb import get_mongodb_client
    from app.db.redis_client import get_redis_client
    from app.api.api_v1.api import api_router
    PRODUCTION_READY = True
except ImportError as e:
    logger.warning(f"Production imports failed: {e}. Using development fallback.")
    from app.core.config_dev import dev_settings as settings
    PRODUCTION_READY = False

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan manager"""
    logger.info("🚀 Starting ShikkhaSathi Production Server...")
    
    if PRODUCTION_READY:
        # Initialize databases
        try:
            # Test PostgreSQL connection
            from sqlalchemy import text
            with engine.connect() as conn:
                conn.execute(text("SELECT 1"))
            logger.info("✅ PostgreSQL connected")
            
            # Test MongoDB connection
            mongo_client = get_mongodb_client()
            await mongo_client.admin.command('ping')
            logger.info("✅ MongoDB connected")
            
            # Test Redis connection
            redis_client = get_redis_client()
            await redis_client.ping()
            logger.info("✅ Redis connected")
            
        except Exception as e:
            logger.error(f"❌ Database connection failed: {e}")
    
    logger.info("🌐 Server ready for production!")
    yield
    
    logger.info("🛑 Shutting down ShikkhaSathi...")

# Create FastAPI app
app = FastAPI(
    title="ShikkhaSathi API",
    description="AI-Powered Learning Platform for Bangladesh - Production",
    version="1.0.0",
    docs_url="/docs" if os.getenv("ENVIRONMENT") != "production" else None,
    redoc_url="/redoc" if os.getenv("ENVIRONMENT") != "production" else None,
    lifespan=lifespan
)

# Security middleware
app.add_middleware(
    TrustedHostMiddleware, 
    allowed_hosts=["*"]  # Configure properly for production
)

# Compression middleware
app.add_middleware(GZipMiddleware, minimum_size=1000)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.BACKEND_CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API routes
if PRODUCTION_READY:
    app.include_router(api_router, prefix=settings.API_V1_STR)
else:
    # Fallback to development endpoints
    from run_dev import app as dev_app
    # Copy routes from development app
    for route in dev_app.routes:
        if hasattr(route, 'path') and route.path.startswith('/api/'):
            app.routes.append(route)

# Static files
if os.path.exists("/app/uploads"):
    app.mount("/uploads", StaticFiles(directory="/app/uploads"), name="uploads")

# Health check endpoints
@app.get("/")
async def root():
    return {
        "message": "ShikkhaSathi API - Production Mode",
        "version": "1.0.0",
        "status": "running",
        "environment": os.getenv("ENVIRONMENT", "production")
    }

@app.get("/health")
async def health_check():
    """Comprehensive health check"""
    health_status = {
        "status": "healthy",
        "timestamp": "2025-01-10T00:00:00Z",
        "environment": os.getenv("ENVIRONMENT", "production"),
        "services": {}
    }
    
    if PRODUCTION_READY:
        # Check database connections
        try:
            # PostgreSQL
            from sqlalchemy import text
            with engine.connect() as conn:
                conn.execute(text("SELECT 1"))
            health_status["services"]["postgresql"] = "healthy"
        except Exception as e:
            health_status["services"]["postgresql"] = f"unhealthy: {str(e)}"
            health_status["status"] = "degraded"
        
        try:
            # MongoDB
            mongo_client = get_mongodb_client()
            await mongo_client.admin.command('ping')
            health_status["services"]["mongodb"] = "healthy"
        except Exception as e:
            health_status["services"]["mongodb"] = f"unhealthy: {str(e)}"
            health_status["status"] = "degraded"
        
        try:
            # Redis
            redis_client = get_redis_client()
            await redis_client.ping()
            health_status["services"]["redis"] = "healthy"
        except Exception as e:
            health_status["services"]["redis"] = f"unhealthy: {str(e)}"
            health_status["status"] = "degraded"
    else:
        health_status["services"]["database"] = "development_mode"
    
    return health_status

# Error handlers
@app.exception_handler(404)
async def not_found_handler(request, exc):
    return JSONResponse(
        status_code=404,
        content={"message": "Resource not found"}
    )

@app.exception_handler(500)
async def internal_error_handler(request, exc):
    logger.error(f"Internal server error: {exc}")
    return JSONResponse(
        status_code=500,
        content={"message": "Internal server error"}
    )

if __name__ == "__main__":
    # Production server configuration
    uvicorn.run(
        "run_production:app",
        host="0.0.0.0",
        port=8000,
        workers=4,
        log_level="info",
        access_log=True,
        reload=False
    )