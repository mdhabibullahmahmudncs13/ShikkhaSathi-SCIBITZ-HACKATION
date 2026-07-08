from fastapi import Request, HTTPException
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException
import logging
import traceback
import uuid
from datetime import datetime
from typing import Any, Dict
import json

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class ErrorHandler:
    """Centralized error handling for the application"""
    
    @staticmethod
    def generate_error_id() -> str:
        """Generate unique error ID for tracking"""
        return str(uuid.uuid4())[:8]
    
    @staticmethod
    def log_error(error_id: str, error: Exception, request: Request, context: Dict[str, Any] = None):
        """Log error with context information"""
        try:
            # Safely convert headers to dict, handling bytes objects
            headers_dict = {}
            for key, value in request.headers.items():
                try:
                    headers_dict[key] = str(value)
                except:
                    headers_dict[key] = "<non-serializable>"
            
            error_data = {
                "error_id": error_id,
                "timestamp": datetime.utcnow().isoformat(),
                "error_type": type(error).__name__,
                "error_message": str(error),
                "request_method": request.method,
                "request_url": str(request.url),
                "request_headers": headers_dict,
                "user_agent": request.headers.get("user-agent", "unknown"),
                "client_ip": request.client.host if request.client else None,
                "context": context or {}
            }
            
            # Add stack trace for debugging
            if hasattr(error, '__traceback__'):
                error_data["stack_trace"] = traceback.format_exception(
                    type(error), error, error.__traceback__
                )
            
            # Use a safe JSON serialization
            try:
                logger.error(f"Error {error_id}: {json.dumps(error_data, indent=2, default=str)}")
            except Exception as json_error:
                # Fallback logging if JSON serialization fails
                logger.error(f"Error {error_id}: {error_data['error_type']} - {error_data['error_message']}")
                logger.error(f"JSON serialization failed: {json_error}")
        
        except Exception as log_error:
            # Ultimate fallback
            logger.error(f"Error {error_id}: Failed to log error details - {log_error}")
            logger.error(f"Original error: {type(error).__name__} - {str(error)}")
        
        # In production, send to external monitoring service
        # Example: send_to_sentry(error_data)
    
    @staticmethod
    def create_error_response(
        error_id: str,
        status_code: int,
        message: str,
        details: Dict[str, Any] = None,
        user_message: str = None
    ) -> JSONResponse:
        """Create standardized error response"""
        
        # User-friendly messages in Bangla
        user_messages = {
            400: "অনুরোধে সমস্যা রয়েছে। অনুগ্রহ করে তথ্য পরীক্ষা করুন।",
            401: "আপনার সেশন শেষ হয়ে গেছে। অনুগ্রহ করে আবার লগইন করুন।",
            403: "আপনার এই কাজটি করার অনুমতি নেই।",
            404: "অনুরোধকৃত তথ্য পাওয়া যায়নি।",
            422: "প্রদত্ত তথ্যে ত্রুটি রয়েছে। অনুগ্রহ করে সংশোধন করুন।",
            429: "অনেক বেশি অনুরোধ। অনুগ্রহ করে কিছুক্ষণ পর চেষ্টা করুন।",
            500: "সার্ভারে সমস্যা হয়েছে। আমরা এটি সমাধান করার চেষ্টা করছি।",
            503: "সেবা সাময়িকভাবে বন্ধ। অনুগ্রহ করে পরে চেষ্টা করুন।"
        }
        
        response_data = {
            "error": True,
            "error_id": error_id,
            "status_code": status_code,
            "message": message,
            "user_message": user_message or user_messages.get(status_code, "একটি ত্রুটি ঘটেছে।"),
            "timestamp": datetime.utcnow().isoformat()
        }
        
        if details:
            response_data["details"] = details
            
        return JSONResponse(
            status_code=status_code,
            content=response_data
        )

# Global exception handlers
async def http_exception_handler(request: Request, exc: HTTPException):
    """Handle HTTP exceptions"""
    error_id = ErrorHandler.generate_error_id()
    
    ErrorHandler.log_error(error_id, exc, request, {
        "status_code": exc.status_code,
        "detail": exc.detail
    })
    
    return ErrorHandler.create_error_response(
        error_id=error_id,
        status_code=exc.status_code,
        message=str(exc.detail),
        details={"type": "http_exception"}
    )

async def starlette_http_exception_handler(request: Request, exc: StarletteHTTPException):
    """Handle Starlette HTTP exceptions"""
    error_id = ErrorHandler.generate_error_id()
    
    ErrorHandler.log_error(error_id, exc, request, {
        "status_code": exc.status_code,
        "detail": exc.detail
    })
    
    return ErrorHandler.create_error_response(
        error_id=error_id,
        status_code=exc.status_code,
        message=str(exc.detail),
        details={"type": "starlette_http_exception"}
    )

async def validation_exception_handler(request: Request, exc: RequestValidationError):
    """Handle request validation errors"""
    error_id = ErrorHandler.generate_error_id()
    
    # Extract validation error details
    validation_errors = []
    for error in exc.errors():
        # Safely handle input data that might contain bytes
        input_data = error.get("input")
        if isinstance(input_data, bytes):
            input_data = input_data.decode('utf-8', errors='replace')
        elif input_data is not None:
            try:
                # Try to convert to string if it's not JSON serializable
                json.dumps(input_data)
            except (TypeError, ValueError):
                input_data = str(input_data)
        
        validation_errors.append({
            "field": " -> ".join(str(loc) for loc in error["loc"]),
            "message": error["msg"],
            "type": error["type"],
            "input": input_data
        })
    
    ErrorHandler.log_error(error_id, exc, request, {
        "validation_errors": validation_errors
    })
    
    return ErrorHandler.create_error_response(
        error_id=error_id,
        status_code=422,
        message="Validation error",
        details={
            "type": "validation_error",
            "errors": validation_errors
        },
        user_message="প্রদত্ত তথ্যে ত্রুটি রয়েছে। অনুগ্রহ করে সংশোধন করুন।"
    )

async def general_exception_handler(request: Request, exc: Exception):
    """Handle all other exceptions"""
    error_id = ErrorHandler.generate_error_id()
    
    ErrorHandler.log_error(error_id, exc, request, {
        "exception_type": type(exc).__name__
    })
    
    # Don't expose internal error details in production
    message = "Internal server error"
    details = {"type": "internal_error"}
    
    # In development, provide more details
    import os
    if os.getenv("ENVIRONMENT") == "development":
        details["exception"] = str(exc)
        details["traceback"] = traceback.format_exc()
    
    return ErrorHandler.create_error_response(
        error_id=error_id,
        status_code=500,
        message=message,
        details=details
    )

# Custom exception classes
class ShikkhaSathiException(Exception):
    """Base exception for ShikkhaSathi application"""
    def __init__(self, message: str, status_code: int = 500, details: Dict[str, Any] = None):
        self.message = message
        self.status_code = status_code
        self.details = details or {}
        super().__init__(self.message)

class AuthenticationError(ShikkhaSathiException):
    """Authentication related errors"""
    def __init__(self, message: str = "Authentication failed", details: Dict[str, Any] = None):
        super().__init__(message, 401, details)

class AuthorizationError(ShikkhaSathiException):
    """Authorization related errors"""
    def __init__(self, message: str = "Access denied", details: Dict[str, Any] = None):
        super().__init__(message, 403, details)

class ValidationError(ShikkhaSathiException):
    """Data validation errors"""
    def __init__(self, message: str = "Validation failed", details: Dict[str, Any] = None):
        super().__init__(message, 422, details)

class NotFoundError(ShikkhaSathiException):
    """Resource not found errors"""
    def __init__(self, message: str = "Resource not found", details: Dict[str, Any] = None):
        super().__init__(message, 404, details)

class RateLimitError(ShikkhaSathiException):
    """Rate limiting errors"""
    def __init__(self, message: str = "Rate limit exceeded", details: Dict[str, Any] = None):
        super().__init__(message, 429, details)

class ExternalServiceError(ShikkhaSathiException):
    """External service integration errors"""
    def __init__(self, message: str = "External service error", details: Dict[str, Any] = None):
        super().__init__(message, 503, details)

# Custom exception handler for ShikkhaSathi exceptions
async def shikkhasathi_exception_handler(request: Request, exc: ShikkhaSathiException):
    """Handle custom ShikkhaSathi exceptions"""
    error_id = ErrorHandler.generate_error_id()
    
    ErrorHandler.log_error(error_id, exc, request, {
        "status_code": exc.status_code,
        "details": exc.details
    })
    
    return ErrorHandler.create_error_response(
        error_id=error_id,
        status_code=exc.status_code,
        message=exc.message,
        details=exc.details
    )

# Database error handlers
async def database_error_handler(request: Request, exc: Exception):
    """Handle database-related errors"""
    error_id = ErrorHandler.generate_error_id()
    
    ErrorHandler.log_error(error_id, exc, request, {
        "database_error": True,
        "exception_type": type(exc).__name__
    })
    
    return ErrorHandler.create_error_response(
        error_id=error_id,
        status_code=503,
        message="Database service unavailable",
        details={"type": "database_error"},
        user_message="ডেটাবেস সেবা সাময়িকভাবে বন্ধ। অনুগ্রহ করে পরে চেষ্টা করুন।"
    )

# Rate limiting error handler
async def rate_limit_handler(request: Request, exc: Exception):
    """Handle rate limiting errors"""
    error_id = ErrorHandler.generate_error_id()
    
    ErrorHandler.log_error(error_id, exc, request, {
        "rate_limit_exceeded": True
    })
    
    return ErrorHandler.create_error_response(
        error_id=error_id,
        status_code=429,
        message="Rate limit exceeded",
        details={"type": "rate_limit_error"},
        user_message="অনেক বেশি অনুরোধ। অনুগ্রহ করে কিছুক্ষণ পর চেষ্টা করুন।"
    )

# Health check for error handling system
def test_error_handling():
    """Test error handling system"""
    try:
        # Test custom exceptions
        raise ValidationError("Test validation error", {"field": "test"})
    except ShikkhaSathiException as e:
        logger.info(f"Error handling test successful: {e.message}")
        return True
    except Exception as e:
        logger.error(f"Error handling test failed: {e}")
        return False