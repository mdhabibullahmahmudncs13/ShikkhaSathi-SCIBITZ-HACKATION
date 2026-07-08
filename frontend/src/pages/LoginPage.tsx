import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Eye, EyeOff, Mail, Lock, AlertCircle, CheckCircle, Sparkles, ArrowRight } from 'lucide-react';
import { useUser } from '../contexts/UserContext';

const LoginPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, user, loading: userLoading } = useUser();
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });

  // Check for success message from registration
  useEffect(() => {
    if (location.state?.message) {
      setSuccessMessage(location.state.message);
      // Clear the state to prevent showing the message on refresh
      window.history.replaceState({}, document.title);
    }
  }, [location]);

  // Redirect if already logged in
  useEffect(() => {
    if (user && !userLoading) {
      console.log(`🎯 User already logged in, redirecting based on role: ${user.role}`);
      switch (user.role) {
        case 'student':
          navigate('/student');
          break;
        case 'teacher':
          navigate('/teacher');
          break;
        case 'parent':
          navigate('/parent');
          break;
        default:
          navigate('/student');
      }
    }
  }, [user, userLoading, navigate]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
    setError(''); // Clear error when user types
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      console.log('🔄 Starting login process...');
      
      // Use the UserContext login method
      await login(formData.email, formData.password);
      
      console.log('✅ Login successful, user context updated');
      
      // The useEffect above will handle the redirect based on user role
      
    } catch (err: any) {
      console.error('❌ Login error:', err);
      setError(err.message || 'ইমেইল বা পাসওয়ার্ড ভুল। আবার চেষ্টা করুন।');
    } finally {
      setLoading(false);
    }
  };

  const handleSocialLogin = (provider: string) => {
    console.log(`Login with ${provider}`);
    // Implement social login logic here
  };

  return (
    <div className="min-h-screen flex bg-slate-50">
      {/* Left Side - Inspiring Visual */}
      <motion.div 
        className="hidden lg:flex flex-1 relative overflow-hidden"
        initial={{ opacity: 0, x: -50 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
      >
        {/* Background Image */}
        <img
          src="https://images.unsplash.com/photo-1523240795612-9a054b0db644?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1470&q=80"
          alt="Students collaborating in modern classroom"
          className="absolute inset-0 w-full h-full object-cover"
        />
        
        {/* Enhanced Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-600/80 via-purple-600/70 to-indigo-600/80"></div>
        
        {/* Content Overlay */}
        <div className="relative z-10 flex items-center justify-center p-12">
          <motion.div 
            className="text-center text-white max-w-lg"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
          >
            <motion.div
              className="mb-8"
              animate={{ 
                rotate: [0, 5, -5, 0],
                scale: [1, 1.05, 1]
              }}
              transition={{ 
                duration: 6,
                repeat: Infinity,
                ease: "easeInOut"
              }}
            >
              <Sparkles className="w-16 h-16 mx-auto mb-4 text-yellow-300" />
            </motion.div>
            
            <h3 className="text-5xl font-bold mb-6 font-['Hind_Siliguri']">
              স্বাগতম ফিরে!
            </h3>
            <p className="text-xl leading-relaxed mb-8 font-['Hind_Siliguri'] opacity-90">
              আপনার শিক্ষার যাত্রা অব্যাহত রাখুন। কৃত্রিম বুদ্ধিমত্তার সাহায্যে নতুন উচ্চতায় পৌঁছান।
            </p>
            
            {/* Floating Achievement Cards */}
            <div className="grid grid-cols-2 gap-4">
              <motion.div 
                className="bg-white/20 backdrop-blur-md rounded-3xl p-6 text-center border border-white/30"
                whileHover={{ scale: 1.05, y: -5 }}
                transition={{ duration: 0.3 }}
              >
                <div className="text-3xl font-bold font-['Hind_Siliguri'] mb-2">10K+</div>
                <div className="text-sm opacity-90 font-['Hind_Siliguri']">সক্রিয় শিক্ষার্থী</div>
              </motion.div>
              <motion.div 
                className="bg-white/20 backdrop-blur-md rounded-3xl p-6 text-center border border-white/30"
                whileHover={{ scale: 1.05, y: -5 }}
                transition={{ duration: 0.3 }}
              >
                <div className="text-3xl font-bold font-['Hind_Siliguri'] mb-2">৯৮%</div>
                <div className="text-sm opacity-90 font-['Hind_Siliguri']">সফলতার হার</div>
              </motion.div>
            </div>
          </motion.div>
        </div>

        {/* Floating Decorative Elements */}
        <motion.div
          className="absolute top-20 left-20 w-20 h-20 bg-white/10 rounded-full blur-xl"
          animate={{
            y: [0, -20, 0],
            scale: [1, 1.2, 1]
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
        <motion.div
          className="absolute bottom-32 right-16 w-16 h-16 bg-yellow-300/20 rounded-full blur-lg"
          animate={{
            y: [0, -15, 0],
            x: [0, 10, 0]
          }}
          transition={{
            duration: 6,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 2
          }}
        />
      </motion.div>

      {/* Right Side - Login Form */}
      <motion.div 
        className="flex-1 flex items-center justify-center p-8 lg:max-w-md xl:max-w-lg bg-white"
        initial={{ opacity: 0, x: 50 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.8, ease: "easeOut", delay: 0.2 }}
      >
        <div className="w-full max-w-md space-y-8">
          {/* Branding */}
          <motion.div 
            className="text-center"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
          >
            <div className="flex items-center justify-center gap-3 mb-8">
              <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-xl">
                <span className="text-white font-bold text-xl">শ</span>
              </div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 bg-clip-text text-transparent font-['Hind_Siliguri']">
                শিক্ষাসাথী
              </h1>
            </div>
            <h2 className="text-3xl font-bold text-gray-900 font-['Hind_Siliguri'] mb-3">
              স্বাগতম!
            </h2>
            <p className="text-gray-600 font-['Hind_Siliguri'] text-lg">
              আপনার অ্যাকাউন্টে প্রবেশ করুন
            </p>
          </motion.div>

          {/* Login Form */}
          <motion.form 
            className="space-y-6"
            onSubmit={handleSubmit}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.6 }}
          >
            {/* Success Message */}
            {successMessage && (
              <motion.div 
                className="bg-green-50 border border-green-200 text-green-700 px-6 py-4 rounded-2xl text-sm flex items-center gap-3 font-['Hind_Siliguri'] shadow-lg"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3 }}
              >
                <CheckCircle className="w-5 h-5 flex-shrink-0" />
                {successMessage}
              </motion.div>
            )}

            {/* Error Message */}
            {error && (
              <motion.div 
                className="bg-red-50 border border-red-200 text-red-700 px-6 py-4 rounded-2xl text-sm flex items-center gap-3 font-['Hind_Siliguri'] shadow-lg"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3 }}
              >
                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                {error}
              </motion.div>
            )}

            {/* Email Field */}
            <div>
              <label htmlFor="email" className="block text-sm font-semibold text-gray-700 mb-3 font-['Hind_Siliguri']">
                ইমেইল ঠিকানা
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={formData.email}
                  onChange={handleChange}
                  disabled={loading}
                  className={`appearance-none relative block w-full pl-12 pr-4 py-4 border ${
                    error ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'
                  } placeholder-gray-400 text-gray-900 rounded-2xl focus:outline-none focus:ring-2 focus:ring-offset-0 transition-all disabled:bg-gray-100 disabled:cursor-not-allowed font-['Hind_Siliguri'] text-lg shadow-sm`}
                  placeholder="আপনার ইমেইল লিখুন"
                />
              </div>
            </div>

            {/* Password Field */}
            <div>
              <label htmlFor="password" className="block text-sm font-semibold text-gray-700 mb-3 font-['Hind_Siliguri']">
                পাসওয়ার্ড
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  required
                  value={formData.password}
                  onChange={handleChange}
                  disabled={loading}
                  className={`appearance-none relative block w-full pl-12 pr-14 py-4 border ${
                    error ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'
                  } placeholder-gray-400 text-gray-900 rounded-2xl focus:outline-none focus:ring-2 focus:ring-offset-0 transition-all disabled:bg-gray-100 disabled:cursor-not-allowed font-['Hind_Siliguri'] text-lg shadow-sm`}
                  placeholder="আপনার পাসওয়ার্ড লিখুন"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-gray-600 transition-colors"
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5" />
                  ) : (
                    <Eye className="h-5 w-5" />
                  )}
                </button>
              </div>
            </div>

            {/* Remember Me & Forgot Password */}
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <input
                  id="remember-me"
                  name="remember-me"
                  type="checkbox"
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="remember-me" className="ml-3 block text-sm text-gray-700 font-['Hind_Siliguri']">
                  মনে রাখুন
                </label>
              </div>
              <button
                type="button"
                className="text-sm text-blue-600 hover:text-blue-500 font-medium font-['Hind_Siliguri'] transition-colors"
              >
                পাসওয়ার্ড ভুলে গেছেন?
              </button>
            </div>

            {/* Login Button */}
            <motion.button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center items-center gap-3 py-4 px-6 border border-transparent text-xl font-bold rounded-2xl text-white bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 hover:from-blue-700 hover:via-purple-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all shadow-xl hover:shadow-2xl disabled:opacity-50 disabled:cursor-not-allowed font-['Hind_Siliguri'] transform hover:-translate-y-1"
              whileHover={{ scale: loading ? 1 : 1.02 }}
              whileTap={{ scale: loading ? 1 : 0.98 }}
            >
              {loading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-3 h-6 w-6 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  প্রবেশ করা হচ্ছে...
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5" />
                  প্রবেশ করুন
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </motion.button>

            {/* Divider */}
            <div className="relative my-8">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-4 bg-white text-gray-500 font-['Hind_Siliguri'] font-medium">অথবা</span>
              </div>
            </div>

            {/* Social Login Buttons */}
            <div className="grid grid-cols-2 gap-4">
              <motion.button
                type="button"
                onClick={() => handleSocialLogin('google')}
                className="w-full inline-flex justify-center items-center gap-3 py-4 px-4 border border-gray-300 rounded-2xl bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all shadow-sm hover:shadow-md font-['Hind_Siliguri']"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Google
              </motion.button>

              <motion.button
                type="button"
                onClick={() => handleSocialLogin('facebook')}
                className="w-full inline-flex justify-center items-center gap-3 py-4 px-4 border border-gray-300 rounded-2xl bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all shadow-sm hover:shadow-md font-['Hind_Siliguri']"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <svg className="w-5 h-5" fill="#1877F2" viewBox="0 0 24 24">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                </svg>
                Facebook
              </motion.button>
            </div>
          </motion.form>

          {/* Sign Up Link */}
          <motion.div 
            className="text-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.8 }}
          >
            <p className="text-sm text-gray-600 font-['Hind_Siliguri']">
              নতুন ব্যবহারকারী?{' '}
              <button
                onClick={() => navigate('/signup')}
                className="font-semibold text-blue-600 hover:text-blue-500 transition-colors"
              >
                নতুন অ্যাকাউন্ট তৈরি করুন
              </button>
            </p>
          </motion.div>
        </div>
      </motion.div>

      {/* Mobile Background for smaller screens */}
      <div className="lg:hidden fixed inset-0 -z-10">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50"></div>
        <div className="absolute top-20 left-10 w-72 h-72 bg-blue-200 rounded-full blur-3xl opacity-20"></div>
        <div className="absolute bottom-20 right-10 w-80 h-80 bg-purple-200 rounded-full blur-3xl opacity-25"></div>
      </div>
    </div>
  );
};

export default LoginPage;