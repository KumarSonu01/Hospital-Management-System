import React from 'react';
import { 
  Calendar, 
  Clipboard, 
  Cog, 
  DollarSign, 
  HeartPulse, 
  Hospital, 
  Shield, 
  User, 
  Users, 
  Clock, 
  ChartBar, 
  Globe,
  ArrowRight,
  Play,
  Smartphone,
  Monitor,
  Zap
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const Button = ({ children, primary, secondary, outline, large, onClick, ...props }) => {
  const baseClasses = `group inline-flex items-center justify-center font-medium rounded-xl transition-all duration-300 transform hover:scale-105 focus:outline-none focus:ring-4 focus:ring-offset-2 gap-2 shadow-lg`;

  const variants = {
    primary: 'bg-gradient-to-r from-blue-600 to-blue-700 text-white hover:from-blue-700 hover:to-blue-800 focus:ring-blue-500 shadow-blue-500/25 hover:shadow-xl',
    secondary: 'bg-gradient-to-r from-emerald-500 to-emerald-600 text-white hover:from-emerald-600 hover:to-emerald-700 focus:ring-emerald-500 shadow-emerald-500/25 hover:shadow-xl',
    outline: 'border-2 border-blue-500 text-blue-600 bg-white hover:bg-blue-50 focus:ring-blue-500 hover:shadow-md'
  };

  const sizeClasses = large ? 'px-8 py-4 text-lg' : 'px-6 py-3 text-base';

  return (
    <button
      className={`${baseClasses} ${variants[primary ? 'primary' : secondary ? 'secondary' : outline ? 'outline' : 'bg-white border-2 border-gray-200 text-gray-700 hover:bg-gray-50']} ${sizeClasses}`}
      onClick={onClick}
      {...props}
    >
      {children}
      <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
    </button>
  );
};

const Card = ({ icon: Icon, title, description, primary, features = false }) => (
  <div className={`group relative overflow-hidden rounded-2xl p-8 transition-all duration-500 hover:shadow-2xl hover:-translate-y-2 bg-gradient-to-br ${
    primary 
      ? 'from-white to-blue-50 border-2 border-blue-100 shadow-xl' 
      : 'from-white/80 to-gray-50/80 backdrop-blur-sm border border-gray-100 shadow-lg hover:shadow-2xl'
  }`}>
    <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
    <div className="relative z-10">
      <div className={`w-16 h-16 rounded-2xl bg-gradient-to-r from-blue-500 to-blue-600 flex items-center justify-center mb-6 shadow-lg group-hover:scale-110 transition-all duration-300 ${primary ? 'shadow-blue-400/25' : ''}`}>
        <Icon className="w-8 h-8 text-white" />
      </div>
      <h3 className="text-2xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent mb-4 group-hover:from-blue-600 group-hover:to-purple-600 transition-all duration-300">
        {title}
      </h3>
      <p className={`text-lg ${primary ? 'text-gray-700' : 'text-gray-600'} mb-6 leading-relaxed transition-colors duration-300`}>
        {description}
      </p>
      {features && (
        <ul className="space-y-2 mb-6">
          {features.map((feature, idx) => (
            <li key={idx} className="flex items-center text-sm text-gray-500">
              <Zap className="w-4 h-4 text-emerald-500 mr-2" />
              {feature}
            </li>
          ))}
        </ul>
      )}
      <Button primary={!primary} className="w-full sm:w-auto">
        Explore Now
      </Button>
    </div>
  </div>
);

const FeatureCard = ({ icon: Icon, title, description }) => (
  <div className="group p-6 rounded-2xl bg-white/70 backdrop-blur-sm border border-white/50 hover:bg-white hover:shadow-xl hover:-translate-y-2 transition-all duration-500">
    <div className="w-14 h-14 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
      <Icon className="w-7 h-7 text-white" />
    </div>
    <h4 className="font-bold text-xl mb-2 text-gray-900 group-hover:text-indigo-600 transition-colors">{title}</h4>
    <p className="text-gray-600 leading-relaxed">{description}</p>
  </div>
);

const Section = ({ children, bg = 'bg-white', className = '', fullHeight = false }) => (
  <section className={`${bg} ${fullHeight ? 'min-h-screen' : 'py-24 md:py-32'} ${className}`}>
    <div className="container mx-auto px-6 lg:px-8 max-w-7xl">
      {children}
    </div>
  </section>
);

const Stats = () => (
  <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-16 lg:mb-24">
    {[
      { num: '10K+', label: 'Patients', icon: User },
      { num: '500+', label: 'Doctors', icon: Users },
      { num: '99.9%', label: 'Uptime', icon: Shield },
      { num: '24/7', label: 'Support', icon: Clock }
    ].map(({ num, label, icon: Icon }, idx) => (
      <div key={idx} className="text-center group p-6 rounded-2xl bg-gradient-to-b from-white/50 to-blue-50/50 backdrop-blur-sm border border-blue-100 hover:shadow-xl transition-all">
        <Icon className="w-12 h-12 text-blue-600 mx-auto mb-4 group-hover:scale-110 transition-transform" />
        <div className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-700 bg-clip-text text-transparent mb-2">
          {num}
        </div>
        <p className="text-gray-600 font-medium">{label}</p>
      </div>
    ))}
  </div>
);

const Home = () => {
  const navigate = useNavigate();

  const handleButtonClick = (route) => {
    navigate(route);
  };

  return (
    <div className="bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 min-h-screen">
      {/* Enhanced Header */}
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-gray-100 shadow-sm">
        <div className="container mx-auto px-6 lg:px-8 max-w-7xl">
          <div className="flex items-center justify-between h-16 lg:h-20">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-gradient-to-r from-blue-600 to-blue-700 rounded-2xl shadow-lg">
                <Hospital className="w-7 h-7 text-white" />
              </div>
              <span className="text-2xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
                Hospital Management System
              </span>
            </div>
            <nav className="hidden md:flex items-center gap-2">
              <Button outline onClick={() => handleButtonClick('/login')}>Login</Button>
              <Button secondary large onClick={() => handleButtonClick('/signup')}>
                Get Started Free
              </Button>
            </nav>
          </div>
        </div>
      </header>

      <main>
        {/* Hero Section */}
        <Section fullHeight className="overflow-hidden">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center h-full pt-12 lg:pt-0">
            <div className="lg:pr-12">
              <div className="inline-block px-6 py-2 bg-blue-100 rounded-full text-sm font-semibold text-blue-700 mb-8">
                🚀 Trusted by 10,000+ Hospitals Worldwide
              </div>
              <h1 className="text-5xl lg:text-7xl font-black leading-tight mb-8 bg-gradient-to-r from-gray-900 via-blue-900 to-purple-900 bg-clip-text text-transparent">
                Transform Your 
                <span className="bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 bg-clip-text text-transparent">
                  Hospital
                </span>
              </h1>
              <p className="text-xl lg:text-2xl text-gray-600 mb-12 leading-relaxed max-w-lg">
                The most advanced hospital management system with AI-powered insights, seamless workflows, and unmatched security.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Button primary large onClick={() => handleButtonClick('/login')}>
                  Start Free Trial
                </Button>
                <Button outline large onClick={() => handleButtonClick('/features')}>
                  Watch Demo <Play className="w-5 h-5 ml-1" />
                </Button>
              </div>
            </div>
            <div className="relative">
              <div className="relative z-10 bg-gradient-to-br from-white via-blue-50/50 to-purple-50/50 backdrop-blur-xl rounded-3xl shadow-2xl p-8 lg:p-12 border border-white/50">
                <div className="grid grid-cols-2 gap-6 mb-8">
                  <div className="bg-gradient-to-r from-emerald-400 to-teal-500 p-4 rounded-2xl shadow-lg">
                    <p className="text-white font-bold text-lg">📱 Mobile App</p>
                  </div>
                  <div className="bg-gradient-to-r from-purple-400 to-pink-500 p-4 rounded-2xl shadow-lg">
                    <p className="text-white font-bold text-lg">💻 Web Dashboard</p>
                  </div>
                </div>
                <div className="bg-gradient-to-b from-gray-900/5 to-blue-900/10 p-8 rounded-2xl border-2 border-white/30 shadow-xl">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-center">
                    <div>
                      <div className="text-3xl font-bold text-white mb-2">24/7</div>
                      <p className="text-blue-100 text-sm">Support</p>
                    </div>
                    <div>
                      <div className="text-3xl font-bold text-white mb-2">99.9%</div>
                      <p className="text-blue-100 text-sm">Uptime</p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="absolute -top-4 -right-4 w-72 h-72 bg-gradient-to-r from-blue-400/20 to-purple-400/20 rounded-full blur-3xl animate-pulse"></div>
            </div>
          </div>
        </Section>

        {/* Stats */}
        <Section bg="bg-gradient-to-r from-blue-600/10 via-purple-500/5 to-indigo-600/10">
          <Stats />
        </Section>

        {/* Core Features */}
        <Section>
          <div className="text-center mb-20">
            <h2 className="text-4xl lg:text-5xl font-black mb-6 bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
              Core Features That 
              <span className="bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
                Transform
              </span>
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto leading-relaxed">
              Everything you need to manage your hospital efficiently
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              { 
                icon: User, 
                title: "Patient Management", 
                description: "Complete patient lifecycle management with AI-powered insights and automated workflows.",
                features: ["Electronic Health Records", "Appointment Reminders", "Treatment History"]
              },
              { 
                icon: Hospital, 
                title: "Doctor Management", 
                description: "Streamlined doctor scheduling, performance tracking, and patient assignment automation.",
                features: ["Smart Scheduling", "Performance Analytics", "On-call Management"]
              },
              { 
                icon: Calendar, 
                title: "Appointment System", 
                description: "Intelligent appointment booking with real-time availability and automated confirmations.",
                features: ["Online Booking", "Waitlist Management", "Telemedicine Integration"]
              }
            ].map((card, index) => (
              <Card key={index} {...card} primary />
            ))}
          </div>
        </Section>

        {/* Modern Operations Section */}
        <Section bg="bg-gradient-to-br from-emerald-50 via-green-50 to-teal-50">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-24 items-center">
            <div className="order-2 lg:order-1">
              <h2 className="text-4xl lg:text-5xl font-black mb-6 bg-gradient-to-r from-emerald-800 to-teal-800 bg-clip-text text-transparent">
                Modernize Your 
                <span className="bg-gradient-to-r from-emerald-600 via-teal-600 to-green-600 bg-clip-text text-transparent">
                  Operations
                </span>
              </h2>
              <p className="text-xl text-gray-700 mb-12 leading-relaxed max-w-lg">
                Experience the future of healthcare management with our cutting-edge platform designed for efficiency and growth.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Button secondary large onClick={() => handleButtonClick('/login')}>
                  Explore Platform
                </Button>
                <Button outline large onClick={() => handleButtonClick('/demo')}>
                  Book Demo
                </Button>
              </div>
            </div>
            <div className="order-1 lg:order-2 relative">
              <div className="bg-gradient-to-br from-emerald-500/10 via-teal-500/5 to-green-500/10 backdrop-blur-xl rounded-3xl p-12 border border-emerald-200/50 shadow-2xl">
                <div className="grid grid-cols-2 gap-6">
                  <div className="bg-white/80 p-6 rounded-2xl shadow-lg border border-white/50">
                    <Smartphone className="w-12 h-12 text-emerald-600 mx-auto mb-4" />
                    <h4 className="font-bold text-xl mb-2 text-gray-900">Mobile First</h4>
                    <p className="text-gray-600 text-sm">Access everywhere</p>
                  </div>
                  <div className="bg-white/80 p-6 rounded-2xl shadow-lg border border-white/50">
                    <Monitor className="w-12 h-12 text-emerald-600 mx-auto mb-4" />
                    <h4 className="font-bold text-xl mb-2 text-gray-900">Dashboard</h4>
                    <p className="text-gray-600 text-sm">Real-time insights</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Section>

        {/* Why Choose Us */}
        <Section>
          <div className="text-center mb-20">
            <h2 className="text-4xl lg:text-5xl font-black mb-6 bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
              Why Hospitals Choose 
              <span className="bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 bg-clip-text text-transparent">
                Hospital Management System
              </span>
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Join thousands of healthcare providers who trust our platform
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              { icon: Clipboard, title: "⚡ Lightning Fast", description: "Blazing fast performance with intelligent caching and optimized workflows." },
              { icon: Users, title: "👥 Enhanced Care", description: "Comprehensive patient records with intelligent scheduling for better outcomes." },
              { icon: DollarSign, title: "💰 Cost Effective", description: "Reduce operational costs by up to 40% with automated workflows." },
              { icon: HeartPulse, title: "📈 Better Outcomes", description: "AI-powered insights improve patient satisfaction and treatment success." },
              { icon: Shield, title: "🔒 Enterprise Security", description: "HIPAA compliant with military-grade encryption and zero-trust architecture." },
              { icon: Cog, title: "🎨 Fully Customizable", description: "Tailor every aspect to match your hospital's unique workflows." },
              { icon: Clock, title: "⏱️ Time Saving", description: "Automate 80% of administrative tasks, freeing staff for patient care." },
              { icon: ChartBar, title: "📊 Advanced Analytics", description: "Real-time dashboards and predictive analytics for data-driven decisions." },
              { icon: Globe, title: "🌐 Global Scale", description: "Enterprise-ready infrastructure supporting unlimited locations and users." }
            ].map((card, index) => (
              <Card key={index} {...card} />
            ))}
          </div>
        </Section>

        {/* CTA Section */}
        <Section bg="bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-700 text-white" className="overflow-hidden">
          <div className="text-center max-w-4xl mx-auto">
            <div className="inline-flex items-center gap-2 px-6 py-3 bg-white/20 backdrop-blur-sm rounded-full mb-8">
              <Zap className="w-5 h-5" />
              <span className="font-semibold">Ready to transform your hospital?</span>
            </div>
                       <h2 className="text-4xl lg:text-6xl font-black mb-8 drop-shadow-2xl leading-tight">
              Start Your 
              <span className="bg-gradient-to-r from-yellow-400 via-orange-400 to-red-400 bg-clip-text text-transparent">
                Free Trial
              </span>
              Today
            </h2>
            <p className="text-xl lg:text-2xl text-blue-100/90 mb-12 opacity-90 leading-relaxed max-w-2xl mx-auto">
              No credit card required. Cancel anytime. Trusted by 10,000+ healthcare providers worldwide.
            </p>
            <div className="flex flex-col sm:flex-row gap-6 justify-center items-center mb-16">
              <Button primary large className="!bg-white/90 text-blue-700 hover:!bg-white font-bold shadow-2xl hover:shadow-3xl">
                Start Free Trial
              </Button>
              <Button outline large className="!border-white/50 text-white/90 hover:!bg-white/10 backdrop-blur-sm">
                Schedule Demo Call
              </Button>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center text-sm text-blue-100/80">
              {[
                { icon: '🏥', label: 'Mayo Clinic' },
                { icon: '🏨', label: 'Cleveland Clinic' },
                { icon: '🏥', label: 'Johns Hopkins' },
                { icon: '🏨', label: 'Mount Sinai' }
              ].map(({ icon, label }, idx) => (
                <div key={idx} className="group hover:scale-105 transition-transform">
                  <span className="text-2xl mb-2 block">{icon}</span>
                  <span className="font-medium group-hover:text-white transition-colors">{label}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="absolute inset-0 overflow-hidden">
            <div className="absolute -top-40 -right-40 w-80 h-80 bg-white/10 rounded-full blur-3xl animate-pulse"></div>
            <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-yellow-400/20 rounded-full blur-3xl animate-pulse delay-1000"></div>
          </div>
        </Section>
      </main>

      {/* Enhanced Footer */}
      <footer className="bg-gradient-to-t from-gray-900 via-gray-800 to-black/50 border-t border-gray-800/50">
        <div className="container mx-auto px-6 lg:px-8 max-w-7xl">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 py-20">
            <div>
              <div className="flex items-center gap-3 mb-8">
                <div className="p-3 bg-gradient-to-r from-blue-600 to-blue-700 rounded-2xl">
                  <Hospital className="w-7 h-7 text-white" />
                </div>
                <span className="text-2xl font-bold text-white">Hospital Management System</span>
              </div>
              <p className="text-gray-400 leading-relaxed mb-8 max-w-md">
                The most advanced hospital management system trusted by thousands of healthcare providers worldwide.
              </p>
              <div className="flex space-x-4">
                {['📱', '💻', '🖥️'].map((icon, idx) => (
                  <div key={idx} className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center backdrop-blur-sm hover:bg-white/20 transition-all group">
                    <span className="text-xl group-hover:scale-110 transition-transform">{icon}</span>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <h4 className="text-xl font-bold text-white mb-8">Product</h4>
              <ul className="space-y-4 text-gray-400">
                <li><a href="#" className="hover:text-white transition-colors">Patient Portal</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Doctor Dashboard</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Appointment System</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Analytics</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-xl font-bold text-white mb-8">Company</h4>
              <ul className="space-y-4 text-gray-400">
                <li><a href="#" className="hover:text-white transition-colors">About</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Careers</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Press</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Contact</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-xl font-bold text-white mb-8">Support</h4>
              <ul className="space-y-4 text-gray-400">
                <li><a href="#" className="hover:text-white transition-colors">Documentation</a></li>
                <li><a href="#" className="hover:text-white transition-colors">API</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Status</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Support</a></li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-gray-800 pt-12 mt-12">
            <div className="flex flex-col md:flex-row justify-between items-center gap-6 text-gray-400 text-sm">
              <p>&copy; 2024 Hospital Management System. All rights reserved.</p>
              <div className="flex gap-6">
                <a href="#" className="hover:text-white transition-colors">Privacy</a>
                <a href="#" className="hover:text-white transition-colors">Terms</a>
                <a href="#" className="hover:text-white transition-colors">Security</a>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Home;