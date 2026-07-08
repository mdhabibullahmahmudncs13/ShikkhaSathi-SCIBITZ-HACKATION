import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Eye, 
  EyeOff, 
  Mail, 
  Lock, 
  User, 
  Phone, 
  Calendar,
  CheckCircle,
  AlertCircle,
  ArrowRight,
  ArrowLeft,
  Check,
  Sparkles,
  Trophy,
  Target,
  Zap
} from 'lucide-react';

interface FormData {
  // Step 1: Basic Info & Role
  role: 'student' | 'teacher' | 'parent';
  fullName: string;
  email: string;
  phone: string;
  dateOfBirth: string;
  
  // Step 2: Role-specific Details
  grade: string;
  medium: 'bangla' | 'english';
  school: string;
  district: string;
  subjects?: string; // For teachers
  experience?: string; // For teachers
  childName?: string; // For parents
  childGrade?: string; // For parents
  
  // Step 3: Security
  password: string;
  confirmPassword: string;
  agreeToTerms: boolean;
}

interface PasswordValidation {
  minLength: boolean;
  hasUppercase: boolean;
  hasLowercase: boolean;
  hasNumber: boolean;
  hasSpecialChar: boolean;
}

const SignUpPage = () => {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  const [formData, setFormData] = useState<FormData>({
    role: 'student',
    fullName: '',
    email: '',
    phone: '',
    dateOfBirth: '',
    grade: '',
    medium: 'bangla',
    school: '',
    district: '',
    subjects: '',
    experience: '',
    childName: '',
    childGrade: '',
    password: '',
    confirmPassword: '',
    agreeToTerms: false
  });

  const [passwordValidation, setPasswordValidation] = useState<PasswordValidation>({
    minLength: false,
    hasUppercase: false,
    hasLowercase: false,
    hasNumber: false,
    hasSpecialChar: false
  });

  // Grade options with enhanced colorful pills
  const gradeOptions = [
    { value: '6', label: 'ষষ্ঠ শ্রেণী', color: 'from-red-400 to-pink-500', icon: '🌟' },
    { value: '7', label: 'সপ্তম শ্রেণী', color: 'from-orange-400 to-red-500', icon: '🚀' },
    { value: '8', label: 'অষ্টম শ্রেণী', color: 'from-yellow-400 to-orange-500', icon: '⚡' },
    { value: '9', label: 'নবম শ্রেণী', color: 'from-green-400 to-yellow-500', icon: '🎯' },
    { value: '10', label: 'দশম শ্রেণী', color: 'from-blue-400 to-green-500', icon: '🏆' },
    { value: '11', label: 'একাদশ শ্রেণী', color: 'from-indigo-400 to-blue-500', icon: '💎' },
    { value: '12', label: 'দ্বাদশ শ্রেণী', color: 'from-purple-400 to-indigo-500', icon: '👑' }
  ];

  // Bangladesh districts
  const districts = [
    'ঢাকা', 'চট্টগ্রাম', 'রাজশাহী', 'খুলনা', 'বরিশাল', 'সিলেট', 'রংপুর', 'ময়মনসিংহ',
    'গাজীপুর', 'নারায়ণগঞ্জ', 'কুমিল্লা', 'ফরিদপুর', 'কিশোরগঞ্জ', 'মানিকগঞ্জ', 'টাঙ্গাইল'
  ];

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;
    
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
    
    setError('');

    // Real-time password validation
    if (name === 'password') {
      validatePassword(value);
    }
  };

  const validatePassword = (password: string) => {
    setPasswordValidation({
      minLength: password.length >= 8,
      hasUppercase: /[A-Z]/.test(password),
      hasLowercase: /[a-z]/.test(password),
      hasNumber: /\d/.test(password),
      hasSpecialChar: /[!@#$%^&*(),.?":{}|<>]/.test(password)
    });
  };

  const isPasswordValid = () => {
    return Object.values(passwordValidation).every(Boolean);
  };

  const validateStep = (step: number): boolean => {
    switch (step) {
      case 1:
        if (!formData.fullName.trim()) {
          setError('পূর্ণ নাম প্রয়োজন');
          return false;
        }
        if (!formData.email.trim() || !/\S+@\S+\.\S+/.test(formData.email)) {
          setError('বৈধ ইমেইল ঠিকানা প্রয়োজন');
          return false;
        }
        if (!formData.phone.trim() || !/^(\+88|88)?01[3-9]\d{8}$/.test(formData.phone)) {
          setError('বৈধ মোবাইল নম্বর প্রয়োজন (১১ সংখ্যার)');
          return false;
        }
        if (!formData.dateOfBirth) {
          setError('জন্ম তারিখ প্রয়োজন');
          return false;
        }
        break;
      case 2:
        if (formData.role === 'student') {
          if (!formData.grade) {
            setError('শ্রেণী নির্বাচন করুন');
            return false;
          }
          if (!formData.school.trim()) {
            setError('স্কুলের নাম প্রয়োজন');
            return false;
          }
          if (!formData.district) {
            setError('জেলা নির্বাচন করুন');
            return false;
          }
        } else if (formData.role === 'teacher') {
          if (!formData.subjects?.trim()) {
            setError('বিষয়সমূহ প্রয়োজন');
            return false;
          }
          if (!formData.school.trim()) {
            setError('স্কুলের নাম প্রয়োজন');
            return false;
          }
          if (!formData.district) {
            setError('জেলা নির্বাচন করুন');
            return false;
          }
        } else if (formData.role === 'parent') {
          if (!formData.childName?.trim()) {
            setError('সন্তানের নাম প্রয়োজন');
            return false;
          }
          if (!formData.childGrade) {
            setError('সন্তানের শ্রেণী নির্বাচন করুন');
            return false;
          }
          if (!formData.district) {
            setError('জেলা নির্বাচন করুন');
            return false;
          }
        }
        break;
      case 3:
        if (!isPasswordValid()) {
          setError('পাসওয়ার্ড সকল শর্ত পূরণ করতে হবে');
          return false;
        }
        if (formData.password !== formData.confirmPassword) {
          setError('পাসওয়ার্ড মিলছে না');
          return false;
        }
        if (!formData.agreeToTerms) {
          setError('শর্তাবলী গ্রহণ করতে হবে');
          return false;
        }
        break;
    }
    return true;
  };

  const nextStep = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => Math.min(prev + 1, 3));
    }
  };

  const prevStep = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateStep(3)) return;

    setLoading(true);
    setError('');

    try {
      // Import the API client
      const { authAPI } = await import('../services/apiClient');
      
      // Prepare registration data for backend API
      const registrationData = {
        email: formData.email,
        password: formData.password,
        full_name: formData.fullName,
        phone: formData.phone,
        date_of_birth: formData.dateOfBirth,
        school: formData.school,
        district: formData.district,
        grade: formData.role === 'student' ? parseInt(formData.grade) : (formData.role === 'parent' ? parseInt(formData.childGrade || '0') : undefined),
        medium: formData.medium,
        role: formData.role
      };

      // Call the registration API
      await authAPI.register(registrationData);
      
      console.log('Registration successful:', registrationData);
      navigate('/login', { 
        state: { message: 'অ্যাকাউন্ট সফলভাবে তৈরি হয়েছে! এখন লগ ইন করুন।' }
      });
    } catch (err: any) {
      console.error('Registration error:', err);
      setError(err.message || 'অ্যাকাউন্ট তৈরিতে সমস্যা হয়েছে। আবার চেষ্টা করুন।');
    } finally {
      setLoading(false);
    }
  };

  const handleSocialSignUp = (provider: string) => {
    console.log(`Sign up with ${provider}`);
    // Implement social sign-up logic here
  };

  // Progress bar calculation
  const progressPercentage = (currentStep / 3) * 100;

  return (
    <div className="min-h-screen flex">
      {/* Left Side - Sign Up Form */}
      <motion.div 
        className="flex-1 flex items-center justify-center p-8 bg-white lg:max-w-2xl xl:max-w-3xl"
        initial={{ opacity: 0, x: -50 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
      >
        <div className="w-full max-w-2xl space-y-8">
          {/* Branding */}
          <motion.div 
            className="text-center"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <div className="flex items-center justify-center gap-3 mb-6">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
                <span className="text-white font-bold text-lg">শ</span>
              </div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent font-['Hind_Siliguri']">
                শিক্ষাসাথী
              </h1>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 font-['Hind_Siliguri']">
              নতুন অ্যাকাউন্ট তৈরি করুন
            </h2>
            <p className="mt-2 text-gray-600 font-['Hind_Siliguri']">
              আপনার শিক্ষার যাত্রা শুরু করুন
            </p>
          </motion.div>

          {/* Progress Bar */}
          <motion.div 
            className="w-full"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.4 }}
          >
            <div className="flex items-center justify-between mb-4">
              {[1, 2, 3].map((step) => (
                <div key={step} className="flex items-center">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm transition-all duration-300 ${
                    step <= currentStep 
                      ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg' 
                      : 'bg-gray-200 text-gray-500'
                  }`}>
                    {step < currentStep ? <Check className="w-5 h-5" /> : step}
                  </div>
                  {step < 3 && (
                    <div className={`w-16 h-1 mx-2 rounded-full transition-all duration-300 ${
                      step < currentStep ? 'bg-gradient-to-r from-blue-500 to-purple-600' : 'bg-gray-200'
                    }`} />
                  )}
                </div>
              ))}
            </div>
            <div className="bg-gray-200 rounded-full h-2 overflow-hidden">
              <motion.div 
                className="h-full bg-gradient-to-r from-blue-500 to-purple-600 rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${progressPercentage}%` }}
                transition={{ duration: 0.5, ease: "easeOut" }}
              />
            </div>
            <div className="flex justify-between text-xs text-gray-500 mt-2 font-['Hind_Siliguri']">
              <span>মৌলিক তথ্য ও ভূমিকা</span>
              <span>{formData.role === 'student' ? 'শিক্ষার্থী বিবরণ' : formData.role === 'teacher' ? 'শিক্ষক বিবরণ' : 'অভিভাবক বিবরণ'}</span>
              <span>নিরাপত্তা</span>
            </div>
          </motion.div>

          {/* Error Message */}
          <AnimatePresence>
            {error && (
              <motion.div 
                className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm flex items-center gap-2 font-['Hind_Siliguri']"
                initial={{ opacity: 0, scale: 0.95, y: -10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: -10 }}
                transition={{ duration: 0.3 }}
              >
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                {error}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Multi-Step Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            <AnimatePresence mode="wait">
              {/* Step 1: Basic Information */}
              {currentStep === 1 && (
                <motion.div
                  key="step1"
                  initial={{ opacity: 0, x: 50 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -50 }}
                  transition={{ duration: 0.4 }}
                  className="space-y-6"
                >
                  <div className="text-center mb-6">
                    <h3 className="text-xl font-bold text-gray-900 font-['Hind_Siliguri']">মৌলিক তথ্য ও ভূমিকা</h3>
                    <p className="text-gray-600 font-['Hind_Siliguri']">আপনার ব্যক্তিগত তথ্য ও ভূমিকা নির্বাচন করুন</p>
                  </div>

                  {/* Role Selection */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-4 font-['Hind_Siliguri']">
                      আপনার ভূমিকা নির্বাচন করুন
                    </label>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                      {[
                        { 
                          value: 'student', 
                          label: 'শিক্ষার্থী', 
                          icon: '🎓', 
                          description: 'আমি একজন শিক্ষার্থী',
                          color: 'from-blue-500 to-cyan-500'
                        },
                        { 
                          value: 'teacher', 
                          label: 'শিক্ষক', 
                          icon: '👨‍🏫', 
                          description: 'আমি একজন শিক্ষক',
                          color: 'from-green-500 to-emerald-500'
                        },
                        { 
                          value: 'parent', 
                          label: 'অভিভাবক', 
                          icon: '👨‍👩‍👧‍👦', 
                          description: 'আমি একজন অভিভাবক',
                          color: 'from-purple-500 to-pink-500'
                        }
                      ].map((role) => (
                        <motion.button
                          key={role.value}
                          type="button"
                          onClick={() => setFormData(prev => ({ ...prev, role: role.value as 'student' | 'teacher' | 'parent' }))}
                          className={`relative p-6 rounded-xl text-center font-bold transition-all duration-300 ${
                            formData.role === role.value
                              ? `bg-gradient-to-r ${role.color} text-white shadow-lg scale-105`
                              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          }`}
                          whileHover={{ scale: formData.role === role.value ? 1.05 : 1.02 }}
                          whileTap={{ scale: 0.98 }}
                        >
                          <div className="text-3xl mb-2">{role.icon}</div>
                          <div className="font-['Hind_Siliguri'] text-lg font-bold">{role.label}</div>
                          <div className="font-['Hind_Siliguri'] text-sm opacity-80">{role.description}</div>
                          {formData.role === role.value && (
                            <motion.div
                              className="absolute -top-2 -right-2 w-6 h-6 bg-white rounded-full flex items-center justify-center shadow-lg"
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                              transition={{ duration: 0.2 }}
                            >
                              <CheckCircle className="w-4 h-4 text-green-500" />
                            </motion.div>
                          )}
                        </motion.button>
                      ))}
                    </div>
                  </div>

                  {/* Full Name */}
                  <div>
                    <label htmlFor="fullName" className="block text-sm font-medium text-gray-700 mb-2 font-['Hind_Siliguri']">
                      পূর্ণ নাম
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <User className="h-5 w-5 text-gray-400" />
                      </div>
                      <input
                        id="fullName"
                        name="fullName"
                        type="text"
                        required
                        value={formData.fullName}
                        onChange={handleChange}
                        className="appearance-none relative block w-full pl-10 pr-3 py-3 border border-gray-300 placeholder-gray-400 text-gray-900 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all font-['Hind_Siliguri']"
                        placeholder="আপনার পূর্ণ নাম লিখুন"
                      />
                    </div>
                  </div>

                  {/* Email */}
                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2 font-['Hind_Siliguri']">
                      ইমেইল ঠিকানা
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Mail className="h-5 w-5 text-gray-400" />
                      </div>
                      <input
                        id="email"
                        name="email"
                        type="email"
                        required
                        value={formData.email}
                        onChange={handleChange}
                        className="appearance-none relative block w-full pl-10 pr-3 py-3 border border-gray-300 placeholder-gray-400 text-gray-900 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all font-['Hind_Siliguri']"
                        placeholder="আপনার ইমেইল ঠিকানা"
                      />
                    </div>
                  </div>

                  {/* Phone and Date of Birth - Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Phone */}
                    <div>
                      <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-2 font-['Hind_Siliguri']">
                        মোবাইল নম্বর
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <Phone className="h-5 w-5 text-gray-400" />
                        </div>
                        <input
                          id="phone"
                          name="phone"
                          type="tel"
                          required
                          value={formData.phone}
                          onChange={handleChange}
                          className="appearance-none relative block w-full pl-10 pr-3 py-3 border border-gray-300 placeholder-gray-400 text-gray-900 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                          placeholder="01XXXXXXXXX"
                        />
                      </div>
                    </div>

                    {/* Date of Birth */}
                    <div>
                      <label htmlFor="dateOfBirth" className="block text-sm font-medium text-gray-700 mb-2 font-['Hind_Siliguri']">
                        জন্ম তারিখ
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <Calendar className="h-5 w-5 text-gray-400" />
                        </div>
                        <input
                          id="dateOfBirth"
                          name="dateOfBirth"
                          type="date"
                          required
                          value={formData.dateOfBirth}
                          onChange={handleChange}
                          className="appearance-none relative block w-full pl-10 pr-3 py-3 border border-gray-300 placeholder-gray-400 text-gray-900 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                        />
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Step 2: Role-specific Details */}
              {currentStep === 2 && (
                <motion.div
                  key="step2"
                  initial={{ opacity: 0, x: 50 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -50 }}
                  transition={{ duration: 0.4 }}
                  className="space-y-6"
                >
                  <div className="text-center mb-6">
                    <h3 className="text-xl font-bold text-gray-900 font-['Hind_Siliguri']">
                      {formData.role === 'student' ? 'শিক্ষার্থী বিবরণ' : 
                       formData.role === 'teacher' ? 'শিক্ষক বিবরণ' : 'অভিভাবক বিবরণ'}
                    </h3>
                    <p className="text-gray-600 font-['Hind_Siliguri']">
                      {formData.role === 'student' ? 'আপনার শিক্ষা সংক্রান্ত তথ্য প্রদান করুন' : 
                       formData.role === 'teacher' ? 'আপনার শিক্ষকতা সংক্রান্ত তথ্য প্রদান করুন' : 
                       'আপনার সন্তানের তথ্য প্রদান করুন'}
                    </p>
                  </div>

                  {/* Student Form */}
                  {formData.role === 'student' && (
                    <>
                      {/* Grade Selection with Colorful Pills */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-4 font-['Hind_Siliguri']">
                          শ্রেণী নির্বাচন করুন
                        </label>
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                          {gradeOptions.map((grade) => (
                            <motion.button
                              key={grade.value}
                              type="button"
                              onClick={() => setFormData(prev => ({ ...prev, grade: grade.value }))}
                              className={`relative p-4 rounded-xl text-center font-bold text-sm transition-all duration-300 ${
                                formData.grade === grade.value
                                  ? `bg-gradient-to-r ${grade.color} text-white shadow-lg scale-105`
                                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                              }`}
                              whileHover={{ scale: formData.grade === grade.value ? 1.05 : 1.02 }}
                              whileTap={{ scale: 0.98 }}
                            >
                              <span className="font-['Hind_Siliguri']">{grade.label}</span>
                              {formData.grade === grade.value && (
                                <motion.div
                                  className="absolute -top-2 -right-2 w-6 h-6 bg-white rounded-full flex items-center justify-center shadow-lg"
                                  initial={{ scale: 0 }}
                                  animate={{ scale: 1 }}
                                  transition={{ duration: 0.2 }}
                                >
                                  <CheckCircle className="w-4 h-4 text-green-500" />
                                </motion.div>
                              )}
                            </motion.button>
                          ))}
                        </div>
                      </div>

                      {/* Medium Selection */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-3 font-['Hind_Siliguri']">
                          শিক্ষার মাধ্যম
                        </label>
                        <div className="grid grid-cols-2 gap-4">
                          <motion.button
                            type="button"
                            onClick={() => setFormData(prev => ({ ...prev, medium: 'bangla' }))}
                            className={`p-4 rounded-xl border-2 text-center font-bold transition-all duration-300 ${
                              formData.medium === 'bangla'
                                ? 'border-blue-500 bg-blue-50 text-blue-700'
                                : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400'
                            }`}
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                          >
                            <span className="font-['Hind_Siliguri']">বাংলা মাধ্যম</span>
                          </motion.button>
                          <motion.button
                            type="button"
                            onClick={() => setFormData(prev => ({ ...prev, medium: 'english' }))}
                            className={`p-4 rounded-xl border-2 text-center font-bold transition-all duration-300 ${
                              formData.medium === 'english'
                                ? 'border-purple-500 bg-purple-50 text-purple-700'
                                : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400'
                            }`}
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                          >
                            <span className="font-['Hind_Siliguri']">ইংরেজি মাধ্যম</span>
                          </motion.button>
                        </div>
                      </div>
                    </>
                  )}

                  {/* Teacher Form */}
                  {formData.role === 'teacher' && (
                    <>
                      {/* Subjects */}
                      <div>
                        <label htmlFor="subjects" className="block text-sm font-medium text-gray-700 mb-2 font-['Hind_Siliguri']">
                          শিক্ষাদানের বিষয়সমূহ
                        </label>
                        <input
                          id="subjects"
                          name="subjects"
                          type="text"
                          required
                          value={formData.subjects || ''}
                          onChange={handleChange}
                          className="appearance-none relative block w-full px-3 py-3 border border-gray-300 placeholder-gray-400 text-gray-900 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all font-['Hind_Siliguri']"
                          placeholder="যেমন: গণিত, পদার্থবিজ্ঞান, রসায়ন"
                        />
                      </div>

                      {/* Experience */}
                      <div>
                        <label htmlFor="experience" className="block text-sm font-medium text-gray-700 mb-2 font-['Hind_Siliguri']">
                          শিক্ষকতার অভিজ্ঞতা (বছর)
                        </label>
                        <select
                          id="experience"
                          name="experience"
                          value={formData.experience || ''}
                          onChange={handleChange}
                          className="appearance-none relative block w-full px-3 py-3 border border-gray-300 text-gray-900 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all font-['Hind_Siliguri']"
                        >
                          <option value="">অভিজ্ঞতা নির্বাচন করুন</option>
                          <option value="0-1">০-১ বছর</option>
                          <option value="2-5">২-৫ বছর</option>
                          <option value="6-10">৬-১০ বছর</option>
                          <option value="11-15">১১-১৫ বছর</option>
                          <option value="15+">১৫+ বছর</option>
                        </select>
                      </div>
                    </>
                  )}

                  {/* Parent Form */}
                  {formData.role === 'parent' && (
                    <>
                      {/* Child Name */}
                      <div>
                        <label htmlFor="childName" className="block text-sm font-medium text-gray-700 mb-2 font-['Hind_Siliguri']">
                          সন্তানের নাম
                        </label>
                        <input
                          id="childName"
                          name="childName"
                          type="text"
                          required
                          value={formData.childName || ''}
                          onChange={handleChange}
                          className="appearance-none relative block w-full px-3 py-3 border border-gray-300 placeholder-gray-400 text-gray-900 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all font-['Hind_Siliguri']"
                          placeholder="আপনার সন্তানের নাম"
                        />
                      </div>

                      {/* Child Grade */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-4 font-['Hind_Siliguri']">
                          সন্তানের শ্রেণী
                        </label>
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                          {gradeOptions.map((grade) => (
                            <motion.button
                              key={grade.value}
                              type="button"
                              onClick={() => setFormData(prev => ({ ...prev, childGrade: grade.value }))}
                              className={`relative p-4 rounded-xl text-center font-bold text-sm transition-all duration-300 ${
                                formData.childGrade === grade.value
                                  ? `bg-gradient-to-r ${grade.color} text-white shadow-lg scale-105`
                                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                              }`}
                              whileHover={{ scale: formData.childGrade === grade.value ? 1.05 : 1.02 }}
                              whileTap={{ scale: 0.98 }}
                            >
                              <span className="font-['Hind_Siliguri']">{grade.label}</span>
                              {formData.childGrade === grade.value && (
                                <motion.div
                                  className="absolute -top-2 -right-2 w-6 h-6 bg-white rounded-full flex items-center justify-center shadow-lg"
                                  initial={{ scale: 0 }}
                                  animate={{ scale: 1 }}
                                  transition={{ duration: 0.2 }}
                                >
                                  <CheckCircle className="w-4 h-4 text-green-500" />
                                </motion.div>
                              )}
                            </motion.button>
                          ))}
                        </div>
                      </div>
                    </>
                  )}

                  {/* Common Fields for All Roles */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* School (for students and teachers) or District (for parents) */}
                    {(formData.role === 'student' || formData.role === 'teacher') && (
                      <div>
                        <label htmlFor="school" className="block text-sm font-medium text-gray-700 mb-2 font-['Hind_Siliguri']">
                          স্কুলের নাম
                        </label>
                        <input
                          id="school"
                          name="school"
                          type="text"
                          required
                          value={formData.school}
                          onChange={handleChange}
                          className="appearance-none relative block w-full px-3 py-3 border border-gray-300 placeholder-gray-400 text-gray-900 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all font-['Hind_Siliguri']"
                          placeholder="আপনার স্কুলের নাম"
                        />
                      </div>
                    )}

                    {/* District */}
                    <div className={formData.role === 'parent' ? 'md:col-span-2' : ''}>
                      <label htmlFor="district" className="block text-sm font-medium text-gray-700 mb-2 font-['Hind_Siliguri']">
                        জেলা
                      </label>
                      <select
                        id="district"
                        name="district"
                        required
                        value={formData.district}
                        onChange={handleChange}
                        className="appearance-none relative block w-full px-3 py-3 border border-gray-300 text-gray-900 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all font-['Hind_Siliguri']"
                      >
                        <option value="">জেলা নির্বাচন করুন</option>
                        {districts.map((district) => (
                          <option key={district} value={district}>
                            {district}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Step 3: Security */}
              {currentStep === 3 && (
                <motion.div
                  key="step3"
                  initial={{ opacity: 0, x: 50 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -50 }}
                  transition={{ duration: 0.4 }}
                  className="space-y-6"
                >
                  <div className="text-center mb-6">
                    <h3 className="text-xl font-bold text-gray-900 font-['Hind_Siliguri']">নিরাপত্তা</h3>
                    <p className="text-gray-600 font-['Hind_Siliguri']">একটি শক্তিশালী পাসওয়ার্ড তৈরি করুন</p>
                  </div>

                  {/* Password */}
                  <div>
                    <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2 font-['Hind_Siliguri']">
                      পাসওয়ার্ড
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Lock className="h-5 w-5 text-gray-400" />
                      </div>
                      <input
                        id="password"
                        name="password"
                        type={showPassword ? "text" : "password"}
                        required
                        value={formData.password}
                        onChange={handleChange}
                        className="appearance-none relative block w-full pl-10 pr-12 py-3 border border-gray-300 placeholder-gray-400 text-gray-900 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                        placeholder="শক্তিশালী পাসওয়ার্ড তৈরি করুন"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 transition-colors"
                      >
                        {showPassword ? (
                          <EyeOff className="h-5 w-5" />
                        ) : (
                          <Eye className="h-5 w-5" />
                        )}
                      </button>
                    </div>

                    {/* Real-time Password Validation */}
                    {formData.password && (
                      <motion.div 
                        className="mt-3 p-4 bg-gray-50 rounded-xl"
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        transition={{ duration: 0.3 }}
                      >
                        <p className="text-sm font-medium text-gray-700 mb-2 font-['Hind_Siliguri']">পাসওয়ার্ড শর্তাবলী:</p>
                        <div className="space-y-1">
                          {[
                            { key: 'minLength', label: 'কমপক্ষে ৮ অক্ষর' },
                            { key: 'hasUppercase', label: 'একটি বড় হাতের অক্ষর (A-Z)' },
                            { key: 'hasLowercase', label: 'একটি ছোট হাতের অক্ষর (a-z)' },
                            { key: 'hasNumber', label: 'একটি সংখ্যা (0-9)' },
                            { key: 'hasSpecialChar', label: 'একটি বিশেষ চিহ্ন (!@#$...)' }
                          ].map(({ key, label }) => (
                            <div key={key} className="flex items-center gap-2">
                              <div className={`w-4 h-4 rounded-full flex items-center justify-center ${
                                passwordValidation[key as keyof PasswordValidation] 
                                  ? 'bg-green-500' 
                                  : 'bg-gray-300'
                              }`}>
                                {passwordValidation[key as keyof PasswordValidation] && (
                                  <Check className="w-3 h-3 text-white" />
                                )}
                              </div>
                              <span className={`text-xs font-['Hind_Siliguri'] ${
                                passwordValidation[key as keyof PasswordValidation] 
                                  ? 'text-green-700' 
                                  : 'text-gray-600'
                              }`}>
                                {label}
                              </span>
                            </div>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </div>

                  {/* Confirm Password */}
                  <div>
                    <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-2 font-['Hind_Siliguri']">
                      পাসওয়ার্ড নিশ্চিত করুন
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Lock className="h-5 w-5 text-gray-400" />
                      </div>
                      <input
                        id="confirmPassword"
                        name="confirmPassword"
                        type={showConfirmPassword ? "text" : "password"}
                        required
                        value={formData.confirmPassword}
                        onChange={handleChange}
                        className={`appearance-none relative block w-full pl-10 pr-12 py-3 border placeholder-gray-400 text-gray-900 rounded-xl focus:outline-none focus:ring-2 transition-all ${
                          formData.confirmPassword && formData.password !== formData.confirmPassword
                            ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
                            : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'
                        }`}
                        placeholder="পাসওয়ার্ড পুনরায় লিখুন"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 transition-colors"
                      >
                        {showConfirmPassword ? (
                          <EyeOff className="h-5 w-5" />
                        ) : (
                          <Eye className="h-5 w-5" />
                        )}
                      </button>
                    </div>
                    {formData.confirmPassword && formData.password !== formData.confirmPassword && (
                      <p className="mt-1 text-sm text-red-600 font-['Hind_Siliguri']">
                        পাসওয়ার্ড মিলছে না
                      </p>
                    )}
                  </div>

                  {/* Terms and Conditions */}
                  <div className="flex items-start gap-3">
                    <input
                      id="agreeToTerms"
                      name="agreeToTerms"
                      type="checkbox"
                      checked={formData.agreeToTerms}
                      onChange={handleChange}
                      className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <label htmlFor="agreeToTerms" className="text-sm text-gray-700 font-['Hind_Siliguri']">
                      আমি{' '}
                      <button
                        type="button"
                        className="text-blue-600 hover:text-blue-500 font-medium underline"
                      >
                        শর্তাবলী
                      </button>
                      {' '}এবং{' '}
                      <button
                        type="button"
                        className="text-blue-600 hover:text-blue-500 font-medium underline"
                      >
                        গোপনীয়তা নীতি
                      </button>
                      {' '}গ্রহণ করছি
                    </label>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Navigation Buttons */}
            <div className="flex justify-between pt-6">
              {currentStep > 1 ? (
                <motion.button
                  type="button"
                  onClick={prevStep}
                  className="flex items-center gap-2 px-6 py-3 text-gray-600 hover:text-gray-800 font-medium rounded-xl hover:bg-gray-100 transition-all font-['Hind_Siliguri']"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <ArrowLeft className="w-4 h-4" />
                  পূর্ববর্তী
                </motion.button>
              ) : (
                <div></div>
              )}

              {currentStep < 3 ? (
                <motion.button
                  type="button"
                  onClick={nextStep}
                  className="flex items-center gap-2 px-8 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-bold rounded-xl transition-all shadow-lg hover:shadow-xl font-['Hind_Siliguri']"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  পরবর্তী
                  <ArrowRight className="w-4 h-4" />
                </motion.button>
              ) : (
                <motion.button
                  type="submit"
                  disabled={loading}
                  className="flex items-center gap-2 px-8 py-3 bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 text-white font-bold rounded-xl transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed font-['Hind_Siliguri']"
                  whileHover={{ scale: loading ? 1 : 1.02 }}
                  whileTap={{ scale: loading ? 1 : 0.98 }}
                >
                  {loading ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      অ্যাকাউন্ট তৈরি হচ্ছে...
                    </>
                  ) : (
                    <>
                      অ্যাকাউন্ট তৈরি করুন
                      <CheckCircle className="w-4 h-4" />
                    </>
                  )}
                </motion.button>
              )}
            </div>
          </form>

          {/* Social Sign-up (only on first step) */}
          {currentStep === 1 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.8 }}
            >
              {/* Divider */}
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-300"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-white text-gray-500 font-['Hind_Siliguri']">অথবা</span>
                </div>
              </div>

              {/* Social Sign-up Buttons */}
              <div className="grid grid-cols-2 gap-3 mt-6">
                <motion.button
                  type="button"
                  onClick={() => handleSocialSignUp('google')}
                  className="w-full inline-flex justify-center items-center gap-2 py-3 px-4 border border-gray-300 rounded-xl bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all shadow-sm hover:shadow-md font-['Hind_Siliguri']"
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
                  onClick={() => handleSocialSignUp('facebook')}
                  className="w-full inline-flex justify-center items-center gap-2 py-3 px-4 border border-gray-300 rounded-xl bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all shadow-sm hover:shadow-md font-['Hind_Siliguri']"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <svg className="w-5 h-5" fill="#1877F2" viewBox="0 0 24 24">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                  </svg>
                  Facebook
                </motion.button>
              </div>
            </motion.div>
          )}

          {/* Login Link */}
          <motion.div 
            className="text-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 1.0 }}
          >
            <p className="text-sm text-gray-600 font-['Hind_Siliguri']">
              ইতিমধ্যে অ্যাকাউন্ট আছে?{' '}
              <button
                onClick={() => navigate('/login')}
                className="font-medium text-blue-600 hover:text-blue-500 transition-colors"
              >
                লগ ইন করুন
              </button>
            </p>
          </motion.div>
        </div>
      </motion.div>

      {/* Right Side - Visual */}
      <motion.div 
        className="hidden lg:flex flex-1 relative"
        initial={{ opacity: 0, x: 50 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.8, ease: "easeOut", delay: 0.2 }}
      >
        {/* Background Image */}
        <img
          src="https://images.unsplash.com/photo-1523240795612-9a054b0db644?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1470&q=80"
          alt="Students collaborating and learning"
          className="absolute inset-0 w-full h-full object-cover"
        />
        
        {/* Colorful Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-600/30 via-purple-600/40 to-pink-600/30"></div>
        
        {/* Content Overlay */}
        <div className="relative z-10 flex items-center justify-center p-12">
          <motion.div 
            className="text-center text-white max-w-lg"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.6 }}
          >
            <h3 className="text-5xl font-bold mb-6 font-['Hind_Siliguri']">
              আপনার স্বপ্নের শিক্ষা
            </h3>
            <p className="text-xl leading-relaxed mb-8 font-['Hind_Siliguri']">
              কৃত্রিম বুদ্ধিমত্তার সাহায্যে ব্যক্তিগতকৃত শিক্ষার অভিজ্ঞতা পান
            </p>
            
            {/* Feature Highlights */}
            <div className="space-y-4">
              {[
                { icon: '🤖', text: 'AI চালিত ব্যক্তিগত টিউটর' },
                { icon: '📊', text: 'রিয়েল-টাইম অগ্রগতি ট্র্যাকিং' },
                { icon: '🎯', text: 'অভিযোজিত শিক্ষা পদ্ধতি' },
                { icon: '🏆', text: 'গেমিফিকেশন ও পুরস্কার' }
              ].map((feature, index) => (
                <motion.div
                  key={index}
                  className="flex items-center gap-4 bg-white/20 backdrop-blur-md rounded-2xl p-4"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.5, delay: 0.8 + index * 0.1 }}
                >
                  <span className="text-2xl">{feature.icon}</span>
                  <span className="font-medium font-['Hind_Siliguri']">{feature.text}</span>
                </motion.div>
              ))}
            </div>
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

export default SignUpPage;