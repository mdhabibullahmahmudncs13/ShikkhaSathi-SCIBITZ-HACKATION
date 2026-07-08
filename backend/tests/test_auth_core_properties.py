"""
Core property-based tests for authentication security (without database dependencies)

**Feature: shikkhasathi-platform, Property 2: Authentication Token Validity**
**Validates: Requirements 3.1, 6.1, 7.1**
"""

import pytest
from hypothesis import given, strategies as st, assume
from datetime import datetime, timedelta
from app.core.security import create_access_token, verify_token, get_password_hash, verify_password
import uuid


# Test data generators
@st.composite
def valid_token_subject(draw):
    """Generate valid token subjects (user IDs)"""
    return str(draw(st.uuids()))


class TestCoreAuthenticationProperties:
    """Core property-based tests for authentication without database dependencies"""

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

    @given(subject=valid_token_subject())
    def test_token_contains_subject_information(self, subject):
        """
        Property: For any valid subject, the created token should contain 
        the subject information when decoded
        """
        token = create_access_token(subject=subject)
        
        # Token should not be empty
        assert token is not None
        assert len(token) > 0
        
        # Token should be verifiable and return the same subject
        verified_subject = verify_token(token)
        assert verified_subject == subject

    @given(password=st.text(min_size=8, max_size=20, alphabet="abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"))
    def test_password_hash_is_deterministic_but_unique(self, password):
        """
        Property: For any password, multiple hashes should be different 
        (due to salt) but all should verify the original password
        """
        hash1 = get_password_hash(password)
        hash2 = get_password_hash(password)
        
        # Hashes should be different (due to salt)
        assert hash1 != hash2
        
        # Both should verify the original password
        assert verify_password(password, hash1) is True
        assert verify_password(password, hash2) is True

    @given(subjects=st.lists(valid_token_subject(), min_size=2, max_size=10, unique=True))
    def test_different_subjects_create_different_tokens(self, subjects):
        """
        Property: For any list of different subjects, their tokens should be different
        """
        tokens = [create_access_token(subject=subject) for subject in subjects]
        
        # All tokens should be different
        assert len(set(tokens)) == len(tokens)
        
        # Each token should verify to its original subject
        for i, token in enumerate(tokens):
            verified_subject = verify_token(token)
            assert verified_subject == subjects[i]


if __name__ == "__main__":
    pytest.main([__file__, "-v"])