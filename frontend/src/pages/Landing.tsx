import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import Hero from '../components/common/Hero';

const Landing = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 relative overflow-hidden">
      {/* Soft Background Blobs */}
      <div className="absolute top-20 left-10 w-96 h-96 bg-blue-200 rounded-full blur-3xl opacity-30 -z-10"></div>
      <div className="absolute top-40 right-20 w-80 h-80 bg-pink-200 rounded-full blur-3xl opacity-40 -z-10"></div>
      <div className="absolute bottom-20 left-1/3 w-72 h-72 bg-purple-200 rounded-full blur-3xl opacity-35 -z-10"></div>

      {/* Hero Section */}
      <Hero />

      {/* Features Section */}
      <section id="features" className="py-24 bg-gradient-to-br from-blue-50/50 via-purple-50/50 to-pink-50/50 relative">
        {/* Additional background blobs */}
        <div className="absolute top-10 right-1/4 w-64 h-64 bg-orange-200 rounded-full blur-3xl opacity-20 -z-10"></div>
        <div className="absolute bottom-20 left-1/4 w-80 h-80 bg-green-200 rounded-full blur-3xl opacity-25 -z-10"></div>
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div 
            className="text-center mb-20"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
          >
            <span className="inline-block px-6 py-3 bg-gray-900 text-white rounded-full text-sm font-bold mb-6 shadow-lg">
              প্ল্যাটফর্ম বৈশিষ্ট্য
            </span>
            <h2 className="text-5xl font-bold text-gray-900 mb-6 font-['Hind_Siliguri']">
              কেন শিক্ষাসাথী?
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              আধুনিক প্রযুক্তি এবং শিক্ষাবিজ্ঞানের সমন্বয়ে তৈরি শেখার অভিজ্ঞতা
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* AI Tutor */}
            <motion.div 
              className="group bg-white/80 backdrop-blur-md rounded-2xl p-8 border border-white/50 shadow-lg hover:shadow-xl transition-all"
              whileHover={{ scale: 1.05, y: -5 }}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              viewport={{ once: true }}
            >
              <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform shadow-lg">
                <svg className="w-9 h-9 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-3 font-['Hind_Siliguri']">AI টিউটর</h3>
              <p className="text-gray-600 mb-6 leading-relaxed">
                ২৪/৭ উপলব্ধ AI টিউটর যা আপনার প্রশ্নের তাৎক্ষণিক উত্তর দেয় এবং ভয়েস সাপোর্ট প্রদান করে
              </p>
              <ul className="space-y-3 text-sm text-gray-700">
                <li className="flex items-center gap-3">
                  <span className="flex-shrink-0 w-5 h-5 bg-blue-500 text-white rounded-full flex items-center justify-center text-xs font-bold">✓</span>
                  <span>তাৎক্ষণিক সাহায্য</span>
                </li>
                <li className="flex items-center gap-3">
                  <span className="flex-shrink-0 w-5 h-5 bg-blue-500 text-white rounded-full flex items-center justify-center text-xs font-bold">✓</span>
                  <span>ভয়েস সাপোর্ট</span>
                </li>
                <li className="flex items-center gap-3">
                  <span className="flex-shrink-0 w-5 h-5 bg-blue-500 text-white rounded-full flex items-center justify-center text-xs font-bold">✓</span>
                  <span>বাংলা ও ইংরেজি</span>
                </li>
              </ul>
            </motion.div>

            {/* Adaptive Assessments */}
            <motion.div 
              className="group bg-cyan-50/80 backdrop-blur-md rounded-2xl p-8 border border-white/50 shadow-lg hover:shadow-xl transition-all"
              whileHover={{ scale: 1.05, y: -5 }}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              viewport={{ once: true }}
            >
              <div className="w-16 h-16 bg-gradient-to-br from-cyan-500 to-teal-500 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform shadow-lg">
                <svg className="w-9 h-9 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                </svg>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-3 font-['Hind_Siliguri']">অভিযোজিত মূল্যায়ন</h3>
              <p className="text-gray-600 mb-6 leading-relaxed">
                আপনার দক্ষতা অনুযায়ী স্বয়ংক্রিয়ভাবে সমন্বয়কৃত কুইজ এবং পরীক্ষা
              </p>
              <ul className="space-y-3 text-sm text-gray-700">
                <li className="flex items-center gap-3">
                  <span className="flex-shrink-0 w-5 h-5 bg-cyan-500 text-white rounded-full flex items-center justify-center text-xs">✓</span>
                  <span>ব্যক্তিগত কঠিনতা</span>
                </li>
                <li className="flex items-center gap-3">
                  <span className="flex-shrink-0 w-5 h-5 bg-cyan-500 text-white rounded-full flex items-center justify-center text-xs">✓</span>
                  <span>তাৎক্ষণিক ফিডব্যাক</span>
                </li>
                <li className="flex items-center gap-3">
                  <span className="flex-shrink-0 w-5 h-5 bg-cyan-500 text-white rounded-full flex items-center justify-center text-xs">✓</span>
                  <span>অগ্রগতি ট্র্যাকিং</span>
                </li>
              </ul>
            </motion.div>

            {/* Offline Access */}
            <motion.div 
              className="group bg-green-50/80 backdrop-blur-md rounded-2xl p-8 border border-white/50 shadow-lg hover:shadow-xl transition-all"
              whileHover={{ scale: 1.05, y: -5 }}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              viewport={{ once: true }}
            >
              <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-emerald-500 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform shadow-lg">
                <svg className="w-9 h-9 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                </svg>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-3">অফলাইন অ্যাক্সেস</h3>
              <p className="text-gray-600 mb-6 leading-relaxed">
                ইন্টারনেট ছাড়াই শিখুন। সব কন্টেন্ট অফলাইনে উপলব্ধ
              </p>
              <ul className="space-y-3 text-sm text-gray-700">
                <li className="flex items-center gap-3">
                  <span className="flex-shrink-0 w-5 h-5 bg-green-500 text-white rounded-full flex items-center justify-center text-xs">✓</span>
                  <span>PWA প্রযুক্তি</span>
                </li>
                <li className="flex items-center gap-3">
                  <span className="flex-shrink-0 w-5 h-5 bg-green-500 text-white rounded-full flex items-center justify-center text-xs">✓</span>
                  <span>স্বয়ংক্রিয় সিঙ্ক</span>
                </li>
                <li className="flex items-center gap-3">
                  <span className="flex-shrink-0 w-5 h-5 bg-green-500 text-white rounded-full flex items-center justify-center text-xs">✓</span>
                  <span>কম ডেটা ব্যবহার</span>
                </li>
              </ul>
            </motion.div>

            {/* Gamification */}
            <motion.div 
              className="group bg-purple-50/80 backdrop-blur-md rounded-2xl p-8 border border-white/50 shadow-lg hover:shadow-xl transition-all"
              whileHover={{ scale: 1.05, y: -5 }}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.4 }}
              viewport={{ once: true }}
            >
              <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-violet-500 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform shadow-lg">
                <svg className="w-9 h-9 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                </svg>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-3">গেমিফিকেশন</h3>
              <p className="text-gray-600 mb-6 leading-relaxed">
                XP, অর্জন, স্ট্রিক এবং লিডারবোর্ডের মাধ্যমে শেখা আরও মজাদার
              </p>
              <ul className="space-y-3 text-sm text-gray-700">
                <li className="flex items-center gap-3">
                  <span className="flex-shrink-0 w-5 h-5 bg-purple-500 text-white rounded-full flex items-center justify-center text-xs">✓</span>
                  <span>XP সিস্টেম</span>
                </li>
                <li className="flex items-center gap-3">
                  <span className="flex-shrink-0 w-5 h-5 bg-purple-500 text-white rounded-full flex items-center justify-center text-xs">✓</span>
                  <span>অর্জন ব্যাজ</span>
                </li>
                <li className="flex items-center gap-3">
                  <span className="flex-shrink-0 w-5 h-5 bg-purple-500 text-white rounded-full flex items-center justify-center text-xs">✓</span>
                  <span>লিডারবোর্ড</span>
                </li>
              </ul>
            </motion.div>

            {/* Teacher Tools */}
            <motion.div 
              className="group bg-orange-50/80 backdrop-blur-md rounded-2xl p-8 border border-white/50 shadow-lg hover:shadow-xl transition-all"
              whileHover={{ scale: 1.05, y: -5 }}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.5 }}
              viewport={{ once: true }}
            >
              <div className="w-16 h-16 bg-gradient-to-br from-orange-500 to-red-500 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform shadow-lg">
                <svg className="w-9 h-9 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-3">শিক্ষক সরঞ্জাম</h3>
              <p className="text-gray-600 mb-6 leading-relaxed">
                শিক্ষকদের জন্য বিস্তৃত বিশ্লেষণ এবং মূল্যায়ন তৈরির সরঞ্জাম
              </p>
              <ul className="space-y-3 text-sm text-gray-700">
                <li className="flex items-center gap-3">
                  <span className="flex-shrink-0 w-5 h-5 bg-orange-500 text-white rounded-full flex items-center justify-center text-xs">✓</span>
                  <span>বিশ্লেষণ ড্যাশবোর্ড</span>
                </li>
                <li className="flex items-center gap-3">
                  <span className="flex-shrink-0 w-5 h-5 bg-orange-500 text-white rounded-full flex items-center justify-center text-xs">✓</span>
                  <span>মূল্যায়ন তৈরি</span>
                </li>
                <li className="flex items-center gap-3">
                  <span className="flex-shrink-0 w-5 h-5 bg-orange-500 text-white rounded-full flex items-center justify-center text-xs">✓</span>
                  <span>ছাত্র ট্র্যাকিং</span>
                </li>
              </ul>
            </motion.div>

            {/* Parent Portal */}
            <motion.div 
              className="group bg-pink-50/80 backdrop-blur-md rounded-2xl p-8 border border-white/50 shadow-lg hover:shadow-xl transition-all"
              whileHover={{ scale: 1.05, y: -5 }}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.6 }}
              viewport={{ once: true }}
            >
              <div className="w-16 h-16 bg-gradient-to-br from-pink-500 to-rose-500 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform shadow-lg">
                <svg className="w-9 h-9 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-3">অভিভাবক পোর্টাল</h3>
              <p className="text-gray-600 mb-6 leading-relaxed">
                অভিভাবকদের জন্য সন্তানের অগ্রগতি ট্র্যাকিং এবং নোটিফিকেশন
              </p>
              <ul className="space-y-3 text-sm text-gray-700">
                <li className="flex items-center gap-3">
                  <span className="flex-shrink-0 w-5 h-5 bg-pink-500 text-white rounded-full flex items-center justify-center text-xs">✓</span>
                  <span>অগ্রগতি রিপোর্ট</span>
                </li>
                <li className="flex items-center gap-3">
                  <span className="flex-shrink-0 w-5 h-5 bg-pink-500 text-white rounded-full flex items-center justify-center text-xs">✓</span>
                  <span>নোটিফিকেশন</span>
                </li>
                <li className="flex items-center gap-3">
                  <span className="flex-shrink-0 w-5 h-5 bg-pink-500 text-white rounded-full flex items-center justify-center text-xs">✓</span>
                  <span>যোগাযোগ</span>
                </li>
              </ul>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Target Users Section - Bento Grid */}
      <section className="py-24 bg-gradient-to-br from-gray-50 via-blue-50/30 to-purple-50/30 relative">
        {/* Background decorations */}
        <div className="absolute top-1/4 left-10 w-48 h-48 bg-yellow-200 rounded-full blur-3xl opacity-20 -z-10"></div>
        <div className="absolute bottom-1/4 right-10 w-64 h-64 bg-indigo-200 rounded-full blur-3xl opacity-25 -z-10"></div>
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div 
            className="text-center mb-16"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
          >
            <h2 className="text-5xl font-bold text-gray-900 mb-4 font-['Hind_Siliguri']">
              কাদের জন্য?
            </h2>
            <p className="text-xl text-gray-600">
              শিক্ষার্থী, শিক্ষক এবং অভিভাবক - সবার জন্য
            </p>
          </motion.div>

          {/* Bento Grid Layout */}
          <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-6 gap-6 h-auto md:h-[600px]">
            {/* Student - Large Card */}
            <motion.div 
              className="md:col-span-2 lg:col-span-3 md:row-span-2 bg-white/90 backdrop-blur-md rounded-3xl p-8 border border-white/50 shadow-xl hover:shadow-2xl transition-all group relative overflow-hidden"
              whileHover={{ scale: 1.02, y: -5 }}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              viewport={{ once: true }}
            >
              {/* Background gradient */}
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 via-purple-500/10 to-pink-500/10 rounded-3xl"></div>
              
              <div className="relative z-10">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg">
                    <span className="text-3xl">🎓</span>
                  </div>
                  <div>
                    <h3 className="text-3xl font-bold text-gray-900 font-['Hind_Siliguri']">শিক্ষার্থী</h3>
                    <p className="text-blue-600 font-medium">৬ম থেকে ১২শ শ্রেণী</p>
                  </div>
                </div>
                
                <p className="text-gray-700 mb-6 text-lg leading-relaxed">
                  বাংলা ও ইংরেজি মাধ্যমের শিক্ষার্থীদের জন্য ব্যক্তিগত শেখার পথ, AI টিউটর সাহায্য, এবং গেমিফাইড অভিজ্ঞতা
                </p>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-blue-50/80 rounded-xl p-4">
                    <div className="text-2xl font-bold text-blue-600">10K+</div>
                    <div className="text-sm text-gray-600">সক্রিয় শিক্ষার্থী</div>
                  </div>
                  <div className="bg-purple-50/80 rounded-xl p-4">
                    <div className="text-2xl font-bold text-purple-600">95%</div>
                    <div className="text-sm text-gray-600">সন্তুষ্টির হার</div>
                  </div>
                </div>

                {/* Floating elements */}
                <div className="absolute top-4 right-4 opacity-20 group-hover:opacity-40 transition-opacity">
                  <div className="w-20 h-20 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center">
                    <span className="text-2xl">⭐</span>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Teacher - Medium Card */}
            <motion.div 
              className="md:col-span-2 lg:col-span-2 bg-white/90 backdrop-blur-md rounded-3xl p-6 border border-white/50 shadow-xl hover:shadow-2xl transition-all group relative overflow-hidden"
              whileHover={{ scale: 1.02, y: -5 }}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              viewport={{ once: true }}
            >
              {/* Background gradient */}
              <div className="absolute inset-0 bg-gradient-to-br from-orange-500/10 via-red-500/10 to-pink-500/10 rounded-3xl"></div>
              
              <div className="relative z-10">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-red-500 rounded-xl flex items-center justify-center shadow-lg">
                    <span className="text-2xl">👨‍🏫</span>
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 font-['Hind_Siliguri']">শিক্ষক</h3>
                </div>
                
                <p className="text-gray-700 mb-4 leading-relaxed">
                  মূল্যায়ন তৈরি, বিশ্লেষণ এবং শ্রেণীকক্ষ ব্যবস্থাপনার জন্য শক্তিশালী সরঞ্জাম
                </p>
                
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <span className="w-2 h-2 bg-orange-500 rounded-full"></span>
                    <span>বিশ্লেষণ ড্যাশবোর্ড</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <span className="w-2 h-2 bg-red-500 rounded-full"></span>
                    <span>স্বয়ংক্রিয় মূল্যায়ন</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <span className="w-2 h-2 bg-pink-500 rounded-full"></span>
                    <span>ছাত্র ট্র্যাকিং</span>
                  </div>
                </div>

                <div className="absolute -top-2 -right-2 opacity-20 group-hover:opacity-40 transition-opacity">
                  <div className="w-16 h-16 bg-gradient-to-br from-orange-400 to-red-500 rounded-full flex items-center justify-center">
                    <span className="text-xl">📊</span>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Parent - Medium Card */}
            <motion.div 
              className="md:col-span-2 lg:col-span-1 bg-white/90 backdrop-blur-md rounded-3xl p-6 border border-white/50 shadow-xl hover:shadow-2xl transition-all group relative overflow-hidden"
              whileHover={{ scale: 1.02, y: -5 }}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              viewport={{ once: true }}
            >
              {/* Background gradient */}
              <div className="absolute inset-0 bg-gradient-to-br from-green-500/10 via-teal-500/10 to-cyan-500/10 rounded-3xl"></div>
              
              <div className="relative z-10">
                <div className="flex flex-col items-center text-center">
                  <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-teal-500 rounded-2xl flex items-center justify-center shadow-lg mb-4">
                    <span className="text-3xl">👨‍👩‍👧</span>
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-3 font-['Hind_Siliguri']">অভিভাবক</h3>
                  
                  <p className="text-gray-700 mb-4 text-sm leading-relaxed">
                    সন্তানের অগ্রগতি পর্যবেক্ষণ এবং সম্পৃক্ততা ট্র্যাকিং
                  </p>
                  
                  <div className="bg-green-50/80 rounded-xl p-3 w-full">
                    <div className="text-lg font-bold text-green-600">500+</div>
                    <div className="text-xs text-gray-600">সক্রিয় অভিভাবক</div>
                  </div>
                </div>

                <div className="absolute -bottom-1 -right-1 opacity-20 group-hover:opacity-40 transition-opacity">
                  <div className="w-12 h-12 bg-gradient-to-br from-green-400 to-teal-500 rounded-full flex items-center justify-center">
                    <span className="text-lg">💚</span>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Stats Card */}
            <motion.div 
              className="md:col-span-2 lg:col-span-2 bg-gradient-to-br from-indigo-500/90 to-purple-600/90 backdrop-blur-md rounded-3xl p-6 border border-white/20 shadow-xl hover:shadow-2xl transition-all text-white relative overflow-hidden"
              whileHover={{ scale: 1.02, y: -5 }}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.4 }}
              viewport={{ once: true }}
            >
              <div className="relative z-10">
                <h3 className="text-2xl font-bold mb-6">প্ল্যাটফর্ম পরিসংখ্যান</h3>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-white/20 backdrop-blur-sm rounded-xl p-4">
                    <div className="text-2xl font-bold">50K+</div>
                    <div className="text-sm opacity-90">কুইজ সম্পন্ন</div>
                  </div>
                  <div className="bg-white/20 backdrop-blur-sm rounded-xl p-4">
                    <div className="text-2xl font-bold">98%</div>
                    <div className="text-sm opacity-90">আপটাইম</div>
                  </div>
                  <div className="bg-white/20 backdrop-blur-sm rounded-xl p-4">
                    <div className="text-2xl font-bold">24/7</div>
                    <div className="text-sm opacity-90">AI সাপোর্ট</div>
                  </div>
                  <div className="bg-white/20 backdrop-blur-sm rounded-xl p-4">
                    <div className="text-2xl font-bold">100%</div>
                    <div className="text-sm opacity-90">বিনামূল্যে</div>
                  </div>
                </div>
              </div>

              {/* Animated background elements */}
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl"></div>
              <div className="absolute bottom-0 left-0 w-24 h-24 bg-yellow-400/20 rounded-full blur-xl"></div>
            </motion.div>

            {/* Feature Highlight */}
            <motion.div 
              className="md:col-span-2 lg:col-span-1 bg-white/90 backdrop-blur-md rounded-3xl p-6 border border-white/50 shadow-xl hover:shadow-2xl transition-all group relative overflow-hidden"
              whileHover={{ scale: 1.02, y: -5 }}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.5 }}
              viewport={{ once: true }}
            >
              {/* Background gradient */}
              <div className="absolute inset-0 bg-gradient-to-br from-yellow-500/10 via-orange-500/10 to-red-500/10 rounded-3xl"></div>
              
              <div className="relative z-10 text-center">
                <div className="w-16 h-16 bg-gradient-to-br from-yellow-500 to-orange-500 rounded-2xl flex items-center justify-center shadow-lg mb-4 mx-auto">
                  <span className="text-3xl">🚀</span>
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">অফলাইন সাপোর্ট</h3>
                <p className="text-gray-700 text-sm leading-relaxed">
                  ইন্টারনেট ছাড়াই সব ফিচার ব্যবহার করুন
                </p>
                
                <div className="mt-4 bg-yellow-50/80 rounded-xl p-3">
                  <div className="text-lg font-bold text-yellow-600">PWA</div>
                  <div className="text-xs text-gray-600">প্রযুক্তি</div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 bg-gradient-to-br from-blue-100/50 via-purple-100/50 to-pink-100/50 relative">
        {/* Background blobs */}
        <div className="absolute top-10 left-1/4 w-72 h-72 bg-blue-300 rounded-full blur-3xl opacity-20 -z-10"></div>
        <div className="absolute bottom-10 right-1/4 w-80 h-80 bg-purple-300 rounded-full blur-3xl opacity-25 -z-10"></div>
        
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
          >
            <h2 className="text-5xl font-bold text-gray-900 mb-6 font-['Hind_Siliguri']">
              আজই শুরু করুন
            </h2>
            <p className="text-xl text-gray-700 mb-10 leading-relaxed">
              বাংলাদেশের শিক্ষার ভবিষ্যতে যোগ দিন। বিনামূল্যে শুরু করুন এবং<br />
              আধুনিক শিক্ষার অভিজ্ঞতা নিন।
            </p>
            
            <div className="flex flex-col sm:flex-row gap-6 justify-center items-center">
              <motion.button
                onClick={() => navigate('/login')}
                className="px-12 py-5 bg-gray-900 hover:bg-gray-800 text-white font-bold text-xl rounded-2xl transition-all shadow-2xl hover:shadow-3xl transform hover:-translate-y-1 font-['Hind_Siliguri']"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                বিনামূল্যে সাইন আপ করুন →
              </motion.button>
              
              <motion.button
                onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })}
                className="px-12 py-5 bg-white/90 backdrop-blur-sm hover:bg-white text-gray-900 font-semibold text-xl rounded-2xl transition-all border-2 border-gray-200 hover:border-gray-300 shadow-lg hover:shadow-xl font-['Hind_Siliguri']"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                ডেমো দেখুন
              </motion.button>
            </div>

            {/* Trust indicators */}
            <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8 max-w-3xl mx-auto">
              <motion.div 
                className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-white/50 shadow-lg"
                whileHover={{ scale: 1.05 }}
              >
                <div className="text-3xl mb-2">🔒</div>
                <h3 className="font-bold text-gray-900 mb-2">সম্পূর্ণ নিরাপদ</h3>
                <p className="text-sm text-gray-600">আপনার ডেটা সুরক্ষিত</p>
              </motion.div>
              
              <motion.div 
                className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-white/50 shadow-lg"
                whileHover={{ scale: 1.05 }}
              >
                <div className="text-3xl mb-2">⚡</div>
                <h3 className="font-bold text-gray-900 mb-2">তাৎক্ষণিক শুরু</h3>
                <p className="text-sm text-gray-600">মাত্র ২ মিনিটে সেটআপ</p>
              </motion.div>
              
              <motion.div 
                className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-white/50 shadow-lg"
                whileHover={{ scale: 1.05 }}
              >
                <div className="text-3xl mb-2">💝</div>
                <h3 className="font-bold text-gray-900 mb-2">সম্পূর্ণ বিনামূল্যে</h3>
                <p className="text-sm text-gray-600">কোনো লুকানো খরচ নেই</p>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-300 py-16 relative overflow-hidden">
        {/* Background decoration */}
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500"></div>
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-12">
            <div className="md:col-span-2">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
                  <span className="text-white font-bold text-lg">শ</span>
                </div>
                <h3 className="text-2xl font-bold text-white font-['Hind_Siliguri']">শিক্ষাসাথী</h3>
              </div>
              <p className="text-gray-400 mb-6 leading-relaxed max-w-md">
                বাংলাদেশের শিক্ষার্থীদের জন্য AI-চালিত অভিযোজিত শিক্ষা প্ল্যাটফর্ম। 
                আধুনিক প্রযুক্তির সাথে ঐতিহ্যবাহী শিক্ষার সমন্বয়।
              </p>
              <div className="flex gap-4">
                <motion.button 
                  className="w-10 h-10 bg-gray-800 hover:bg-blue-600 rounded-lg flex items-center justify-center transition-colors"
                  whileHover={{ scale: 1.1 }}
                >
                  <span className="text-lg">📘</span>
                </motion.button>
                <motion.button 
                  className="w-10 h-10 bg-gray-800 hover:bg-purple-600 rounded-lg flex items-center justify-center transition-colors"
                  whileHover={{ scale: 1.1 }}
                >
                  <span className="text-lg">🐦</span>
                </motion.button>
                <motion.button 
                  className="w-10 h-10 bg-gray-800 hover:bg-green-600 rounded-lg flex items-center justify-center transition-colors"
                  whileHover={{ scale: 1.1 }}
                >
                  <span className="text-lg">💬</span>
                </motion.button>
              </div>
            </div>
            
            <div>
              <h4 className="font-semibold text-white mb-6 text-lg">প্ল্যাটফর্ম</h4>
              <ul className="space-y-3 text-sm">
                <li><a href="#" className="hover:text-blue-400 transition-colors">শিক্ষার্থী ড্যাশবোর্ড</a></li>
                <li><a href="#" className="hover:text-blue-400 transition-colors">শিক্ষক পোর্টাল</a></li>
                <li><a href="#" className="hover:text-blue-400 transition-colors">অভিভাবক অ্যাপ</a></li>
                <li><a href="#" className="hover:text-blue-400 transition-colors">AI টিউটর</a></li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold text-white mb-6 text-lg">সহায়তা</h4>
              <ul className="space-y-3 text-sm">
                <li><a href="#" className="hover:text-blue-400 transition-colors">সাহায্য কেন্দ্র</a></li>
                <li><a href="#" className="hover:text-blue-400 transition-colors">যোগাযোগ</a></li>
                <li><a href="#" className="hover:text-blue-400 transition-colors">FAQ</a></li>
                <li><a href="#" className="hover:text-blue-400 transition-colors">কমিউনিটি</a></li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-gray-800 pt-8">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
              <p className="text-sm text-gray-400">
                &copy; 2024 ShikkhaSathi. সকল অধিকার সংরক্ষিত।
              </p>
              <div className="flex gap-6 text-sm">
                <a href="#" className="text-gray-400 hover:text-blue-400 transition-colors">গোপনীয়তা নীতি</a>
                <a href="#" className="text-gray-400 hover:text-blue-400 transition-colors">ব্যবহারের শর্তাবলী</a>
                <a href="#" className="text-gray-400 hover:text-blue-400 transition-colors">কুকি নীতি</a>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
