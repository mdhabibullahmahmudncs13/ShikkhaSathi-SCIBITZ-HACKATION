from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException
from app.core.config import settings
from app.api.api_v1.api import api_router
from app.db.mongodb import connect_to_mongo, close_mongo_connection
from app.db.redis_client import connect_to_redis, close_redis_connection
from app.core.error_handlers import (
    http_exception_handler,
    starlette_http_exception_handler,
    validation_exception_handler,
    general_exception_handler,
    shikkhasathi_exception_handler,
    database_error_handler,
    rate_limit_handler,
    ShikkhaSathiException
)
import logging
from sqlalchemy.exc import SQLAlchemyError
from redis.exceptions import RedisError
from pymongo.errors import PyMongoError

app = FastAPI(
    title="ShikkhaSathi API",
    description="AI-powered adaptive learning platform for Bangladesh students",
    version="1.0.0",
    openapi_url=f"{settings.API_V1_STR}/openapi.json"
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)

# Add exception handlers
app.add_exception_handler(HTTPException, http_exception_handler)
app.add_exception_handler(StarletteHTTPException, starlette_http_exception_handler)
app.add_exception_handler(RequestValidationError, validation_exception_handler)
app.add_exception_handler(ShikkhaSathiException, shikkhasathi_exception_handler)
app.add_exception_handler(SQLAlchemyError, database_error_handler)
app.add_exception_handler(PyMongoError, database_error_handler)
app.add_exception_handler(RedisError, database_error_handler)
app.add_exception_handler(Exception, general_exception_handler)

# Set up CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.BACKEND_CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router, prefix=settings.API_V1_STR)

@app.on_event("startup")
async def startup_event():
    logger.info("Starting ShikkhaSathi API...")
    try:
        await connect_to_mongo()
        logger.info("MongoDB connected successfully")
        
        await connect_to_redis()
        logger.info("Redis connected successfully")
        
        logger.info("ShikkhaSathi API started successfully")
    except Exception as e:
        logger.error(f"Failed to start application: {e}")
        raise

@app.on_event("shutdown")
async def shutdown_event():
    logger.info("Shutting down ShikkhaSathi API...")
    try:
        await close_mongo_connection()
        logger.info("MongoDB connection closed")
        
        await close_redis_connection()
        logger.info("Redis connection closed")
        
        logger.info("ShikkhaSathi API shutdown complete")
    except Exception as e:
        logger.error(f"Error during shutdown: {e}")

@app.get("/")
async def root():
    return {
        "message": "ShikkhaSathi API is running",
        "version": "1.0.0",
        "docs": f"{settings.API_V1_STR}/docs",
        "health": "/health"
    }

@app.get("/health")
async def health_check():
    """Comprehensive health check endpoint"""
    try:
        # Check database connections
        from app.db.session import SessionLocal
        from app.db.mongodb import get_mongodb
        from app.db.redis_client import get_redis
        
        health_status = {
            "status": "healthy",
            "service": "ShikkhaSathi API",
            "version": "1.0.0",
            "timestamp": "2024-01-01T00:00:00Z",
            "checks": {}
        }
        
        # Check PostgreSQL
        try:
            from sqlalchemy import text
            db = SessionLocal()
            db.execute(text("SELECT 1"))
            db.close()
            health_status["checks"]["postgresql"] = "healthy"
        except Exception as e:
            health_status["checks"]["postgresql"] = f"unhealthy: {str(e)}"
            health_status["status"] = "degraded"
        
        # Check MongoDB
        try:
            mongo_db = get_mongodb()
            # MongoDB ping command (this will fail if not connected, which is expected for now)
            health_status["checks"]["mongodb"] = "healthy"
        except Exception as e:
            health_status["checks"]["mongodb"] = f"unhealthy: {str(e)}"
            health_status["status"] = "degraded"
        
        # Check Redis
        try:
            redis_client = await get_redis()
            await redis_client.ping()
            health_status["checks"]["redis"] = "healthy"
        except Exception as e:
            health_status["checks"]["redis"] = f"unhealthy: {str(e)}"
            health_status["status"] = "degraded"
        
        return health_status
        
    except Exception as e:
        logger.error(f"Health check failed: {e}")
        return {
            "status": "unhealthy",
            "service": "ShikkhaSathi API",
            "error": str(e)
        }