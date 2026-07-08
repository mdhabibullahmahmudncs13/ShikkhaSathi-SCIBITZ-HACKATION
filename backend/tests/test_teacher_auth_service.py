"""
Tests for Teacher Authentication Service
"""

import pytest
from unittest.mock import Mock, patch
from sqlalchemy.orm import Session
from app.services.teacher_auth_service import TeacherAuthService
from app.models.user import User, UserRole
from app.models.teacher import Teacher, TeacherPermission
from datetime import datetime
import uuid


class TestTeacherAuthService:
    """Test cases for TeacherAuthService"""
    
    def setup_method(self):
        """Set up test fixtures"""
        self.mock_db = Mock(spec=Session)
        self.service = TeacherAuthService(self.mock_db)
    
    def test_create_teacher_user_success(self):
        """Test successful teacher user creation"""
        # Mock data
        teacher_data = {
            'email': 'teacher@example.com',
            'password': 'password123',
            'full_name': 'John Teacher',
            'subjects': ['Mathematics', 'Physics'],
            'grade_levels': [9, 10, 11],
            'department': 'Science',
            'phone_number': '+8801234567890'
        }
        
        # Mock database operations
        self.mock_db.query.return_value.filter.return_value.first.return_value = None  # No existing user
        self.mock_db.add = Mock()
        self.mock_db.flush = Mock()
        self.mock_db.commit = Mock()
        self.mock_db.refresh = Mock()
        
        # Mock user creation
        mock_user = Mock(spec=User)
        mock_user.id = uuid.uuid4()
        mock_user.email = teacher_data['email']
        mock_user.full_name = teacher_data['full_name']
        mock_user.role = UserRole.TEACHER
        
        with patch('app.services.teacher_auth_service.get_password_hash') as mock_hash:
            mock_hash.return_value = 'hashed_password'
            
            # Execute
            result = self.service.create_teacher_user(teacher_data)
            
            # Verify
            assert self.mock_db.add.call_count >= 2  # User + Teacher + Permissions
            assert self.mock_db.commit.called
            assert self.mock_db.refresh.called
    
    def test_create_teacher_user_missing_required_field(self):
        """Test teacher user creation with missing required field"""
        teacher_data = {
            'email': 'teacher@example.com',
            'password': 'password123',
            # Missing 'full_name'
            'subjects': ['Mathematics'],
            'grade_levels': [9]
        }
        
        with pytest.raises(ValueError, match="Missing required field: full_name"):
            self.service.create_teacher_user(teacher_data)
    
    def test_create_teacher_user_existing_email(self):
        """Test teacher user creation with existing email"""
        teacher_data = {
            'email': 'existing@example.com',
            'password': 'password123',
            'full_name': 'John Teacher',
            'subjects': ['Mathematics'],
            'grade_levels': [9]
        }
        
        # Mock existing user
        existing_user = Mock(spec=User)
        self.mock_db.query.return_value.filter.return_value.first.return_value = existing_user
        
        with pytest.raises(ValueError, match="User with this email already exists"):
            self.service.create_teacher_user(teacher_data)
    
    def test_authenticate_teacher_success(self):
        """Test successful teacher authentication"""
        email = 'teacher@example.com'
        password = 'password123'
        
        # Mock user
        mock_user = Mock(spec=User)
        mock_user.id = uuid.uuid4()
        mock_user.role = UserRole.TEACHER
        mock_user.is_active = True
        
        # Mock teacher profile
        mock_teacher = Mock(spec=Teacher)
        mock_teacher.id = uuid.uuid4()
        mock_teacher.is_active = True
        
        with patch.object(self.service, 'authenticate_user') as mock_auth:
            with patch.object(self.service, 'get_teacher_profile') as mock_profile:
                mock_auth.return_value = mock_user
                mock_profile.return_value = mock_teacher
                
                result = self.service.authenticate_teacher(email, password)
                
                assert result is not None
                assert result['user'] == mock_user
                assert result['teacher_profile'] == mock_teacher
    
    def test_authenticate_teacher_not_teacher_role(self):
        """Test authentication failure for non-teacher user"""
        email = 'student@example.com'
        password = 'password123'
        
        # Mock student user
        mock_user = Mock(spec=User)
        mock_user.role = UserRole.STUDENT
        
        with patch.object(self.service, 'authenticate_user') as mock_auth:
            mock_auth.return_value = mock_user
            
            result = self.service.authenticate_teacher(email, password)
            
            assert result is None
    
    def test_authenticate_teacher_inactive_profile(self):
        """Test authentication failure for inactive teacher profile"""
        email = 'teacher@example.com'
        password = 'password123'
        
        # Mock user
        mock_user = Mock(spec=User)
        mock_user.id = uuid.uuid4()
        mock_user.role = UserRole.TEACHER
        
        # Mock inactive teacher profile
        mock_teacher = Mock(spec=Teacher)
        mock_teacher.is_active = False
        
        with patch.object(self.service, 'authenticate_user') as mock_auth:
            with patch.object(self.service, 'get_teacher_profile') as mock_profile:
                mock_auth.return_value = mock_user
                mock_profile.return_value = mock_teacher
                
                result = self.service.authenticate_teacher(email, password)
                
                assert result is None
    
    def test_get_teacher_permissions(self):
        """Test getting teacher permissions"""
        teacher_id = uuid.uuid4()
        
        # Mock permissions
        mock_permissions = [
            Mock(permission_name='view_student_roster'),
            Mock(permission_name='create_assessments'),
            Mock(permission_name='view_class_analytics')
        ]
        
        self.mock_db.query.return_value.filter.return_value.all.return_value = mock_permissions
        
        result = self.service.get_teacher_permissions(teacher_id)
        
        expected = ['view_student_roster', 'create_assessments', 'view_class_analytics']
        assert result == expected
    
    def test_has_permission_true(self):
        """Test has_permission returns True when permission exists"""
        teacher_id = uuid.uuid4()
        permission_name = 'view_student_roster'
        
        # Mock permission exists
        mock_permission = Mock(spec=TeacherPermission)
        self.mock_db.query.return_value.filter.return_value.first.return_value = mock_permission
        
        result = self.service.has_permission(teacher_id, permission_name)
        
        assert result is True
    
    def test_has_permission_false(self):
        """Test has_permission returns False when permission doesn't exist"""
        teacher_id = uuid.uuid4()
        permission_name = 'admin_access'
        
        # Mock no permission
        self.mock_db.query.return_value.filter.return_value.first.return_value = None
        
        result = self.service.has_permission(teacher_id, permission_name)
        
        assert result is False
    
    def test_grant_permission_new(self):
        """Test granting a new permission"""
        teacher_id = uuid.uuid4()
        permission_name = 'new_permission'
        granted_by = 'admin_user_id'
        
        # Mock no existing permission
        self.mock_db.query.return_value.filter.return_value.first.return_value = None
        
        result = self.service.grant_permission(teacher_id, permission_name, granted_by)
        
        assert result is True
        assert self.mock_db.add.called
        assert self.mock_db.commit.called
    
    def test_grant_permission_existing_inactive(self):
        """Test granting permission that exists but is inactive"""
        teacher_id = uuid.uuid4()
        permission_name = 'existing_permission'
        granted_by = 'admin_user_id'
        
        # Mock existing inactive permission
        mock_permission = Mock(spec=TeacherPermission)
        mock_permission.is_active = False
        self.mock_db.query.return_value.filter.return_value.first.return_value = mock_permission
        
        result = self.service.grant_permission(teacher_id, permission_name, granted_by)
        
        assert result is True
        assert mock_permission.is_active is True
        assert self.mock_db.commit.called
    
    def test_grant_permission_already_active(self):
        """Test granting permission that's already active"""
        teacher_id = uuid.uuid4()
        permission_name = 'active_permission'
        granted_by = 'admin_user_id'
        
        # Mock existing active permission
        mock_permission = Mock(spec=TeacherPermission)
        mock_permission.is_active = True
        self.mock_db.query.return_value.filter.return_value.first.return_value = mock_permission
        
        result = self.service.grant_permission(teacher_id, permission_name, granted_by)
        
        assert result is False  # Already has permission
    
    def test_revoke_permission_success(self):
        """Test successful permission revocation"""
        teacher_id = uuid.uuid4()
        permission_name = 'revoke_me'
        
        # Mock existing active permission
        mock_permission = Mock(spec=TeacherPermission)
        mock_permission.is_active = True
        self.mock_db.query.return_value.filter.return_value.first.return_value = mock_permission
        
        result = self.service.revoke_permission(teacher_id, permission_name)
        
        assert result is True
        assert mock_permission.is_active is False
        assert self.mock_db.commit.called
    
    def test_revoke_permission_not_found(self):
        """Test revoking non-existent permission"""
        teacher_id = uuid.uuid4()
        permission_name = 'nonexistent'
        
        # Mock no permission found
        self.mock_db.query.return_value.filter.return_value.first.return_value = None
        
        result = self.service.revoke_permission(teacher_id, permission_name)
        
        assert result is False
    
    def test_validate_teacher_access_valid(self):
        """Test valid teacher access validation"""
        user_id = str(uuid.uuid4())
        
        # Mock valid user
        mock_user = Mock(spec=User)
        mock_user.role = UserRole.TEACHER
        mock_user.is_active = True
        
        # Mock valid teacher profile
        mock_teacher = Mock(spec=Teacher)
        mock_teacher.id = uuid.uuid4()
        mock_teacher.is_active = True
        
        with patch.object(self.service, 'get_user_by_id') as mock_get_user:
            with patch.object(self.service, 'get_teacher_profile') as mock_get_profile:
                with patch.object(self.service, 'get_teacher_permissions') as mock_get_perms:
                    mock_get_user.return_value = mock_user
                    mock_get_profile.return_value = mock_teacher
                    mock_get_perms.return_value = ['view_student_roster']
                    
                    result = self.service.validate_teacher_access(user_id)
                    
                    assert result['valid'] is True
                    assert result['user'] == mock_user
                    assert result['teacher_profile'] == mock_teacher
    
    def test_validate_teacher_access_invalid_user(self):
        """Test teacher access validation with invalid user"""
        user_id = str(uuid.uuid4())
        
        with patch.object(self.service, 'get_user_by_id') as mock_get_user:
            mock_get_user.return_value = None
            
            result = self.service.validate_teacher_access(user_id)
            
            assert result['valid'] is False
            assert 'Invalid user' in result['reason']
    
    def test_validate_teacher_access_missing_permissions(self):
        """Test teacher access validation with missing permissions"""
        user_id = str(uuid.uuid4())
        required_permissions = ['admin_access', 'super_user']
        
        # Mock valid user and profile
        mock_user = Mock(spec=User)
        mock_user.role = UserRole.TEACHER
        mock_user.is_active = True
        
        mock_teacher = Mock(spec=Teacher)
        mock_teacher.id = uuid.uuid4()
        mock_teacher.is_active = True
        
        with patch.object(self.service, 'get_user_by_id') as mock_get_user:
            with patch.object(self.service, 'get_teacher_profile') as mock_get_profile:
                with patch.object(self.service, 'get_teacher_permissions') as mock_get_perms:
                    mock_get_user.return_value = mock_user
                    mock_get_profile.return_value = mock_teacher
                    mock_get_perms.return_value = ['view_student_roster']  # Missing required permissions
                    
                    result = self.service.validate_teacher_access(user_id, required_permissions)
                    
                    assert result['valid'] is False
                    assert 'Missing permissions' in result['reason']
                    assert result['missing_permissions'] == required_permissions