"""
Property-based tests for authentication security

**Feature: shikkhasathi-platform, Property 2: Authentication Token Validity**
**Validates: Requirements 3.1, 6.1, 7.1**
"""

import pytest
from hypothesis import given, strategies as st, assume
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from app.core.security import create_access_token, verify_token, get_password_hash, verify_password
from app.services.auth_service import AuthService
from app.schemas.user import UserCreate
from app.models.user import UserRole, Medium
from app.db.session import SessionLocal
from app.core.config import settings
from unittest.mock import Mock, patch
import uuid


# Test data generators
@st.composite
def valid_user_data(draw):
    """Generate valid user creation data"""
    email = draw(st.emails())
    # Limit password to 20 characters to ensure it stays well under bcrypt's 72-byte limit
    password = draw(st.text(min_size=8, max_size=20, alphabet="abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"))
    full_name = draw(st.text(min_size=1, max_size=100, alphabet=st.characters(whitelist_categories=('Lu', 'Ll', 'Nd', 'Zs'))))
    grade = draw(st.one_of(st.none(), st.integers(min_value=6, max_value=12)))
    medium = draw(st.one_of(st.none(), st.sampled_from(Medium)))
    role = draw(st.sampled_from(UserRole))
    
    return UserCreate(
        email=email,
        password=password,
        full_name=full_name,
        grade=grade,
        medium=medium,
        role=role
    )


@st.composite
def valid_token_subject(draw):
    """Generate valid token subjects (user IDs)"""
    return str(draw(st.uuids()))


class TestAuthenticationTokenValidity:
    """Property-based tests for authentication token validity"""
    
    def setup_method(self):
        """Set up test environment with mocked Redis"""
        # Mock Redis client for session tests
        self.mock_redis = Mock()
        self.mock_redis.setex = Mock(return_value=True)
        self.mock_redis.delete = Mock(return_value=1)
        
        # Store for session data simulation
        self.session_store = {}
        
        def mock_get(key):
            return self.session_store.get(key)
        
        def mock_setex(key, ttl, value):
            self.session_store[key] = value
            return True
            
        def mock_delete(key):
            if key in self.session_store:
                del self.session_store[key]
                return 1
            return 0
        
        self.mock_redis.get = Mock(side_effect=mock_get)
        self.mock_redis.setex = Mock(side_effect=mock_setex)
        self.mock_redis.delete = Mock(side_effect=mock_delete)
        
        # Patch the redis_client import
        self.redis_patcher = patch('app.services.auth_service.redis_client', self.mock_redis)
        self.redis_patcher.start()
    
    def teardown_method(self):
        """Clean up after tests"""
        if hasattr(self, 'redis_patcher'):
            self.redis_patcher.stop()

    @given(subject=valid_token_subject())
    def test_token_creation_and_verification_roundtrip(self, subject):
        """
        Property: For any valid user ID, creating a token and then verifying it 
        should return the same user ID
        """
        # Create token
        token = create_access_token(subject=subject)
        
        # Verify token
        verified_subject = verify_token(token)
        
        # Should return the same subject
        assert verified_subject == subject

    @given(subject=valid_token_subject(), 
           expires_minutes=st.integers(min_value=1, max_value=60*24*30))  # 1 minute to 30 days
    def test_token_with_custom_expiry_is_valid(self, subject, expires_minutes):
        """
        Property: For any valid user ID and expiry time in the future,
        the created token should be valid immediately after creation
        """
        expires_delta = timedelta(minutes=expires_minutes)
        token = create_access_token(subject=subject, expires_delta=expires_delta)
        
        verified_subject = verify_token(token)
        assert verified_subject == subject

    @given(password=st.text(min_size=8, max_size=20, alphabet="abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"))
    def test_password_hashing_roundtrip(self, password):
        """
        Property: For any valid password, hashing it and then verifying 
        should return True for the original password
        """
        hashed = get_password_hash(password)
        
        # Original password should verify
        assert verify_password(password, hashed) is True
        
        # Hash should be different from original password
        assert hashed != password

    @given(password=st.text(min_size=8, max_size=20, alphabet="abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"),
           wrong_password=st.text(min_size=8, max_size=20, alphabet="abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"))
    def test_password_verification_rejects_wrong_password(self, password, wrong_password):
        """
        Property: For any password and a different wrong password,
        verification should fail for the wrong password
        """
        assume(password != wrong_password)
        
        hashed = get_password_hash(password)
        
        # Wrong password should not verify
        assert verify_password(wrong_password, hashed) is False

    @given(malformed_token=st.text(min_size=1, max_size=100))
    def test_malformed_token_verification_fails(self, malformed_token):
        """
        Property: For any malformed token string, verification should return None
        """
        # Assume it's not a valid JWT format
        assume('.' not in malformed_token or len(malformed_token.split('.')) != 3)
        
        result = verify_token(malformed_token)
        assert result is None

    @given(user_data=valid_user_data())
    def test_user_creation_and_authentication_roundtrip(self, user_data):
        """
        Property: For any valid user data, creating a user and then authenticating
        with the same credentials should succeed
        """
        db = SessionLocal()
        try:
            auth_service = AuthService(db)
            
            # Clean up any existing user with the same email
            existing_user = auth_service.get_user_by_email(user_data.email)
            if existing_user:
                # Delete existing user to avoid conflicts
                db.delete(existing_user)
                db.commit()
            
            # Create user
            user = auth_service.create_user(user_data)
            assert user is not None
            assert user.email == user_data.email
            assert user.full_name == user_data.full_name
            assert user.role == user_data.role
            
            # Authenticate with correct credentials
            authenticated_user = auth_service.authenticate_user(user_data.email, user_data.password)
            assert authenticated_user is not None
            assert authenticated_user.id == user.id
            
            # Create session
            token = auth_service.create_session(user)
            assert token is not None
            
            # Verify session exists
            session_data = auth_service.get_session(token)
            assert session_data is not None
            assert session_data["user_id"] == str(user.id)
            assert session_data["email"] == user.email
            assert session_data["role"] == user.role.value
            
        finally:
            db.rollback()
            db.close()

    @given(user_data=valid_user_data(),
           wrong_password=st.text(min_size=8, max_size=20, alphabet="abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"))
    def test_authentication_fails_with_wrong_password(self, user_data, wrong_password):
        """
        Property: For any user and a different wrong password,
        authentication should fail
        """
        assume(user_data.password != wrong_password)
        
        db = SessionLocal()
        try:
            auth_service = AuthService(db)
            
            # Clean up any existing user with the same email
            existing_user = auth_service.get_user_by_email(user_data.email)
            if existing_user:
                # Delete existing user to avoid conflicts
                db.delete(existing_user)
                db.commit()
            
            # Create user
            user = auth_service.create_user(user_data)
            
            # Try to authenticate with wrong password
            authenticated_user = auth_service.authenticate_user(user_data.email, wrong_password)
            assert authenticated_user is None
            
        finally:
            db.rollback()
            db.close()

    @given(user_data=valid_user_data())
    def test_session_invalidation_prevents_access(self, user_data):
        """
        Property: For any user session, invalidating it should prevent further access
        """
        db = SessionLocal()
        try:
            auth_service = AuthService(db)
            
            # Clean up any existing user with the same email
            existing_user = auth_service.get_user_by_email(user_data.email)
            if existing_user:
                # Delete existing user to avoid conflicts
                db.delete(existing_user)
                db.commit()
            
            # Create user and session
            user = auth_service.create_user(user_data)
            token = auth_service.create_session(user)
            
            # Verify session exists
            session_data = auth_service.get_session(token)
            assert session_data is not None
            
            # Invalidate session
            success = auth_service.invalidate_session(token)
            assert success is True
            
            # Session should no longer exist
            session_data = auth_service.get_session(token)
            assert session_data is None
            
        finally:
            db.rollback()
            db.close()

    @given(user_data=valid_user_data())
    def test_session_refresh_creates_new_valid_token(self, user_data):
        """
        Property: For any valid user session, refreshing it should create a new valid token
        and invalidate the old one
        """
        db = SessionLocal()
        try:
            auth_service = AuthService(db)
            
            # Clean up any existing user with the same email
            existing_user = auth_service.get_user_by_email(user_data.email)
            if existing_user:
                # Delete existing user to avoid conflicts
                db.delete(existing_user)
                db.commit()
            
            # Create user and session
            user = auth_service.create_user(user_data)
            old_token = auth_service.create_session(user)
            
            # Refresh session
            new_token = auth_service.refresh_session(old_token)
            assert new_token is not None
            assert new_token != old_token
            
            # Old session should be invalidated
            old_session_data = auth_service.get_session(old_token)
            assert old_session_data is None
            
            # New session should be valid
            new_session_data = auth_service.get_session(new_token)
            assert new_session_data is not None
            assert new_session_data["user_id"] == str(user.id)
            
        finally:
            db.rollback()
            db.close()


if __name__ == "__main__":
    pytest.main([__file__, "-v"])