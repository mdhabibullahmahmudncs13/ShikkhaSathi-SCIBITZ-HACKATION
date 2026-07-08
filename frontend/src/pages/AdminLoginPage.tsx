import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AdminLogin from '../components/admin/AdminLogin';

const AdminLoginPage: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleLogin = async (credentials: { email: string; password: string }) => {
    setLoading(true);
    setError('');

    try {
      // For admin login, use simple credential check
      if (credentials.email === 'admin@shikkhaSathi.com' && credentials.password === 'admin123') {
        // Store admin session info
        localStorage.setItem('auth_token', 'admin_session_token');
        localStorage.setItem('user_role', 'admin');
        localStorage.setItem('user_email', credentials.email);
        
        // Redirect to admin dashboard
        navigate('/admin');
        return;
      }
      
      // For other users, use API authentication
      const response = await fetch('/api/v1/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(credentials)
      });

      if (!response.ok) {
        throw new Error('Invalid credentials');
      }

      const data = await response.json();
      
      // Check if user is admin
      if (data.user && data.user.role !== 'admin') {
        throw new Error('Access denied. Admin privileges required.');
      }
      
      // Store admin token and user info
      localStorage.setItem('auth_token', data.access_token);
      localStorage.setItem('user_role', 'admin');
      localStorage.setItem('user_email', credentials.email);
        
      // Redirect to admin dashboard
      navigate('/admin');
    } catch (err) {
      setError('Login failed. Please try again.');
      console.error('Admin login error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AdminLogin
      onLogin={handleLogin}
      loading={loading}
      error={error}
    />
  );
};

export default AdminLoginPage;