from datetime import datetime, timedelta
from typing import Any, Union, Optional
from jose import jwt, JWTError
from passlib.context import CryptContext
from app.core.config import settings
import hashlib
import secrets

# Password hashing context with fallback
import os
FORCE_FALLBACK = True  # Force fallback for now to avoid bcrypt issues

if FORCE_FALLBACK:
    pwd_context = None
    BCRYPT_AVAILABLE = False
else:
    try:
        pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
        BCRYPT_AVAILABLE = True
    except Exception:
        # Fallback to a simple hash for testing environments
        pwd_context = None
        BCRYPT_AVAILABLE = False

ALGORITHM = "HS256"


def create_access_token(
    subject: Union[str, Any], expires_delta: timedelta = None
) -> str:
    """Create JWT access token"""
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(
            minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES
        )
    
    # Ensure all values are JSON serializable
    to_encode = {
        "exp": expire,
        "sub": str(subject),
        "iat": datetime.utcnow()
    }
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a password against its hash"""
    if BCRYPT_AVAILABLE:
        # Truncate password to 72 bytes for bcrypt compatibility
        password_bytes = plain_password.encode('utf-8')
        if len(password_bytes) > 72:
            password_bytes = password_bytes[:72]
            # Ensure we don't cut in the middle of a UTF-8 character
            while len(password_bytes) > 0:
                try:
                    plain_password = password_bytes.decode('utf-8')
                    break
                except UnicodeDecodeError:
                    password_bytes = password_bytes[:-1]
        return pwd_context.verify(plain_password, hashed_password)
    else:
        # Fallback verification for testing environments
        if not hashed_password.startswith("pbkdf2_sha256$"):
            return False
        try:
            _, salt, stored_hash = hashed_password.split('$')
            password_hash = hashlib.pbkdf2_hmac('sha256', plain_password.encode('utf-8'), salt.encode('utf-8'), 100000)
            return password_hash.hex() == stored_hash
        except ValueError:
            return False


def get_password_hash(password: str) -> str:
    """Generate password hash"""
    if BCRYPT_AVAILABLE:
        # Truncate password to 72 bytes for bcrypt compatibility
        password_bytes = password.encode('utf-8')
        if len(password_bytes) > 72:
            password_bytes = password_bytes[:72]
            # Ensure we don't cut in the middle of a UTF-8 character
            while len(password_bytes) > 0:
                try:
                    password = password_bytes.decode('utf-8')
                    break
                except UnicodeDecodeError:
                    password_bytes = password_bytes[:-1]
        return pwd_context.hash(password)
    else:
        # Fallback hash for testing environments
        salt = secrets.token_hex(16)
        password_hash = hashlib.pbkdf2_hmac('sha256', password.encode('utf-8'), salt.encode('utf-8'), 100000)
        return f"pbkdf2_sha256${salt}${password_hash.hex()}"


def verify_token(token: str) -> Optional[str]:
    """Verify JWT token and return subject"""
    try:
        payload = jwt.decode(
            token, settings.SECRET_KEY, algorithms=[ALGORITHM]
        )
        token_data = payload.get("sub")
        if token_data is None:
            return None
        return str(token_data)
    except JWTError:
        return None