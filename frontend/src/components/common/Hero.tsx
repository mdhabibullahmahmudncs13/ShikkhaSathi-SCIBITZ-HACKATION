import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { GraduationCap, BookOpen, PenTool, ArrowRight, Sparkles, Users, Trophy } from 'lucide-react';

const Hero = () => {
  const navigate = useNavigate();

  // Animation variants for floating icons
  const floatingVariants = {
    animate: {
      y: [0, -20, 0],
      rotate: [0, 10, -10, 0],
      transition: {
        duration: 6,
        repeat: Infinity,
        ease: "easeInOut"
      }
    }
  };

  const floatingVariants2 = {
    animate: {
      y: [0, -15, 0],
      rotate: [0, -8, 8, 0],
      transition: {
        duration: 8,
        repeat: Infinity,
        ease: "easeInOut",
        delay: 2
      }
    }
  };

  const floatingVariants3 = {
    animate: {
      y: [0, -25, 0],
      rotate: [0, 12, -12, 0],
      transition: {
        duration: 7,
        repeat: Infinity,
        ease: "easeInOut",
        delay: 4
      }
    }
  };

  // Fade-in-up animation variants
  const fadeInUp = {
    initial: { opacity: 0, y: 60 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.8, ease: "easeOut" }
  };

  const staggerContainer = {
    animate: {
      transition: {
        staggerChildren: 0.2
      }
    }
  };

  return (
    <section className="relative min-h-screen bg-slate-50 overflow-hidden">
      {/* Enhanced Background with Soft Gradients */}
      <div className="absolute inset-0">
        <div className="absolute top-20 left-20 w-96 h-96 bg-gradient-to-br from-blue-200/40 via-purple-200/30 to-transparent rounded-full blur-3xl"></div>
        <div className="absolute top-60 right-32 w-80 h-80 bg-gradient-to-br from-purple-200/30 via-pink-200/20 to-transparent rounded-full blur-3xl"></div>
        <div className="absolute bottom-40 left-1/3 w-72 h-72 bg-gradient-to-br from-indigo-200/40 via-blue-200/30 to-transparent rounded-full blur-3xl"></div>
      </div>

      {/* Floating Decorative Icons with Enhanced Colors */}
      <motion.div
        className="absolute top-32 left-16 text-blue-500/30"
        variants={floatingVariants}
        animate="animate"
      >
        <GraduationCap size={40} />
      </motion.div>
      
      <motion.div
        className="absolute top-48 right-24 text-purple-500/35"
        variants={floatingVariants2}
        animate="animate"
      >
        <BookOpen size={36} />
      </motion.div>
      
      <motion.div
        className="absolute bottom-48 left-24 text-indigo-500/30"
        variants={floatingVariants3}
        animate="animate"
      >
        <PenTool size={32} />
      </motion.div>
      
      <motion.div
        className="absolute top-80 left-1/4 text-orange-500/25"
        variants={floatingVariants}
        animate="animate"
        style={{ animationDelay: '1s' }}
      >
        <Sparkles size={28} />
      </motion.div>
      
      <motion.div
        className="absolute bottom-64 right-1/4 text-purple-500/30"
        variants={floatingVariants2}
        animate="animate"
        style={{ animationDelay: '3s' }}
      >
        <Trophy size={34} />
      </motion.div>

      {/* Main Content Container - Split Screen Layout */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-16">
        <motion.div 
          className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center min-h-[85vh]"
          variants={staggerContainer}
          initial="initial"
          animate="animate"
        >
          
          {/* Left Side - Content */}
          <div className="space-y-10 order-2 lg:order-1">
            
            {/* Main Title with Enhanced Gradient */}
            <motion.div variants={fadeInUp}>
              <h1 className="text-6xl md:text-7xl lg:text-8xl font-bold leading-tight mb-6">
                <span className="bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 bg-clip-text text-transparent font-['Hind_Siliguri']">
                  শিক্ষাসাথী
                </span>
              </h1>
            </motion.div>

            {/* Sub-header with Better Typography */}
            <motion.div variants={fadeInUp}>
              <p className="text-xl md:text-2xl text-gray-700 leading-relaxed font-['Hind_Siliguri'] max-w-2xl">
                বাংলাদেশের ৬ষ্ঠ থেকে ১০ম শ্রেণীর শিক্ষার্থীদের জন্য বিশেষভাবে ডিজাইন করা 
                <span className="text-blue-600 font-semibold"> কৃত্রিম বুদ্ধিমত্তা চালিত</span> অভিযোজিত শিক্ষা প্ল্যাটফর্ম।
              </p>
            </motion.div>

            {/* Enhanced CTA Buttons */}
            <motion.div 
              className="flex flex-col sm:flex-row gap-6"
              variants={fadeInUp}
            >
              {/* Primary CTA with Gradient */}
              <motion.button
                onClick={() => navigate('/signup')}
                className="group px-10 py-5 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-bold text-xl rounded-2xl transition-all duration-300 shadow-xl hover:shadow-2xl transform hover:-translate-y-2 font-['Hind_Siliguri'] flex items-center justify-center gap-3"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Sparkles className="w-6 h-6" />
                বিনামূল্যে শুরু করুন
                <ArrowRight className="w-6 h-6 group-hover:translate-x-2 transition-transform" />
              </motion.button>
              
              {/* Secondary CTA with Glass Effect */}
              <motion.button
                onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })}
                className="px-10 py-5 bg-white/70 backdrop-blur-md hover:bg-white/90 text-gray-800 hover:text-gray-900 font-semibold text-xl rounded-2xl transition-all duration-300 border-2 border-white/50 hover:border-white/80 shadow-lg hover:shadow-xl font-['Hind_Siliguri']"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                বৈশিষ্ট্য দেখুন
              </motion.button>
            </motion.div>

            {/* Enhanced Statistics Bar - Glassmorphism Cards */}
            <motion.div 
              className="grid grid-cols-3 gap-6 pt-8"
              variants={fadeInUp}
            >
              <motion.div 
                className="bg-white/70 backdrop-blur-md rounded-3xl p-6 border border-white/50 shadow-lg text-center group"
                whileHover={{ scale: 1.08, y: -5 }}
                transition={{ duration: 0.3 }}
              >
                <div className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent font-['Hind_Siliguri'] mb-2">10K+</div>
                <div className="text-sm text-gray-600 font-['Hind_Siliguri'] font-medium">শিক্ষার্থী</div>
                <div className="w-8 h-8 mx-auto mt-3 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Users className="w-4 h-4 text-white" />
                </div>
              </motion.div>
              
              <motion.div 
                className="bg-white/70 backdrop-blur-md rounded-3xl p-6 border border-white/50 shadow-lg text-center group"
                whileHover={{ scale: 1.08, y: -5 }}
                transition={{ duration: 0.3 }}
              >
                <div className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-orange-500 to-red-500 bg-clip-text text-transparent font-['Hind_Siliguri'] mb-2">500+</div>
                <div className="text-sm text-gray-600 font-['Hind_Siliguri'] font-medium">শিক্ষক</div>
                <div className="w-8 h-8 mx-auto mt-3 bg-gradient-to-r from-orange-500 to-red-500 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                  <GraduationCap className="w-4 h-4 text-white" />
                </div>
              </motion.div>
              
              <motion.div 
                className="bg-white/70 backdrop-blur-md rounded-3xl p-6 border border-white/50 shadow-lg text-center group"
                whileHover={{ scale: 1.08, y: -5 }}
                transition={{ duration: 0.3 }}
              >
                <div className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-purple-500 to-pink-500 bg-clip-text text-transparent font-['Hind_Siliguri'] mb-2">50K+</div>
                <div className="text-sm text-gray-600 font-['Hind_Siliguri'] font-medium">কুইজ সম্পন্ন</div>
                <div className="w-8 h-8 mx-auto mt-3 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Trophy className="w-4 h-4 text-white" />
                </div>
              </motion.div>
            </motion.div>
          </div>

          {/* Right Side - Enhanced Student Image with Radial Glow */}
          <motion.div 
            className="relative order-1 lg:order-2"
            variants={fadeInUp}
          >
            <div className="relative">
              {/* Enhanced Radial Glow Background */}
              <div className="absolute inset-0 bg-gradient-radial from-blue-300/30 via-purple-300/20 to-transparent rounded-full blur-3xl scale-110 -z-10"></div>
              
              {/* Main Image Container with Enhanced Glow */}
              <motion.div
                className="relative z-0"
                whileHover={{ scale: 1.03 }}
                transition={{ duration: 0.4 }}
              >
                <div className="relative">
                  {/* Outer Glow Effect - Enhanced */}
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-400/30 via-purple-400/30 to-pink-400/20 rounded-3xl blur-2xl scale-105 -z-10"></div>
                  
                  {/* Main Image */}
                  <img
                    src="https://images.unsplash.com/photo-1522202176988-66273c2fd55f?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1471&q=80"
                    alt="Student learning with ShikkhaSathi"
                    className="relative w-full h-auto max-w-lg mx-auto rounded-3xl shadow-2xl object-cover z-0"
                  />
                </div>
              </motion.div>

              {/* Enhanced Decorative Floating Elements */}
              <motion.div
                className="absolute -top-8 -left-8 w-24 h-24 bg-gradient-to-br from-blue-400/40 to-purple-500/40 rounded-2xl blur-xl -z-20"
                animate={{
                  rotate: [0, 360],
                  scale: [1, 1.2, 1]
                }}
                transition={{
                  duration: 20,
                  repeat: Infinity,
                  ease: "linear"
                }}
              />
              
              <motion.div
                className="absolute -bottom-10 -right-10 w-28 h-28 bg-gradient-to-br from-purple-400/40 to-pink-500/40 rounded-full blur-xl -z-20"
                animate={{
                  rotate: [360, 0],
                  scale: [1, 1.3, 1]
                }}
                transition={{
                  duration: 15,
                  repeat: Infinity,
                  ease: "linear"
                }}
              />

              {/* Enhanced Success Badge */}
              <motion.div
                className="absolute top-8 -right-8 bg-white/90 backdrop-blur-md rounded-3xl p-4 shadow-2xl border border-white/60 z-20"
                animate={{
                  y: [0, -10, 0],
                  rotate: [0, 3, -3, 0]
                }}
                transition={{
                  duration: 4,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-r from-green-400 to-emerald-500 rounded-full flex items-center justify-center shadow-lg">
                    <GraduationCap className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <div className="text-sm font-bold text-gray-900 font-['Hind_Siliguri']">৯৮%</div>
                    <div className="text-xs text-gray-600 font-['Hind_Siliguri']">সফলতার হার</div>
                  </div>
                </div>
              </motion.div>

              {/* Enhanced AI Support Badge */}
              <motion.div
                className="absolute bottom-16 -left-10 bg-white/90 backdrop-blur-md rounded-3xl p-4 shadow-2xl border border-white/60 z-20"
                animate={{
                  y: [0, -8, 0],
                  rotate: [0, -2, 2, 0]
                }}
                transition={{
                  duration: 5,
                  repeat: Infinity,
                  ease: "easeInOut",
                  delay: 1
                }}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-r from-purple-400 to-pink-500 rounded-full flex items-center justify-center shadow-lg">
                    <Sparkles className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <div className="text-sm font-bold text-gray-900 font-['Hind_Siliguri']">২৪/৭</div>
                    <div className="text-xs text-gray-600 font-['Hind_Siliguri']">AI সাপোর্ট</div>
                  </div>
                </div>
              </motion.div>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
};

export default Hero;